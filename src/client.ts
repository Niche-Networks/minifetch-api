import { processConfig } from './init.js';
import { validateAndNormalizeUrl } from './utils/validation.js';
import { handlePayment, type PaymentResult } from './utils/payment.js';
import type { ClientConfig, ProcessedConfig } from './types/config.js';
import type {
  PreflightCheckResult,
  MetadataResult,
  LinksResult,
  PreviewResult,
  ContentResult,
} from './types/results.js';
import {
  InvalidUrlError,
  RobotsBlockedError,
  ExtractionFailedError,
  NetworkError,
} from './types/errors.js';

/**
 * Main Minifetch API client
 * Provides methods to check URLs and extract metadata/links/preview/content
 */
export class MinifetchClient {
  private config: ProcessedConfig;
  private baseUrl: string;

  constructor(config: ClientConfig) {
    this.config = processConfig(config);
    this.baseUrl = this.config.apiUrl || 'https://minifetch.com';
  }

  /**
   * Check if URL is allowed by robots.txt (free preflight check)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {NetworkError} if request fails
   */
  async preflightCheckUrl(url: string): Promise<PreflightCheckResult> {
    // Validate and normalize URL
    const normalizedUrl = validateAndNormalizeUrl(url);

    // Build request URL (free endpoint, no payment)
    const endpoint = `/api/v1/free/preflight/url-check?url=${encodeURIComponent(normalizedUrl)}`;
    const requestUrl = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(requestUrl);

      if (!response.ok) {
        throw new NetworkError(
          `Preflight check failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        success: data.success,
        queryParameters: data.queryParameters,
        results: data.results,
      };
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Preflight check failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract URL metadata (paid, requires x402 payment)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if payment fails
   * @throws {ExtractionFailedError} if extraction fails
   */
  async extractUrlMetadata(
    url: string,
    options?: { includeResponseBody?: boolean }
  ): Promise<MetadataResult> {
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

    try {
      // Initial request (may return 402)
      const initialResponse = await fetch(requestUrl);

      // Handle payment if required
      const { response, payment } = await handlePayment(
        requestUrl,
        initialResponse,
        this.config
      );

      // Check if extraction succeeded
      if (!response.ok) {
        throw new ExtractionFailedError(
          `Metadata extraction failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Check for server-side errors in response
      if (!data.success) {
        throw new ExtractionFailedError(
          data.results?.[0]?.metadata?.error || "Metadata extraction failed"
        );
      }

      return {
        success: true,
        queryParameters: data.queryParameters,
        results: data.results,
        payment,
      };
    } catch (error) {
      if (
        error instanceof InvalidUrlError ||
        error instanceof ExtractionFailedError
      ) {
        throw error;
      }
      throw new ExtractionFailedError(
        `Metadata extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract URL links (paid, requires x402 payment)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if payment fails
   * @throws {ExtractionFailedError} if extraction fails
   */
  async extractUrlLinks(url: string): Promise<LinksResult> {
    const normalizedUrl = validateAndNormalizeUrl(url);

    const endpoint = `/api/v1/x402/extract/url-links?url=${encodeURIComponent(normalizedUrl)}`;
    const requestUrl = `${this.baseUrl}${endpoint}`;

    try {
      const initialResponse = await fetch(requestUrl);

      const { response, payment } = await handlePayment(
        requestUrl,
        initialResponse,
        this.config
      );

      if (!response.ok) {
        throw new ExtractionFailedError(
          `Links extraction failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new ExtractionFailedError(
          data.results?.[0]?.error?.message || "Links extraction failed"
        );
      }

      return {
        success: true,
        queryParameters: data.queryParameters,
        results: data.results,
        payment,
      };
    } catch (error) {
      if (
        error instanceof InvalidUrlError ||
        error instanceof ExtractionFailedError
      ) {
        throw error;
      }
      throw new ExtractionFailedError(
        `Links extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract URL content as markdown (paid, requires x402 payment)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if payment fails
   * @throws {ExtractionFailedError} if extraction fails
   */
  async extractUrlContent(
    url: string,
    options?: { includeMediaUrls?: boolean }
  ): Promise<ContentResult> {
    // Validate and normalize URL
    const normalizedUrl = validateAndNormalizeUrl(url);

    // Build request URL with optional params
    const params = new URLSearchParams({ url: normalizedUrl });
    if (options?.includeMediaUrls) {
      params.set("includeMediaUrls", "true");
    }

    const endpoint = `/api/v1/x402/extract/url-content?${params.toString()}`;
    const requestUrl = `${this.baseUrl}${endpoint}`;

    try {
      // Initial request (may return 402)
      const initialResponse = await fetch(requestUrl);

      // Handle payment if required
      const { response, payment } = await handlePayment(
        requestUrl,
        initialResponse,
        this.config
      );

      // Check if extraction succeeded
      if (!response.ok) {
        throw new ExtractionFailedError(
          `Content extraction failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Check for server-side errors in response
      if (!data.success) {
        throw new ExtractionFailedError(
          data.results?.[0]?.content?.error?.message || "Content extraction failed"
        );
      }

      return {
        success: true,
        queryParameters: data.queryParameters,
        results: data.results,
        payment,
      };
    } catch (error) {
      if (
        error instanceof InvalidUrlError ||
        error instanceof ExtractionFailedError
      ) {
        throw error;
      }
      throw new ExtractionFailedError(
        `Content extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract URL preview (paid, requires x402 payment)
   * @throws {InvalidUrlError} if URL is invalid
   * @throws {PaymentFailedError} if payment fails
   * @throws {ExtractionFailedError} if extraction fails
   */
  async extractUrlPreview(url: string): Promise<PreviewResult> {
    // Validate and normalize URL
    const normalizedUrl = validateAndNormalizeUrl(url);

    // Build request URL
    const endpoint = `/api/v1/x402/extract/url-preview?url=${encodeURIComponent(normalizedUrl)}`;
    const requestUrl = `${this.baseUrl}${endpoint}`;

    try {
      // Initial request (may return 402)
      const initialResponse = await fetch(requestUrl);

      // Handle payment if required
      const { response, payment } = await handlePayment(
        requestUrl,
        initialResponse,
        this.config
      );

      // Check if extraction succeeded
      if (!response.ok) {
        throw new ExtractionFailedError(
          `Preview extraction failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Check for server-side errors in response
      if (!data.success) {
        throw new ExtractionFailedError(
          data.results?.[0]?.metadata?.error?.message || "Preview extraction failed"
        );
      }

      return {
        success: true,
        queryParameters: data.queryParameters,
        results: data.results,
        payment,
      };
    } catch (error) {
      if (
        error instanceof InvalidUrlError ||
        error instanceof ExtractionFailedError
      ) {
        throw error;
      }
      throw new ExtractionFailedError(
        `Preview extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check URL and extract metadata in one call
   * Throws RobotsBlockedError if robots.txt blocks the URL
   */
  async checkAndExtractMetadata(
    url: string,
    options?: { includeResponseBody?: boolean }
): Promise<MetadataResult> {
    const checkResult = await this.preflightCheckUrl(url);

    if (!checkResult.results[0]?.allowed) {
      throw new RobotsBlockedError(
        checkResult.results[0]?.message || "URL blocked by robots.txt"
      );
    }

    return this.extractUrlMetadata(url, options);
  }

  /**
   * Check URL and extract links in one call
   * Throws RobotsBlockedError if robots.txt blocks the URL
   */
  async checkAndExtractLinks(url: string): Promise<LinksResult> {
    const checkResult = await this.preflightCheckUrl(url);

    if (!checkResult.results[0]?.allowed) {
      throw new RobotsBlockedError(
        checkResult.results[0]?.message || "URL blocked by robots.txt"
      );
    }

    return this.extractUrlLinks(url);
  }

  /**
   * Check URL and extract content in one call
   * Throws RobotsBlockedError if robots.txt blocks the URL
   */
  async checkAndExtractContent(
    url: string,
    options?: { includeMediaUrls?: boolean }
  ): Promise<ContentResult> {
    const checkResult = await this.preflightCheckUrl(url);

    if (!checkResult.results[0]?.allowed) {
      throw new RobotsBlockedError(
        checkResult.results[0]?.message || "URL blocked by robots.txt"
      );
    }

    return this.extractUrlContent(url, options);
  }

  /**
   * Check URL and extract preview in one call
   * Throws RobotsBlockedError if robots.txt blocks the URL
   */
  async checkAndExtractPreview(url: string): Promise<PreviewResult> {
    const checkResult = await this.preflightCheckUrl(url);

    if (!checkResult.results[0]?.allowed) {
      throw new RobotsBlockedError(
        checkResult.results[0]?.message || "URL blocked by robots.txt"
      );
    }

    return this.extractUrlPreview(url);
  }
}
