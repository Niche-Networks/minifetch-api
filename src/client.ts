import { initConfig } from "./init.js";
import { validateAndNormalizeUrl } from "./utils/validation.js";
import { handlePayment } from "./utils/payment.js";
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
 * Main Minifetch API client
 * Provides methods to check URLs and extract metadata/links/preview/content
 */
export class MinifetchClient {
  private config: InitializedConfig;
  private baseUrl: string;

  /**
   *
   * @param config
   */
  constructor(config: ClientConfig) {
    this.config = initConfig(config);
    this.baseUrl = this.config.apiBaseUrl;
  }

  /**
   * Check if URL is allowed by robots.txt (free preflight check)
   *
   * @param url
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {NetworkError} if request fails
   */
  async preflightUrlCheck(url: string): Promise<PreflightCheckResponse> {
    try {
      // Validate and normalize URL
      const normalizedUrl = validateAndNormalizeUrl(url);

      // Build request URL (free endpoint, no payment)
      const endpoint = `/api/v1/free/preflight/url-check?url=${encodeURIComponent(normalizedUrl)}`;
      const requestUrl = `${this.baseUrl}${endpoint}`;

      const response = await fetch(requestUrl);

      if (!response.ok) {
        throw new NetworkError(`Preflight check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return data;
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
   * Extract URL metadata (paid, requires x402 payment)
   *
   * @param url
   * @param options
   * @param options.includeResponseBody
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if payment fails
   * @throws {ExtractionFailedError} if extraction fails
   */
  async extractUrlMetadata(
    url: string,
    options?: { includeResponseBody?: boolean },
  ): Promise<PaidEndpointResponse> {
    try {
      // Validate and normalize URL
      const normalizedUrl = validateAndNormalizeUrl(url);

      // Build request URL with optional params
      const params = new URLSearchParams({ url: normalizedUrl });
      if (options?.includeResponseBody) {
        params.set("includeResponseBody", "true");
      }

      // Build request URL - convert params to string
      const endpoint = `/api/v1/x402/extract/url-metadata?${params.toString()}`;
      const requestUrl = `${this.baseUrl}${endpoint}`;

      // Make request with x402 payment handling
      const { response, payment } = await handlePayment(requestUrl, this.config);

      // Check if extraction succeeded
      if (!response.ok) {
        throw new ExtractionFailedError(
          `Metadata extraction failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return {
        success: data.success,
        results: data.results,
        payment,
      };
    } catch (error) {
      if (
        error instanceof InvalidUrlError ||
        error instanceof ExtractionFailedError ||
        error instanceof PaymentFailedError ||
        error instanceof NetworkError
      ) {
        throw error;
      }
      throw new ExtractionFailedError(
        `Metadata extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract URL links (paid, requires x402 payment)
   *
   * @param url
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if payment fails
   * @throws {ExtractionFailedError} if extraction fails
   */
  async extractUrlLinks(url: string): Promise<PaidEndpointResponse> {
    try {
      const normalizedUrl = validateAndNormalizeUrl(url);

      const endpoint = `/api/v1/x402/extract/url-links?url=${encodeURIComponent(normalizedUrl)}`;
      const requestUrl = `${this.baseUrl}${endpoint}`;

      // Make request with x402 payment handling
      const { response, payment } = await handlePayment(requestUrl, this.config);

      if (!response.ok) {
        throw new ExtractionFailedError(
          `Links extraction failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return {
        success: data.success,
        results: data.results,
        payment,
      };
    } catch (error) {
      if (
        error instanceof InvalidUrlError ||
        error instanceof ExtractionFailedError ||
        error instanceof PaymentFailedError ||
        error instanceof NetworkError
      ) {
        throw error;
      }
      throw new ExtractionFailedError(
        `Links extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract URL preview (paid, requires x402 payment)
   *
   * @param url
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if payment fails
   * @throws {ExtractionFailedError} if extraction fails
   */
  async extractUrlPreview(url: string): Promise<PaidEndpointResponse> {
    try {
      // Validate and normalize URL
      const normalizedUrl = validateAndNormalizeUrl(url);

      // Build request URL
      const endpoint = `/api/v1/x402/extract/url-preview?url=${encodeURIComponent(normalizedUrl)}`;
      const requestUrl = `${this.baseUrl}${endpoint}`;

      // Make request with x402 payment handling
      const { response, payment } = await handlePayment(requestUrl, this.config);

      // Check if extraction succeeded
      if (!response.ok) {
        throw new ExtractionFailedError(
          `Preview extraction failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return {
        success: data.success,
        results: data.results,
        payment,
      };
    } catch (error) {
      if (
        error instanceof InvalidUrlError ||
        error instanceof ExtractionFailedError ||
        error instanceof PaymentFailedError ||
        error instanceof NetworkError
      ) {
        throw error;
      }
      throw new ExtractionFailedError(
        `Preview extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract URL content as markdown (paid, requires x402 payment)
   *
   * @param url
   * @param options
   * @param options.includeMediaUrls
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if payment fails
   * @throws {ExtractionFailedError} if extraction fails
   */
  async extractUrlContent(
    url: string,
    options?: { includeMediaUrls?: boolean },
  ): Promise<PaidEndpointResponse> {
    try {
      // Validate and normalize URL
      const normalizedUrl = validateAndNormalizeUrl(url);

      // Build request URL with optional params
      const params = new URLSearchParams({ url: normalizedUrl });
      if (options?.includeMediaUrls) {
        params.set("includeMediaUrls", "true");
      }

      const endpoint = `/api/v1/x402/extract/url-content?${params.toString()}`;
      const requestUrl = `${this.baseUrl}${endpoint}`;

      // Make request with x402 payment handling
      const { response, payment } = await handlePayment(requestUrl, this.config);

      // Check if extraction succeeded
      if (!response.ok) {
        throw new ExtractionFailedError(
          `Content extraction failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return {
        success: data.success,
        results: data.results,
        payment,
      };
    } catch (error) {
      if (
        error instanceof InvalidUrlError ||
        error instanceof ExtractionFailedError ||
        error instanceof PaymentFailedError ||
        error instanceof NetworkError
      ) {
        throw error;
      }
      throw new ExtractionFailedError(
        `Content extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check URL and extract metadata in one call
   * Throws RobotsBlockedError if robots.txt blocks the URL
   *
   * @param url
   * @param options
   * @param options.includeResponseBody
   */
  async checkAndExtractUrlMetadata(
    url: string,
    options?: { includeResponseBody?: boolean },
  ): Promise<PaidEndpointResponse> {
    const checkResponse = await this.preflightUrlCheck(url);

    if (!checkResponse.results[0]?.data?.allowed) {
      throw new RobotsBlockedError(
        url,
        checkResponse.results[0]?.data?.message || "URL is blocked by robots.txt",
      );
    }

    return this.extractUrlMetadata(url, options);
  }

  /**
   * Check URL and extract links in one call
   * Throws RobotsBlockedError if robots.txt blocks the URL
   *
   * @param url
   */
  async checkAndExtractUrlLinks(url: string): Promise<PaidEndpointResponse> {
    const checkResponse = await this.preflightUrlCheck(url);

    if (!checkResponse.results[0]?.data?.allowed) {
      throw new RobotsBlockedError(
        url,
        checkResponse.results[0]?.data?.message || "URL is blocked by robots.txt",
      );
    }

    return this.extractUrlLinks(url);
  }

  /**
   * Check URL and extract preview in one call
   * Throws RobotsBlockedError if robots.txt blocks the URL
   *
   * @param url
   */
  async checkAndExtractUrlPreview(url: string): Promise<PaidEndpointResponse> {
    const checkResponse = await this.preflightUrlCheck(url);

    if (!checkResponse.results[0]?.data?.allowed) {
      throw new RobotsBlockedError(
        url,
        checkResponse.results[0]?.data?.message || "URL is blocked by robots.txt",
      );
    }

    return this.extractUrlPreview(url);
  }

  /**
   * Check URL and extract content in one call
   * Throws RobotsBlockedError if robots.txt blocks the URL
   *
   * @param url
   * @param options
   * @param options.includeMediaUrls
   */
  async checkAndExtractUrlContent(
    url: string,
    options?: { includeMediaUrls?: boolean },
  ): Promise<PaidEndpointResponse> {
    const checkResponse = await this.preflightUrlCheck(url);

    if (!checkResponse.results[0]?.data?.allowed) {
      throw new RobotsBlockedError(
        url,
        checkResponse.results[0]?.data?.message || "URL is blocked by robots.txt",
      );
    }

    return this.extractUrlContent(url, options);
  }
}
