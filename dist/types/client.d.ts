import type { ClientConfig, HttpMethod } from "./types/config.js";
import type { PreflightCheckResponse, PaidEndpointResponse } from "./types/responses.js";
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
     * @param options
     * @param options.fresh
     * @param options.method - "GET" or "POST" (default POST)
     * @throws {InvalidUrlError} if URL is invalid
     * @throws {NetworkError} if request fails
     */
    preflightUrlCheck(url: string, options?: {
        fresh?: boolean;
        method?: HttpMethod;
    }): Promise<PreflightCheckResponse>;
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
    runSeoPageAudit(url: string, options?: {
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
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
    extractUrlMetadata(url: string, options?: {
        fields?: string[];
        omitEmpty?: boolean;
        includeResponseBody?: boolean;
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
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
    extractUrlLinks(url: string, options?: {
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
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
    extractUrlPreview(url: string, options?: {
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
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
    extractUrlContent(url: string, options?: {
        includeMediaUrls?: boolean;
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
    /**
     * Check URL then run SEO page audit in one call.
     * Throws RobotsBlockedError if robots.txt blocks the URL.
     *
     * @param url
     * @param options
     * @param options.method - "GET" or "POST" (default POST)
     */
    checkAndRunSeoPageAudit(url: string, options?: {
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
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
    checkAndExtractUrlMetadata(url: string, options?: {
        fields?: string[];
        omitEmpty?: boolean;
        includeResponseBody?: boolean;
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
    /**
     * Check URL then extract links in one call.
     * Throws RobotsBlockedError if robots.txt blocks the URL.
     *
     * @param url
     * @param options
     * @param options.method - "GET" or "POST" (default POST)
     */
    checkAndExtractUrlLinks(url: string, options?: {
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
    /**
     * Check URL then extract preview in one call.
     * Throws RobotsBlockedError if robots.txt blocks the URL.
     *
     * @param url
     * @param options
     * @param options.method - "GET" or "POST" (default POST)
     */
    checkAndExtractUrlPreview(url: string, options?: {
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
    /**
     * Check URL then extract content in one call.
     * Throws RobotsBlockedError if robots.txt blocks the URL.
     *
     * @param url
     * @param options
     * @param options.includeMediaUrls
     * @param options.method - "GET" or "POST" (default POST)
     */
    checkAndExtractUrlContent(url: string, options?: {
        includeMediaUrls?: boolean;
        method?: HttpMethod;
    }): Promise<PaidEndpointResponse>;
    /**
     * Returns the correct paid path segment based on auth mode.
     * x402 → /api/v1/x402/<endpoint>
     * apiKey → /api/v1/<endpoint>
     *
     * @param endpoint
     */
    private _paidPath;
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
    private _buildRequest;
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
    private _rethrowError;
}
