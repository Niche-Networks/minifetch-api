# Minifetch API
<div align=center>
  <a href="https://minifetch.com">
    <img src="https://minifetch.com/minifetch-dog-logo--whitebg.png" width="70" />
  </a>
</div>

**[Minifetch](https://minifetch.com) is a hosted SEO toolkit of extraction primitives.** Run them as a full technical audit or call one at a time for a fraction of the price — and a fraction of the LLM tokens. No subscription.

- ✅ **Always pay-per-fetch at competitive prices.**
- ✅ [Sign up](https://minifetch.com/dashboard) for an account & get free starter credits. 🎉🎉
- ⛔ No charge for blocked pages (403 errors).

---
**👉 [Dashboard](https://minifetch.com/dashboard) | [Full API docs](https://minifetch.com/docs/api) | [LLMs.txt](https://minifetch.com/llms.txt) | Questions? Join our [Discord](https://discord.gg/EM6ET8Dshm)**

---
**Payments.** Two ways to pay:
1. Credit card + API key. Get started free - [visit our dashboard to Sign Up](https://minifetch.com/dashboard). Your account will be auto-loaded with 25 free technical SEO page audits. Top up with your credit card later.
2. USDC on Base or Solana. Just load your wallet with USDC and you're ready. No "gas token" (ETH or SOL) required.

## Prerequisites

- Node.js v18+ & NPM
- A valid API key from our [dashboard](https://minifetch.com/dashboard)
- *Or* an Ethereum or Solana private key for making USDC payments on Base or Solana networks.

## Install

`npm install minifetch-api --save`

## Quick Start

```js
import Minifetch from "minifetch-api";

// First, initialize the client with your payment choice-
// pick option 1 or 2:

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

// Now you're ready to call the API methods:
try {
  const url = "example.com";
  const response = await client.checkAndRunSeoPageAudit(url);
  // 200 "ok" responses:
  console.log(response);
} catch (err) {
  // No charge for errors or 403 blocked urls!
  console.log(err);
}
```

### API Methods

After the Quick Start, you have the following methods to use.

**Wrap** these methods in a **try/catch** just like in the Quick Start example above. **Code examples** can be also found in the [Github repository](https://github.com/Niche-Networks/minifetch-api/) /example- directories.

The "checkAndExtract" methods check the target URL's `robots.txt` file to ensure its not blocked and tell us your preferred crawl delay (defaults to 1 second between requests to your domain). So fetching 10 URLs takes at least 10 seconds to complete. This is by design, so Minifetch never hammers your server or slows it down for your real users. [Full api docs here.](https://minifetch.com/docs/api)

```js
await client.checkAndRunSeoPageAudit(url);
// Price: $0.01
// Runs a full technical SEO audit on your URL. It combines data from
// the other API endpoints and runs checks that each return a PASS/
// WARN/ FAIL result with no black-box scoring — just deterministic,
// composable signal you can act on or pipe into an agent.
// Audit rules are documented in the in the audit skill file:
// https://minifetch.com/skills/seo-page-audit/SKILL.md

await client.checkAndExtractUrlMetadata(url, options);
// Price: $0.002
// Fetches & extracts rich structured metadata from your URL: meta tags,
// hreflang, json-ld, images, headings, response headers, + more.
// Setting verbosity to "full" is the drop-in replacement for the npm
// `url-metadata` package.
// Options:
// { verbosity: "full" } - defaults to "standard"
// { includeResponseBody: true } - defaults to false

await client.checkAndExtractUrlLinks(url);
// Price: $0.002
// Fetches & extracts all links from your URL categorized by type
// (internal/ external/ anchor). Detects image links, `rel` attributes
// (nofollow, sponsored, ugc, etc), `title` and `target`, plus image
// detection. Summary stats include the most-linked-to internal pages
// (with anchor text variants used for each) and top external domains
// by link count.

await client.checkAndExtractUrlPreview(url);
// Price: $0.001
// For checking how your page unfurls when shared: Extracts the title,
// meta description, and preview image (only) - the lightweight card
// social platforms and chat apps render for a link.

await client.checkAndExtractUrlContent(url, options);
// Price: $0.002
// For site owners auditing AI readability: returns the clean markdown
// an LLM extracts from your page after nav, ads, & scripts are stripped.
// See what survives for AEO and AI search; respects robots.txt.
// Options: { includeMediaUrls: true } - defaults to false.

// For max control, you can also use the following methods directly.
// Free - check robots.txt:
await client.preflightCheck(url);
// Paid methods:
await client.runSeoPageAudit(url);
await client.extractUrlMetadata(url, options); // same options as above
await client.extractUrlLinks(url);
await client.extractUrlPreview(url);
await client.extractUrlContent(url, options); // same options as above
```
---
### Error Types
When you wrap the functions above in a try/catch, here are the errors you may encounter. You are never charged for URLs that are blocked or error.

- **"RobotsBlockedError: URL is blocked by robots.txt"**
  - Minifetch is explicitly blocked by the website's `robots.txt`, cannot be fetched. If this is your site, read our tutorial [How To Unblock Minifetch](https://minifetch.com/tutorials/unblock-minifetch)
- **"Network Error: 402 Payment Required"**
  - Check your wallet -- likely you ran out of USDC to pay!
- **"Network Error: 429 Too Many Requests"**
  - Back off and retry, max 5-10 requests per second.
- **"Network Error: 502 Bad Gateway"**
  - URLs that pass their robots.txt check but are blocked anyway via 403 or other tactics may error like this. No charge.
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
### USDC Best Practices
- Uses the [x402 Protocol](https://www.x402.org/). No "gas token" (ETH or SOL) required, just load your wallet with USDC on Base or Solana network.
- LLMs & Agents should *never* have direct access to your private key. They *will* expose it!
- Only keep a small amount of USDC in the wallet whose private key you use.
- Keep that wallet/ account separate from the rest of your onchain funds.
- Pass your private key into the Minifetch API Client with an [environment variable](https://developer.vonage.com/en/blog/how-to-use-environment-variables-in-javascript-with-dotenv).

---
**License**

MIT / Copyright (c) 2026 Lauren Garcia
This package is an API client for Minifetch.com. The client code is open source, but use of the Minifetch API is subject to the [Minifetch.com Terms of Service](https://minifetch.com/terms-of-service).
