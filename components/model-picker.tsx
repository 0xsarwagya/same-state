"use client";

import { useEffect, useMemo, useState } from "react";

import {
  isFreeModel,
  listModels,
  type OpenRouterModel,
} from "@/lib/openrouter";

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
  const [freeOnly, setFreeOnly] = useState(false);

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

  const visibleModels = useMemo(
    () => (freeOnly ? models.filter(isFreeModel) : models),
    [models, freeOnly],
  );

  const selectedIsFree = useMemo(() => {
    const match = models.find((model) => model.id === value);
    return match !== undefined && isFreeModel(match);
  }, [models, value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="label">{label}</span>
        <div className="flex items-center gap-3">
          {loading ? <span className="label">loading…</span> : null}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink/70">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(event) => setFreeOnly(event.target.checked)}
              className="h-3 w-3 accent-rust"
            />
            <span className="label">Free only</span>
          </label>
        </div>
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-ink/20 bg-transparent px-3 py-2 font-mono text-sm text-ink focus:border-rust focus:outline-none"
      >
        {/* If the current value isn't in the visible list, still show it — a
            user's chosen model must never disappear behind a filter. */}
        {!visibleModels.some((model) => model.id === value) &&
        value.length > 0 ? (
          <option value={value}>{value}</option>
        ) : null}
        {visibleModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.id}
          </option>
        ))}
      </select>
      {error !== null ? <p className="text-xs text-rust">{error}</p> : null}
      {selectedIsFree ? (
        <p className="text-xs italic text-stone">
          Free tier — rate-limited by OpenRouter and can 429 or 503 without
          warning.
        </p>
      ) : null}
      {freeOnly && !loading && visibleModels.length === 0 ? (
        <p className="text-xs italic text-stone">
          No free models returned. OpenRouter&apos;s free pool changes; try
          again without the filter.
        </p>
      ) : null}
    </div>
  );
}
