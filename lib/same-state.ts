import {
  createEd25519Signer,
  createReceipt,
  exportVerificationKey,
  type ClinicalReceipt,
} from "@0xsarwagya/clinical-receipt";
import { fhirExtension } from "@0xsarwagya/clinical-receipt/fhir";

import { HAPI_BASE_URL, HAPI_SERVER, MAX_OUTPUT_TOKENS } from "./constants";
import { fhirRequest } from "./fhir-proxy";
import { chatCompletion, type ChatCompletionResponse } from "./openrouter";

export type RunLabel = "A" | "B";

export interface StepEvent {
  label: RunLabel | "shared";
  message: string;
}

export interface SameStateInput {
  patientId: string;
  modelA: string;
  modelB: string;
  openRouterKey: string;
  /** Optional callback for the live status log. */
  onStep?: (event: StepEvent) => void;
  signal?: AbortSignal;
}

export interface SameStateResult {
  patient: unknown;
  observations: unknown;
  receiptA: ClinicalReceipt;
  receiptB: ClinicalReceipt;
  keyA: JsonWebKey;
  keyB: JsonWebKey;
  outputA: string;
  outputB: string;
  modelActualA: string;
  modelActualB: string;
  createdA: unknown;
  createdB: unknown;
}

function buildPrompt(patient: unknown, observations: unknown): string {
  return [
    "You are reviewing a patient's clinical context and producing a brief clinical impression.",
    "Return 3 to 5 short paragraphs of plain-English clinical reasoning.",
    "Do NOT include any patient identifiers in the output.",
    "",
    "Patient resource (FHIR R4 JSON):",
    "```json",
    JSON.stringify(patient, null, 2),
    "```",
    "",
    "Observations (FHIR Bundle):",
    "```json",
    JSON.stringify(observations, null, 2),
    "```",
  ].join("\n");
}

/**
 * Pull the first diagnostics message out of an OperationOutcome body,
 * if present. HAPI returns these on validation and compartment-lock
 * failures — surfacing them in the status log turns a mystery timeout
 * into an actionable message like "HAPI-1769: Compartment is locked".
 */
function extractHapiDiagnostics(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const outcome = body as {
    resourceType?: string;
    issue?: Array<{ diagnostics?: unknown; details?: { text?: unknown } }>;
  };
  if (outcome.resourceType !== "OperationOutcome") return null;
  const first = outcome.issue?.[0];
  if (typeof first?.diagnostics === "string" && first.diagnostics.length > 0) {
    return first.diagnostics;
  }
  if (
    typeof first?.details?.text === "string" &&
    first.details.text.length > 0
  ) {
    return first.details.text;
  }
  return null;
}

/**
 * A deterministic PRNG factory. Each call returns a FRESH closure
 * seeded with the same starting state — two closures produce the
 * exact same byte sequence for the same call-index. This is the
 * "seededRandom" contract that runOne expects: A and B each get their
 * own closure, but corresponding calls produce equal bytes, so the
 * `random` option flowing into clinical-receipt's fhirExtension yields
 * identical commitment digests across the two runs.
 *
 * xorshift32 keyed by an SHA-256 slice of the demo salt string — not
 * cryptographic (that's not the point here) but stable and side-effect-
 * free. If you inject your own factory, the guarantee is: two calls
 * that produce the same call-index sequence give identical bytes.
 */
function makeSeededRandomFactory(
  seed: string,
): () => (byteLength: number) => Uint8Array<ArrayBuffer> {
  // Fold the seed string into a 32-bit state via multiply-XOR.
  const initialState = ((): number => {
    let s = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
      s ^= seed.charCodeAt(i);
      s = Math.imul(s, 0x01000193) >>> 0;
    }
    return s === 0 ? 0x9e3779b1 : s;
  })();
  return () => {
    let state = initialState;
    return (byteLength: number): Uint8Array<ArrayBuffer> => {
      const out = new Uint8Array(byteLength);
      for (let i = 0; i < byteLength; i += 1) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        out[i] = state & 0xff;
      }
      return out as Uint8Array<ArrayBuffer>;
    };
  };
}

function buildImpression(
  patientId: string,
  summary: string,
  model: string,
): {
  resourceType: string;
  status: string;
  subject: { reference: string };
  summary: string;
  effectiveDateTime: string;
  identifier: Array<{ system: string; value: string }>;
  note: Array<{ text: string }>;
} {
  // Distinguish A from B on the wire: HAPI's newer duplicate detection
  // (HAPI-2840) treats structurally identical impressions with the same
  // subject + status + effectiveDateTime as duplicates. Using the exact
  // write-time timestamp plus the model name in an identifier and a
  // note guarantees the two writes are always distinct — no matter how
  // similar the model outputs happen to be.
  const nowIso = new Date().toISOString();
  return {
    resourceType: "ClinicalImpression",
    status: "completed",
    subject: { reference: `Patient/${patientId}` },
    summary,
    effectiveDateTime: nowIso,
    identifier: [
      {
        system: "https://same-state.sarwagya.wtf/run",
        value: `${model}::${nowIso}`,
      },
    ],
    note: [{ text: `Same-State run — model: ${model}` }],
  };
}

async function runOne(
  label: RunLabel,
  model: string,
  patient: unknown,
  observations: unknown,
  patientId: string,
  openRouterKey: string,
  input: SameStateInput,
  /**
   * A factory that produces a fresh seeded random source. Both runs
   * call this ONCE to get their own closure — same seed on each call,
   * counters progress independently but produce the same sequence.
   * That is the exact protocol the clinical-receipt v0.2.2
   * `fhirExtension({ random })` option expects for identical-input
   * commitments (see spec/1.0/fhir.md and the same-input-commitment
   * regression test in the library).
   */
  seededRandom: () => (byteLength: number) => Uint8Array<ArrayBuffer>,
): Promise<{
  receipt: ClinicalReceipt;
  key: JsonWebKey;
  completion: ChatCompletionResponse;
  created: unknown;
}> {
  const emit = (message: string) => input.onStep?.({ label, message });

  emit(`preparing receipt (${model})`);
  const signer = await createEd25519Signer({ generate: true });
  const run = await createReceipt({
    workflow: {
      id: "same-state",
      version: "1.0.0",
    },
    subject: {
      value: { reference: `Patient/${patientId}` },
    },
  });
  const fhir = fhirExtension(run, {
    server: HAPI_SERVER,
    // Shared salt sequence: identical FHIR bodies → identical commits
    // across runs A and B. That is the whole "same input state" claim.
    random: seededRandom(),
  });

  // Level-3 explicit: feed the *same clinical bytes* into both A's and
  // B's receipts. The only difference between the two runs is what
  // the model receives from here on.
  emit(`committing Patient/${patientId}`);
  await fhir
    .operation({
      method: "GET",
      baseUrl: HAPI_BASE_URL,
      path: `/Patient/${patientId}`,
    })
    .commitResponse({ status: 200, body: patient });

  emit(`committing Observation search`);
  await fhir
    .operation({
      method: "GET",
      baseUrl: HAPI_BASE_URL,
      path: "/Observation",
      query: { patient: patientId, _count: "5" },
    })
    .commitResponse({ status: 200, body: observations });

  emit(`calling ${model}`);
  const prompt = buildPrompt(patient, observations);
  await run.model.requested({
    value: {
      provider: "openrouter",
      model,
      configuration: { max_tokens: MAX_OUTPUT_TOKENS },
      promptBytes: prompt.length,
    },
    mode: "embedded",
    embed: true,
  });

  const completion = await chatCompletion(openRouterKey, {
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      {
        role: "system",
        content:
          "You are a careful clinical assistant. You never invent facts and you never claim medical certainty.",
      },
      { role: "user", content: prompt },
    ],
  });

  const output = completion.choices[0]?.message.content ?? "";
  const modelActual = completion.model ?? model;

  await run.model.responded({
    value: {
      provider: "openrouter",
      model: modelActual,
      content: output,
      finishReason: completion.choices[0]?.finish_reason ?? "unknown",
      // Free-tier providers occasionally omit `usage`; JCS rejects
      // undefined values in the canonicalized payload, so only include
      // it when the response actually carries one.
      ...(completion.usage !== undefined ? { usage: completion.usage } : {}),
    },
    mode: "embedded",
    embed: true,
  });

  emit(`writing ClinicalImpression`);
  // Pass modelActual — HAPI-2840 dedup depends on the impression bodies
  // being structurally distinct between A and B. The model name in the
  // identifier + note plus a wall-clock effectiveDateTime guarantees it.
  const impression = buildImpression(patientId, output, modelActual);
  const created = await fhirRequest(`/ClinicalImpression`, {
    method: "POST",
    body: impression,
  });

  // The write may have failed. HAPI's public server has compartment
  // locks on some patients (e.g. HAPI-1769); other errors are typical
  // FHIR validation issues. Do NOT commit an OperationOutcome as if
  // it were a persisted ClinicalImpression — that would render as a
  // fake successful write in the diff panel and quietly erase the
  // "the write failed" signal from the receipt.
  const responseType =
    typeof (created.body as { resourceType?: unknown } | undefined)
      ?.resourceType === "string"
      ? ((created.body as { resourceType: string }).resourceType as string)
      : undefined;
  if (created.status >= 400 || responseType !== "ClinicalImpression") {
    const diagnostics = extractHapiDiagnostics(created.body);
    const summary =
      diagnostics !== null
        ? `HAPI refused the ClinicalImpression write: ${diagnostics}`
        : `HAPI refused the ClinicalImpression write (status ${created.status}, resourceType=${responseType ?? "unknown"})`;
    throw new Error(summary);
  }

  const locationHeader = created.location ?? undefined;
  await fhir
    .operation({
      method: "POST",
      baseUrl: HAPI_BASE_URL,
      path: "/ClinicalImpression",
      body: impression,
    })
    .commitResponse({
      status: created.status,
      body: created.body,
      headers: locationHeader !== undefined ? { location: locationHeader } : {},
    });

  await run.output.committed({
    value: {
      summaryLength: output.length,
      // Reference into HAPI — the actual bytes were already committed
      // through the FHIR write event above. Only include the location
      // when the server returned one; JCS strictly rejects undefined
      // (there is no JSON representation for it).
      ...(locationHeader !== undefined ? { location: locationHeader } : {}),
    },
    mode: "embedded",
    embed: true,
  });

  emit(`finalizing`);
  const receipt = await run.finalize({ signer });
  const key = exportVerificationKey(signer);
  return { receipt, key, completion, created: created.body };
}

/**
 * Same State — two receipts, same clinical state, different model. The
 * two runs share the FHIR bodies fetched here; each run signs with its
 * own ephemeral in-browser Ed25519 key.
 */
export async function runSameState(input: SameStateInput): Promise<SameStateResult> {
  const emit = (message: string) => input.onStep?.({ label: "shared", message });

  emit(`fetching Patient/${input.patientId}`);
  const patient = (
    await fhirRequest(`/Patient/${input.patientId}`, {
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
    })
  ).body;

  emit(`searching Observations for Patient/${input.patientId}`);
  const observations = (
    await fhirRequest(`/Observation`, {
      query: { patient: input.patientId, _count: 5 },
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
    })
  ).body;

  // Bind the salt seed to the invocation (patient id + timestamp).
  // Both runs get their own closure from this factory — same seed,
  // independent counters → identical byte sequences → identical
  // FHIR-body commitments across A and B. The "same clinical state"
  // claim in the diff panel is proven, not asserted.
  const seededRandom = makeSeededRandomFactory(
    `same-state:${input.patientId}:${Date.now()}`,
  );

  const a = await runOne(
    "A",
    input.modelA,
    patient,
    observations,
    input.patientId,
    input.openRouterKey,
    input,
    seededRandom,
  );
  const b = await runOne(
    "B",
    input.modelB,
    patient,
    observations,
    input.patientId,
    input.openRouterKey,
    input,
    seededRandom,
  );

  return {
    patient,
    observations,
    receiptA: a.receipt,
    receiptB: b.receipt,
    keyA: a.key,
    keyB: b.key,
    outputA: a.completion.choices[0]?.message.content ?? "",
    outputB: b.completion.choices[0]?.message.content ?? "",
    modelActualA: a.completion.model ?? input.modelA,
    modelActualB: b.completion.model ?? input.modelB,
    createdA: a.created,
    createdB: b.created,
  };
}
