# Minifetch.com API

Fetch & extract data from web pages. Works with [x402](https://www.x402.org/) USDC stablecoin micropayments on Coinbase's Base & Solana blockchain networks. Transaction fees are free.

Full [API docs are here](https://minifetch.com/docs/api).
For AI Agents, read the [LLMs.txt](https://minifetch.com/llms.txt).

## Prerequisites

- Node.js v18+ & NPM
- A valid Ethereum or Solana private key for making USDC payments.

## Install

`npm install minifetch-api --save`

## Quick Start

```js
import Minifetch from "minifetch-api";

// Inititialize the client with your network choice & private key.
//   - Network options: "base" or "solana"
//   - Use private key from account that has a small amt of USDC
const client = new Minifetch({
  network: "base",
  privateKey: process.env.BASE_PRIVATE_KEY,
});

// Use the "checkAndExtract" API methods provided to avoid paying
// for blocked URLs and for more granular info about why a URL may
// or may not return data. The "check" fetches the target URL's
// robots.txt file before fetching the URL to help ensure success.
// Example:
try {
  const url = "example.com";
  const response = await client.checkAndExtractPreview(url);
  // 200 "ok" responses will return the data and x402 payment info:
  console.log("data: ", response.data);
  console.log("payment info: ", response.payment);
} catch (err) {
  // No payment or charges for errors!
  console.log(err);
  // "RobotsBlockedError: URL is blocked by robots.txt"
  //   URLs explicitly blocked by their robots.txt error like this
  //   when you use the "checkAndExtract" Minifetch API methods.
  // "402 Payment Required" errors:
  //   Check your wallet -- likely you ran out of USDC to pay!
  // "502 Bad Gateway" errors:
  //   URLs that pass the robots.txt check but are blocked anyway
  //   via 403 or other tactics may error like this.
  // "503 Service Temporarily Unavailable" errors:
  //   Likely encountering Minifetch rate-limiting or upstream
  //   timeout errors on the target URL. You may try again but limit
  //   requests to 5-10 at a time. Bulk fetches TBD in the future.
}
```

## x402 Best Practices

- LLMs & Agents should *never* have direct access to your private key. They *will* expose it!
- Only keep a small amount of USDC in the account whose private key you use.
- Keep that account separate from the rest of your onchain funds.
- Pass your private key into the Minifetch API via an [environment variable](https://developer.vonage.com/en/blog/how-to-use-environment-variables-in-javascript-with-dotenv).

## Credits

This client based on Coinbase's x402 payments [example client code](https://github.com/coinbase/x402/blob/main/examples/typescript/clients/fetch).
