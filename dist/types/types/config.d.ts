export declare const VALID_NETWORKS: readonly ["base", "base-sepolia", "solana", "solana-devnet"];
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
    network?: Network;
    privateKey?: string;
    explorerUrl?: string;
    apiKey?: string;
    apiBaseUrl: string;
}
