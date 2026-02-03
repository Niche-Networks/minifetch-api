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
 * Unsupported file extensions
 */
const UNSUPPORTED_EXTENSIONS = [
  '.pdf', '.txt', '.md', '.doc', '.docx',
  '.xls', '.xlsx', '.zip', '.tar', '.gz'
];

/**
 * Validate and normalize a URL string
 * Auto-normalizes by adding https:// if no protocol is present
 * @throws {InvalidUrlError} if URL is invalid
 */
export function validateUrl(url: string): string {
  // Check if URL is provided
  if (!url || typeof url !== 'string') {
    throw new InvalidUrlError(url, 'URL must be a non-empty string');
  }

  // Normalize: add https:// if no protocol
  let normalized = url.trim();
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`;
  }

  // Check URL length
  if (normalized.length > MAX_URL_LENGTH) {
    throw new InvalidUrlError(normalized, `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`);
  }

  // Try to parse URL
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch (error) {
    throw new InvalidUrlError(normalized, 'Invalid URL format');
  }

  // Validate protocol
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new InvalidUrlError(
      normalized,
      `Protocol must be http: or https:, got: ${parsed.protocol}`
    );
  }

  // Validate hostname exists
  if (!parsed.hostname) {
    throw new InvalidUrlError(normalized, 'URL must have a valid hostname');
  }

  // Check for unsupported file extensions
  const pathname = parsed.pathname.toLowerCase();
  for (const ext of UNSUPPORTED_EXTENSIONS) {
    if (pathname.endsWith(ext)) {
      throw new InvalidUrlError(
        normalized,
        `Unsupported file format: ${ext}. Only HTML pages are supported.`
      );
    }
  }

  // Check for localhost/private IPs
  if (isPrivateOrLocalhost(parsed.hostname)) {
    throw new InvalidUrlError(
      normalized,
      'Cannot fetch from localhost or private IP addresses'
    );
  }

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
