import { NextResponse } from "next/server";

/**
 * HAPI FHIR proxy — forwards `/api/fhir/*` to the public HAPI R4 server.
 *
 * The public HAPI test server does not commit to CORS from arbitrary
 * origins, so calling it directly from a browser is fragile. This route
 * proxies through the same origin as the app, filters response headers
 * down to a documented allowlist, and never forwards any Authorization
 * or Cookie headers upstream.
 *
 * This proxy is agnostic to what clinical-receipt commits — the receipt
 * still records `server.id: "hapi-r4-public"` and `baseUrl:
 * "https://hapi.fhir.org/baseR4"` regardless of the URL the browser
 * physically hit.
 */

const DEFAULT_HAPI_BASE = "https://hapi.fhir.org/baseR4";

// Response headers we permit back to the browser. Anything else is
// stripped; in particular we never leak Set-Cookie or custom HAPI
// server identity headers.
const RESPONSE_HEADER_ALLOWLIST = new Set([
  "content-type",
  "content-location",
  "location",
  "etag",
  "last-modified",
]);

// Request headers we strip before forwarding to HAPI — defense in
// depth even though the client should not be sending any of these.
const REQUEST_HEADER_BLOCKLIST = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
]);

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

function hapiBase(): string {
  return process.env.HAPI_BASE_URL?.replace(/\/+$/, "") ?? DEFAULT_HAPI_BASE;
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, prefer",
    "access-control-max-age": "600",
  };
}

async function forward(request: Request, path: string[]): Promise<Response> {
  const method = request.method.toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json(
      { error: `method ${method} not allowed` },
      { status: 405, headers: corsHeaders() },
    );
  }
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const query = url.search;
  const target = `${hapiBase()}/${path.join("/")}${query}`;

  const headers = new Headers();
  request.headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (REQUEST_HEADER_BLOCKLIST.has(lower)) return;
    // Skip hop-by-hop and host-specific headers that would confuse the
    // upstream server.
    if (lower === "host" || lower === "connection" || lower === "content-length") return;
    headers.set(name, value);
  });
  // FHIR write responses only carry the persisted resource when we ask
  // for it explicitly. Setting Prefer here is a no-op for reads.
  if (method !== "GET") {
    headers.set("prefer", headers.get("prefer") ?? "return=representation");
    // HAPI accepts both application/json and application/fhir+json;
    // default to FHIR's canonical media type when the caller did not.
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/fhir+json");
    }
  }

  const body =
    method === "GET" || method === "HEAD" || method === "OPTIONS"
      ? null
      : await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      ...(body !== null ? { body } : {}),
      // HAPI can be slow; give it 30 seconds before we abandon the
      // request. Anything longer is a UX problem, not a proxy problem.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    return NextResponse.json(
      {
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "transient",
            diagnostics:
              error instanceof Error ? error.name : "hapi request failed",
          },
        ],
      },
      { status: 502, headers: corsHeaders() },
    );
  }

  const responseHeaders = new Headers(corsHeaders());
  upstream.headers.forEach((value, name) => {
    if (RESPONSE_HEADER_ALLOWLIST.has(name.toLowerCase())) {
      responseHeaders.set(name, value);
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

async function extractPath(context: RouteContext): Promise<string[]> {
  const params = await context.params;
  return params.path ?? [];
}

export async function GET(request: Request, context: RouteContext) {
  return forward(request, await extractPath(context));
}
export async function POST(request: Request, context: RouteContext) {
  return forward(request, await extractPath(context));
}
export async function PUT(request: Request, context: RouteContext) {
  return forward(request, await extractPath(context));
}
export async function PATCH(request: Request, context: RouteContext) {
  return forward(request, await extractPath(context));
}
export async function DELETE(request: Request, context: RouteContext) {
  return forward(request, await extractPath(context));
}
export async function OPTIONS(request: Request, context: RouteContext) {
  return forward(request, await extractPath(context));
}
