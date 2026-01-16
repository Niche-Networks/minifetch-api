# Minifetch.com API

Works with x402 payments on Base Sepolia Testnet (only) so far. Testnet API endpoints are not exposed. Check back again later!

This client based on x402 payments [example client code](https://github.com/coinbase/x402/blob/main/examples/typescript/clients/fetch).

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A valid Ethereum private key for making USDC payments on Base Sepolia Testnet (only) -- live production client coming soon!

## Setup

1. Copy `.env-local` to `.env-base-testnet` and add your private key(s), then install:
```bash
cp .env-local .env-base-testnet
pnpm install

```

2. Run the example client:
```bash
pnpm dev:basedev:check
pnpm dev:basedev:metadata

pnpm dev:svmdev:check
pnpm dev:svmdev:metadata
```

