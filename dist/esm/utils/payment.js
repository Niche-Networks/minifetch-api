import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import bs58 from "bs58";
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
 */
export async function handlePayment(url, config) {
    try {
        const _x402Client = new x402Client();
        let payer;
        const isEvm = config.network?.startsWith("base");
        const isSolana = config.network?.startsWith("solana");
        if (isEvm) {
            const signer = privateKeyToAccount(config.privateKey);
            const evmSigner = signer;
            registerExactEvmScheme(_x402Client, { signer: evmSigner });
            payer = signer.address;
        }
        else if (isSolana) {
            if (!config.privateKey)
                throw new PaymentFailedError('privateKey is required for Solana payments');
            const privateKeyBytes = bs58.decode(config.privateKey);
            const signer = await createKeyPairSignerFromBytes(privateKeyBytes);
            const svmSigner = signer;
            registerExactSvmScheme(_x402Client, { signer: svmSigner });
            payer = signer.address;
        }
        else {
            throw new PaymentFailedError(`Unsupported network: ${config.network}`);
        }
        const fetchWithPayment = wrapFetchWithPayment(fetch, _x402Client);
        const response = await fetchWithPayment(url, { method: "GET" });
        if (!response.ok) {
            throw new NetworkError(`Request failed: ${response.status} ${response.statusText}`);
        }
        const httpClient = new x402HTTPClient(_x402Client);
        const paymentResponse = httpClient.getPaymentSettleResponse(name => response.headers.get(name));
        const payment = {
            success: true,
            payer,
            network: config.network,
            txHash: paymentResponse.transaction || "",
            explorerLink: paymentResponse.transaction
                ? getExplorerLink(config, paymentResponse.transaction)
                : "",
        };
        return { response, payment };
    }
    catch (error) {
        if (error instanceof PaymentFailedError || error instanceof NetworkError) {
            throw error;
        }
        throw new PaymentFailedError(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
/**
 * Handle API key auth flow — simple Bearer token request, no crypto.
 * No payment info is returned (not applicable for this auth mode).
 *
 * @param url
 * @param config
 */
export async function handleApiKeyRequest(url, config) {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
        },
    });
    if (!response.ok) {
        throw new NetworkError(`Request failed: ${response.status} ${response.statusText}`);
    }
    return { response };
}
/**
 * Build block explorer link for a transaction hash
 *
 * @param config
 * @param txHash
 */
function getExplorerLink(config, txHash) {
    if (config.network === "solana-devnet") {
        const strArray = config.explorerUrl.split("?");
        return `${strArray[0]}/${txHash}?${strArray[1]}`;
    }
    else if (txHash) {
        return `${config.explorerUrl}/${txHash}`;
    }
    else {
        return "";
    }
}
