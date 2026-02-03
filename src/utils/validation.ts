import { InvalidUrlError } from '../types/errors.js';

/**
 * Maximum allowed URL length
 */
const MAX_URL_LENGTH = 2048;

/**
 * Allowed URL protocols
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validate a URL string
 * @throws {InvalidUrlError} if URL is invalid
 */
export function validateUrl(url: string): void {
  // Check if URL is provided
  if (!url || typeof url !== 'string') {
    throw new InvalidUrlError(url, 'URL must be a non-empty string');
  }

  // Check URL length
  if (url.length > MAX_URL_LENGTH) {
    throw new InvalidUrlError(url, `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`);
  }

  // Try to parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new InvalidUrlError(url, 'Invalid URL format');
  }

  // Validate protocol
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new InvalidUrlError(
      url,
      `Protocol must be http: or https:, got: ${parsed.protocol}`
    );
  }

  // Validate hostname exists
  if (!parsed.hostname) {
    throw new InvalidUrlError(url, 'URL must have a valid hostname');
  }

  // Check for localhost/private IPs in production URLs
  // (This is a basic check - your server will do the real SSRF protection)
  if (isPrivateOrLocalhost(parsed.hostname)) {
    throw new InvalidUrlError(
      url,
      'Cannot fetch from localhost or private IP addresses'
    );
  }
}

/**
 * Validate an array of URLs
 * @throws {InvalidUrlError} if any URL is invalid
 */
export function validateUrls(urls: string[]): void {
  if (!Array.isArray(urls)) {
    throw new InvalidUrlError('', 'URLs must be provided as an array');
  }

  if (urls.length === 0) {
    throw new InvalidUrlError('', 'At least one URL must be provided');
  }

  // Validate each URL
  for (const url of urls) {
    validateUrl(url);
  }
}

/**
 * Normalize a URL (add https:// if no protocol)
 * Returns the normalized URL or throws if invalid
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Add https:// if no protocol
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`;
  }

  // Validate the normalized URL
  validateUrl(normalized);

  return normalized;
}

/**
 * Check if hostname is localhost or private IP
 */
function isPrivateOrLocalhost(hostname: string): boolean {
  // Localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Private IP ranges (basic check)
  const privateIpPatterns = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
  ];

  return privateIpPatterns.some(pattern => pattern.test(hostname));
}
