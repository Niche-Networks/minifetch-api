import type { ClientConfig } from "./types/config.js";
import type { PreflightCheckResponse, PaidEndpointResponse } from "./types/responses.js";
/**
 * Main Minifetch API client
 * Provides methods to check URLs and extract metadata/links/preview/content
 */
export declare class MinifetchClient {
    private config;
    private baseUrl;
    /**
     *
     * @param config
     */
    constructor(config: ClientConfig);
    /**
     * Check if URL is allowed by robots.txt (free preflight check)
     *
     * @param url
     * @throws {InvalidUrlError} if URL is invalid
     * @throws {NetworkError} if request fails
     */
    preflightUrlCheck(url: string): Promise<PreflightCheckResponse>;
    /**
     * Extract URL metadata (paid, requires x402 payment)
     *
     * @param url
     * @param options
     * @param options.includeResponseBody
     * @param options.verbosity - Controls response detail level: "standard" (default) or "full"
     * @throws {InvalidUrlError} if URL is invalid
     * @throws {ExtractionFailedError} various reasons, check README
     * @throws {PaymentFailedError} if payment fails
     * @throws {NetworkError} various reasons, check README
     */
    extractUrlMetadata(url: string, options?: {
        verbosity?: "standard" | "full";
        includeResponseBody?: boolean;
    }): Promise<PaidEndpointResponse>;
    /**
     * Extract URL links (paid, requires x402 payment)
     *
     * @param url
     * @throws {InvalidUrlError} if URL is invalid
     * @throws {ExtractionFailedError} various reasons, check README
     * @throws {PaymentFailedError} if payment fails
     * @throws {NetworkError} various reasons, check README
     */
    extractUrlLinks(url: string): Promise<PaidEndpointResponse>;
    /**
     * Extract URL preview (paid, requires x402 payment)
     *
     * @param url
     * @throws {InvalidUrlError} if URL is invalid
     * @throws {ExtractionFailedError} various reasons, check README
     * @throws {PaymentFailedError} if payment fails
     * @throws {NetworkError} various reasons, check README
     */
    extractUrlPreview(url: string): Promise<PaidEndpointResponse>;
    /**
     * Extract URL content as markdown (paid, requires x402 payment)
     *
     * @param url
     * @param options
     * @param options.includeMediaUrls
     * @throws {InvalidUrlError} if URL is invalid
     * @throws {ExtractionFailedError} various reasons, check README
     * @throws {PaymentFailedError} if payment fails
     * @throws {NetworkError} various reasons, check README
     */
    extractUrlContent(url: string, options?: {
        includeMediaUrls?: boolean;
    }): Promise<PaidEndpointResponse>;
    /**
     * Check URL and extract metadata in one call
     * Throws RobotsBlockedError if robots.txt blocks the URL
     *
     * @param url
     * @param options
     * @param options.verbosity - Controls response detail level: "standard" (default) or "full"
     * @param options.includeResponseBody - Include raw response body in result
     */
    checkAndExtractUrlMetadata(url: string, options?: {
        verbosity?: "standard" | "full";
        includeResponseBody?: boolean;
    }): Promise<PaidEndpointResponse>;
    /**
     * Check URL and extract links in one call
     * Throws RobotsBlockedError if robots.txt blocks the URL
     *
     * @param url
     */
    checkAndExtractUrlLinks(url: string): Promise<PaidEndpointResponse>;
    /**
     * Check URL and extract preview in one call
     * Throws RobotsBlockedError if robots.txt blocks the URL
     *
     * @param url
     */
    checkAndExtractUrlPreview(url: string): Promise<PaidEndpointResponse>;
    /**
     * Check URL and extract content in one call
     * Throws RobotsBlockedError if robots.txt blocks the URL
     *
     * @param url
     * @param options
     * @param options.includeMediaUrls
     */
    checkAndExtractUrlContent(url: string, options?: {
        includeMediaUrls?: boolean;
    }): Promise<PaidEndpointResponse>;
}
