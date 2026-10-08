import type { ClientConfig, HttpMethod } from "./types/config.js";
import type { PreflightCheckResponse, PaidEndpointResponse, SearchKeywordResponse } from "./types/responses.js";
/** Options shared by the url-metadata methods. */
type MetadataOptions = {
    fields?: string[];
    omitEmpty?: boolean;
    includeResponseBody?: boolean;
};
/** Options shared by the url-content methods. */
type ContentOptions = {
    includeMediaUrls?: boolean;
};
/** Options of the external proxy methods (proxyExtract*, proxyRenderExtract*). */
type ProxyOptions = {
    country?: string;
    method?: HttpMethod;
};
/** Options of the extract*WithProxyFallback methods. */
type ProxyFallbackOptions = ProxyOptions & {
    render?: boolean;
};
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
    searchByKeyword(query: string, options?: {
        limit?: number;
        descriptionLength?: number;
        method?: HttpMethod;
    }): Promise<SearchKeywordResponse>;
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
    _exercisePaidUrlCheck(url: string, options?: {
        fresh?: boolean;
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
    proxyExtractUrlMetadata(url: string, options?: MetadataOptions & ProxyOptions): Promise<PaidEndpointResponse>;
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
    proxyExtractUrlLinks(url: string, options?: ProxyOptions): Promise<PaidEndpointResponse>;
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
    proxyExtractUrlPreview(url: string, options?: ProxyOptions): Promise<PaidEndpointResponse>;
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
    proxyExtractUrlContent(url: string, options?: ContentOptions & ProxyOptions): Promise<PaidEndpointResponse>;
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
    proxyRenderExtractUrlMetadata(url: string, options?: MetadataOptions & ProxyOptions): Promise<PaidEndpointResponse>;
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
    proxyRenderExtractUrlLinks(url: string, options?: ProxyOptions): Promise<PaidEndpointResponse>;
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
    proxyRenderExtractUrlPreview(url: string, options?: ProxyOptions): Promise<PaidEndpointResponse>;
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
    proxyRenderExtractUrlContent(url: string, options?: ContentOptions & ProxyOptions): Promise<PaidEndpointResponse>;
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
    extractUrlMetadataWithProxyFallback(url: string, options?: MetadataOptions & ProxyFallbackOptions): Promise<PaidEndpointResponse>;
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
    extractUrlLinksWithProxyFallback(url: string, options?: ProxyFallbackOptions): Promise<PaidEndpointResponse>;
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
    extractUrlPreviewWithProxyFallback(url: string, options?: ProxyFallbackOptions): Promise<PaidEndpointResponse>;
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
    extractUrlContentWithProxyFallback(url: string, options?: ContentOptions & ProxyFallbackOptions): Promise<PaidEndpointResponse>;
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
     * Search-specific request path. Mirrors {@link _makeRequest} but for the
     * keyword search endpoint: there is no URL, non-OK responses surface as
     * SearchFailedError (carrying the query), and the server's clamped
     * `queryParameters` echo is preserved rather than dropped.
     *
     * @param params - request params (query + optional limit/descriptionLength)
     * @param method - "GET" or "POST" (default POST)
     */
    private _makeSearchRequest;
    /**
     * Preflight check helper — throws RobotsBlockedError on a robots.txt block,
     * InvalidUrlError when the domain itself is invalid or doesn't exist.
     *
     * @param url
     * @param proxySlug - the extract endpoint being checked (e.g. "url-metadata").
     *   When given, a robots.txt block sets `error.tip` to the proxy methods for
     *   that endpoint. Omit for the SEO page audit, which has no proxy version.
     *   The message itself is never changed.
     */
    private _preflightOrThrow;
    /**
     * Request params for the url-metadata endpoint (without `url`).
     *
     * @param options
     */
    private _metadataParams;
    /**
     * Request params for the url-content endpoint (without `url`).
     *
     * @param options
     */
    private _contentParams;
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
    private _extractVia;
    /**
     * True when a failed native fetch means the target blocked the native
     * Minifetch proxy (robots.txt, or an upstream 403 / 429 / 503), so the
     * external proxy is worth trying. Anything else (404, DNS, bad url, payment)
     * would fail there too.
     *
     * @param error
     */
    private _isBlockedError;
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
    private _extractWithProxyFallback;
    /**
     * Re-throw known error types, wrapping unknowns in ExtractionFailedError
     *
     * @param error
     * @param url
     * @param label
     */
    private _rethrowError;
    /**
     * Search sibling of {@link _rethrowError}: re-throw known search error types,
     * wrapping anything else in SearchFailedError (which carries the query, not a URL).
     *
     * @param error
     * @param query
     * @param label
     */
    private _rethrowSearchError;
}
export {};
