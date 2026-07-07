"use client";

import type { ClinicalReceipt } from "@0xsarwagya/clinical-receipt";
import { useMemo, useState } from "react";

import { KeyInput } from "@/components/key-input";
import { ModelPicker } from "@/components/model-picker";
import { PatientPicker } from "@/components/patient-picker";
import { ReceiptDiffPanel } from "@/components/receipt-diff-panel";
import { ReceiptViewer } from "@/components/receipt-viewer";
import { DEFAULT_MODEL_A, DEFAULT_MODEL_B } from "@/lib/constants";
import { diffReceipts } from "@/lib/diff";
import { runSameState, type StepEvent } from "@/lib/same-state";

interface RunResult {
  receiptA: ClinicalReceipt;
  receiptB: ClinicalReceipt;
}

export function SameStateApp() {
  const [patientId, setPatientId] = useState("");
  const [modelA, setModelA] = useState(DEFAULT_MODEL_A);
  const [modelB, setModelB] = useState(DEFAULT_MODEL_B);
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [status, setStatus] = useState<StepEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const diff = useMemo(
    () => (result === null ? null : diffReceipts(result.receiptA, result.receiptB)),
    [result],
  );

  const ready =
    patientId.length > 0 &&
    modelA.length > 0 &&
    modelB.length > 0 &&
    openRouterKey.length > 0 &&
    !running;

  const start = async () => {
    setError(null);
    setResult(null);
    setStatus([]);
    setRunning(true);
    try {
      const output = await runSameState({
        patientId,
        modelA,
        modelB,
        openRouterKey,
        onStep: (event) =>
          setStatus((prev) => [...prev, event].slice(-40)),
      });
      setResult({ receiptA: output.receiptA, receiptB: output.receiptB });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6 rounded border border-ink/10 p-5">
          <PatientPicker value={patientId} onChange={setPatientId} />
          <KeyInput value={openRouterKey} onChange={setOpenRouterKey} />
        </div>
        <div className="flex flex-col gap-6 rounded border border-ink/10 p-5">
          <ModelPicker
            label="Model A"
            value={modelA}
            onChange={setModelA}
            openRouterKey={openRouterKey}
          />
          <ModelPicker
            label="Model B"
            value={modelB}
            onChange={setModelB}
            openRouterKey={openRouterKey}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <button
            type="button"
            onClick={start}
            disabled={!ready}
            className="rounded border border-ink px-6 py-3 font-mono text-sm uppercase tracking-widest text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-ink/30 disabled:text-ink/40 disabled:hover:bg-transparent disabled:hover:text-ink/40"
          >
            {running ? "running…" : "Run Same-State"}
          </button>
          {modelA === modelB && modelA.length > 0 ? (
            <span className="label text-rust">both slots pick the same model</span>
          ) : null}
        </div>
        <p className="text-xs text-ink/60">
          Runs the same committed FHIR clinical state through both models,
          writes both ClinicalImpressions to HAPI, and finalizes two
          receipts signed by ephemeral in-browser Ed25519 keys.
        </p>
      </section>

      {status.length > 0 ? (
        <section className="flex flex-col gap-2 rounded border border-ink/10 p-4">
          <span className="label">status</span>
          <ol className="flex flex-col gap-1 font-mono text-xs">
            {status.map((step, index) => (
              <li key={index} className="grid grid-cols-[4ch_1fr] items-baseline gap-2">
                <span className="text-ink/50">{step.label}</span>
                <span>{step.message}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {error !== null ? (
        <section className="rounded border border-rust/50 bg-rust/5 p-4 text-sm text-rust">
          {error}
        </section>
      ) : null}

      {result !== null && diff !== null ? (
        <>
          <ReceiptDiffPanel diff={diff} />
          <section className="grid gap-4 md:grid-cols-2">
            <ReceiptViewer label="A" receipt={result.receiptA} />
            <ReceiptViewer label="B" receipt={result.receiptB} />
          </section>
        </>
      ) : null}
    </div>
  );
}
