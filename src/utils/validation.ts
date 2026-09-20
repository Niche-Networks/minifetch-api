import { InvalidUrlError, InvalidQueryError } from "../types/errors.js";

/**
 * Maximum allowed URL length
 */
const MAX_URL_LENGTH = 2048;

/**
 * Maximum allowed search-query length. Mirrors Ceramic's hard cap on the server
 * so we fail fast client-side instead of spending a paid call on a 400.
 */
const MAX_QUERY_LENGTH = 50;

/**
 * Allowed URL protocols
 */
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Unsupported file extensions
 */
const UNSUPPORTED_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".md",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
  ".tar",
  ".gz",
];

/**
 * Validate and normalize a URL string
 * Auto-normalizes by adding https:// if no protocol is present
 *
 * @param url
 * @throws {InvalidUrlError} if URL is invalid
 */
export function validateAndNormalizeUrl(url: string): string {
  // Check if URL is provided
  if (!url || typeof url !== "string") {
    throw new InvalidUrlError(url, "URL must be a non-empty string");
  }

  // Normalize: add https:// if no protocol
  let normalized = url.trim();
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`;
  }

  // Check URL length
  if (normalized.length > MAX_URL_LENGTH) {
    throw new InvalidUrlError(
      normalized,
      `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
    );
  }

  // Try to parse URL
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch (error) {
    throw new InvalidUrlError(normalized, "Invalid URL format");
  }

  // Validate protocol
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new InvalidUrlError(
      normalized,
      `Protocol must be http: or https:, got: ${parsed.protocol}`,
    );
  }

  // Validate hostname exists
  if (!parsed.hostname) {
    throw new InvalidUrlError(normalized, "URL must have a valid hostname");
  }

  // Validate hostname has at least one dot (e.g., example.com)
  if (!parsed.hostname.includes(".")) {
    throw new InvalidUrlError(normalized, "URL must have a valid domain with a TLD");
  }

  // Check for unsupported file extensions
  const pathname = parsed.pathname.toLowerCase();
  for (const ext of UNSUPPORTED_EXTENSIONS) {
    if (pathname.endsWith(ext)) {
      throw new InvalidUrlError(
        normalized,
        `Unsupported file format: ${ext}. Only HTML pages are supported.`,
      );
    }
  }

  // Basic check for localhost/private IPs
  // API server will do deeper SSRF validation
  if (isPrivateOrLocalhost(parsed.hostname)) {
    throw new InvalidUrlError(normalized, "Cannot fetch from localhost or private IP addresses");
  }

  return normalized;
}

/**
 * Validate and normalize a keyword-search query.
 * Mirrors the server: strips null bytes, normalizes unicode, trims, then enforces
 * the same non-empty / 50-char rules so bad input fails before a paid call.
 *
 * @param query
 * @throws {InvalidQueryError} if the query is empty or exceeds 50 characters
 */
export function validateAndNormalizeQuery(query: string): string {
  if (!query || typeof query !== "string") {
    throw new InvalidQueryError(String(query ?? ""), "Query must be a non-empty string");
  }

  const cleaned = query.replace(/\0/g, "").normalize("NFC").trim();

  if (!cleaned) {
    throw new InvalidQueryError(query, "Query must not be empty");
  }

  if (cleaned.length > MAX_QUERY_LENGTH) {
    throw new InvalidQueryError(
      cleaned,
      `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`,
    );
  }

  return cleaned;
}

/**
 * Check if hostname is localhost or private IP
 *
 * @param hostname
 */
function isPrivateOrLocalhost(hostname: string): boolean {
  // Localhost
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }

  // Private IP ranges (basic check)
  const privateIpPatterns = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (link-local)
  ];

  return privateIpPatterns.some(pattern => pattern.test(hostname));
}
