import type { ClientConfig, InitConfig, Network } from './types/config.js';
import { ConfigurationError } from './types/errors.js';

/**
 * Default configuration values
 * Exported for testing purposes
 */
export const DEFAULTS = {
  network: 'base' as Network,
  apiBaseUrls: {
    'base-sepolia': 'http://localhost:4021',
    'solana-devnet': 'http://localhost:4021',
    'base': 'https://minifetch.com/api',
    'solana': 'https://minifetch.com/api'
  },
  explorerUrls: {
    'base-sepolia': 'https://sepolia.basescan.org/tx',
    'solana-devnet': 'https://explorer.solana.com/tx?cluster=devnet',
    'base': 'https://basescan.org/tx',
    'solana': 'https://explorer.solana.com/tx',
  },
} as const;

/**
 * Process and validate client configuration
 */
export function initConfig(config: ClientConfig): InitConfig {
  // Validate private key is provided
  if (!config.privateKey || config.privateKey.trim() === '') {
    throw new ConfigurationError('Private key is required');
  }

  // Validate private key format based on network
  const network = config.network || DEFAULTS.network;
  validatePrivateKey(config.privateKey, network);

  // Build processed config
  const apiBaseUrl = DEFAULTS.apiBaseUrls[network];
  const explorerUrl = config.explorerUrl || DEFAULTS.explorerUrls[network];

  return {
    network,
    privateKey,
    apiBaseUrl,
    explorerUrl,
  };
}

/**
 * Validate private key format for the given network
 */
function validatePrivateKey(privateKey: string, network: Network): void {
  if (network === 'solana' || network === 'solana-devnet') {
    // Solana: base58 encoded, typically 88 characters
    if (!/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(privateKey)) {
      throw new ConfigurationError(
        'Invalid Solana private key format (expected base58 string)'
      );
    }
  } else {
    // EVM: hex string, 64 characters (with or without 0x prefix)
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
      throw new ConfigurationError(
        'Invalid EVM private key format (expected 64-character hex string)'
      );
    }
  }
}

/**
 * Get the default timeout value
 */
export function getDefaultTimeout(): number {
  return 30000; // 30 seconds
}
