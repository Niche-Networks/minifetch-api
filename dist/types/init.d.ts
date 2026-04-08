import type { ClientConfig, InitializedConfig, Network } from "./types/config.js";
/**
 * Default configuration values for x402 mode
 * Exported for testing purposes
 */
export declare const DEFAULTS: {
    readonly network: Network;
    readonly apiBaseUrls: {
        readonly "base-sepolia": "http://localhost:4021";
        readonly "solana-devnet": "http://localhost:4021";
        readonly base: "https://minifetch.com";
        readonly solana: "https://minifetch.com";
    };
    readonly explorerUrls: {
        readonly "base-sepolia": "https://sepolia.basescan.org/tx";
        readonly "solana-devnet": "https://explorer.solana.com/tx?cluster=devnet";
        readonly base: "https://basescan.org/tx";
        readonly solana: "https://explorer.solana.com/tx";
    };
};
/**
 * Validate & initialize client configuration.
 * Accepts either X402Config (network + privateKey) or ApiKeyConfig (apiKey).
 *
 * @param config
 */
export declare function initConfig(config: ClientConfig): InitializedConfig;
