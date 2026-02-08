/**
 * Base error class for all Minifetch errors
 */
export class MinifetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MinifetchError';
    Object.setPrototypeOf(this, MinifetchError.prototype);
  }
}

/**
 * Thrown when URL validation fails
 */
export class InvalidUrlError extends MinifetchError {
  public readonly url: string;

  constructor(url: string, message?: string) {
    super(message || `Invalid URL: ${url}`);
    this.name = 'InvalidUrlError';
    this.url = url;
    Object.setPrototypeOf(this, InvalidUrlError.prototype);
  }
}

/**
 * Thrown when robots.txt blocks the request
 */
export class RobotsBlockedError extends MinifetchError {
  public readonly url: string;

  constructor(url: string, message?: string) {
    super(`Robots.txt blocks access to: ${url}${message ? ` (${message})` : ''}`);
    this.name = 'RobotsBlockedError';
    this.url = url;
    Object.setPrototypeOf(this, RobotsBlockedError.prototype);
  }
}

/**
 * Thrown when payment fails
 */
export class PaymentFailedError extends MinifetchError {
  public readonly network?: string;
  public readonly originalError?: Error;

  constructor(message: string, network?: string, originalError?: Error) {
    super(message);
    this.name = 'PaymentFailedError';
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

  constructor(url: string, message: string, statusCode?: number, originalError?: Error) {
    super(`Extraction failed for ${url}: ${message}`);
    this.name = 'ExtractionFailedError';
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
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Thrown when network/API communication fails
 */
export class NetworkError extends MinifetchError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
