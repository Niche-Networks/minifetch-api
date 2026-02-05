/**
 * Payment information included with successful paid requests
 */
export interface PaymentInfo {
  /** Whether the payment was successful */
  success: boolean;
  /** Account that paid for tx **/
  payer: string;
  /** Amount paid in USDC */
  amount: string;
  /** Network the payment was made on */
  network: 'base' | 'base-sepolia' | 'solana' | 'solana-devnet';
  /** Transaction hash */
  txHash: string;
  /** Link to view transaction on block explorer */
  explorerLink: string;
}

/**
 * Base structure for all API responses
 */
export interface BaseResult {
  /** Whether the request was successful */
  success: boolean;
  /** Payment information (only present for paid endpoints) */
  payment?: PaymentInfo;
}

/**
 * Result from preflight URL check (free endpoint)
 */
export interface FreePreflightCheckResult extends BaseResult {
  success: boolean;
  queryParameters: {
    url: string[];
    [key: string]: any;
  };
  results: Array<{
    url: string;
    allowed: boolean;
    message?: string;
    crawlDelay?: number;
    [key: string]: any;
  }>;
}

/**
 * Result from metadata extraction
 */
export interface MetadataResult extends BaseResult {
  success: boolean;
  queryParameters: {
    url: string[];
    includeResponseBody?: boolean;
    [key: string]: any;
  };
  results: Array<{
    metadata?: {
      requestUrl: string; // the url the user passed in
      url: string; // final destination url in request chain
      responseBody?: string;
      minifetchCache?: Record<string, string>;
      [key: string]: any;
    },
    error?: {
      statusCode: number;
      message: string;
      [key: string]: any;
    };
  }>;
}

/**
 * Result from content extraction
 */
export interface ContentResult extends BaseResult {
  queryParameters: {
    url: string[];
    includeMediaUrls?: boolean;
    [key: string]: any;
  };
  results: Array<{
    content?: {
      requestUrl: string; // the url the user passed in
      url: string; // final destination url in request chain
      summary: string; // markdown (or other format in future?)
      mediaUrls?: Array<{
        url: string;
        alt: string;
        [key: string]: any;
      }>;
      minifetchCache?: Record<string, string>;
      [key: string]: any;
    };
    error?: {
      statusCode: number;
      message: string;
      [key: string]: any;
    };
  }>;
}

/**
 * Result from preview extraction
 */
export interface PreviewResult extends BaseResult {
  queryParameters: {
    url: string[];
    [key: string]: any;
  };
  results: Array<{
    metadata: {
      requestUrl: string; // the url the user passed in
      url: string; // final destination url in request chain
      title?: string;
      description?: string;
      image?: string;
      minifetchCache?: Record<string, string>;
      [key: string]: any;
    };
    error?: {
      statusCode: number;
      message: string;
      [key: string]: any;
    };
  }>;
}

/**
 * Result from links extraction
 */
export interface LinksResult extends BaseResult {
  queryParameters: {
    url: string[];
    [key: string]: any;
  };
  results: Array<{
    metadata: {
      requestUrl: string; // the url the user passed in
      url: string; // final destination url in request chain
      links: Record<string, any>;
      minifetchCache?: Record<string, string>;
      [key: string]: any;
    };
    error?: {
      statusCode: number;
      message: string;
      [key: string]: any;
    };
  }>;
}

