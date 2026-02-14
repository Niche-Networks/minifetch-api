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
    }
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
    },
    error?: Record<string, any>;
  }>;
  /**
   * Payment information
   * Only present for paid endpoints when request was successful
   * */
  payment?: PaymentInfo;
}

/**
 * Payment information included with successful paid API responses
 */
export interface PaymentInfo {
  /** Whether the payment was successful **/
  success: boolean;
  /** Account that paid for tx **/
  payer: string;
  /** Network the payment was made on **/
  network: 'base' | 'base-sepolia' | 'solana' | 'solana-devnet';
  /** Transaction hash **/
  txHash: string;
  /** Link to view transaction on block explorer **/
  explorerLink: string;
}
