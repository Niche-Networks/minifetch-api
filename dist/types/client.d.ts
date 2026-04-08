import type { ClientConfig } from "./types/config.js";
import type { PreflightCheckResponse, PaidEndpointResponse } from "./types/responses.js";
/**
 * Main Minifetch API client.
 * Supports two auth modes:
 *   - x402: crypto micropayments via Coinbase x402 (pass network + privateKey)
 *   - apiKey: Stripe-backed credits (pass apiKey: "mf_prod_..." or "mf_dev_...")
 */
export declare class MinifetchClient {
    private config;
    private baseUrl;
    /**
     * @param config - Either { network, privateKey } for x402 or { apiKey } for API key auth
     */
    constructor(config: ClientConfig);
    /**
     * Check if URL is allowed by robots.txt (free preflight check — no auth required)
     *
     * @param url
     * @throws {InvalidUrlError} if URL is invalid
     * @throws {NetworkError} if request fails
     */
    preflightUrlCheck(url: string): Promise<PreflightCheckResponse>;
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
    extractUrlMetadata(url: string, options?: {
        verbosity?: "standard" | "full";
        includeResponseBody?: boolean;
    }): Promise<PaidEndpointResponse>;
    /**
     * Extract URL links (paid endpoint)
     *
     * @param url
     * @throws {InvalidUrlError} if URL is invalid
     * @throws {ExtractionFailedError} various reasons, check README
     * @throws {PaymentFailedError} if x402 payment fails
     * @throws {NetworkError} various reasons, check README
     */
    extractUrlLinks(url: string): Promise<PaidEndpointResponse>;
    /**
     * Extract URL preview (paid endpoint)
     *
     * @param url
     * @throws {InvalidUrlError} if URL is invalid
     * @throws {ExtractionFailedError} various reasons, check README
     * @throws {PaymentFailedError} if x402 payment fails
     * @throws {NetworkError} various reasons, check README
     */
    extractUrlPreview(url: string): Promise<PaidEndpointResponse>;
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
    extractUrlContent(url: string, options?: {
        includeMediaUrls?: boolean;
    }): Promise<PaidEndpointResponse>;
    /**
     * Check URL then extract metadata in one call.
     * Throws RobotsBlockedError if robots.txt blocks the URL.
     *
     * @param url
     * @param options
     * @param options.verbosity - "standard" (default) or "full"
     * @param options.includeResponseBody
     */
    checkAndExtractUrlMetadata(url: string, options?: {
        verbosity?: "standard" | "full";
        includeResponseBody?: boolean;
    }): Promise<PaidEndpointResponse>;
    /**
     * Check URL then extract links in one call.
     * Throws RobotsBlockedError if robots.txt blocks the URL.
     *
     * @param url
     */
    checkAndExtractUrlLinks(url: string): Promise<PaidEndpointResponse>;
    /**
     * Check URL then extract preview in one call.
     * Throws RobotsBlockedError if robots.txt blocks the URL.
     *
     * @param url
     */
    checkAndExtractUrlPreview(url: string): Promise<PaidEndpointResponse>;
    /**
     * Check URL then extract content in one call.
     * Throws RobotsBlockedError if robots.txt blocks the URL.
     *
     * @param url
     * @param options
     * @param options.includeMediaUrls
     */
    checkAndExtractUrlContent(url: string, options?: {
        includeMediaUrls?: boolean;
    }): Promise<PaidEndpointResponse>;
    /**
     * Returns the correct extract path segment based on auth mode.
     * x402 → /api/v1/x402/extract/<endpoint>
     * apiKey → /api/v1/extract/<endpoint>
     *
     * @param endpoint
     */
    private _extractPath;
    /**
     * Dispatch to the correct request handler based on auth mode, then
     * normalize the response into PaidEndpointResponse.
     * Note: payment field is only present for x402 responses.
     *
     * @param requestUrl
     * @param normalizedUrl
     * @param label - used in error messages
     */
    private _makeRequest;
    /**
     * Preflight check helper — throws RobotsBlockedError if not allowed
     *
     * @param url
     */
    private _preflightOrThrow;
    /**
     * Re-throw known error types, wrapping unknowns in ExtractionFailedError
     *
     * @param error
     * @param url
     * @param label
     */
    private _rethrowExtraction;
}
