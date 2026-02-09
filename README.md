# Minifetch.com API

Works with [x402](https://www.x402.org/) USDC stablecoin payments on Coinbase's Base & Solana blockchain networks.

## Prerequisites

- CLI: Node.js v18+ & NPM
- A valid Ethereum or Solana private key for making USDC payments on the network of your choice. Transaction fees are free to the user.

## Install

`npm install minifetch-api --save`

## Quick Start

```js
import { MinifetchClient } from 'minifetch-api';

// Network options: "base", "base-sepolia", "solana", "solana-devnet"
// Bring your own private key, best practice = pass in via environment variable
const client = new MinifetchClient({
  network: 'base-sepolia',
  privateKey: process.env.BASE_PRIVATE_KEY,
});

try {
  const response = await client.checkAndExtractMetadata("https://example.com");
  console.log("metadata: ", response.results[0].metadata);
  console.log("payment: ", response.payment);
} catch (error) {
  console.log(error.message);
  // ...
}
```

## Credits

This client based on Coinbase's x402 payments [example client code](https://github.com/coinbase/x402/blob/main/examples/typescript/clients/fetch).
