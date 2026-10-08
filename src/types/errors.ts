/**
 * Base error class for all Minifetch errors
 */
export class MinifetchError extends Error {
  /**
   *
   * @param message
   */
  constructor(message: string) {
    super(message);
    this.name = "MinifetchError";
    Object.setPrototypeOf(this, MinifetchError.prototype);
  }
}

/**
 * Thrown when URL validation fails
 */
export class InvalidUrlError extends MinifetchError {
  public readonly url: string;

  /**
   *
   * @param url
   * @param message
   */
  constructor(url: string, message?: string) {
    super(message || `Invalid url: ${url}`);
    this.name = "InvalidUrlError";
    this.url = url;
    Object.setPrototypeOf(this, InvalidUrlError.prototype);
  }
}

/**
 * Thrown when robots.txt blocks the request
 */
export class RobotsBlockedError extends MinifetchError {
  public readonly url: string;
  /** What to try next, when there is something to try. Only set when it applies. */
  public declare readonly tip?: string;

  /**
   *
   * @param url
   * @param message
   * @param tip - optional pointer to another way to fetch the url
   */
  constructor(url: string, message?: string, tip?: string) {
    super(message || `URL is blocked by robots.txt`);
    this.name = "RobotsBlockedError";
    this.url = url;
    if (tip) this.tip = tip;
    Object.setPrototypeOf(this, RobotsBlockedError.prototype);
  }
}

/**
 * Thrown when payment fails
 */
export class PaymentFailedError extends MinifetchError {
  public readonly network?: string;
  public readonly originalError?: Error;

  /**
   *
   * @param message
   * @param network
   * @param originalError
   */
  constructor(message: string, network?: string, originalError?: Error) {
    super(message);
    this.name = "PaymentFailedError";
    this.network = network;
    this.originalError = originalError;
    Object.setPrototypeOf(this, PaymentFailedError.prototype);
  }
}

/**
 * Thrown when extraction/fetch fails
 */
export class ExtractionFailedError extends MinifetchError {
  public readonly url: string;
  public readonly statusCode?: number;
  public readonly originalError?: Error;

  /**
   *
   * @param url
   * @param message
   * @param statusCode
   * @param originalError
   */
  constructor(url: string, message: string, statusCode?: number, originalError?: Error) {
    super(message);
    this.name = "ExtractionFailedError";
    this.url = url;
    this.statusCode = statusCode;
    this.originalError = originalError;
    Object.setPrototypeOf(this, ExtractionFailedError.prototype);
  }
}

/**
 * Thrown when configuration is invalid
 */
export class ConfigurationError extends MinifetchError {
  /**
   *
   * @param message
   */
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Structured details of a non-ok API response, attached to {@link NetworkError}.
 */
export interface NetworkErrorDetails {
  /** HTTP status Minifetch returned (ex: 502) */
  statusCode?: number;
  /** The server's `results[0].error.message`, exact (ex: "upstream forbidden") */
  serverMessage?: string;
  /** The target's own HTTP status, when it answered (ex: 403) */
  upstreamStatus?: number;
}

/**
 * Thrown when network/API communication fails
 */
export class NetworkError extends MinifetchError {
  public readonly originalError?: Error;
  // `declare`: these exist on the error only when the server supplied them, so
  // an error without details looks exactly as it did before they were added.
  /** HTTP status Minifetch returned (ex: 502) */
  public declare readonly statusCode?: number;
  /** The server's `results[0].error.message`, exact (ex: "upstream forbidden") */
  public declare readonly serverMessage?: string;
  /** The target's own HTTP status, when it answered (ex: 403) */
  public declare readonly upstreamStatus?: number;

  /**
   *
   * @param message
   * @param originalError
   * @param details - structured fields from a non-ok API response
   */
  constructor(message: string, originalError?: Error, details?: NetworkErrorDetails) {
    super(message);
    this.name = "NetworkError";
    this.originalError = originalError;
    if (details?.statusCode !== undefined) this.statusCode = details.statusCode;
    if (details?.serverMessage !== undefined) this.serverMessage = details.serverMessage;
    if (details?.upstreamStatus !== undefined) this.upstreamStatus = details.upstreamStatus;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Thrown when keyword-search query validation fails (empty, or over 50 chars).
 * The query sibling of {@link InvalidUrlError} — searchByKeyword takes a query,
 * not a URL, so bad input surfaces here instead.
 */
export class InvalidQueryError extends MinifetchError {
  public readonly query: string;

  /**
   *
   * @param query
   * @param message
   */
  constructor(query: string, message?: string) {
    super(message || `Invalid query: ${query}`);
    this.name = "InvalidQueryError";
    this.query = query;
    Object.setPrototypeOf(this, InvalidQueryError.prototype);
  }
}

/**
 * Thrown when a keyword search fails (non-OK response or unexpected error).
 * The search sibling of {@link ExtractionFailedError}: it carries the `query`
 * rather than a `url`, since search has no target URL.
 */
export class SearchFailedError extends MinifetchError {
  public readonly query: string;
  public readonly statusCode?: number;
  public readonly originalError?: Error;

  /**
   *
   * @param query
   * @param message
   * @param statusCode
   * @param originalError
   */
  constructor(query: string, message: string, statusCode?: number, originalError?: Error) {
    super(message);
    this.name = "SearchFailedError";
    this.query = query;
    this.statusCode = statusCode;
    this.originalError = originalError;
    Object.setPrototypeOf(this, SearchFailedError.prototype);
  }
}
