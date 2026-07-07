"use client";

import { useEffect, useState } from "react";

import { listModels, type OpenRouterModel } from "@/lib/openrouter";

interface ModelPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  openRouterKey: string;
}

export function ModelPicker({
  label,
  value,
  onChange,
  openRouterKey,
}: ModelPickerProps) {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await listModels(
          openRouterKey.length > 0 ? openRouterKey : null,
        );
        if (cancelled) return;
        setModels([...next].sort((a, b) => a.id.localeCompare(b.id)));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "could not load models");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // Re-run only when the key changes to a non-empty string; the
    // models endpoint returns broadly the same list either way, but a
    // key can unlock provider-specific models.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRouterKey.length > 0]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        {loading ? <span className="label">loading…</span> : null}
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-ink/20 bg-transparent px-3 py-2 font-mono text-sm text-ink focus:border-rust focus:outline-none"
      >
        {/* If the current value isn't in the fetched list, still show it. */}
        {!models.some((model) => model.id === value) && value.length > 0 ? (
          <option value={value}>{value}</option>
        ) : null}
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.id}
          </option>
        ))}
      </select>
      {error !== null ? (
        <p className="text-xs text-rust">{error}</p>
      ) : null}
    </div>
  );
}
