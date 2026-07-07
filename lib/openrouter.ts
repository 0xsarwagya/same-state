/**
 * Browser-side helper for the same-origin OpenRouter proxy. Every call
 * forwards the user's key via X-OpenRouter-Key — the key is held only
 * in React state during the session; nothing persists it.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

/**
 * A model is "free" when OpenRouter reports zero prompt AND zero
 * completion cost. Almost every free model on OpenRouter carries a
 * `:free` suffix on its slug, but the pricing rule is authoritative —
 * a couple of preview slugs (e.g. some Google Lyria variants) match
 * without the suffix.
 *
 * Free-tier models are subject to shared per-minute / per-day request
 * caps at OpenRouter and can 429 or 503 without warning; surface that
 * caveat in the UI wherever a `:free` slug is used.
 */
export function isFreeModel(model: OpenRouterModel): boolean {
  return model.pricing?.prompt === "0" && model.pricing?.completion === "0";
}

function keyHeader(key: string | null): Record<string, string> {
  return key === null || key.length === 0 ? {} : { "x-openrouter-key": key };
}

export async function listModels(key: string | null): Promise<OpenRouterModel[]> {
  const response = await fetch("/api/openrouter/models", {
    method: "GET",
    headers: keyHeader(key),
  });
  if (!response.ok) {
    throw new Error(`failed to list models (status ${response.status})`);
  }
  const body = (await response.json()) as { data?: OpenRouterModel[] };
  return body.data ?? [];
}

export async function chatCompletion(
  key: string | null,
  request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const response = await fetch("/api/openrouter/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...keyHeader(key),
    },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as
    | ChatCompletionResponse
    | { error?: { code?: string; message?: string } };
  if (!response.ok || "error" in body) {
    const err = "error" in body ? body.error : undefined;
    const message = err?.message ?? `OpenRouter error (status ${response.status})`;
    throw new Error(message);
  }
  return body as ChatCompletionResponse;
}
