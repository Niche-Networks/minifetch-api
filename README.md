# Minifetch API
<div align=center>
  <a href="https://minifetch.com">
    <img src="https://minifetch.com/minifetch-dog-logo--whitebg.png" width="70" />
  </a>
</div>

**Fetch & extract data from web pages.** [Minifetch.com](https://minifetch.com) provides composable extraction APIs that humans and AI Agents can autonomously discover, orchestrate, and pay for— making web pages simple to access. Pay-as-you-go at competitive prices.

**Full [API docs are here](https://minifetch.com/docs/api)**, including example queries, response data & prices. For AI Agents, read the [LLMs.txt](https://minifetch.com/llms.txt) instead.

**Payments** work with [x402](https://www.x402.org/) USDC stablecoin micropayments on Coinbase's Base & Solana blockchain networks. Transaction fees are free. If you'd like to use a traditional credit card & API key instead, sign up for the waitlist: [forms.gle/rkMi7T23bHJc8XFw9](https://forms.gle/rkMi7T23bHJc8XFw9)

**Bulk fetch and extract** for building datasets is coming soon, sign up for the waitlist: [forms.gle/rkMi7T23bHJc8XFw9](https://forms.gle/rkMi7T23bHJc8XFw9)

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

try {
  const url = "example.com";
  const response = await client.checkAndExtractPreview(url);
  // 200 "ok" responses will return the data and x402 payment info:
  console.log("data: ", response.data);
  console.log("payment info: ", response.payment);
} catch (err) {
  // No payment or charges for errors!
  console.log(err);
}
```

### Client Methods Available

After you initialize the client (above), you have the following methods available to use. The "checkAndExtract" API methods provided help you avoid paying for blocked URLs and return more granular info about why a URL may or may not return data. There is no charge for blocked upstream URLs.

**Price list** and example data for each method [is here.](https://minifetch.com/docs/api#example-data)

**Rate limit** Requests exceeding rate limits return `503` errors. This is intentional — back off and retry, max 5-10 queries per second. We'll add bulk fetch and extract in the future. Sign up for the [waitlist](https://forms.gle/rkMi7T23bHJc8XFw9).

**Code examples** can be found in the github repository under /test.

- **`client.checkAndExtractUrlPreview(url)`**
  - Extracts a light, token-efficient preview of a URL: title, description, and image (only).

- **`client.checkAndExtractUrlContent(url, options)`**
  - Extracts a clean, token-efficient content summary as markdown from a URL. Removes ads, nav, scripts. Much more efficient than raw HTML fetches for LLMs.
  - Option: `{ includeMediaUrls: true }`, defaults to false

- **`client.checkAndExtractUrlLinks(url)`**
  - Extracts all links from a URL categorized by type (internal/external/anchor) with SEO metadata. Detects image links, nofollow attributes, and analyzes external domain distribution.

- **`client.checkAndExtractUrlMetadata(url, options)`**
  - Extracts rich structured metadata from a URL: title, description, og/twitter tags, json-ld, images, headings, response headers, and more. Perfect for SEO research or metadata indexing & analysis. Largest response size of the client methods available. Calling this method and setting verbosity to "full" is the drop-in replacement for the [`url-metadata`](https://www.npmjs.com/package/url-metadata) package.
  - Option: `{ verbosity: "full" }`, defaults to "standard"
  - Option: `{ includeResponseBody: true }`, defaults to false

***For maximum control, you can also use the following methods directly:***

- **`client.preflightCheck(url)`**
  - Standalone call to check if a URL is allowed to be fetched according to the website's robots.txt file. Use this free endpoint before using our other paid endpoints to help avoid spending extra on un-fetchable URLs
- **`client.extractUrlPreview(url)`**
- **`client.extractUrlContent(url, options)`**
  - Option: `{ includeMediaUrls: true }`, defaults to false
- **`client.extractUrlLinks(url)`**
- **`client.extractUrlMetadata(url, options)`**
  - Option: `{ verbosity: "full" }`, defaults to "standard"
  - Option: `{ includeResponseBody: true }`, defaults to false

### Error Types
When you wrap the functions above in a try/catch, here are the errors you may encounter:

- **"RobotsBlockedError: URL is blocked by robots.txt"**
  - URL is explicitly blocked by the website's robots.txt will error like this.
- **"Network Error: 402 Payment Required"**
  - Check your wallet -- likely you ran out of USDC to pay!
- **"Network Error: 502 Bad Gateway"**
  - URLs that pass the robots.txt check but are blocked anyway via 403 or other tactics may error like this.
- **"503 Service Temporarily Unavailable"**
  - Likely encountering Minifetch rate-limiting or upstream timeout errors on the target URL. You may try again but limit requests to 5-10 at a time. Bulk fetches coming soon.
- **"InvalidURLError: Invalid url ${url}"**
  - The URL you passed in is malformed in some way, correct it and try again.

### Service Limitations
Minifetch only extracts publicly available metadata and content from pages accessible without authentication and javascript execution.

What Minifetch does NOT do:

- Ignore robots.txt directives
- Access authenticated or logged-in content
- Create accounts or log into user sessions
- Perform transactional actions (checkout, bidding, purchasing, form submissions)
- Bypass paywalls or access restricted content

What Minifetch does NOT do *currently* but may offer in the future as an add-on:
- Javascript execution

## x402 Best Practices

- LLMs & Agents should *never* have direct access to your private key. They *will* expose it!
- Only keep a small amount of USDC in the account whose private key you use.
- Keep that account separate from the rest of your onchain funds.
- Pass your private key into the Minifetch API Client via an [environment variable](https://developer.vonage.com/en/blog/how-to-use-environment-variables-in-javascript-with-dotenv).

---
**License**

MIT / Copyright (c) 2026 Lauren Garcia
This package is an API client for Minifetch.com. The client code is open source, but use of the Minifetch API is subject to the [Minifetch.com Terms of Service](https://minifetch.com/terms-of-service).
