import { NextResponse } from "next/server";

/**
 * OpenRouter chat-completions proxy — forwards the browser's
 * user-provided key to https://openrouter.ai/api/v1/chat/completions.
 * The key rides in a request header (X-OpenRouter-Key) and is
 * never persisted or logged server-side; the proxy forwards it and
 * discards the reference immediately.
 *
 * Falls back to OPENROUTER_API_KEY_FALLBACK if configured — a
 * deployment can offer a "just try it" mode by attaching a key.
 * Without a fallback and without a client key, the request fails
 * fast with a 401 pointing at https://openrouter.ai/settings/keys.
 */

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

function clientKey(request: Request): string | null {
  const header = request.headers.get("x-openrouter-key");
  if (header !== null && header.length > 0) return header;
  return process.env.OPENROUTER_API_KEY_FALLBACK ?? null;
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-openrouter-key",
    "access-control-max-age": "600",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  const key = clientKey(request);
  if (key === null) {
    return NextResponse.json(
      {
        error: {
          code: "no-openrouter-key",
          message:
            "No OpenRouter key supplied. Paste one at https://openrouter.ai/settings/keys and send it via X-OpenRouter-Key.",
        },
      },
      { status: 401, headers: corsHeaders() },
    );
  }

  const body = await request.arrayBuffer();
  let upstream: Response;
  try {
    upstream = await fetch(OPENROUTER, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        // Ranking / attribution headers. Both optional per OpenRouter's
        // docs; harmless to include.
        "http-referer": "https://same-state.sarwagya.wtf",
        "x-title": "Same State",
      },
      body,
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "openrouter-transport-failed",
          message:
            error instanceof Error ? error.name : "openrouter request failed",
        },
      },
      { status: 502, headers: corsHeaders() },
    );
  }

  const responseHeaders = new Headers(corsHeaders());
  const contentType = upstream.headers.get("content-type");
  if (contentType !== null) responseHeaders.set("content-type", contentType);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
