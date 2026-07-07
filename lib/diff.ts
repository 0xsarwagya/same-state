import type { ClinicalReceipt } from "@0xsarwagya/clinical-receipt";
import { inspectFHIR } from "@0xsarwagya/clinical-receipt/fhir";

/**
 * Pure diff over two "Same State" receipts. Renders the panel that is
 * the whole point of the demo — identical clinical state, different
 * model, verifiably different receipts.
 */

export interface CommitmentPair {
  label: string;
  reference: string;
  digestA: string;
  digestB: string;
  equal: boolean;
}

export interface SameStateDiff {
  input: {
    equal: boolean;
    entries: CommitmentPair[];
  };
  model: {
    equal: boolean;
    modelA: string | null;
    modelB: string | null;
  };
  output: {
    equal: boolean;
    outputA: string | null;
    outputB: string | null;
  };
  write: {
    equal: boolean;
    referenceA: string | null;
    referenceB: string | null;
  };
  root: {
    equal: boolean;
    digestA: string;
    digestB: string;
  };
}

function truncate(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 12)}…${hash.slice(-4)}` : hash;
}

function refFor(resource: {
  type: string;
  id?: string;
  versionId?: string;
}): string {
  const id = resource.id ?? "?";
  const version = resource.versionId;
  return version === undefined
    ? `${resource.type}/${id}`
    : `${resource.type}/${id}/_history/${version}`;
}

function findModelEvent(receipt: ClinicalReceipt, type: "model.requested" | "model.responded"): unknown {
  const event = receipt.events.find((e) => e.type === type);
  if (event === undefined) return null;
  if (event.payload.mode !== "embedded") return null;
  return event.payload.value;
}

export function diffReceipts(a: ClinicalReceipt, b: ClinicalReceipt): SameStateDiff {
  const traceA = inspectFHIR(a);
  const traceB = inspectFHIR(b);

  // Input state — walk the FHIR reads + searches in order and pair
  // them positionally. Both receipts must have committed the same
  // number of pre-model events for this to be meaningful.
  const inputPairs: CommitmentPair[] = [];
  const readsA = traceA.reads;
  const readsB = traceB.reads;
  for (let i = 0; i < Math.min(readsA.length, readsB.length); i += 1) {
    const rA = readsA[i]!;
    const rB = readsB[i]!;
    // Read commitments are on the receipt's inner event, not on the
    // trace projection — pull them via event id.
    const eA = a.events.find((e) => e.id === rA.eventId);
    const eB = b.events.find((e) => e.id === rB.eventId);
    const digestA =
      eA?.payload.mode === "embedded"
        ? (eA.payload.value as { commitment?: { digest?: string } }).commitment
            ?.digest ?? "?"
        : "?";
    const digestB =
      eB?.payload.mode === "embedded"
        ? (eB.payload.value as { commitment?: { digest?: string } }).commitment
            ?.digest ?? "?"
        : "?";
    inputPairs.push({
      label: rA.operation === "vread" ? "versioned read" : "read",
      reference: refFor(rA.resource),
      digestA: truncate(digestA),
      digestB: truncate(digestB),
      equal: digestA === digestB,
    });
  }
  for (let i = 0; i < Math.min(traceA.searches.length, traceB.searches.length); i += 1) {
    const sA = traceA.searches[i]!;
    const sB = traceB.searches[i]!;
    const eA = a.events.find((e) => e.id === sA.eventId);
    const eB = b.events.find((e) => e.id === sB.eventId);
    const digestA =
      eA?.payload.mode === "embedded"
        ? (eA.payload.value as { bundle?: { commitment?: { digest?: string } } })
            .bundle?.commitment?.digest ?? "?"
        : "?";
    const digestB =
      eB?.payload.mode === "embedded"
        ? (eB.payload.value as { bundle?: { commitment?: { digest?: string } } })
            .bundle?.commitment?.digest ?? "?"
        : "?";
    inputPairs.push({
      label: "search",
      reference: `${sA.resourceType} (${sA.resources.length} resources)`,
      digestA: truncate(digestA),
      digestB: truncate(digestB),
      equal: digestA === digestB,
    });
  }

  // Model
  const modelReqA = findModelEvent(a, "model.requested") as {
    model?: string;
  } | null;
  const modelReqB = findModelEvent(b, "model.requested") as {
    model?: string;
  } | null;
  const modelA = modelReqA?.model ?? null;
  const modelB = modelReqB?.model ?? null;

  // Output
  const modelResA = findModelEvent(a, "model.responded") as {
    content?: string;
  } | null;
  const modelResB = findModelEvent(b, "model.responded") as {
    content?: string;
  } | null;
  const outputA = modelResA?.content ?? null;
  const outputB = modelResB?.content ?? null;

  // Write
  const writeRefA = traceA.writes[0]?.persisted
    ? refFor(traceA.writes[0].persisted)
    : null;
  const writeRefB = traceB.writes[0]?.persisted
    ? refFor(traceB.writes[0].persisted)
    : null;

  // Root
  const rootA = a.commitments.root.digest;
  const rootB = b.commitments.root.digest;

  return {
    input: {
      equal: inputPairs.length > 0 && inputPairs.every((p) => p.equal),
      entries: inputPairs,
    },
    model: {
      equal: modelA === modelB && modelA !== null,
      modelA,
      modelB,
    },
    output: {
      equal: outputA === outputB && outputA !== null,
      outputA,
      outputB,
    },
    write: {
      equal: writeRefA === writeRefB && writeRefA !== null,
      referenceA: writeRefA,
      referenceB: writeRefB,
    },
    root: {
      equal: rootA === rootB,
      digestA: truncate(rootA),
      digestB: truncate(rootB),
    },
  };
}
