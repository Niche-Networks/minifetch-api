import { initConfig } from "./init.js";
import { validateAndNormalizeUrl, validateAndNormalizeQuery } from "./utils/validation.js";
import { handlePayment, handleApiKeyRequest } from "./utils/payment.js";
import { InvalidUrlError, InvalidQueryError, RobotsBlockedError, PaymentFailedError, ExtractionFailedError, SearchFailedError, NetworkError, ConfigurationError, } from "./types/errors.js";
/** Every endpoint accepts GET (query string) or POST (JSON body). POST is the default. */
const DEFAULT_METHOD = "POST";
const TIER_PREFIX = {
    native: "",
    proxy: "/proxy",
    "proxy-render": "/proxy/render",
};
/**
 * Server error messages meaning the target blocked the native Minifetch proxy,
 * so the external proxy may get through. The server sends its "retry via
 * external proxy" tip in exactly these cases.
 */
const BLOCKED_SERVER_MESSAGES = new Set([
    "robots blocked",
    "upstream forbidden",
    "upstream rate limited",
    "upstream unavailable",
]);
/**
 * Marks the one preflight "not allowed" message that is NOT a robots.txt block:
 * the domain is invalid or doesn't exist. Any other not-allowed message
 * (including one the server adds later) is treated as a robots.txt block.
 */
const PREFLIGHT_BAD_DOMAIN = "non-existent domain";
/**
 * `tip` for a RobotsBlockedError from a checkAndExtract* method: names the two
 * methods that can fetch that same endpoint through the external proxy.
 *
 * @param slug - endpoint slug, e.g. "url-metadata"
 * @returns e.g. "... use proxyExtractUrlMetadata or extractUrlMetadataWithProxyFallback ..."
 */
function proxyTipFor(slug) {
    // "url-metadata" -> "UrlMetadata"
    const name = slug
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
    return `To fetch it anyway, use proxyExtract${name} or extract${name}WithProxyFallback (external proxy, does not check robots.txt).`;
}
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
    config;
    baseUrl;
    /**
     * @param config - Either { network, privateKey } for x402 or { apiKey } for API key auth
     */
    constructor(config) {
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
    async searchByKeyword(query, options) {
        try {
            const cleanQuery = validateAndNormalizeQuery(query);
            const params = { query: cleanQuery };
            if (options?.limit !== undefined)
                params.limit = options.limit;
            if (options?.descriptionLength !== undefined)
                params.descriptionLength = options.descriptionLength;
            return await this._makeSearchRequest(params, options?.method);
        }
        catch (error) {
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
    async preflightUrlCheck(url, options) {
        try {
            const normalizedUrl = validateAndNormalizeUrl(url);
            const params = { url: normalizedUrl };
            if (options?.fresh)
                params.fresh = true;
            const { url: requestUrl, init } = this._buildRequest("/api/v1/free/preflight/url-check", params, options?.method ?? DEFAULT_METHOD);
            const response = await fetch(requestUrl, init);
            if (!response.ok) {
                throw new NetworkError(`Preflight check failed: ${response.status} ${response.statusText}`, undefined, { statusCode: response.status });
            }
            return (await response.json());
        }
        catch (error) {
            if (error instanceof InvalidUrlError || error instanceof NetworkError) {
                throw error;
            }
            throw new NetworkError(`Preflight check failed: ${error instanceof Error ? error.message : "Unknown error"}`, error instanceof Error ? error : undefined);
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
    async _exercisePaidUrlCheck(url, options) {
        if (this.config.authMode !== "x402") {
            throw new ConfigurationError("_exercisePaidUrlCheck requires x402 auth (network + privateKey)");
        }
        try {
            const normalizedUrl = validateAndNormalizeUrl(url);
            const params = { url: normalizedUrl };
            if (options?.fresh)
                params.fresh = true;
            return await this._makeRequest("/preflight/url-check", normalizedUrl, "Paid URL check", params, options?.method);
        }
        catch (error) {
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
    async extractUrlMetadata(url, options) {
        try {
            const normalizedUrl = validateAndNormalizeUrl(url);
            const params = { url: normalizedUrl };
            if (options?.fields?.length)
                params.fields = options.fields.join(",");
            if (options?.omitEmpty)
                params.omitEmpty = true;
            if (options?.includeResponseBody)
                params.includeResponseBody = true;
            return await this._makeRequest("/extract/url-metadata", normalizedUrl, "Metadata extraction", params, options?.method);
        }
        catch (error) {
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
    async extractUrlLinks(url, options) {
        try {
            const normalizedUrl = validateAndNormalizeUrl(url);
            const params = { url: normalizedUrl };
            return await this._makeRequest("/extract/url-links", normalizedUrl, "Links extraction", params, options?.method);
        }
        catch (error) {
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
    async extractUrlPreview(url, options) {
        try {
            const normalizedUrl = validateAndNormalizeUrl(url);
            const params = { url: normalizedUrl };
            return await this._makeRequest("/extract/url-preview", normalizedUrl, "Preview extraction", params, options?.method);
        }
        catch (error) {
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
    async extractUrlContent(url, options) {
        try {
            const normalizedUrl = validateAndNormalizeUrl(url);
            const params = { url: normalizedUrl };
            if (options?.includeMediaUrls)
                params.includeMediaUrls = true;
            return await this._makeRequest("/extract/url-content", normalizedUrl, "Content extraction", params, options?.method);
        }
        catch (error) {
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
    async runSeoPageAudit(url, options) {
        try {
            const normalizedUrl = validateAndNormalizeUrl(url);
            const params = { url: normalizedUrl };
            return await this._makeRequest("/run/seo-page-audit", normalizedUrl, "Run SEO page audit", params, options?.method);
        }
        catch (error) {
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
    async checkAndRunSeoPageAudit(url, options) {
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
    async checkAndExtractUrlMetadata(url, options) {
        await this._preflightOrThrow(url, "url-metadata");
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
    async checkAndExtractUrlLinks(url, options) {
        await this._preflightOrThrow(url, "url-links");
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
    async checkAndExtractUrlPreview(url, options) {
        await this._preflightOrThrow(url, "url-preview");
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
    async checkAndExtractUrlContent(url, options) {
        await this._preflightOrThrow(url, "url-content");
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
    async proxyExtractUrlMetadata(url, options) {
        return this._extractVia("proxy", "url-metadata", "Metadata extraction", url, this._metadataParams(options), options);
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
    async proxyExtractUrlLinks(url, options) {
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
    async proxyExtractUrlPreview(url, options) {
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
    async proxyExtractUrlContent(url, options) {
        return this._extractVia("proxy", "url-content", "Content extraction", url, this._contentParams(options), options);
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
    async proxyRenderExtractUrlMetadata(url, options) {
        return this._extractVia("proxy-render", "url-metadata", "Metadata extraction", url, this._metadataParams(options), options);
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
    async proxyRenderExtractUrlLinks(url, options) {
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
    async proxyRenderExtractUrlPreview(url, options) {
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
    async proxyRenderExtractUrlContent(url, options) {
        return this._extractVia("proxy-render", "url-content", "Content extraction", url, this._contentParams(options), options);
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
    async extractUrlMetadataWithProxyFallback(url, options) {
        return this._extractWithProxyFallback("url-metadata", "Metadata extraction", url, this._metadataParams(options), options);
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
    async extractUrlLinksWithProxyFallback(url, options) {
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
    async extractUrlPreviewWithProxyFallback(url, options) {
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
    async extractUrlContentWithProxyFallback(url, options) {
        return this._extractWithProxyFallback("url-content", "Content extraction", url, this._contentParams(options), options);
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
    _paidPath(endpoint) {
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
    _buildRequest(path, params, method) {
        if (method === "GET") {
            const qs = new URLSearchParams();
            for (const [key, value] of Object.entries(params))
                qs.set(key, String(value));
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
    async _makeRequest(endpoint, normalizedUrl, label, params, method = DEFAULT_METHOD) {
        const { url, init } = this._buildRequest(this._paidPath(endpoint), params, method);
        if (this.config.authMode === "x402") {
            const { response, payment } = await handlePayment(url, this.config, init);
            if (!response.ok) {
                throw new ExtractionFailedError(normalizedUrl, `${label} failed: ${response.status} ${response.statusText}`);
            }
            const data = (await response.json());
            return { success: data.success, results: data.results, payment };
        }
        else {
            const { response } = await handleApiKeyRequest(url, this.config, init);
            if (!response.ok) {
                throw new ExtractionFailedError(normalizedUrl, `${label} failed: ${response.status} ${response.statusText}`);
            }
            const data = (await response.json());
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
    async _makeSearchRequest(params, method = DEFAULT_METHOD) {
        const query = String(params.query);
        const { url, init } = this._buildRequest(this._paidPath("/search/keyword"), params, method);
        if (this.config.authMode === "x402") {
            const { response, payment } = await handlePayment(url, this.config, init);
            if (!response.ok) {
                throw new SearchFailedError(query, `Keyword search failed: ${response.status} ${response.statusText}`, response.status);
            }
            const data = (await response.json());
            return {
                success: data.success,
                queryParameters: data.queryParameters,
                results: data.results,
                payment,
            };
        }
        else {
            const { response } = await handleApiKeyRequest(url, this.config, init);
            if (!response.ok) {
                throw new SearchFailedError(query, `Keyword search failed: ${response.status} ${response.statusText}`, response.status);
            }
            const data = (await response.json());
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
     * @param proxySlug - the extract endpoint being checked (e.g. "url-metadata").
     *   When given, a robots.txt block sets `error.tip` to the proxy methods for
     *   that endpoint. Omit for the SEO page audit, which has no proxy version.
     *   The message itself is never changed.
     */
    async _preflightOrThrow(url, proxySlug) {
        const checkResponse = await this.preflightUrlCheck(url);
        const data = checkResponse.results[0]?.data;
        if (!data?.allowed) {
            const message = data?.message || "URL is blocked by robots.txt";
            // Not allowed, but not by robots.txt: the domain is invalid or doesn't exist.
            if (message.includes(PREFLIGHT_BAD_DOMAIN))
                throw new InvalidUrlError(url, message);
            throw new RobotsBlockedError(url, message, proxySlug ? proxyTipFor(proxySlug) : undefined);
        }
    }
    /**
     * Request params for the url-metadata endpoint (without `url`).
     *
     * @param options
     */
    _metadataParams(options) {
        const params = {};
        if (options?.fields?.length)
            params.fields = options.fields.join(",");
        if (options?.omitEmpty)
            params.omitEmpty = true;
        if (options?.includeResponseBody)
            params.includeResponseBody = true;
        return params;
    }
    /**
     * Request params for the url-content endpoint (without `url`).
     *
     * @param options
     */
    _contentParams(options) {
        const params = {};
        if (options?.includeMediaUrls)
            params.includeMediaUrls = true;
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
    async _extractVia(tier, slug, label, url, endpointParams, options) {
        try {
            const normalizedUrl = validateAndNormalizeUrl(url);
            const params = { url: normalizedUrl, ...endpointParams };
            if (tier !== "native" && options?.country)
                params.country = options.country;
            return await this._makeRequest(`${TIER_PREFIX[tier]}/extract/${slug}`, normalizedUrl, label, params, options?.method);
        }
        catch (error) {
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
    _isBlockedError(error) {
        return (error instanceof NetworkError &&
            error.statusCode === 502 &&
            typeof error.serverMessage === "string" &&
            BLOCKED_SERVER_MESSAGES.has(error.serverMessage));
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
    async _extractWithProxyFallback(slug, label, url, endpointParams, options) {
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
            if (message.includes(PREFLIGHT_BAD_DOMAIN))
                throw new InvalidUrlError(url, message);
            return this._extractVia("proxy", slug, label, url, endpointParams, options);
        }
        try {
            return await this._extractVia("native", slug, label, url, endpointParams, options);
        }
        catch (error) {
            if (!this._isBlockedError(error))
                throw error;
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
    _rethrowError(error, url, label) {
        if (error instanceof InvalidUrlError ||
            error instanceof ExtractionFailedError ||
            error instanceof PaymentFailedError ||
            error instanceof NetworkError ||
            error instanceof RobotsBlockedError) {
            throw error;
        }
        throw new ExtractionFailedError(url, `${label} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    /**
     * Search sibling of {@link _rethrowError}: re-throw known search error types,
     * wrapping anything else in SearchFailedError (which carries the query, not a URL).
     *
     * @param error
     * @param query
     * @param label
     */
    _rethrowSearchError(error, query, label) {
        if (error instanceof InvalidQueryError ||
            error instanceof SearchFailedError ||
            error instanceof PaymentFailedError ||
            error instanceof NetworkError) {
            throw error;
        }
        throw new SearchFailedError(query, `${label} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
