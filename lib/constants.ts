/** The FHIR server this demo targets. Recorded verbatim into every receipt. */
export const HAPI_BASE_URL = "https://hapi.fhir.org/baseR4";
export const HAPI_SERVER = {
  id: "hapi-r4-public",
  baseUrl: HAPI_BASE_URL,
} as const;

/** Same-origin proxy path used by the browser. */
export const FHIR_PROXY_PATH = "/api/fhir";

/**
 * Curated default model pair — deliberately CONTRASTING for the
 * "same state, different output" demo. Different providers, visibly
 * different reasoning + prose behavior at the frontier as of July 2026.
 *
 * If a slug is retired or renamed, the picker still works: any model
 * from `/api/openrouter/models` is selectable.
 */
export const DEFAULT_MODEL_A = "anthropic/claude-opus-4.8";
export const DEFAULT_MODEL_B = "x-ai/grok-4.3";

/** How much text we ask the model to produce. Keeps demo cost low. */
export const MAX_OUTPUT_TOKENS = 400;
