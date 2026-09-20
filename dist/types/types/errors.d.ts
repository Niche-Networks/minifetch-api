/**
 * Base error class for all Minifetch errors
 */
export declare class MinifetchError extends Error {
    /**
     *
     * @param message
     */
    constructor(message: string);
}
/**
 * Thrown when URL validation fails
 */
export declare class InvalidUrlError extends MinifetchError {
    readonly url: string;
    /**
     *
     * @param url
     * @param message
     */
    constructor(url: string, message?: string);
}
/**
 * Thrown when robots.txt blocks the request
 */
export declare class RobotsBlockedError extends MinifetchError {
    readonly url: string;
    /**
     *
     * @param url
     * @param message
     */
    constructor(url: string, message?: string);
}
/**
 * Thrown when payment fails
 */
export declare class PaymentFailedError extends MinifetchError {
    readonly network?: string;
    readonly originalError?: Error;
    /**
     *
     * @param message
     * @param network
     * @param originalError
     */
    constructor(message: string, network?: string, originalError?: Error);
}
/**
 * Thrown when extraction/fetch fails
 */
export declare class ExtractionFailedError extends MinifetchError {
    readonly url: string;
    readonly statusCode?: number;
    readonly originalError?: Error;
    /**
     *
     * @param url
     * @param message
     * @param statusCode
     * @param originalError
     */
    constructor(url: string, message: string, statusCode?: number, originalError?: Error);
}
/**
 * Thrown when configuration is invalid
 */
export declare class ConfigurationError extends MinifetchError {
    /**
     *
     * @param message
     */
    constructor(message: string);
}
/**
 * Thrown when network/API communication fails
 */
export declare class NetworkError extends MinifetchError {
    readonly originalError?: Error;
    /**
     *
     * @param message
     * @param originalError
     */
    constructor(message: string, originalError?: Error);
}
/**
 * Thrown when keyword-search query validation fails (empty, or over 50 chars).
 * The query sibling of {@link InvalidUrlError} — searchByKeyword takes a query,
 * not a URL, so bad input surfaces here instead.
 */
export declare class InvalidQueryError extends MinifetchError {
    readonly query: string;
    /**
     *
     * @param query
     * @param message
     */
    constructor(query: string, message?: string);
}
/**
 * Thrown when a keyword search fails (non-OK response or unexpected error).
 * The search sibling of {@link ExtractionFailedError}: it carries the `query`
 * rather than a `url`, since search has no target URL.
 */
export declare class SearchFailedError extends MinifetchError {
    readonly query: string;
    readonly statusCode?: number;
    readonly originalError?: Error;
    /**
     *
     * @param query
     * @param message
     * @param statusCode
     * @param originalError
     */
    constructor(query: string, message: string, statusCode?: number, originalError?: Error);
}
