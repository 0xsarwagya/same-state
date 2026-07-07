"use client";

import type { SameStateDiff } from "@/lib/diff";

function Verdict({ equal, positiveLabel, differentLabel }: {
  equal: boolean;
  positiveLabel: string;
  differentLabel: string;
}) {
  return (
    <span
      className={`label ${equal ? "text-ink/70" : "text-rust"}`}
    >
      {equal ? `✓ ${positiveLabel}` : `✗ ${differentLabel}`}
    </span>
  );
}

interface ReceiptDiffPanelProps {
  diff: SameStateDiff;
}

export function ReceiptDiffPanel({ diff }: ReceiptDiffPanelProps) {
  return (
    <section
      aria-label="Same state diff"
      className="flex flex-col divide-y divide-ink/10 rounded border border-ink/10"
    >
      <div className="flex items-baseline justify-between p-4">
        <h2
          className="font-serif italic text-ink"
          style={{ fontSize: "clamp(22px, 2vw, 28px)" }}
        >
          Where the two runs diverged
        </h2>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <span className="label">Input state</span>
          <Verdict
            equal={diff.input.equal}
            positiveLabel="identical commitments"
            differentLabel="commitments differ"
          />
        </div>
        <ul className="flex flex-col gap-1 font-mono text-xs">
          {diff.input.entries.map((entry, index) => (
            <li key={`${entry.reference}-${index}`} className="grid grid-cols-[1fr_auto] items-baseline gap-4">
              <span className="text-ink/70">
                {entry.label} · {entry.reference}
              </span>
              <span className={entry.equal ? "text-ink/60" : "text-rust"}>
                {entry.equal
                  ? `${entry.digestA} == ${entry.digestB}`
                  : `${entry.digestA} != ${entry.digestB}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <span className="label">Model</span>
          <Verdict
            equal={diff.model.equal}
            positiveLabel="same model"
            differentLabel="different"
          />
        </div>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-mono text-xs">
          <dt className="text-ink/50">A</dt>
          <dd>{diff.model.modelA ?? "—"}</dd>
          <dt className="text-ink/50">B</dt>
          <dd>{diff.model.modelB ?? "—"}</dd>
        </dl>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <span className="label">Output</span>
          <Verdict
            equal={diff.output.equal}
            positiveLabel="identical"
            differentLabel="different"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <pre className="max-h-64 overflow-auto rounded bg-ink/5 p-3 font-mono text-[11px] leading-relaxed">
            {diff.output.outputA ?? "—"}
          </pre>
          <pre className="max-h-64 overflow-auto rounded bg-ink/5 p-3 font-mono text-[11px] leading-relaxed">
            {diff.output.outputB ?? "—"}
          </pre>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <span className="label">FHIR write</span>
          <Verdict
            equal={diff.write.equal}
            positiveLabel="same target"
            differentLabel="different"
          />
        </div>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-mono text-xs">
          <dt className="text-ink/50">A</dt>
          <dd>{diff.write.referenceA ?? "—"}</dd>
          <dt className="text-ink/50">B</dt>
          <dd>{diff.write.referenceB ?? "—"}</dd>
        </dl>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <span className="label">Receipt root</span>
          <Verdict
            equal={diff.root.equal}
            positiveLabel="same digest"
            differentLabel="different"
          />
        </div>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-mono text-xs">
          <dt className="text-ink/50">A</dt>
          <dd className="truncate">{diff.root.digestA}</dd>
          <dt className="text-ink/50">B</dt>
          <dd className="truncate">{diff.root.digestB}</dd>
        </dl>
      </div>
    </section>
  );
}
