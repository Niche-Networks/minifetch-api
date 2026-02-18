import { VALID_NETWORKS } from "./types/config.js";
import { ConfigurationError } from "./types/errors.js";
/**
 * Default configuration values
 * Exported for testing purposes
 */
export const DEFAULTS = {
    network: "base",
    apiBaseUrls: {
        "base-sepolia": "http://localhost:4021",
        "solana-devnet": "http://localhost:4021",
        base: "https://minifetch.com",
        solana: "https://minifetch.com",
    },
    explorerUrls: {
        "base-sepolia": "https://sepolia.basescan.org/tx",
        "solana-devnet": "https://explorer.solana.com/tx?cluster=devnet",
        base: "https://basescan.org/tx",
        solana: "https://explorer.solana.com/tx",
    },
};
/**
 * Validate & initialize client configuration
 *
 * @param config
 */
export function initConfig(config) {
    // Validate private key is provided
    if (!config.privateKey || config.privateKey.trim() === "") {
        throw new ConfigurationError("Private key is required");
    }
    // Validate network
    const network = config.network || DEFAULTS.network;
    if (!VALID_NETWORKS.includes(network)) {
        throw new ConfigurationError(`Invalid network: "${network}". Must be one of: ${VALID_NETWORKS.join(", ")}`);
    }
    // Validate private key format based on network
    validatePrivateKey(config.privateKey, network);
    // Build initalized config
    const apiBaseUrl = DEFAULTS.apiBaseUrls[network];
    const explorerUrl = DEFAULTS.explorerUrls[network];
    // console.log(`config.ts: network: ${network} apiBaseUrl: ${apiBaseUrl}`)
    return {
        network,
        privateKey: config.privateKey,
        apiBaseUrl,
        explorerUrl,
    };
}
/**
 * Validate private key format for the given network
 *
 * @param privateKey
 * @param network
 */
function validatePrivateKey(privateKey, network) {
    if (network === "solana" || network === "solana-devnet") {
        // Solana: base58 encoded, typically 88 characters
        if (!/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(privateKey)) {
            throw new ConfigurationError("Invalid Solana private key format (expected base58 string)");
        }
    }
    else {
        // EVM: hex string, 64 characters (with or without 0x prefix)
        const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
        if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            throw new ConfigurationError("Invalid EVM private key format (expected hex string that starts with 0x)");
        }
    }
}
//# sourceMappingURL=init.js.map