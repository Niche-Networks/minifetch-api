/**
 * Validate and normalize a URL string
 * Auto-normalizes by adding https:// if no protocol is present
 *
 * @param url
 * @throws {InvalidUrlError} if URL is invalid
 */
export declare function validateAndNormalizeUrl(url: string): string;
/**
 * Validate and normalize a keyword-search query.
 * Mirrors the server: strips null bytes, normalizes unicode, trims, then enforces
 * the same non-empty / 50-char rules so bad input fails before a paid call.
 *
 * @param query
 * @throws {InvalidQueryError} if the query is empty or exceeds 50 characters
 */
export declare function validateAndNormalizeQuery(query: string): string;
