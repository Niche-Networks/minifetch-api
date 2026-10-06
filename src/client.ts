import { initConfig } from "./init.js";
import { validateAndNormalizeUrl, validateAndNormalizeQuery } from "./utils/validation.js";
import { handlePayment, handleApiKeyRequest } from "./utils/payment.js";
import type { ClientConfig, InitializedConfig, HttpMethod } from "./types/config.js";
import type {
  PreflightCheckResponse,
  PaidEndpointResponse,
  SearchKeywordResponse,
} from "./types/responses.js";
import {
  InvalidUrlError,
  InvalidQueryError,
  RobotsBlockedError,
  PaymentFailedError,
  ExtractionFailedError,
  SearchFailedError,
  NetworkError,
  ConfigurationError,
} from "./types/errors.js";

/** Request params before transport encoding — string, number, or boolean values. */
type RequestParams = Record<string, string | number | boolean>;

/** Every endpoint accepts GET (query string) or POST (JSON body). POST is the default. */
const DEFAULT_METHOD: HttpMethod = "POST";

/** Options shared by the url-metadata methods. */
type MetadataOptions = { fields?: string[]; omitEmpty?: boolean; includeResponseBody?: boolean };

/** Options shared by the url-content methods. */
type ContentOptions = { includeMediaUrls?: boolean };

/** Options of the external proxy methods (proxyExtract*, proxyRenderExtract*). */
type ProxyOptions = { country?: string; method?: HttpMethod };

/** Options of the extract*WithProxyFallback methods. */
type ProxyFallbackOptions = ProxyOptions & { render?: boolean };

/**
 * Which fetch path serves a request. Mirrors the server routes:
 *   native       -> /extract/<slug>               (native Minifetch proxy, respects robots.txt)
 *   proxy        -> /proxy/extract/<slug>         (external proxy, does not check robots.txt)
 *   proxy-render -> /proxy/render/extract/<slug>  (external proxy + JavaScript rendering)
 */
type FetchTier = "native" | "proxy" | "proxy-render";

const TIER_PREFIX: Record<FetchTier, string> = {
  native: "",
  proxy: "/proxy",
  "proxy-render": "/proxy/render",
};

/**
 * Server error messages meaning the target blocked the native Minifetch proxy,
 * so the external proxy may get through. The server sends its "retry via
 * external proxy" tip in exactly these cases.
 */
const BLOCKED_SERVER_MESSAGES: ReadonlySet<string> = new Set([
  "robots blocked",
  "upstream forbidden",
  "upstream rate limited",
  "upstream unavailable",
]);

/** Preflight message for a robots.txt block (vs. an invalid or non-existent domain). */
const PREFLIGHT_ROBOTS_BLOCKED = "blocked by robots.txt";

/** `tip` on RobotsBlockedError from the checkAndExtract* methods, which have proxy versions. */
const PROXY_TIP =
  "To fetch it anyway, use a proxyExtract* or extract*WithProxyFallback method (external proxy, does not check robots.txt).";

/**
 * Main Minifetch API client.
 * Supports two auth modes:
 *   - x402: crypto micropayments via Coinbase x402 (pass network + privateKey)
 *   - apiKey: Stripe-backed credits (pass apiKey: "mf_prod_..." or "mf_dev_...")
 *
 * Every request method accepts an optional `method: "GET" | "POST"` in its
 * options; it defaults to POST (params sent as a JSON body). Pass `method: "GET"`
 * to send params in the query string instead.
 */
export class MinifetchClient {
  private config: InitializedConfig;
  private baseUrl: string;

  /**
   * @param config - Either { network, privateKey } for x402 or { apiKey } for API key auth
   */
  constructor(config: ClientConfig) {
    this.config = initConfig(config);
    this.baseUrl = this.config.apiBaseUrl;
  }

  /**
   * Search the web by keyword (paid endpoint).
   *
   * Unlike the URL-based methods, this takes a search query rather than a URL and
   * proxies to Minifetch's keyword search. Returns ranked results, each with a
   * title, URL, and text snippet. `limit` and `descriptionLength` are convenience
   * knobs the server clamps into range; the effective values (after clamping) are
   * echoed back on `queryParameters`.
   *
   * @param query - keyword(s) to search for (1-50 characters)
   * @param options
   * @param options.limit - number of results, 1-10 (default 10). Out-of-range values are clamped.
   * @param options.descriptionLength - max characters per snippet, 0-5000 (default 750, 0 = titles/URLs only). Out-of-range values are clamped.
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidQueryError} if the query is empty or exceeds 50 characters
   * @throws {SearchFailedError} if the search request fails
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async searchByKeyword(
    query: string,
    options?: {
      limit?: number;
      descriptionLength?: number;
      method?: HttpMethod;
    },
  ): Promise<SearchKeywordResponse> {
    try {
      const cleanQuery = validateAndNormalizeQuery(query);

      const params: RequestParams = { query: cleanQuery };
      if (options?.limit !== undefined) params.limit = options.limit;
      if (options?.descriptionLength !== undefined)
        params.descriptionLength = options.descriptionLength;

      return await this._makeSearchRequest(params, options?.method);
    } catch (error) {
      return this._rethrowSearchError(error, query, "Keyword search");
    }
  }

  /**
   * Check if URL is allowed by robots.txt (free preflight check — no auth required)
   *
   * @param url
   * @param options
   * @param options.fresh
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {NetworkError} if request fails
   */
  async preflightUrlCheck(
    url: string,
    options?: { fresh?: boolean; method?: HttpMethod },
  ): Promise<PreflightCheckResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);

      const params: RequestParams = { url: normalizedUrl };
      if (options?.fresh) params.fresh = true;

      const { url: requestUrl, init } = this._buildRequest(
        "/api/v1/free/preflight/url-check",
        params,
        options?.method ?? DEFAULT_METHOD,
      );
      const response = await fetch(requestUrl, init);

      if (!response.ok) {
        throw new NetworkError(`Preflight check failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as PreflightCheckResponse;
    } catch (error) {
      if (error instanceof InvalidUrlError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Preflight check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * INTERNAL / UNDOCUMENTED — deliberately omitted from the README and not part
   * of the public API. The public {@link preflightUrlCheck} hits the FREE
   * endpoint (no payment); this hits the PAID x402 twin at
   * `/api/v1/x402/preflight/url-check` so our own suite can generate paid
   * traffic against it — the x402 Bazaar weights usage for ranking and this
   * refreshes the listing. x402 auth only; there is no session/api-key route
   * for a paid url-check.
   *
   * @param url
   * @param options
   * @param options.fresh - bypass the 24h robots.txt cache
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {ConfigurationError} if the client is not in x402 mode
   * @internal
   */
  async _exercisePaidUrlCheck(
    url: string,
    options?: { fresh?: boolean; method?: HttpMethod },
  ): Promise<PaidEndpointResponse> {
    if (this.config.authMode !== "x402") {
      throw new ConfigurationError(
        "_exercisePaidUrlCheck requires x402 auth (network + privateKey)",
      );
    }
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);
      const params: RequestParams = { url: normalizedUrl };
      if (options?.fresh) params.fresh = true;
      return await this._makeRequest(
        "/preflight/url-check",
        normalizedUrl,
        "Paid URL check",
        params,
        options?.method,
      );
    } catch (error) {
      return this._rethrowError(error, url, "Paid URL check");
    }
  }

  /**
   * Extract URL metadata (paid endpoint)
   *
   * @param url
   * @param options
   * @param options.fields
   * @param options.omitEmpty
   * @param options.includeResponseBody
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {ExtractionFailedError} various reasons, check README
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlMetadata(
    url: string,
    options?: {
      fields?: string[];
      omitEmpty?: boolean;
      includeResponseBody?: boolean;
      method?: HttpMethod;
    },
  ): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);

      const params: RequestParams = { url: normalizedUrl };
      if (options?.fields?.length) params.fields = options.fields.join(",");
      if (options?.omitEmpty) params.omitEmpty = true;
      if (options?.includeResponseBody) params.includeResponseBody = true;

      return await this._makeRequest(
        "/extract/url-metadata",
        normalizedUrl,
        "Metadata extraction",
        params,
        options?.method,
      );
    } catch (error) {
      return this._rethrowError(error, url, "Metadata extraction");
    }
  }

  /**
   * Extract URL links (paid endpoint)
   *
   * @param url
   * @param options
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {ExtractionFailedError} various reasons, check README
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlLinks(
    url: string,
    options?: { method?: HttpMethod },
  ): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);
      const params: RequestParams = { url: normalizedUrl };
      return await this._makeRequest(
        "/extract/url-links",
        normalizedUrl,
        "Links extraction",
        params,
        options?.method,
      );
    } catch (error) {
      return this._rethrowError(error, url, "Links extraction");
    }
  }

  /**
   * Extract URL preview (paid endpoint)
   *
   * @param url
   * @param options
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {ExtractionFailedError} various reasons, check README
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlPreview(
    url: string,
    options?: { method?: HttpMethod },
  ): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);
      const params: RequestParams = { url: normalizedUrl };
      return await this._makeRequest(
        "/extract/url-preview",
        normalizedUrl,
        "Preview extraction",
        params,
        options?.method,
      );
    } catch (error) {
      return this._rethrowError(error, url, "Preview extraction");
    }
  }

  /**
   * Extract URL content as markdown (paid endpoint)
   *
   * @param url
   * @param options
   * @param options.includeMediaUrls
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {ExtractionFailedError} various reasons, check README
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlContent(
    url: string,
    options?: { includeMediaUrls?: boolean; method?: HttpMethod },
  ): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);

      const params: RequestParams = { url: normalizedUrl };
      if (options?.includeMediaUrls) params.includeMediaUrls = true;

      return await this._makeRequest(
        "/extract/url-content",
        normalizedUrl,
        "Content extraction",
        params,
        options?.method,
      );
    } catch (error) {
      return this._rethrowError(error, url, "Content extraction");
    }
  }

  /**
   * Run SEO page audit (paid endpoint)
   *
   * @param url
   * @param options
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {ExtractionFailedError} various reasons, check README
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async runSeoPageAudit(
    url: string,
    options?: { method?: HttpMethod },
  ): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);
      const params: RequestParams = { url: normalizedUrl };
      return await this._makeRequest(
        "/run/seo-page-audit",
        normalizedUrl,
        "Run SEO page audit",
        params,
        options?.method,
      );
    } catch (error) {
      return this._rethrowError(error, url, "Run SEO page audit");
    }
  }

  /**
   * Check URL then run SEO page audit in one call.
   * Throws RobotsBlockedError if robots.txt blocks the URL.
   *
   * @param url
   * @param options
   * @param options.method - "GET" or "POST" (default POST)
   */
  async checkAndRunSeoPageAudit(
    url: string,
    options?: { method?: HttpMethod },
  ): Promise<PaidEndpointResponse> {
    await this._preflightOrThrow(url);
    return this.runSeoPageAudit(url, options);
  }

  /**
   * Check URL then extract metadata in one call.
   * Throws RobotsBlockedError if robots.txt blocks the URL.
   *
   * @param url
   * @param options
   * @param options.fields
   * @param options.omitEmpty
   * @param options.includeResponseBody
   * @param options.method - "GET" or "POST" (default POST)
   */
  async checkAndExtractUrlMetadata(
    url: string,
    options?: {
      fields?: string[];
      omitEmpty?: boolean;
      includeResponseBody?: boolean;
      method?: HttpMethod;
    },
  ): Promise<PaidEndpointResponse> {
    await this._preflightOrThrow(url, true);
    return this.extractUrlMetadata(url, options);
  }

  /**
   * Check URL then extract links in one call.
   * Throws RobotsBlockedError if robots.txt blocks the URL.
   *
   * @param url
   * @param options
   * @param options.method - "GET" or "POST" (default POST)
   */
  async checkAndExtractUrlLinks(
    url: string,
    options?: { method?: HttpMethod },
  ): Promise<PaidEndpointResponse> {
    await this._preflightOrThrow(url, true);
    return this.extractUrlLinks(url, options);
  }

  /**
   * Check URL then extract preview in one call.
   * Throws RobotsBlockedError if robots.txt blocks the URL.
   *
   * @param url
   * @param options
   * @param options.method - "GET" or "POST" (default POST)
   */
  async checkAndExtractUrlPreview(
    url: string,
    options?: { method?: HttpMethod },
  ): Promise<PaidEndpointResponse> {
    await this._preflightOrThrow(url, true);
    return this.extractUrlPreview(url, options);
  }

  /**
   * Check URL then extract content in one call.
   * Throws RobotsBlockedError if robots.txt blocks the URL.
   *
   * @param url
   * @param options
   * @param options.includeMediaUrls
   * @param options.method - "GET" or "POST" (default POST)
   */
  async checkAndExtractUrlContent(
    url: string,
    options?: { includeMediaUrls?: boolean; method?: HttpMethod },
  ): Promise<PaidEndpointResponse> {
    await this._preflightOrThrow(url, true);
    return this.extractUrlContent(url, options);
  }

  // ---------------------------------------------------------------------------
  // External proxy methods — mirror the server's /proxy/ routes 1:1.
  //
  // Every method with "proxy" in its name can use the external rotating proxy:
  // it does NOT check robots.txt, is never cached, and costs the native price
  // plus a surcharge. Methods without "proxy" in the name never do.
  // ---------------------------------------------------------------------------

  /**
   * Extract URL metadata via the external proxy (paid endpoint).
   * Does not check robots.txt. `performance` and `redirects` are not available.
   *
   * @param url
   * @param options
   * @param options.fields
   * @param options.omitEmpty
   * @param options.includeResponseBody
   * @param options.country - 2-letter country code to fetch from
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async proxyExtractUrlMetadata(
    url: string,
    options?: MetadataOptions & ProxyOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractVia(
      "proxy",
      "url-metadata",
      "Metadata extraction",
      url,
      this._metadataParams(options),
      options,
    );
  }

  /**
   * Extract URL links via the external proxy (paid endpoint).
   * Does not check robots.txt.
   *
   * @param url
   * @param options
   * @param options.country - 2-letter country code to fetch from
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async proxyExtractUrlLinks(url: string, options?: ProxyOptions): Promise<PaidEndpointResponse> {
    return this._extractVia("proxy", "url-links", "Links extraction", url, {}, options);
  }

  /**
   * Extract URL preview via the external proxy (paid endpoint).
   * Does not check robots.txt.
   *
   * @param url
   * @param options
   * @param options.country - 2-letter country code to fetch from
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async proxyExtractUrlPreview(url: string, options?: ProxyOptions): Promise<PaidEndpointResponse> {
    return this._extractVia("proxy", "url-preview", "Preview extraction", url, {}, options);
  }

  /**
   * Extract URL content as markdown via the external proxy (paid endpoint).
   * Does not check robots.txt.
   *
   * @param url
   * @param options
   * @param options.includeMediaUrls
   * @param options.country - 2-letter country code to fetch from
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async proxyExtractUrlContent(
    url: string,
    options?: ContentOptions & ProxyOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractVia(
      "proxy",
      "url-content",
      "Content extraction",
      url,
      this._contentParams(options),
      options,
    );
  }

  /**
   * Extract URL metadata via the external proxy with JavaScript rendering (paid endpoint).
   * Does not check robots.txt. `performance` and `redirects` are not available.
   *
   * @param url
   * @param options
   * @param options.fields
   * @param options.omitEmpty
   * @param options.includeResponseBody
   * @param options.country - 2-letter country code to fetch from
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async proxyRenderExtractUrlMetadata(
    url: string,
    options?: MetadataOptions & ProxyOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractVia(
      "proxy-render",
      "url-metadata",
      "Metadata extraction",
      url,
      this._metadataParams(options),
      options,
    );
  }

  /**
   * Extract URL links via the external proxy with JavaScript rendering (paid endpoint).
   * Does not check robots.txt.
   *
   * @param url
   * @param options
   * @param options.country - 2-letter country code to fetch from
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async proxyRenderExtractUrlLinks(
    url: string,
    options?: ProxyOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractVia("proxy-render", "url-links", "Links extraction", url, {}, options);
  }

  /**
   * Extract URL preview via the external proxy with JavaScript rendering (paid endpoint).
   * Does not check robots.txt.
   *
   * @param url
   * @param options
   * @param options.country - 2-letter country code to fetch from
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async proxyRenderExtractUrlPreview(
    url: string,
    options?: ProxyOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractVia("proxy-render", "url-preview", "Preview extraction", url, {}, options);
  }

  /**
   * Extract URL content as markdown via the external proxy with JavaScript rendering (paid endpoint).
   * Does not check robots.txt.
   *
   * @param url
   * @param options
   * @param options.includeMediaUrls
   * @param options.country - 2-letter country code to fetch from
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async proxyRenderExtractUrlContent(
    url: string,
    options?: ContentOptions & ProxyOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractVia(
      "proxy-render",
      "url-content",
      "Content extraction",
      url,
      this._contentParams(options),
      options,
    );
  }

  // ---------------------------------------------------------------------------
  // Convenience: native first, external proxy as fallback.
  //
  // These choose the route FOR you, so unlike the methods above the price and
  // the robots.txt behaviour are not known up front: a call costs the native
  // price, or the proxy price when it falls back (never both). Read
  // `results[0].data.proxy` on the response to see which path ran.
  //   - `render: true` or a `country` skips the native attempt.
  //   - otherwise: free preflight -> native -> external proxy if the target
  //     blocked Minifetch (robots.txt, or a 403 / 429 / 503).
  //   - never steps up to JavaScript rendering on its own.
  // ---------------------------------------------------------------------------

  /**
   * Extract URL metadata, falling back to the external proxy when the target
   * blocks the native Minifetch proxy. May skip robots.txt; see the note above.
   *
   * @param url
   * @param options
   * @param options.fields
   * @param options.omitEmpty
   * @param options.includeResponseBody
   * @param options.render - force the external proxy with JavaScript rendering
   * @param options.country - force the external proxy, fetching from this 2-letter country code
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid, or its domain is invalid or doesn't exist
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlMetadataWithProxyFallback(
    url: string,
    options?: MetadataOptions & ProxyFallbackOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractWithProxyFallback(
      "url-metadata",
      "Metadata extraction",
      url,
      this._metadataParams(options),
      options,
    );
  }

  /**
   * Extract URL links, falling back to the external proxy when the target
   * blocks the native Minifetch proxy. May skip robots.txt; see the note above.
   *
   * @param url
   * @param options
   * @param options.render - force the external proxy with JavaScript rendering
   * @param options.country - force the external proxy, fetching from this 2-letter country code
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid, or its domain is invalid or doesn't exist
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlLinksWithProxyFallback(
    url: string,
    options?: ProxyFallbackOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractWithProxyFallback("url-links", "Links extraction", url, {}, options);
  }

  /**
   * Extract URL preview, falling back to the external proxy when the target
   * blocks the native Minifetch proxy. May skip robots.txt; see the note above.
   *
   * @param url
   * @param options
   * @param options.render - force the external proxy with JavaScript rendering
   * @param options.country - force the external proxy, fetching from this 2-letter country code
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid, or its domain is invalid or doesn't exist
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlPreviewWithProxyFallback(
    url: string,
    options?: ProxyFallbackOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractWithProxyFallback("url-preview", "Preview extraction", url, {}, options);
  }

  /**
   * Extract URL content as markdown, falling back to the external proxy when
   * the target blocks the native Minifetch proxy. May skip robots.txt; see the note above.
   *
   * @param url
   * @param options
   * @param options.includeMediaUrls
   * @param options.render - force the external proxy with JavaScript rendering
   * @param options.country - force the external proxy, fetching from this 2-letter country code
   * @param options.method - "GET" or "POST" (default POST)
   * @throws {InvalidUrlError} if URL is invalid, or its domain is invalid or doesn't exist
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlContentWithProxyFallback(
    url: string,
    options?: ContentOptions & ProxyFallbackOptions,
  ): Promise<PaidEndpointResponse> {
    return this._extractWithProxyFallback(
      "url-content",
      "Content extraction",
      url,
      this._contentParams(options),
      options,
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the correct paid path segment based on auth mode.
   * x402 → /api/v1/x402/<endpoint>
   * apiKey → /api/v1/<endpoint>
   *
   * @param endpoint
   */
  private _paidPath(endpoint: string): string {
    return this.config.authMode === "x402" ? `/api/v1/x402${endpoint}` : `/api/v1${endpoint}`;
  }

  /**
   * Encode a request for the wire. GET → params in the query string, no body.
   * POST → params as a JSON body with a Content-Type header. Auth headers
   * (Bearer / x402 payment) are added downstream, not here.
   *
   * @param path - absolute API path (already includes /api/v1[/x402])
   * @param params - request params (string or boolean values)
   * @param method - "GET" or "POST"
   * @returns the full request URL and the fetch init (method + optional body/headers)
   */
  private _buildRequest(
    path: string,
    params: RequestParams,
    method: HttpMethod,
  ): { url: string; init: RequestInit } {
    if (method === "GET") {
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) qs.set(key, String(value));
      return { url: `${this.baseUrl}${path}?${qs.toString()}`, init: { method: "GET" } };
    }
    return {
      url: `${this.baseUrl}${path}`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      },
    };
  }

  /**
   * Build the request, dispatch to the correct auth handler, then normalize the
   * response into PaidEndpointResponse.
   * Note: payment field is only present for x402 responses.
   *
   * @param endpoint - endpoint path segment, e.g. "/extract/url-metadata"
   * @param normalizedUrl
   * @param label - used in error messages
   * @param params - request params (string or boolean values)
   * @param method - "GET" or "POST" (default POST)
   */
  private async _makeRequest(
    endpoint: string,
    normalizedUrl: string,
    label: string,
    params: RequestParams,
    method: HttpMethod = DEFAULT_METHOD,
  ): Promise<PaidEndpointResponse> {
    const { url, init } = this._buildRequest(this._paidPath(endpoint), params, method);

    if (this.config.authMode === "x402") {
      const { response, payment } = await handlePayment(url, this.config, init);
      if (!response.ok) {
        throw new ExtractionFailedError(
          normalizedUrl,
          `${label} failed: ${response.status} ${response.statusText}`,
        );
      }
      const data = (await response.json()) as PaidEndpointResponse;
      return { success: data.success, results: data.results, payment };
    } else {
      const { response } = await handleApiKeyRequest(url, this.config, init);
      if (!response.ok) {
        throw new ExtractionFailedError(
          normalizedUrl,
          `${label} failed: ${response.status} ${response.statusText}`,
        );
      }
      const data = (await response.json()) as PaidEndpointResponse;
      // payment field intentionally omitted for apiKey auth — not applicable
      return { success: data.success, results: data.results };
    }
  }

  /**
   * Search-specific request path. Mirrors {@link _makeRequest} but for the
   * keyword search endpoint: there is no URL, non-OK responses surface as
   * SearchFailedError (carrying the query), and the server's clamped
   * `queryParameters` echo is preserved rather than dropped.
   *
   * @param params - request params (query + optional limit/descriptionLength)
   * @param method - "GET" or "POST" (default POST)
   */
  private async _makeSearchRequest(
    params: RequestParams,
    method: HttpMethod = DEFAULT_METHOD,
  ): Promise<SearchKeywordResponse> {
    const query = String(params.query);
    const { url, init } = this._buildRequest(this._paidPath("/search/keyword"), params, method);

    if (this.config.authMode === "x402") {
      const { response, payment } = await handlePayment(url, this.config, init);
      if (!response.ok) {
        throw new SearchFailedError(
          query,
          `Keyword search failed: ${response.status} ${response.statusText}`,
          response.status,
        );
      }
      const data = (await response.json()) as SearchKeywordResponse;
      return {
        success: data.success,
        queryParameters: data.queryParameters,
        results: data.results,
        payment,
      };
    } else {
      const { response } = await handleApiKeyRequest(url, this.config, init);
      if (!response.ok) {
        throw new SearchFailedError(
          query,
          `Keyword search failed: ${response.status} ${response.statusText}`,
          response.status,
        );
      }
      const data = (await response.json()) as SearchKeywordResponse;
      // payment field intentionally omitted for apiKey auth — not applicable
      return {
        success: data.success,
        queryParameters: data.queryParameters,
        results: data.results,
      };
    }
  }

  /**
   * Preflight check helper — throws RobotsBlockedError on a robots.txt block,
   * InvalidUrlError when the domain itself is invalid or doesn't exist.
   *
   * @param url
   * @param proxyTip - set `error.tip` to a pointer to the proxy methods on a
   *   robots.txt block (extract methods only; the SEO page audit has no proxy
   *   version). The message itself is never changed.
   */
  private async _preflightOrThrow(url: string, proxyTip = false): Promise<void> {
    const checkResponse = await this.preflightUrlCheck(url);
    const data = checkResponse.results[0]?.data;
    if (!data?.allowed) {
      const message = data?.message || "URL is blocked by robots.txt";
      // Not allowed, but not by robots.txt: the domain is invalid or doesn't exist.
      if (!message.includes(PREFLIGHT_ROBOTS_BLOCKED)) throw new InvalidUrlError(url, message);
      throw new RobotsBlockedError(url, message, proxyTip ? PROXY_TIP : undefined);
    }
  }

  /**
   * Request params for the url-metadata endpoint (without `url`).
   *
   * @param options
   */
  private _metadataParams(options?: MetadataOptions): RequestParams {
    const params: RequestParams = {};
    if (options?.fields?.length) params.fields = options.fields.join(",");
    if (options?.omitEmpty) params.omitEmpty = true;
    if (options?.includeResponseBody) params.includeResponseBody = true;
    return params;
  }

  /**
   * Request params for the url-content endpoint (without `url`).
   *
   * @param options
   */
  private _contentParams(options?: ContentOptions): RequestParams {
    const params: RequestParams = {};
    if (options?.includeMediaUrls) params.includeMediaUrls = true;
    return params;
  }

  /**
   * One extract request on a given tier. The single code path behind the
   * proxyExtract*, proxyRenderExtract* and extract*WithProxyFallback methods.
   * `country` is sent on the external proxy tiers only.
   *
   * @param tier - which fetch path (and so which route) to call
   * @param slug - endpoint slug, e.g. "url-metadata"
   * @param label - used in error messages
   * @param url - target url (validated here)
   * @param endpointParams - the endpoint's own params (without `url`)
   * @param options
   * @param options.country - 2-letter country code (external proxy tiers only)
   * @param options.method - "GET" or "POST" (default POST)
   */
  private async _extractVia(
    tier: FetchTier,
    slug: string,
    label: string,
    url: string,
    endpointParams: RequestParams,
    options?: ProxyOptions,
  ): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);

      const params: RequestParams = { url: normalizedUrl, ...endpointParams };
      if (tier !== "native" && options?.country) params.country = options.country;

      return await this._makeRequest(
        `${TIER_PREFIX[tier]}/extract/${slug}`,
        normalizedUrl,
        label,
        params,
        options?.method,
      );
    } catch (error) {
      return this._rethrowError(error, url, label);
    }
  }

  /**
   * True when a failed native fetch means the target blocked the native
   * Minifetch proxy (robots.txt, or an upstream 403 / 429 / 503), so the
   * external proxy is worth trying. Anything else (404, DNS, bad url, payment)
   * would fail there too.
   *
   * @param error
   */
  private _isBlockedError(error: unknown): boolean {
    return (
      error instanceof NetworkError &&
      error.statusCode === 502 &&
      typeof error.serverMessage === "string" &&
      BLOCKED_SERVER_MESSAGES.has(error.serverMessage)
    );
  }

  /**
   * The waterfall behind the extract*WithProxyFallback methods:
   *   1. `render: true`  -> external proxy with JavaScript rendering. No native attempt.
   *   2. `country` set   -> external proxy. No native attempt (native can't pick a country).
   *   3. free preflight says robots.txt blocks Minifetch -> external proxy.
   *   4. otherwise the native Minifetch proxy; if the target blocked it -> external proxy.
   *   5. any other failure is rethrown. Never steps up to rendering on its own.
   * Failed attempts are not charged, so at most one fetch is paid for.
   *
   * @param slug - endpoint slug, e.g. "url-metadata"
   * @param label - used in error messages
   * @param url
   * @param endpointParams - the endpoint's own params (without `url`)
   * @param options
   * @param options.render - force the external proxy with JavaScript rendering
   * @param options.country - force the external proxy, fetching from this country
   * @param options.method - "GET" or "POST" (default POST)
   */
  private async _extractWithProxyFallback(
    slug: string,
    label: string,
    url: string,
    endpointParams: RequestParams,
    options?: ProxyFallbackOptions,
  ): Promise<PaidEndpointResponse> {
    if (options?.render) {
      return this._extractVia("proxy-render", slug, label, url, endpointParams, options);
    }
    if (options?.country) {
      return this._extractVia("proxy", slug, label, url, endpointParams, options);
    }

    const checkResponse = await this.preflightUrlCheck(url);
    const check = checkResponse.results[0]?.data;
    if (!check?.allowed) {
      const message = check?.message || "URL is blocked by robots.txt";
      // Only a robots.txt block is worth the external proxy. An invalid or
      // non-existent domain fails there too, so surface it like checkAndExtract* does.
      if (!message.includes(PREFLIGHT_ROBOTS_BLOCKED)) throw new InvalidUrlError(url, message);
      return this._extractVia("proxy", slug, label, url, endpointParams, options);
    }

    try {
      return await this._extractVia("native", slug, label, url, endpointParams, options);
    } catch (error) {
      if (!this._isBlockedError(error)) throw error;
      return this._extractVia("proxy", slug, label, url, endpointParams, options);
    }
  }

  /**
   * Re-throw known error types, wrapping unknowns in ExtractionFailedError
   *
   * @param error
   * @param url
   * @param label
   */
  private _rethrowError(error: unknown, url: string, label: string): never {
    if (
      error instanceof InvalidUrlError ||
      error instanceof ExtractionFailedError ||
      error instanceof PaymentFailedError ||
      error instanceof NetworkError ||
      error instanceof RobotsBlockedError
    ) {
      throw error;
    }
    throw new ExtractionFailedError(
      url,
      `${label} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  /**
   * Search sibling of {@link _rethrowError}: re-throw known search error types,
   * wrapping anything else in SearchFailedError (which carries the query, not a URL).
   *
   * @param error
   * @param query
   * @param label
   */
  private _rethrowSearchError(error: unknown, query: string, label: string): never {
    if (
      error instanceof InvalidQueryError ||
      error instanceof SearchFailedError ||
      error instanceof PaymentFailedError ||
      error instanceof NetworkError
    ) {
      throw error;
    }
    throw new SearchFailedError(
      query,
      `${label} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
