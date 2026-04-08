import type { InitializedConfig } from "../types/config.js";
import type { PaymentInfo } from "../types/responses.js";
/**
 * Handle x402 payment flow using Coinbase x402 client pattern
 * 1. Initialize x402Client and register payment scheme
 * 2. Wrap fetch with payment capabilities
 * 3. Make request (client handles 402 detection and payment)
 * 4. Extract payment receipt from response headers
 *
 * @param url
 * @param config
 */
export declare function handlePayment(url: string, config: InitializedConfig): Promise<{
    response: Response;
    payment?: PaymentInfo;
}>;
/**
 * Handle API key auth flow — simple Bearer token request, no crypto.
 * No payment info is returned (not applicable for this auth mode).
 *
 * @param url
 * @param config
 */
export declare function handleApiKeyRequest(url: string, config: InitializedConfig): Promise<{
    response: Response;
}>;
