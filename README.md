# Minifetch.com API

Works with [x402](https://www.x402.org/) USDC stablecoin micropayments on Coinbase's Base & Solana blockchain networks. Transaction fees are free.

## Prerequisites

- CLI: Node.js v18+ & NPM
- A valid Ethereum or Solana private key for making USDC payments on the network of your choice.

## Install

`npm install minifetch-api --save`

## Quick Start

```js
import Minifetch from "minifetch-api";

// Init the Minifetch client with your blockchain network choice & private key.
// Network options: "base" or "solana".
// Bring your private key from a wallet account loaded with small amt of USDC.
// Best practice: pass private key in via environment variable `process.env`
const client = new Minifetch({
  network: "base",
  privateKey: process.env.BASE_PRIVATE_KEY,
});

// Use the "checkAndExtract" API methods provided for more granular info about
// why a URL may not return data, as well as to avoid paying for blocked URLs.
// The "check" fetches the target URL's robots.txt file first before fetching
// the actual URL to help ensure success.
// Example:
try {
  const url = "example.com";
  const response = await client.checkAndExtractMetadata(url);
  // 200 "ok" responses will return the data and x402 payment info:
  console.log("metadata: ", response.results[0].metadata);
  console.log("payment info: ", response.payment);
} catch (err) {
  // No payment or charges for errors!
  console.log(err);
  // "RobotsBlockedError: URL is blocked by robots.txt"
  //   URLs explicitly blocked by robots.txt will error like this when you use
  //   the "checkAndExtract" Minifetch API methods.
  // "402 Payment Required" errors:
  //   Check your wallet -- likely you ran out of USDC to pay!
  // "502 Bad Gateway" errors:
  //   Web pages that pass the robots.txt check but are blocked anyway via 403
  //   or other blocks when we try to fetch may error like this.
  // "503 Service Temporarily Unavailable" errors:
  //   Fetches that return 503 errors are likely encountering Minifetch
  //   rate-limiting or upstream timeout errors on the target URL.
  //   You may try again but limit your requests to 5-10 at a time.
  //   We will implement bulk fetches in the future.
}
```

## x402 Best Practices

- LLMs & Agents should *never* have direct access to your private key. They *will* expose it!
- Only keep a small amount of USDC in the account whose private key you use.
- Keep that account separate from the rest of your funds.
- Pass your private key into the Minifetch API via an [environment variable](https://developer.vonage.com/en/blog/how-to-use-environment-variables-in-javascript-with-dotenv).

## Credits

This client based on Coinbase's x402 payments [example client code](https://github.com/coinbase/x402/blob/main/examples/typescript/clients/fetch).
