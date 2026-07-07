"use client";

import { useEffect, useState } from "react";

import { fhirRequest } from "@/lib/fhir-proxy";

interface PatientPickerProps {
  value: string;
  onChange: (id: string) => void;
}

interface PatientEntry {
  id: string;
  display: string;
  versionId: string | null;
}

function displayFor(resource: unknown): string {
  const patient = resource as {
    id?: string;
    name?: Array<{ family?: string; given?: string[] }>;
    gender?: string;
    birthDate?: string;
  };
  const name = patient.name?.[0];
  const family = name?.family;
  const given = name?.given?.[0];
  if (family !== undefined || given !== undefined) {
    return [given, family].filter(Boolean).join(" ");
  }
  return `Patient/${patient.id ?? "?"}`;
}

export function PatientPicker({ value, onChange }: PatientPickerProps) {
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fhirRequest<{
          entry?: Array<{
            resource?: {
              id?: string;
              name?: unknown;
              meta?: { versionId?: string };
            };
          }>;
        }>("/Patient", { query: { _count: 10 } });
        if (cancelled) return;
        const bundle = response.body ?? {};
        const next: PatientEntry[] = [];
        for (const entry of bundle.entry ?? []) {
          const resource = entry?.resource;
          if (resource === undefined || resource.id === undefined) continue;
          next.push({
            id: resource.id,
            display: displayFor(resource),
            versionId: resource.meta?.versionId ?? null,
          });
        }
        setEntries(next);
        if (value.length === 0 && next.length > 0) {
          const first =
            next.find((entry) => !entry.display.startsWith("Patient/")) ??
            next[0]!;
          onChange(first.id);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "could not load patients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [onChange, value.length]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="label">Patient (synthetic — HAPI is public)</span>
        {loading ? <span className="label">loading…</span> : null}
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-ink/20 bg-transparent px-3 py-2 font-mono text-sm text-ink focus:border-rust focus:outline-none"
      >
        {value.length === 0 ? <option value="">select a patient…</option> : null}
        {entries.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.display} · Patient/{entry.id}
            {entry.versionId !== null ? `/_history/${entry.versionId}` : ""}
          </option>
        ))}
      </select>
      {error !== null ? (
        <p className="text-xs text-rust">{error}</p>
      ) : null}
    </div>
  );
}
