# Fetch HTML Metadata Client for x402 payments by Coinbase

x402 payments mostly cribbed from example client code:
https://github.com/coinbase/x402/blob/main/examples/typescript/clients/fetch

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A running x402 server to query
- A valid Ethereum private key for making payments

## Setup

1. Copy `.env-local` to `.env-base-testnet` and add your Ethereum private key:
```bash
cp .env-local .env-base-testnet
```

2. Start the example client:
```bash
pnpm install
pnpm dev:testnet
```

## How It Works

The example demonstrates how to:
1. Create a wallet client using viem
2. Wrap the native fetch function with x402 payment handling
3. Make a request to a paid endpoint
4. Handle the response or any errors

## Example Code

```typescript
import { config } from "dotenv";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";
import { baseSepolia } from "viem/chains";

config();

const { RESOURCE_SERVER_URL, PRIVATE_KEY, ENDPOINT_PATH } = process.env;

// Create wallet client
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const client = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia,
});

// Wrap fetch with payment handling
const fetchWithPay = wrapFetchWithPayment(fetch, client);

// Make request to paid endpoint
fetchWithPay(`${RESOURCE_SERVER_URL}${ENDPOINT_PATH}`, {
  method: "GET",
})
  .then(async response => {
    const body = await response.json();
    console.log(body);
  })
  .catch(error => {
    console.error(error.response?.data?.error);
  });
```
