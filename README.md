# Same State

> Same clinical state. Different model. Verifiable difference.

A tiny open-source demo of [`@0xsarwagya/clinical-receipt`](https://github.com/0xsarwagya/clinical-receipt).
It runs the *exact same* committed FHIR clinical state through *two*
different models via OpenRouter, writes both results back to FHIR, and
shows a diff of the two resulting receipts.

**Not for real PHI.** The demo runs against
[the public HAPI FHIR test server](https://hapi.fhir.org/baseR4). Use
synthetic patients only.

## The idea

`clinical-receipt` records a workflow — inputs, evidence, prompts,
models, tools, guardrails, human decisions, outputs — as a hash-linked
event DAG committed to one Merkle root. Two runs from identical
committed inputs must produce identical input-side commitments; if
their outputs diverge, that divergence is now cryptographically
provable.

```
                 COMMITTED CLINICAL STATE
                            │
              ┌─────────────┴─────────────┐
              ↓                           ↓
         Model A                     Model B
              ↓                           ↓
   ClinicalImpression A         ClinicalImpression B
              ↓                           ↓
         Receipt A                   Receipt B
```

The diff panel walks both receipts and tells you exactly which axes
match and which differ:

```
INPUT STATE
  ✓ identical commitments

MODEL
  ✗ different

OUTPUT
  ✗ different

FHIR WRITE
  ✗ different

RECEIPT ROOT
  ✗ different
```

## Live demo

[same-state.sarwagya.wtf](https://same-state.sarwagya.wtf)

Bring your own [OpenRouter API key](https://openrouter.ai/settings/keys).
The key is held only in your browser tab's memory and passed through
the same-origin `/api/openrouter/*` proxy — it is never persisted
server-side.

## What ships in this repo

- **Next.js 16 App Router** frontend and API routes (`app/`).
- **FHIR proxy** (`app/api/fhir/[...path]/route.ts`) that forwards
  browser requests to HAPI with `Prefer: return=representation`,
  filters response headers to a small allowlist, and never forwards
  authorization headers.
- **OpenRouter proxy** (`app/api/openrouter/*`) that forwards the
  caller's key without storing it, plus the OpenRouter model catalog.
- **Same-State orchestrator** (`lib/same-state.ts`) that fetches the
  clinical state once, then feeds identical bytes into two independent
  runs via `clinical-receipt`'s Level-3 explicit
  `fhirExtension(...).operation(...).commitResponse(...)` API. Each run
  is signed by a fresh, ephemeral in-browser Ed25519 key.
- **Diff logic** (`lib/diff.ts`) that projects two receipts through
  `inspectFHIR` and reports where they align vs where they diverge.

## Running locally

```
pnpm install
pnpm dev
```

Open `http://localhost:3000`, paste an OpenRouter key, pick a patient
from HAPI, pick two models, and hit **Run Same-State**.

Requires Node ≥ 20.

## Deploying your own

1. Fork this repo.
2. Create a Vercel project pointing at your fork.
3. No environment variables are required — the app is bring-your-own-key.
   Optionally set `HAPI_BASE_URL` to point at a private FHIR test server,
   or `OPENROUTER_API_KEY_FALLBACK` if you want to attach a fallback key
   (which will be billed for every request against your instance).
4. Point a domain at the Vercel deployment.

The `.github/workflows/deploy.yml` workflow expects a `VERCEL_TOKEN`
secret.

## How the receipts stay honest

- The clinical state is fetched **once**. Both runs then commit the
  **same bytes** via Level-3 explicit — so the input-state diff is
  guaranteed to show identical commitments unless something in the
  code, canonicalization, or hashing has drifted.
- The two AI calls hit the same OpenRouter proxy with the same
  configuration except for `model`. Their `model.requested` and
  `model.responded` core events are the only planned difference.
- Each receipt is finalized with an ephemeral in-browser Ed25519 key
  that never leaves the tab. Verifiers see it as `self-attested` — the
  right posture for a demo, not for real clinical signing.

## What the demo does NOT prove

- That either model output is medically correct.
- That HAPI's `meta.versionId` is truthful about its history.
- That the workflow saw every relevant FHIR resource — only what came
  through the instrumentation boundary.
- Identity of the signer — an ephemeral browser key proves possession,
  not who owns it.

Integrity is not truth. A signature is not identity. A Merkle tree is
not a medical device. See the [`clinical-receipt`
security model](https://oss.sarwagya.wtf/clinical-receipt/docs/security).

## License

MIT. See [LICENSE](./LICENSE).

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).
