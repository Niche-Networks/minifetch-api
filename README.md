# Minifetch.com API

Works with x402 USDC payments on Base, Base Sepolia (testnet), Solana, and Solana devnet.

## Prerequisites

- Node.js v18+ (install via [nvm](https://github.com/nvm-sh/nvm))
- npm
- A valid Ethereum or Solana private key for making USDC payments on the network of your choice

## Quickstart

```ts
import { MinifetchClient } from 'minifetch-api';

const client = new MinifetchClient({
  network: 'base-sepolia',
  privateKey: process.env.BASE_PRIVATE_KEY,
});

try {
  const response = await client.checkAndExtractMetadata('https://example.com');
  console.log(response.results[0].metadata);
} catch (error) {
  // ...
}
```

## Legacy -- delete me

1. Copy `.env-local` to `.env-base-testnet` and add your private key(s), then pnpm install:
```bash
cp .env-local .env-base-testnet
npm install
```

2. Run the example client:
```bash
pnpm dev:basedev:check
pnpm dev:basedev:metadata

pnpm dev:svmdev:check
pnpm dev:svmdev:metadata
```


## Credits

This client based on Coinbase's x402 payments [example client code](https://github.com/coinbase/x402/blob/main/examples/typescript/clients/fetch).
