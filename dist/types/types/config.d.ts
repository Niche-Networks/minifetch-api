export declare const VALID_NETWORKS: readonly ["base", "base-sepolia", "solana", "solana-devnet"];
export type Network = (typeof VALID_NETWORKS)[number];
export interface ClientConfig {
    /**
     * Blockchain network to use for payments
     *
     * @default 'base'
     */
    network: Network;
    /**
     * Private key for signing transactions -
     * hex string for EVM, base58 for Solana
     */
    privateKey: string;
}
export interface InitializedConfig {
    network: Network;
    privateKey: string;
    apiBaseUrl: string;
    explorerUrl: string;
}
//# sourceMappingURL=config.d.ts.map