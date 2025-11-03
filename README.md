# Minifetch.com API with x402 payments by Coinbase

Works with Base Sepolia Testnet (only) so far. Testnet API endpoints are not exposed. Check back again later!

x402 payments example client code:
https://github.com/coinbase/x402/blob/main/examples/typescript/clients/fetch

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A valid Ethereum private key for making USDC payments on Base Sepolia Testnet (only) -- live production client coming soon!

## Setup

1. Copy `.env-local` to `.env-base-testnet` and add your Ethereum private key:
```bash
cp .env-local .env-base-testnet
```

2. Start the example client:
```bash
pnpm install
pnpm dev:testnet:check
pnpm dev:testnet
```

