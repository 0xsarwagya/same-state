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
  synthetic: boolean;
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

/**
 * Minimal FHIR R4 Patient — HAPI accepts this and assigns an id. The
 * name carries a timestamp so multiple demo sessions produce distinct
 * synthetic patients without collision.
 */
function makeSyntheticPayload(): {
  resourceType: string;
  name: Array<{ family: string; given: string[] }>;
  gender: string;
} {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  return {
    resourceType: "Patient",
    name: [{ family: "Same-State", given: [`Synthetic-${stamp}`] }],
    gender: "unknown",
  };
}

async function createSyntheticPatient(): Promise<PatientEntry | null> {
  try {
    const response = await fhirRequest<{
      id?: string;
      resourceType?: string;
      name?: unknown;
      meta?: { versionId?: string };
    }>("/Patient", { method: "POST", body: makeSyntheticPayload() });
    const body = response.body ?? {};
    if (body.resourceType !== "Patient" || typeof body.id !== "string") {
      return null;
    }
    return {
      id: body.id,
      display: displayFor(body),
      versionId: body.meta?.versionId ?? null,
      synthetic: true,
    };
  } catch {
    return null;
  }
}

export function PatientPicker({ value, onChange }: PatientPickerProps) {
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Create a fresh synthetic patient on HAPI. This is the ONE
        //    patient we know isn't compartment-locked, so the demo's
        //    ClinicalImpression writes succeed for both runs.
        setCreating(true);
        const synthetic = await createSyntheticPatient();
        if (cancelled) return;
        setCreating(false);

        // 2. Also fetch HAPI's existing patients so a caller can play
        //    with the compartment-lock error path if they want. Most
        //    of these on the public server ARE locked.
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
        const existing: PatientEntry[] = [];
        for (const entry of bundle.entry ?? []) {
          const resource = entry?.resource;
          if (resource === undefined || resource.id === undefined) continue;
          existing.push({
            id: resource.id,
            display: displayFor(resource),
            versionId: resource.meta?.versionId ?? null,
            synthetic: false,
          });
        }
        const next =
          synthetic !== null ? [synthetic, ...existing] : existing;
        setEntries(next);
        if (value.length === 0 && next.length > 0) {
          const first = next[0]!;
          onChange(first.id);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "could not load patients");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCreating(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [onChange, value.length]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    const synthetic = await createSyntheticPatient();
    setCreating(false);
    if (synthetic === null) {
      setError("HAPI refused the synthetic patient create — try again");
      return;
    }
    setEntries((prev) => [synthetic, ...prev.filter((p) => p.id !== synthetic.id)]);
    onChange(synthetic.id);
  };

  const selected = entries.find((entry) => entry.id === value);
  const selectedLocked = selected !== undefined && !selected.synthetic;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="label">Patient (synthetic — HAPI is public)</span>
        <div className="flex items-center gap-3">
          {loading || creating ? (
            <span className="label">
              {creating ? "creating synthetic…" : "loading…"}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="label cursor-pointer text-rust underline decoration-dotted underline-offset-2 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            new synthetic
          </button>
        </div>
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-ink/20 bg-transparent px-3 py-2 font-mono text-sm text-ink focus:border-rust focus:outline-none"
      >
        {value.length === 0 ? <option value="">select a patient…</option> : null}
        {entries.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.synthetic ? "◆ " : ""}
            {entry.display} · Patient/{entry.id}
            {entry.versionId !== null ? `/_history/${entry.versionId}` : ""}
            {entry.synthetic ? " (just created)" : ""}
          </option>
        ))}
      </select>
      {selectedLocked ? (
        <p className="text-xs italic text-stone">
          HAPI often compartment-locks public patients — writes may be
          rejected with{" "}
          <code className="font-mono text-[11px]">HAPI-1769</code>. Use
          the fresh synthetic (◆) for a run that will succeed.
        </p>
      ) : null}
      {error !== null ? (
        <p className="text-xs text-rust">{error}</p>
      ) : null}
    </div>
  );
}
