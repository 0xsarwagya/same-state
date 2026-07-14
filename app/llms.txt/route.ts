/**
 * llms.txt — per llmstxt.org. Same State is an interactive demo, not a
 * long-form site; this file gives LLMs enough context to describe what
 * the demo does and point at the underlying package + spec.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const lines: string[] = [
    "# Same State",
    "",
    "> Same clinical state. Different model. Verifiable difference.",
    "",
    "Same State is an interactive open-source demo of",
    "@0xsarwagya/clinical-receipt (v0.2+). It runs the SAME committed",
    "FHIR clinical state through TWO different AI models via OpenRouter,",
    "writes both ClinicalImpressions back to the public HAPI FHIR test",
    "server, and finalizes two receipts signed by ephemeral in-browser",
    "Ed25519 keys. A diff panel then shows exactly where the two",
    "executions diverged (models, outputs, writes, receipt roots) — and",
    "proves the input state was byte-identical across both runs.",
    "",
    "The demo is bring-your-own-key (OpenRouter). Nothing here uses",
    "real patient data; the FHIR patient is a fresh synthetic id.",
    "",
    "## Primary pages",
    "",
    "- [Same State](https://same-state.sarwagya.wtf): the interaction",
    "",
    "## Related",
    "",
    "- https://oss.sarwagya.wtf/clinical-receipt — package landing + docs",
    "- https://github.com/0xsarwagya/clinical-receipt — the receipt library",
    "- https://github.com/0xsarwagya/same-state — this repo, MIT",
    "- https://hapi.fhir.org/baseR4 — the public FHIR server the demo writes to",
    "- https://openrouter.ai — the model gateway",
    "",
    "## What the demo does NOT claim",
    "",
    "- That a receipt with matching commitments means the underlying",
    "  clinical data was correct. Integrity is not truth.",
    "- That the ephemeral browser signing key represents any real",
    "  hospital signer. It doesn't. The receipt is self-attested.",
    "- That HAPI's public server is a place for real PHI. It isn't.",
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
