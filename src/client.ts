import { initConfig } from "./init.js";
import { validateAndNormalizeUrl } from "./utils/validation.js";
import { handlePayment, handleApiKeyRequest } from "./utils/payment.js";
import type { ClientConfig, InitializedConfig, HttpMethod } from "./types/config.js";
import type { PreflightCheckResponse, PaidEndpointResponse } from "./types/responses.js";
import {
  InvalidUrlError,
  RobotsBlockedError,
  PaymentFailedError,
  ExtractionFailedError,
  NetworkError,
  ConfigurationError,
} from "./types/errors.js";

/** Request params before transport encoding — string or boolean values only. */
type RequestParams = Record<string, string | boolean>;

/** Every endpoint accepts GET (query string) or POST (JSON body). POST is the default. */
const DEFAULT_METHOD: HttpMethod = "POST";

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
    await this._preflightOrThrow(url);
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
    await this._preflightOrThrow(url);
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
    await this._preflightOrThrow(url);
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
    await this._preflightOrThrow(url);
    return this.extractUrlContent(url, options);
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
   * Preflight check helper — throws RobotsBlockedError if not allowed
   *
   * @param url
   */
  private async _preflightOrThrow(url: string): Promise<void> {
    const checkResponse = await this.preflightUrlCheck(url);
    if (!checkResponse.results[0]?.data?.allowed) {
      throw new RobotsBlockedError(
        url,
        checkResponse.results[0]?.data?.message || "URL is blocked by robots.txt",
      );
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
}
