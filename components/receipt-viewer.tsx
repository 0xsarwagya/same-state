"use client";

import type { ClinicalReceipt } from "@0xsarwagya/clinical-receipt";
import { useState } from "react";

interface ReceiptViewerProps {
  label: string;
  receipt: ClinicalReceipt;
}

export function ReceiptViewer({ label, receipt }: ReceiptViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const download = () => {
    const blob = new Blob([JSON.stringify(receipt, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${label}-${receipt.receipt.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-3 rounded border border-ink/10 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">receipt {label}</span>
        <div className="flex items-baseline gap-3">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="label transition-colors hover:text-rust"
          >
            {expanded ? "hide" : "show json"}
          </button>
          <button
            type="button"
            onClick={download}
            className="label transition-colors hover:text-rust"
          >
            download
          </button>
        </div>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-mono text-xs text-ink/80">
        <dt className="text-ink/50">id</dt>
        <dd>{receipt.receipt.id}</dd>
        <dt className="text-ink/50">events</dt>
        <dd>{receipt.events.length}</dd>
        <dt className="text-ink/50">root</dt>
        <dd className="truncate">{receipt.commitments.root.digest}</dd>
        <dt className="text-ink/50">signatures</dt>
        <dd>{receipt.signatures.length}</dd>
      </dl>
      {expanded ? (
        <pre className="max-h-96 overflow-auto rounded bg-ink/5 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(receipt, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
