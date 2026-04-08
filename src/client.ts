import { initConfig } from "./init.js";
import { validateAndNormalizeUrl } from "./utils/validation.js";
import { handlePayment, handleApiKeyRequest } from "./utils/payment.js";
import type { ClientConfig, InitializedConfig } from "./types/config.js";
import type { PreflightCheckResponse, PaidEndpointResponse } from "./types/responses.js";
import {
  InvalidUrlError,
  RobotsBlockedError,
  PaymentFailedError,
  ExtractionFailedError,
  NetworkError,
} from "./types/errors.js";

/**
 * Main Minifetch API client.
 * Supports two auth modes:
 *   - x402: crypto micropayments via Coinbase x402 (pass network + privateKey)
 *   - apiKey: Stripe-backed credits (pass apiKey: "mf_prod_..." or "mf_dev_...")
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
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {NetworkError} if request fails
   */
  async preflightUrlCheck(url: string): Promise<PreflightCheckResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);
      const requestUrl = `${this.baseUrl}/api/v1/free/preflight/url-check?url=${encodeURIComponent(normalizedUrl)}`;
      const response = await fetch(requestUrl);

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
   * Extract URL metadata (paid endpoint)
   *
   * @param url
   * @param options
   * @param options.verbosity - "standard" (default) or "full"
   * @param options.includeResponseBody
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {ExtractionFailedError} various reasons, check README
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlMetadata(
    url: string,
    options?: {
      verbosity?: "standard" | "full";
      includeResponseBody?: boolean;
    },
  ): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);

      const params = new URLSearchParams({ url: normalizedUrl });
      if (options?.verbosity) params.set("verbosity", options.verbosity);
      if (options?.includeResponseBody) params.set("includeResponseBody", "true");

      const requestUrl = `${this.baseUrl}${this._extractPath("url-metadata")}?${params.toString()}`;

      return await this._makeRequest(requestUrl, normalizedUrl, "Metadata extraction");
    } catch (error) {
      return this._rethrowExtraction(error, url, "Metadata extraction");
    }
  }

  /**
   * Extract URL links (paid endpoint)
   *
   * @param url
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {ExtractionFailedError} various reasons, check README
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlLinks(url: string): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);
      const requestUrl = `${this.baseUrl}${this._extractPath("url-links")}?url=${encodeURIComponent(normalizedUrl)}`;
      return await this._makeRequest(requestUrl, normalizedUrl, "Links extraction");
    } catch (error) {
      return this._rethrowExtraction(error, url, "Links extraction");
    }
  }

  /**
   * Extract URL preview (paid endpoint)
   *
   * @param url
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {ExtractionFailedError} various reasons, check README
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlPreview(url: string): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);
      const requestUrl = `${this.baseUrl}${this._extractPath("url-preview")}?url=${encodeURIComponent(normalizedUrl)}`;
      return await this._makeRequest(requestUrl, normalizedUrl, "Preview extraction");
    } catch (error) {
      return this._rethrowExtraction(error, url, "Preview extraction");
    }
  }

  /**
   * Extract URL content as markdown (paid endpoint)
   *
   * @param url
   * @param options
   * @param options.includeMediaUrls
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {ExtractionFailedError} various reasons, check README
   * @throws {PaymentFailedError} if x402 payment fails
   * @throws {NetworkError} various reasons, check README
   */
  async extractUrlContent(
    url: string,
    options?: { includeMediaUrls?: boolean },
  ): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);

      const params = new URLSearchParams({ url: normalizedUrl });
      if (options?.includeMediaUrls) params.set("includeMediaUrls", "true");

      const requestUrl = `${this.baseUrl}${this._extractPath("url-content")}?${params.toString()}`;
      return await this._makeRequest(requestUrl, normalizedUrl, "Content extraction");
    } catch (error) {
      return this._rethrowExtraction(error, url, "Content extraction");
    }
  }

  /**
   * Check URL then extract metadata in one call.
   * Throws RobotsBlockedError if robots.txt blocks the URL.
   *
   * @param url
   * @param options
   * @param options.verbosity - "standard" (default) or "full"
   * @param options.includeResponseBody
   */
  async checkAndExtractUrlMetadata(
    url: string,
    options?: { verbosity?: "standard" | "full"; includeResponseBody?: boolean },
  ): Promise<PaidEndpointResponse> {
    await this._preflightOrThrow(url);
    return this.extractUrlMetadata(url, options);
  }

  /**
   * Check URL then extract links in one call.
   * Throws RobotsBlockedError if robots.txt blocks the URL.
   *
   * @param url
   */
  async checkAndExtractUrlLinks(url: string): Promise<PaidEndpointResponse> {
    await this._preflightOrThrow(url);
    return this.extractUrlLinks(url);
  }

  /**
   * Check URL then extract preview in one call.
   * Throws RobotsBlockedError if robots.txt blocks the URL.
   *
   * @param url
   */
  async checkAndExtractUrlPreview(url: string): Promise<PaidEndpointResponse> {
    await this._preflightOrThrow(url);
    return this.extractUrlPreview(url);
  }

  /**
   * Check URL then extract content in one call.
   * Throws RobotsBlockedError if robots.txt blocks the URL.
   *
   * @param url
   * @param options
   * @param options.includeMediaUrls
   */
  async checkAndExtractUrlContent(
    url: string,
    options?: { includeMediaUrls?: boolean },
  ): Promise<PaidEndpointResponse> {
    await this._preflightOrThrow(url);
    return this.extractUrlContent(url, options);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the correct extract path segment based on auth mode.
   * x402 → /api/v1/x402/extract/<endpoint>
   * apiKey → /api/v1/extract/<endpoint>
   *
   * @param endpoint
   */
  private _extractPath(endpoint: string): string {
    return this.config.authMode === "x402"
      ? `/api/v1/x402/extract/${endpoint}`
      : `/api/v1/extract/${endpoint}`;
  }

  /**
   * Dispatch to the correct request handler based on auth mode, then
   * normalize the response into PaidEndpointResponse.
   * Note: payment field is only present for x402 responses.
   *
   * @param requestUrl
   * @param normalizedUrl
   * @param label - used in error messages
   */
  private async _makeRequest(
    requestUrl: string,
    normalizedUrl: string,
    label: string,
  ): Promise<PaidEndpointResponse> {
    if (this.config.authMode === "x402") {
      const { response, payment } = await handlePayment(requestUrl, this.config);
      if (!response.ok) {
        throw new ExtractionFailedError(normalizedUrl, `${label} failed: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as PaidEndpointResponse;
      return { success: data.success, results: data.results, payment };
    } else {
      const { response } = await handleApiKeyRequest(requestUrl, this.config);
      if (!response.ok) {
        throw new ExtractionFailedError(normalizedUrl, `${label} failed: ${response.status} ${response.statusText}`);
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
  private _rethrowExtraction(error: unknown, url: string, label: string): never {
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
