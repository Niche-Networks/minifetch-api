# Minifetch API
<div align=center>
  <a href="https://minifetch.com">
    <img src="https://minifetch.com/minifetch-dog-logo--whitebg.png" width="70" />
  </a>
</div>

**Fetch & extract data from web pages.** [Minifetch.com](https://minifetch.com) provides composable extraction APIs for humans and AI Agents-- making web pages simple to access.

- **✅ [Sign up](https://minifetch.com/dashboard) for an account and get your first 125-250 fetches for free. 🎉🎉**
- ✅ Always pay-as-you-go at competitive prices.
- ⛔ No charge for blocked pages (403 errors).

---
**[👉 Full API docs](https://minifetch.com/docs/api) | [LLMs.txt](https://minifetch.com/llms.txt) | [Dashboard](https://minifetch.com/dashboard)**

---
**Payments.** Two ways to pay:
1. Credit card + API key. Get started free - [visit our dashboard to Sign Up](https://minifetch.com/dashboard). Your account will be auto-loaded with 125–250 API calls. Top up with your credit card later.
2. x402. USDC stablecoin micropayments on Coinbase's Base & Solana networks.

## Prerequisites

- Node.js v18+ & NPM
- A valid API key from our [dashboard](https://minifetch.com/dashboard)
- *Or* an Ethereum or Solana private key for making USDC payments on Base or Solana networks.

## Install

`npm install minifetch-api --save`

## Quick Start

```js
import Minifetch from "minifetch-api";

// First, initialize the client with your payment choice:

// 1. API Key Payments:
const client = new Minifetch({
  apiKey: process.env.MINIFETCH_API_KEY
});

// 2. x402 Payments:
//   - Network options: "base" or "solana"
//   - Private key from wallet that has a small amt of USDC
const client = new Minifetch({
  network: "base",
  privateKey: process.env.BASE_PRIVATE_KEY,
});

// Now you're ready to extract data from a url:
try {
  const url = "example.com";
  const response = await client.checkAndExtractUrlPreview(url);
  // 200 "ok" responses
  console.log("data: ", response.data);
} catch (err) {
  // No charge for errors or 403 blocked urls!
  console.log(err);
}
```

### Data Extraction Methods

After the Quick Start, you have the following methods to use. The "checkAndExtract" methods help to avoid paying for blocked URLs. **Price list** & example data [is here.](https://minifetch.com/docs/api#example-data)

**Wrap** these in a **try/catch** just like in the Quickstart example above. **Code examples** can be also found in the [Github repository](https://github.com/Niche-Networks/minifetch-api/) in the /example- directories.

```js
// Extracts a light, token-efficient preview of a URL:
// title, description, and image (only).
client.checkAndExtractUrlPreview(url);

// Extracts a clean, token-efficient content summary as markdown from a URL.
// Removes ads, nav, scripts. More efficient than raw HTML fetches for LLMs.
// Options:
// { includeMediaUrls: true }, defaults to false.
client.checkAndExtractUrlContent(url, options);

// Extracts all links from a URL categorized by type (internal/external/anchor).
// Detects image links, nofollow attributes, analyzes external domain distribution.
client.checkAndExtractUrlLinks(url);

// Extracts rich structured metadata from a URL:
// meta tags, json-ld, images, headings, response headers, + more.
// Perfect for SEO research or metadata indexing & analysis. Largest
// response size of client methods. Setting verbosity to "full" is the drop-in
// replacement for the [`url-metadata`](https://www.npmjs.com/package/url-metadata) package.
// Options:
// { verbosity: "full" }, defaults to "standard"
// { includeResponseBody: true }, defaults to false
client.checkAndExtractUrlMetadata(url, options);

// For max control, you can also use the following methods directly:
// Free - check robots.txt:
client.preflightCheck(url);
// Extract:
client.extractUrlPreview(url);
client.extractUrlContent(url, options); // same options as above
client.extractUrlLinks(url);
client.extractUrlMetadata(url, options) // same options as above

```
---
### Error Types
When you wrap the functions above in a try/catch, here are the errors you may encounter. You are never charged for errors.

- **"RobotsBlockedError: URL is blocked by robots.txt"**
  - URL is explicitly blocked by the website's robots.txt, cannot be fetched.
- **"Network Error: 402 Payment Required"**
  - Check your wallet -- likely you ran out of USDC to pay!
- **"Network Error: 429 Too Many Requests"**
  - Back off and retry, max 5-10 requests per second.
- **"Network Error: 502 Bad Gateway"**
  - URLs that pass their robots.txt check but are blocked anyway via 403 or other tactics may error like this.
- **"503 Service Temporarily Unavailable"**
  - Likely encountering upstream timeout errors on the target URL.
- **"InvalidURLError: Invalid url ${url}"**
  - The URL is malformed in some way, correct it and try again.

---
### Service Limitations
Minifetch only extracts publicly available metadata and content from pages accessible without authentication and javascript execution.

What Minifetch does *NOT* do:
- Ignore robots.txt directives
- Access authenticated or logged-in content
- Create accounts or log into user sessions
- Perform transactional actions (checkout, bidding, purchasing, form submissions)
- Bypass paywalls or access restricted content

What Minifetch does NOT do *currently* but may offer in the future as an add-on:
- Javascript execution

---
### x402 Best Practices
- LLMs & Agents should *never* have direct access to your private key. They *will* expose it!
- Only keep a small amount of USDC in the account whose private key you use.
- Keep that account separate from the rest of your onchain funds.
- Pass your private key into the Minifetch API Client via an [environment variable](https://developer.vonage.com/en/blog/how-to-use-environment-variables-in-javascript-with-dotenv).

---
**License**

MIT / Copyright (c) 2026 Lauren Garcia
This package is an API client for Minifetch.com. The client code is open source, but use of the Minifetch API is subject to the [Minifetch.com Terms of Service](https://minifetch.com/terms-of-service).
