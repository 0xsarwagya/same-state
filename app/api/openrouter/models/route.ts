import { NextResponse } from "next/server";

/**
 * OpenRouter model-catalog proxy — forwards to
 * https://openrouter.ai/api/v1/models. The models endpoint returns
 * a public list even without a key, but we still forward whatever
 * the caller provided so per-user access controls are respected.
 */

const OPENROUTER = "https://openrouter.ai/api/v1/models";

function clientKey(request: Request): string | null {
  const header = request.headers.get("x-openrouter-key");
  if (header !== null && header.length > 0) return header;
  return process.env.OPENROUTER_API_KEY_FALLBACK ?? null;
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type, x-openrouter-key",
    "access-control-max-age": "600",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  const key = clientKey(request);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "http-referer": "https://same-state.sarwagya.wtf",
    "x-title": "Same State",
  };
  if (key !== null) headers.authorization = `Bearer ${key}`;

  let upstream: Response;
  try {
    upstream = await fetch(OPENROUTER, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "openrouter-transport-failed",
          message:
            error instanceof Error ? error.name : "openrouter models fetch failed",
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
