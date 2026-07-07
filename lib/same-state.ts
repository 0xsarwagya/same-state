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

function buildImpression(patientId: string, summary: string): {
  resourceType: string;
  status: string;
  subject: { reference: string };
  summary: string;
  effectiveDateTime: string;
} {
  // ISO date is deterministic enough for a demo receipt; the server
  // assigns its own lastUpdated and versionId on write anyway.
  return {
    resourceType: "ClinicalImpression",
    status: "completed",
    subject: { reference: `Patient/${patientId}` },
    summary,
    effectiveDateTime: "2026-07-07T00:00:00Z",
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
      usage: completion.usage,
    },
    mode: "embedded",
    embed: true,
  });

  emit(`writing ClinicalImpression`);
  const impression = buildImpression(patientId, output);
  const created = await fhirRequest(`/ClinicalImpression`, {
    method: "POST",
    body: impression,
  });
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
      // through the FHIR write event above.
      location: locationHeader,
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

  const a = await runOne(
    "A",
    input.modelA,
    patient,
    observations,
    input.patientId,
    input.openRouterKey,
    input,
  );
  const b = await runOne(
    "B",
    input.modelB,
    patient,
    observations,
    input.patientId,
    input.openRouterKey,
    input,
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
