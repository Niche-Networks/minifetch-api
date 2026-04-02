import type { ClientConfig, InitializedConfig, Network, X402Config, ApiKeyConfig } from "./types/config.js";
import { VALID_NETWORKS } from "./types/config.js";
import { ConfigurationError } from "./types/errors.js";

/**
 * Default configuration values for x402 mode
 * Exported for testing purposes
 */
export const DEFAULTS = {
  network: "base" as Network,
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
} as const;

/** Prod API key prefix */
const PROD_KEY_PREFIX = "mf_prod_";
/** Dev API key prefix */
const DEV_KEY_PREFIX = "mf_dev_";

/**
 * Validate & initialize client configuration.
 * Accepts either X402Config (network + privateKey) or ApiKeyConfig (apiKey).
 *
 * @param config
 */
export function initConfig(config: ClientConfig): InitializedConfig {
  if ("apiKey" in config) {
    return initApiKeyConfig(config);
  }
  return initX402Config(config);
}

/**
 * Initialize config for API key auth mode.
 * Infers apiBaseUrl from the key prefix (mf_prod_* → prod, mf_dev_* → dev).
 *
 * @param config
 */
function initApiKeyConfig(config: ApiKeyConfig): InitializedConfig {
  const { apiKey } = config;

  if (!apiKey || apiKey.trim() === "") {
    throw new ConfigurationError("API key is required");
  }

  if (!apiKey.startsWith(PROD_KEY_PREFIX) && !apiKey.startsWith(DEV_KEY_PREFIX)) {
    throw new ConfigurationError(
      `Invalid API key format: must start with "${PROD_KEY_PREFIX}" or "${DEV_KEY_PREFIX}"`,
    );
  }

  const apiBaseUrl = apiKey.startsWith(PROD_KEY_PREFIX)
    ? "https://minifetch.com"
    : "http://localhost:4021";

  return {
    authMode: "apiKey",
    apiKey,
    apiBaseUrl,
  };
}

/**
 * Initialize config for x402 crypto payment mode.
 *
 * @param config
 */
function initX402Config(config: X402Config): InitializedConfig {
  if (!config.privateKey || config.privateKey.trim() === "") {
    throw new ConfigurationError("Private key is required");
  }

  const network = config.network || DEFAULTS.network;
  if (!VALID_NETWORKS.includes(network as Network)) {
    throw new ConfigurationError(
      `Invalid network: "${network}". Must be one of: ${VALID_NETWORKS.join(", ")}`,
    );
  }

  validatePrivateKey(config.privateKey, network);

  return {
    authMode: "x402",
    network,
    privateKey: config.privateKey,
    apiBaseUrl: DEFAULTS.apiBaseUrls[network],
    explorerUrl: DEFAULTS.explorerUrls[network],
  };
}

/**
 * Validate private key format for the given network
 *
 * @param privateKey
 * @param network
 */
function validatePrivateKey(privateKey: string, network: Network): void {
  if (network === "solana" || network === "solana-devnet") {
    if (!/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(privateKey)) {
      throw new ConfigurationError("Invalid Solana private key format (expected base58 string)");
    }
  } else {
    const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
      throw new ConfigurationError(
        "Invalid EVM private key format (expected hex string that starts with 0x)",
      );
    }
  }
}
