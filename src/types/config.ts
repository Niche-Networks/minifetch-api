export const VALID_NETWORKS = ["base", "base-sepolia", "solana", "solana-devnet"] as const;
export type Network = (typeof VALID_NETWORKS)[number];

/**
 * Config for x402 crypto micropayment auth
 */
export interface X402Config {
  /** Blockchain network to use for payments @default 'base' */
  network: Network;
  /** Private key for signing transactions — hex for EVM, base58 for Solana */
  privateKey: string;
}

/**
 * Config for Stripe-backed API key auth.
 * apiBaseUrl is inferred from the key prefix:
 *   mf_prod_* → https://minifetch.com
 *   mf_dev_*  → http://localhost:4021
 */
export interface ApiKeyConfig {
  apiKey: string;
}

export type ClientConfig = X402Config | ApiKeyConfig;

/** Discriminant for internal use after init */
export type AuthMode = "x402" | "apiKey";

export interface InitializedConfig {
  authMode: AuthMode;
  // x402 fields (present only when authMode === 'x402')
  network?: Network;
  privateKey?: string;
  explorerUrl?: string;
  // apiKey field (present only when authMode === 'apiKey')
  apiKey?: string;
  // common
  apiBaseUrl: string;
}
