import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";
import bs58 from "bs58";
import type { InitializedConfig } from "../types/config.js";
import type { PaymentInfo } from "../types/responses.js";
import { PaymentFailedError, NetworkError } from "../types/errors.js";

/**
 * Handle x402 payment flow using Coinbase x402 client pattern
 * 1. Initialize x402Client and register payment scheme
 * 2. Wrap fetch with payment capabilities
 * 3. Make request (client handles 402 detection and payment)
 * 4. Extract payment receipt from response headers
 *
 * @param url
 * @param config
 * @param init
 */
export async function handlePayment(
  url: string,
  config: InitializedConfig,
  init?: RequestInit,
): Promise<{ response: Response; payment?: PaymentInfo }> {
  try {
    const _x402Client = new x402Client();
    let payer: string;

    const isEvm = config.network?.startsWith("base");
    const isSolana = config.network?.startsWith("solana");

    if (isEvm) {
      const signer = privateKeyToAccount(config.privateKey as `0x${string}`);
      const evmSigner = signer as ReturnType<typeof privateKeyToAccount>;
      registerExactEvmScheme(_x402Client, { signer: evmSigner });
      payer = signer.address;
    } else if (isSolana) {
      if (!config.privateKey)
        throw new PaymentFailedError("privateKey is required for Solana payments");
      const privateKeyBytes = bs58.decode(config.privateKey);
      const signer = await createKeyPairSignerFromBytes(privateKeyBytes);
      const svmSigner = signer as KeyPairSigner<string>;
      registerExactSvmScheme(_x402Client, { signer: svmSigner });
      payer = signer.address;
    } else {
      throw new PaymentFailedError(`Unsupported network: ${config.network}`);
    }

    // Network failures are tagged at the source (fetchOrNetworkError), so being
    // offline never surfaces as "Payment failed" — no payment was attempted.
    const fetchWithPayment = wrapFetchWithPayment(fetchOrNetworkError, _x402Client);
    // Default GET when no init passed; init carries method + JSON body for POST.
    const response = await fetchWithPayment(url, init ?? { method: "GET" });

    if (!response.ok) {
      const { serverMessage, upstreamStatus } = await readServerError(response);
      throw new NetworkError(
        `Request failed: ${response.status} ${response.statusText}${serverMessage ? ` — ${serverMessage}` : ""}`,
        undefined,
        { statusCode: response.status, serverMessage, upstreamStatus },
      );
    }

    const httpClient = new x402HTTPClient(_x402Client);
    const paymentResponse = httpClient.getPaymentSettleResponse(name => response.headers.get(name));

    const payment: PaymentInfo = {
      success: true,
      payer,
      network: config.network as PaymentInfo["network"],
      txHash: paymentResponse.transaction || "",
      explorerLink: paymentResponse.transaction
        ? getExplorerLink(config, paymentResponse.transaction)
        : "",
    };

    return { response, payment };
  } catch (error) {
    if (error instanceof PaymentFailedError || error instanceof NetworkError) {
      throw error;
    }
    // The x402 wrapper may re-wrap what our fetch threw; dig it back out.
    const networkError = findNetworkError(error);
    if (networkError) throw networkError;
    throw new PaymentFailedError(
      `Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      config.network,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Handle API key auth flow — simple Bearer token request, no crypto.
 * No payment info is returned (not applicable for this auth mode).
 *
 * @param url
 * @param config
 * @param init
 */
export async function handleApiKeyRequest(
  url: string,
  config: InitializedConfig,
  init?: RequestInit,
): Promise<{ response: Response }> {
  const response = await fetchOrNetworkError(url, {
    ...init,
    method: init?.method ?? "GET",
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  if (!response.ok) {
    const { serverMessage, upstreamStatus } = await readServerError(response);
    throw new NetworkError(
      `Request failed: ${response.status} ${response.statusText}${serverMessage ? ` — ${serverMessage}` : ""}`,
      undefined,
      { statusCode: response.status, serverMessage, upstreamStatus },
    );
  }

  return { response };
}

/**
 * Build block explorer link for a transaction hash
 *
 * @param config
 * @param txHash
 */
function getExplorerLink(config: InitializedConfig, txHash: string): string {
  if (config.network === "solana-devnet") {
    const strArray = config.explorerUrl!.split("?");
    return `${strArray[0]}/${txHash}?${strArray[1]}`;
  } else if (txHash) {
    return `${config.explorerUrl}/${txHash}`;
  } else {
    return "";
  }
}

/**
 * Best-effort read of the server's error from a non-ok response. Minifetch
 * fetch-error bodies carry it at results[0].error: `message` is a fixed string
 * (ex: "upstream forbidden") and `statusCode`, when present, is the TARGET's
 * HTTP status. Other error shapes (auth, credits) yield nothing here.
 *
 * @param response - non-ok Response (body is consumed)
 */
async function readServerError(
  response: Response,
): Promise<{ serverMessage?: string; upstreamStatus?: number }> {
  try {
    const body = (await response.json()) as {
      results?: Array<{ error?: { message?: string; statusCode?: number | string } }>;
    };
    // TODO: revisit this approach when we scale up to multiple results per request
    const error = body?.results?.[0]?.error;
    const upstreamStatus = Number(error?.statusCode);
    return {
      serverMessage: typeof error?.message === "string" ? error.message : undefined,
      upstreamStatus:
        Number.isFinite(upstreamStatus) && upstreamStatus > 0 ? upstreamStatus : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * `fetch`, but a failure to get any response at all (offline, DNS, connection
 * refused or reset, TLS) is thrown as a NetworkError carrying the original
 * error — never left to be mislabelled as an extraction or payment failure.
 * HTTP error statuses are NOT thrown here; callers handle `response.ok`.
 *
 * @param input - request url (or Request)
 * @param init - fetch init
 * @throws {NetworkError} when no response was received
 */
const fetchOrNetworkError: typeof fetch = async (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    const original = error instanceof Error ? error : undefined;
    // Node's fetch reports every transport failure as "fetch failed"; the
    // useful part (ex: ENOTFOUND, ECONNREFUSED) is the cause's code.
    const code = (original?.cause as { code?: unknown } | undefined)?.code;
    const detail = `${original?.message ?? "Unknown error"}${typeof code === "string" ? ` (${code})` : ""}`;
    throw new NetworkError(`Request failed: could not reach Minifetch — ${detail}`, original);
  }
};

/**
 * Find a NetworkError in an error's `cause` chain (bounded depth).
 *
 * @param error - the caught error
 * @returns the NetworkError, or undefined when there is none
 */
function findNetworkError(error: unknown): NetworkError | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (current instanceof NetworkError) return current;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}
