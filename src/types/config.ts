export type Network = 'base' | 'base-sepolia' | 'solana' | 'solana-devnet';

export interface ClientConfig {
  /**
   * Blockchain network to use for payments
   * @default 'base'
   */
  network: Network;
  /**
   * Private key for signing transactions -
   * hex string for EVM, base58 for Solana
   */
  privateKey: string;
}

export interface InitConfig {
  network: Network;
  privateKey: string;
  apiBaseUrl: string;
  explorerUrl: string;
}

// Extract options - shared across all endpoints
export interface BaseExtractOptions {
  // Future: retries, etc.

  /**
   * Maximum time to wait for the request in milliseconds
   * @default 30000
   */
  timeout?: number;
}

// Metadata-specific options
export interface MetadataExtractOptions extends BaseExtractOptions {
  /**
   * Include raw HTML response body in the result
   * @default false
   */
  includeResponseBody?: boolean;
}

// Content, Preview, Links, Redirects use BaseExtractOptions (no special options yet)
export type ContentExtractOptions = BaseExtractOptions;
export type PreviewExtractOptions = BaseExtractOptions;
export type LinksExtractOptions = BaseExtractOptions;
