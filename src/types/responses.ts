/**
 * Result from preflight URL check (free endpoint)
 * Note: This is the ONLY endpoint that doesn't require payment
 */
export interface PreflightCheckResponse {
  success: boolean;
  results: Array<{
    data: {
      url: string;
      allowed: boolean;
      message?: string;
      crawlDelay?: number;
      [key: string]: any;
    };
  }>;
  // No payment field - this is a free endpoint
}

/**
 * Response structure for all paid API responses
 */
export interface PaidEndpointResponse {
  /** Minifetch API success (200, ok) **/
  success: boolean;
  /** Data returned from the Minifetch.com API **/
  results: Array<{
    data: {
      [key: string]: any;
    };
    error?: Record<string, any>;
  }>;
  /**
   * Payment information
   * Only present for paid x402 endpoints when request was successful
   * */
  payment?: PaymentInfo;
}

/**
 * Payment information included with successful paid x402 API responses
 */
export interface PaymentInfo {
  /** Whether the payment was successful **/
  success: boolean;
  /** Account that paid for tx **/
  payer: string;
  /** Network the payment was made on **/
  network: "base" | "base-sepolia" | "solana" | "solana-devnet";
  /** Transaction hash **/
  txHash: string;
  /** Link to view transaction on block explorer **/
  explorerLink: string;
}

/**
 * A single keyword-search result.
 */
export interface SearchKeywordResult {
  /** Title of the result page */
  title: string;
  /** URL of the result page */
  url: string;
  /** Text snippet from the result page, trimmed to the requested descriptionLength */
  description: string;
}

/**
 * Response from the keyword search endpoint.
 *
 * Unlike PaidEndpointResponse, this preserves `queryParameters` — the effective
 * request params after the server clamps `limit`/`descriptionLength` into range.
 * That echo is how a caller learns what actually ran (no black box).
 */
export interface SearchKeywordResponse {
  /** Minifetch API success (200, ok) */
  success: boolean;
  /** Effective params after server-side clamping. */
  queryParameters: {
    query: string;
    limit: number;
    descriptionLength: number;
  };
  /** Ranked search results. */
  results: Array<{
    data: SearchKeywordResult;
    error?: Record<string, any>;
  }>;
  /** Payment information — only present for paid x402 requests. */
  payment?: PaymentInfo;
}
