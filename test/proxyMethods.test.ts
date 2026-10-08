/**
 * Unit tests for the external proxy methods and the error-handling changes
 * that shipped with them. No server, no network, no payment: `fetch` is
 * replaced with a stub that answers each route with a hand-built Response,
 * so cases that are hard to reproduce live (a target that 403s / 429s / 503s,
 * the client being offline) are deterministic.
 *
 * What is under test is the CLIENT's logic: which route each method calls,
 * what it sends, the extract*WithProxyFallback waterfall, and how failures
 * surface as errors. What the server does on those routes is covered by the
 * minifetch-server test suite.
 *
 * API key mode is used throughout (a dev key, so the base url is localhost and
 * nothing real is ever contacted). One x402 case runs the real x402 wrapper to
 * check a network failure is not reported as a payment failure.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { MinifetchClient } from "../src/client.js";

const BASE = "http://localhost:4021/api/v1";
const TARGET = "https://example.com";

// ── Response builders ──

/** JSON response with a status line. */
const json = (status: number, body: unknown, statusText = "OK") =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "content-type": "application/json" },
  });

/** 200 success, tagged with which proxy served it. */
const ok = (proxyType: "minifetch" | "managed") => () =>
  json(200, { success: true, results: [{ data: { url: TARGET, proxy: { proxyType } } }] });

/** 502 fetch error in the server's shared error shape. */
const fetchError = (message: string, upstreamStatus?: number) => () =>
  json(
    502,
    {
      success: false,
      results: [
        {
          data: { requestUrl: TARGET, url: null },
          error: { message, ...(upstreamStatus && { statusCode: upstreamStatus }) },
        },
      ],
    },
    "Bad Gateway",
  );

/** Free preflight answer. */
const preflight = (allowed: boolean, message?: string) => () =>
  json(200, { success: true, results: [{ data: { url: TARGET, allowed, ...(message && { message }) } }] });

/** What Node's fetch throws when there is no response at all. */
const offline = () => {
  throw new TypeError("fetch failed", {
    cause: Object.assign(new Error("getaddrinfo ENOTFOUND localhost"), { code: "ENOTFOUND" }),
  });
};

// ── fetch stub ──

type Route = () => Response;

/**
 * Replace global fetch. `routes` maps an API path (after /api/v1) to its
 * answer; an unplanned path fails the test. Returns the recorded calls.
 */
function stubFetch(routes: Record<string, Route>) {
  const calls: Array<{ path: string; method: string; query: URLSearchParams; body: any }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const path = url.pathname.replace("/api/v1", "");
      calls.push({
        path,
        method: init?.method ?? "GET",
        query: url.searchParams,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      const route = routes[path];
      if (!route) throw new Error(`test: unplanned request to ${path}`);
      return route();
    }),
  );
  return calls;
}

const client = () => new MinifetchClient({ apiKey: "mf_dev_test" });
const paths = (calls: Array<{ path: string }>) => calls.map(c => c.path);

const PREFLIGHT = "/free/preflight/url-check";
const BLOCKED_MESSAGES: Array<[string, number | undefined]> = [
  ["robots blocked", undefined],
  ["upstream forbidden", 403],
  ["upstream rate limited", 429],
  ["upstream unavailable", 503],
];

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────────────────────
// Mirror methods: proxyExtract* / proxyRenderExtract*
// ─────────────────────────────────────────────────────────────

describe("proxy mirror methods unit tests", () => {
  const METHODS: Array<[string, string]> = [
    ["proxyExtractUrlMetadata", "/proxy/extract/url-metadata"],
    ["proxyExtractUrlLinks", "/proxy/extract/url-links"],
    ["proxyExtractUrlPreview", "/proxy/extract/url-preview"],
    ["proxyExtractUrlContent", "/proxy/extract/url-content"],
    ["proxyRenderExtractUrlMetadata", "/proxy/render/extract/url-metadata"],
    ["proxyRenderExtractUrlLinks", "/proxy/render/extract/url-links"],
    ["proxyRenderExtractUrlPreview", "/proxy/render/extract/url-preview"],
    ["proxyRenderExtractUrlContent", "/proxy/render/extract/url-content"],
  ];

  it.each(METHODS)("%s calls %s once, POST by default", async (method, path) => {
    const calls = stubFetch({ [path]: ok("managed") });
    const response = await (client() as any)[method](TARGET);

    expect(response.success).toBe(true);
    expect(paths(calls)).toEqual([path]);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toEqual({ url: TARGET });
  });

  it.each(METHODS)("%s sends country when given", async (method, path) => {
    const calls = stubFetch({ [path]: ok("managed") });
    await (client() as any)[method](TARGET, { country: "de" });
    expect(calls[0].body.country).toBe("de");
  });

  it("GET puts every param in the query string", async () => {
    const calls = stubFetch({ "/proxy/extract/url-metadata": ok("managed") });
    await client().proxyExtractUrlMetadata(TARGET, {
      method: "GET",
      country: "mx",
      fields: ["title", "og"],
      omitEmpty: true,
    });

    expect(calls[0].method).toBe("GET");
    expect(calls[0].body).toBeUndefined();
    expect(calls[0].query.get("country")).toBe("mx");
    expect(calls[0].query.get("fields")).toBe("title,og");
    expect(calls[0].query.get("omitEmpty")).toBe("true");
  });

  it("metadata methods pass the native metadata options through", async () => {
    const calls = stubFetch({ "/proxy/render/extract/url-metadata": ok("managed") });
    await client().proxyRenderExtractUrlMetadata(TARGET, {
      fields: ["title"],
      omitEmpty: true,
      includeResponseBody: true,
    });
    expect(calls[0].body).toMatchObject({ fields: "title", omitEmpty: true, includeResponseBody: true });
  });

  it("content methods pass includeMediaUrls through", async () => {
    const calls = stubFetch({ "/proxy/extract/url-content": ok("managed") });
    await client().proxyExtractUrlContent(TARGET, { includeMediaUrls: true });
    expect(calls[0].body.includeMediaUrls).toBe(true);
  });

  it("an invalid url is rejected before any request", async () => {
    const calls = stubFetch({});
    await expect(client().proxyExtractUrlLinks("vvv")).rejects.toMatchObject({ name: "InvalidUrlError" });
    expect(calls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// extract*WithProxyFallback — the waterfall
// ─────────────────────────────────────────────────────────────

describe("extract*WithProxyFallback unit tests", () => {
  const NATIVE = "/extract/url-metadata";
  const PROXY = "/proxy/extract/url-metadata";
  const RENDER = "/proxy/render/extract/url-metadata";

  it("render: true goes straight to /proxy/render, no preflight, no native", async () => {
    const calls = stubFetch({ [RENDER]: ok("managed") });
    await client().extractUrlMetadataWithProxyFallback(TARGET, { render: true, country: "mx" });
    expect(paths(calls)).toEqual([RENDER]);
    expect(calls[0].body.country).toBe("mx");
  });

  it("country goes straight to /proxy, no preflight, no native", async () => {
    const calls = stubFetch({ [PROXY]: ok("managed") });
    await client().extractUrlMetadataWithProxyFallback(TARGET, { country: "mx" });
    expect(paths(calls)).toEqual([PROXY]);
  });

  it("allowed by preflight + native succeeds: native only, never the proxy", async () => {
    const calls = stubFetch({ [PREFLIGHT]: preflight(true, "Access allowed by robots.txt"), [NATIVE]: ok("minifetch") });
    const response = await client().extractUrlMetadataWithProxyFallback(TARGET);

    expect(paths(calls)).toEqual([PREFLIGHT, NATIVE]);
    expect(response.results[0].data.proxy.proxyType).toBe("minifetch");
  });

  it("robots.txt block at preflight: straight to /proxy, skips native", async () => {
    const calls = stubFetch({ [PREFLIGHT]: preflight(false, "URL is blocked by robots.txt"), [PROXY]: ok("managed") });
    const response = await client().extractUrlMetadataWithProxyFallback(TARGET);

    expect(paths(calls)).toEqual([PREFLIGHT, PROXY]);
    expect(response.results[0].data.proxy.proxyType).toBe("managed");
  });

  it("an unrecognised not-allowed preflight message is treated as a robots block", async () => {
    const calls = stubFetch({ [PREFLIGHT]: preflight(false, "Some future reason"), [PROXY]: ok("managed") });
    await client().extractUrlMetadataWithProxyFallback(TARGET);
    expect(paths(calls)).toEqual([PREFLIGHT, PROXY]);
  });

  it("invalid or non-existent domain: InvalidUrlError, no further requests", async () => {
    const calls = stubFetch({ [PREFLIGHT]: preflight(false, "Invalid or non-existent domain") });
    await expect(client().extractUrlMetadataWithProxyFallback(TARGET)).rejects.toMatchObject({
      name: "InvalidUrlError",
      message: "Invalid or non-existent domain",
    });
    expect(paths(calls)).toEqual([PREFLIGHT]);
  });

  it.each(BLOCKED_MESSAGES)("native blocked (%s): falls back to /proxy", async (message, upstreamStatus) => {
    const calls = stubFetch({
      [PREFLIGHT]: preflight(true),
      [NATIVE]: fetchError(message, upstreamStatus),
      [PROXY]: ok("managed"),
    });
    const response = await client().extractUrlMetadataWithProxyFallback(TARGET);

    expect(paths(calls)).toEqual([PREFLIGHT, NATIVE, PROXY]);
    expect(response.results[0].data.proxy.proxyType).toBe("managed");
  });

  it.each([
    ["upstream not found", 404],
    ["upstream error", 500],
    ["dns lookup failed", undefined],
  ] as Array<[string, number | undefined]>)(
    "native fails for another reason (%s): rethrown, proxy never called",
    async (message, upstreamStatus) => {
      const calls = stubFetch({ [PREFLIGHT]: preflight(true), [NATIVE]: fetchError(message, upstreamStatus) });
      await expect(client().extractUrlMetadataWithProxyFallback(TARGET)).rejects.toMatchObject({
        name: "NetworkError",
        statusCode: 502,
        serverMessage: message,
      });
      expect(paths(calls)).toEqual([PREFLIGHT, NATIVE]);
    },
  );

  it("proxy also fails: its error is rethrown, never steps up to render", async () => {
    const calls = stubFetch({
      [PREFLIGHT]: preflight(true),
      [NATIVE]: fetchError("upstream forbidden", 403),
      [PROXY]: fetchError("upstream forbidden", 403),
    });
    await expect(client().extractUrlMetadataWithProxyFallback(TARGET)).rejects.toMatchObject({
      name: "NetworkError",
      upstreamStatus: 403,
    });
    expect(paths(calls)).toEqual([PREFLIGHT, NATIVE, PROXY]);
  });

  it("country is not sent on the native attempt", async () => {
    // (country alone skips native, so check native never sees one via the plain path)
    const calls = stubFetch({ [PREFLIGHT]: preflight(true), [NATIVE]: ok("minifetch") });
    await client().extractUrlMetadataWithProxyFallback(TARGET);
    expect(calls[1].body.country).toBeUndefined();
  });

  it.each([
    ["extractUrlLinksWithProxyFallback", "url-links"],
    ["extractUrlPreviewWithProxyFallback", "url-preview"],
    ["extractUrlContentWithProxyFallback", "url-content"],
  ])("%s uses its own endpoint on every tier", async (method, slug) => {
    const calls = stubFetch({
      [PREFLIGHT]: preflight(true),
      [`/extract/${slug}`]: fetchError("upstream forbidden", 403),
      [`/proxy/extract/${slug}`]: ok("managed"),
    });
    await (client() as any)[method](TARGET);
    expect(paths(calls)).toEqual([PREFLIGHT, `/extract/${slug}`, `/proxy/extract/${slug}`]);
  });
});

// ─────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────

describe("NetworkError details from server error response unit tests", () => {
  it("carries statusCode, the exact serverMessage and the target's upstreamStatus; message format unchanged", async () => {
    stubFetch({ "/extract/url-metadata": fetchError("upstream forbidden", 403) });
    await expect(client().extractUrlMetadata(TARGET)).rejects.toMatchObject({
      name: "NetworkError",
      message: "Request failed: 502 Bad Gateway — upstream forbidden",
      statusCode: 502,
      serverMessage: "upstream forbidden",
      upstreamStatus: 403,
    });
  });

  it("a non-fetch-error body (credits, 402) keeps the bare message and adds no serverMessage", async () => {
    stubFetch({
      "/extract/url-metadata": () =>
        json(402, { success: false, error: "insufficient_credits", message: "No credits remaining." }, "Payment Required"),
    });
    const error = await client().extractUrlMetadata(TARGET).catch(e => e);

    expect(error.name).toBe("NetworkError");
    expect(error.message).toBe("Request failed: 402 Payment Required");
    expect(error.statusCode).toBe(402);
    expect("serverMessage" in error).toBe(false);
    expect("upstreamStatus" in error).toBe(false);
  });
});

describe("checkAnd* preflight errors unit tests", () => {
  it.each([
    ["checkAndExtractUrlMetadata", "UrlMetadata"],
    ["checkAndExtractUrlLinks", "UrlLinks"],
    ["checkAndExtractUrlPreview", "UrlPreview"],
    ["checkAndExtractUrlContent", "UrlContent"],
  ])("%s: robots block keeps its message, tip names the proxy methods for that endpoint", async (method, name) => {
    const calls = stubFetch({ [PREFLIGHT]: preflight(false, "URL is blocked by robots.txt") });
    const error = await (client() as any)[method](TARGET).catch((e: any) => e);

    expect(error.name).toBe("RobotsBlockedError");
    expect(error.message).toBe("URL is blocked by robots.txt");
    expect(error.tip).toContain(`proxyExtract${name} or extract${name}WithProxyFallback`);
    expect(paths(calls)).toEqual([PREFLIGHT]);
  });

  it("checkAndRunSeoPageAudit: robots block has no tip (the audit has no proxy version)", async () => {
    stubFetch({ [PREFLIGHT]: preflight(false, "URL is blocked by robots.txt") });
    const error = await client().checkAndRunSeoPageAudit(TARGET).catch(e => e);

    expect(error.name).toBe("RobotsBlockedError");
    expect("tip" in error).toBe(false);
  });

  it("invalid or non-existent domain: InvalidUrlError, not RobotsBlockedError", async () => {
    stubFetch({ [PREFLIGHT]: preflight(false, "Invalid or non-existent domain") });
    await expect(client().checkAndExtractUrlLinks(TARGET)).rejects.toMatchObject({
      name: "InvalidUrlError",
      message: "Invalid or non-existent domain",
    });
  });

  it("no message from the server: RobotsBlockedError with the default text", async () => {
    stubFetch({ [PREFLIGHT]: preflight(false) });
    await expect(client().checkAndRunSeoPageAudit(TARGET)).rejects.toMatchObject({
      name: "RobotsBlockedError",
      message: "URL is blocked by robots.txt",
    });
  });
});

describe("client cannot reach Minifetch (offline, DNS, connection refused) unit tests", () => {
  const isUnreachable = (error: any) => {
    expect(error.name).toBe("NetworkError");
    expect(error.message).toBe("Request failed: could not reach Minifetch — fetch failed (ENOTFOUND)");
    expect(error.originalError).toBeInstanceOf(TypeError);
    expect("statusCode" in error).toBe(false);
  };

  it.each([
    ["extractUrlMetadata", [TARGET]],
    ["runSeoPageAudit", [TARGET]],
    ["searchByKeyword", ["green tea"]],
    ["proxyRenderExtractUrlContent", [TARGET]],
    ["extractUrlLinksWithProxyFallback", [TARGET, { render: true }]],
  ] as Array<[string, unknown[]]>)("API key: %s throws NetworkError", async (method, args) => {
    vi.stubGlobal("fetch", vi.fn(offline));
    isUnreachable(await (client() as any)[method](...args).catch((e: any) => e));
  });

  it("preflightUrlCheck keeps its existing message, now with originalError", async () => {
    vi.stubGlobal("fetch", vi.fn(offline));
    const error = await client().preflightUrlCheck(TARGET).catch(e => e);

    expect(error.name).toBe("NetworkError");
    expect(error.message).toBe("Preflight check failed: fetch failed");
    expect(error.originalError).toBeInstanceOf(TypeError);
  });

  it("x402: NetworkError, not PaymentFailedError (runs the real x402 wrapper)", async () => {
    vi.stubGlobal("fetch", vi.fn(offline));
    // A throwaway, well-formed key: no request ever leaves this process.
    const x402Client = new MinifetchClient({ network: "base-sepolia", privateKey: `0x${"11".repeat(32)}` });
    isUnreachable(await x402Client.extractUrlMetadata(TARGET).catch(e => e));
  });

  it("a 200 that isn't JSON stays ExtractionFailedError (a response-handling failure)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>oops</html>", { status: 200 })));
    await expect(client().extractUrlMetadata(TARGET)).rejects.toMatchObject({ name: "ExtractionFailedError" });
  });
});
