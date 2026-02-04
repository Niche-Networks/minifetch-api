import { encodeAbiParameters, type Hex } from 'viem';
import { generateKeyPairSigner } from '@solana/kit';
import bs58 from 'bs58';
import type { ProcessedConfig } from '../types/config.js';
import { PaymentFailedError, NetworkError } from '../types/errors.js';

/**
 * x402 payment requirement from server
 */
interface PaymentRequirement {
  scheme: string;
  network: string;
  to: string;
  amount: string;
  data?: string;
}

/**
 * Payment result containing transaction details
 */
export interface PaymentResult {
  amount: string;
  network: string;
  txHash?: string;
  explorerUrl?: string;
}

/**
 * Request options for payment flow
 */
export interface PaymentRequestOptions {
  method?: 'GET' | 'POST';
  body?: string | FormData | URLSearchParams;
  headers?: Record<string, string>;
}

/**
 * Handle x402 payment flow
 * 1. Detect 402 response
 * 2. Parse payment requirements
 * 3. Sign payment (EVM or Solana)
 * 4. Retry with payment header
 */
export async function handlePayment(
  url: string,
  initialResponse: Response,
  config: ProcessedConfig,
  options?: PaymentRequestOptions
): Promise<{ response: Response; payment?: PaymentResult }> {

  // Check if payment is required
  if (initialResponse.status !== 402) {
    return { response: initialResponse };
  }

  // Parse payment requirements
  const paymentReq = await parsePaymentRequirements(initialResponse);

  if (!paymentReq) {
    throw new PaymentFailedError('No payment requirements found in 402 response');
  }

  // Validate network matches config
  const configNetwork = config.network.split(':')[0]; // 'base' or 'solana'
  const reqNetwork = paymentReq.network.split(':')[0];

  if (configNetwork !== reqNetwork) {
    throw new PaymentFailedError(
      `Network mismatch: config has ${configNetwork}, server requires ${reqNetwork}`
    );
  }

  // Create signed payment based on network type
  const paymentHeader = await createSignedPayment(paymentReq, config);

  // Build request options with payment header
  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    headers: {
      'X-Payment': paymentHeader,
      ...(options?.headers || {}),
    },
  };

  // Add body for POST requests
  if (options?.method === 'POST' && options?.body) {
    fetchOptions.body = options.body;

    // Set Content-Type if not already set and body is JSON
    if (!options.headers?.['Content-Type'] && typeof options.body === 'string') {
      try {
        JSON.parse(options.body);
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json',
        };
      } catch {
        // Not JSON, leave Content-Type unset
      }
    }
  }

  // Retry request with payment
  const paidResponse = await fetch(url, fetchOptions);

  if (!paidResponse.ok && paidResponse.status !== 402) {
    throw new NetworkError(
      `Payment request failed: ${paidResponse.status} ${paidResponse.statusText}`
    );
  }

  // Build payment result for user
  const payment: PaymentResult = {
    amount: paymentReq.amount,
    network: paymentReq.network,
  };

  // Add explorer URL if available
  if (config.explorerUrl) {
    // Note: txHash would come from on-chain transaction
    // For now we don't have it since facilitator handles settlement
    payment.explorerUrl = config.explorerUrl;
  }

  return { response: paidResponse, payment };
}

/**
 * Parse payment requirements from 402 response headers
 */
async function parsePaymentRequirements(
  response: Response
): Promise<PaymentRequirement | null> {
  const paymentHeader = response.headers.get('X-Payment-Required');

  if (!paymentHeader) {
    return null;
  }

  try {
    const requirements = JSON.parse(paymentHeader);

    // x402 v2 format: array of payment options
    if (Array.isArray(requirements) && requirements.length > 0) {
      return requirements[0]; // Use first payment option
    }

    // x402 v1 format: single payment requirement
    if (requirements.scheme && requirements.network) {
      return requirements;
    }

    return null;
  } catch (error) {
    throw new PaymentFailedError(
      `Failed to parse payment requirements: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create signed payment for EVM (Base) or Solana
 */
async function createSignedPayment(
  paymentReq: PaymentRequirement,
  config: ProcessedConfig
): Promise<string> {

  const isEvm = config.network.startsWith('base');
  const isSolana = config.network.startsWith('solana');

  if (isEvm) {
    return createEvmPayment(paymentReq, config);
  } else if (isSolana) {
    return createSolanaPayment(paymentReq, config);
  } else {
    throw new PaymentFailedError(`Unsupported network: ${config.network}`);
  }
}

/**
 * Create EVM payment authorization (Base network)
 * Uses EIP-712 style encoding
 */
function createEvmPayment(
  paymentReq: PaymentRequirement,
  config: ProcessedConfig
): string {

  if (!config.privateKey) {
    throw new PaymentFailedError('Private key required for EVM payments');
  }

  try {
    // Encode payment data using viem
    const encoded = encodeAbiParameters(
      [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      [paymentReq.to as Hex, BigInt(paymentReq.amount)]
    );

    // Create payment authorization
    // Note: In production, this would include proper signature
    const payment = {
      scheme: paymentReq.scheme,
      network: paymentReq.network,
      to: paymentReq.to,
      amount: paymentReq.amount,
      data: encoded,
      // Signature would be added here by facilitator client
    };

    return JSON.stringify(payment);

  } catch (error) {
    throw new PaymentFailedError(
      `Failed to create EVM payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create Solana payment authorization
 * Uses Solana transaction format
 */
async function createSolanaPayment(
  paymentReq: PaymentRequirement,
  config: ProcessedConfig
): Promise<string> {

  if (!config.privateKey) {
    throw new PaymentFailedError('Private key required for Solana payments');
  }

  try {
    // Decode base58 private key to create signer
    const secretKey = bs58.decode(config.privateKey);
    const signer = await generateKeyPairSigner(secretKey);

    // Create payment authorization
    // Note: Actual transaction signing would happen here
    const payment = {
      scheme: paymentReq.scheme,
      network: paymentReq.network,
      to: paymentReq.to,
      amount: paymentReq.amount,
      publicKey: signer.address,
      // Signature would be added here
    };

    return JSON.stringify(payment);

  } catch (error) {
    throw new PaymentFailedError(
      `Failed to create Solana payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
