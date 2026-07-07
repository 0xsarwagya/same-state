/** The FHIR server this demo targets. Recorded verbatim into every receipt. */
export const HAPI_BASE_URL = "https://hapi.fhir.org/baseR4";
export const HAPI_SERVER = {
  id: "hapi-r4-public",
  baseUrl: HAPI_BASE_URL,
} as const;

/** Same-origin proxy path used by the browser. */
export const FHIR_PROXY_PATH = "/api/fhir";

/** Curated default models for the two panels. */
export const DEFAULT_MODEL_A = "anthropic/claude-3.5-sonnet";
export const DEFAULT_MODEL_B = "openai/gpt-4o";

/** How much text we ask the model to produce. Keeps demo cost low. */
export const MAX_OUTPUT_TOKENS = 400;
