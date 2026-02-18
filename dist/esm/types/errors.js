/**
 * Base error class for all Minifetch errors
 */
export class MinifetchError extends Error {
    /**
     *
     * @param message
     */
    constructor(message) {
        super(message);
        this.name = "MinifetchError";
        Object.setPrototypeOf(this, MinifetchError.prototype);
    }
}
/**
 * Thrown when URL validation fails
 */
export class InvalidUrlError extends MinifetchError {
    url;
    /**
     *
     * @param url
     * @param message
     */
    constructor(url, message) {
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
    url;
    /**
     *
     * @param url
     * @param message
     */
    constructor(url, message) {
        super(message || `URL is blocked by robots.txt`);
        this.name = "RobotsBlockedError";
        this.url = url;
        Object.setPrototypeOf(this, RobotsBlockedError.prototype);
    }
}
/**
 * Thrown when payment fails
 */
export class PaymentFailedError extends MinifetchError {
    network;
    originalError;
    /**
     *
     * @param message
     * @param network
     * @param originalError
     */
    constructor(message, network, originalError) {
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
    url;
    statusCode;
    originalError;
    /**
     *
     * @param url
     * @param message
     * @param statusCode
     * @param originalError
     */
    constructor(url, message, statusCode, originalError) {
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
    constructor(message) {
        super(message);
        this.name = "ConfigurationError";
        Object.setPrototypeOf(this, ConfigurationError.prototype);
    }
}
/**
 * Thrown when network/API communication fails
 */
export class NetworkError extends MinifetchError {
    originalError;
    /**
     *
     * @param message
     * @param originalError
     */
    constructor(message, originalError) {
        super(message);
        this.name = "NetworkError";
        this.originalError = originalError;
        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}
//# sourceMappingURL=errors.js.map