"use client";

import { useState } from "react";

interface KeyInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function KeyInput({ value, onChange }: KeyInputProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="label">Your OpenRouter key</span>
        <a
          href="https://openrouter.ai/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="label transition-colors hover:text-rust"
        >
          get one →
        </a>
      </div>
      <div className="flex items-stretch gap-2">
        <input
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="sk-or-…"
          autoComplete="off"
          className="flex-1 rounded border border-ink/20 bg-transparent px-3 py-2 font-mono text-sm text-ink placeholder:text-ink/40 focus:border-rust focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setRevealed((prev) => !prev)}
          className="label rounded border border-ink/20 px-3 transition-colors hover:border-rust hover:text-rust"
        >
          {revealed ? "hide" : "show"}
        </button>
      </div>
      <p className="text-xs text-ink/60">
        Held in this tab&apos;s memory only. Sent through{" "}
        <code className="font-mono">/api/openrouter/*</code> to OpenRouter and
        never persisted server-side.
      </p>
    </div>
  );
}
