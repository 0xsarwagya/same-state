import { FHIR_PROXY_PATH } from "./constants";

/**
 * Browser-side helper that talks to the same-origin FHIR proxy. Never
 * hits HAPI directly — CORS on the public server is not guaranteed.
 */

export interface FhirRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Extra request headers (content-type is set for you on writes). */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface FhirResponse<T = unknown> {
  status: number;
  body: T;
  location: string | null;
  etag: string | null;
  lastModified: string | null;
}

function joinQuery(query?: Record<string, string | number | undefined>): string {
  if (query === undefined) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

export async function fhirRequest<T = unknown>(
  path: string,
  options: FhirRequestOptions = {},
): Promise<FhirResponse<T>> {
  const url = `${FHIR_PROXY_PATH}/${path.replace(/^\/+/, "")}${joinQuery(options.query)}`;
  const method = options.method ?? "GET";
  const init: RequestInit = { method };
  if (options.signal !== undefined) init.signal = options.signal;
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
    init.headers = {
      "content-type": "application/fhir+json",
      ...(options.headers ?? {}),
    };
  } else if (options.headers !== undefined) {
    init.headers = { ...options.headers };
  }
  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  return {
    status: response.status,
    body: body as T,
    location: response.headers.get("location"),
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
  };
}
