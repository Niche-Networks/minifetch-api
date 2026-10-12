# Minifetch API
<div align=center>
  <a href="https://minifetch.com">
    <img src="https://minifetch.com/minifetch-dog-logo--whitebg.png" width="70" />
  </a>
</div>

**Search, scrape, extract & SEO audit web pages. [Minifetch](https://minifetch.com)** is a hosted toolkit for web developers and AI agents. Pay per fetch, no subscription.

- ✅ **Always pay-per-fetch at competitive prices.**
- ✅ [Sign up](https://minifetch.com/dashboard) for an account & get free starter credits. 🎉🎉
- ⛔ No charge for blocked pages (403 errors).

---

**👉 [Full API docs](https://minifetch.com/docs/api) | [LLMs.txt](https://minifetch.com/llms.txt) and [SKILL.md](https://minifetch.com/SKILL.md) for agents | Questions? Join our [Discord](https://discord.gg/EM6ET8Dshm)**

---

## Prerequisites

- Node.js v18+ & NPM
- A valid API key from our [dashboard](https://minifetch.com/dashboard)
- ***Or*** an Ethereum or Solana private key for making USDC payments on Base or Solana networks.

**Payments.** Two ways to pay:
1. Credit card + API key. Get started free - [visit our dashboard to Sign Up](https://minifetch.com/dashboard). Create a Minifetch account and it will be auto-loaded with credits worth up to 25 free technical SEO page audits. Top up with your credit card later.
2. USDC on Base or Solana. Just load your wallet with USDC, you're ready. No "gas token" (ETH or SOL) required. You don't need a Minifetch account either, just load your wallet and go!

## Install
Add to your project:
```
npm install minifetch-api --save
```

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

// Now you're ready to call the API methods, always wrap in a try/ catch:
try {
  const url = "example.com";
  const response = await client.extractUrlMetadataWithProxyFallback(url);
  console.log(response); // 200 "ok" responses:
} catch (err) {
  console.log(err); // No charge for errors or 403 blocked urls!
}
```

### API Methods

**Wrap** every method below in a **try/catch** like the Quick Start. All methods send POST by default; pass `{ method: 'GET' }` in options to send GET. More [code examples](https://github.com/Niche-Networks/minifetch-api/) are in the /example- directories on Github.

#### Search

```js
const options = {
  limit: 10, // number of results, 1-10, defaults to 10
  descriptionLength: 750 // snippet length, 0-5000 characters, default 750
};

await client.searchByKeyword("green tea", options);
// $0.002 · Keyword web search by Ceramic.ai. Returns ranked results as
// structured JSON: a title, URL, and text snippet per result.
```

#### Scrape & Extract from Web Pages

Minifetch offers 4 extraction types, jump to the section below that suits your needs:
- **metadata**
- **content**
- **preview**
- **links**

**Free Preflight Check:** (Optional) Run this before your extraction, it checks if the target URL's robots.txt allows the native Minifetch proxy to scrape it (cheapest) or if you should use the external rotating proxy instead. The `checkAndExtract` methods below run this check automatically for you.
```js
const options = { fresh: true }
// To bypass the 24hr robots.txt cache.
// Defaults to false.

await client.preflightUrlCheck(url, options);
```

**Extract Metadata:** response headers, performance, redirects, favicons, title, description, SEO meta tags, canonical, Open Graph and Twitter card tags, JSON-LD, image tags, headings and more. Performance and redirects not available when using the external rotating proxy. You are never charged for blocked or errored pages.

```js
const options = {

  fields: ['title', 'canonical', 'og:url'],
  // Return only these fields; also takes the groups: 'network', 'meta',
  // 'og', 'twitter' and 'meta:<name>'.
  // Defaults to returning all metadata without fields option set.

  omitEmpty: true,
  // Drop empty fields, defaults to false.

  includeResponseBody: true
  // Include the raw HTML, defaults to false.
};

await client.extractUrlMetadataWithProxyFallback(url, options);
// $0.002 tries with native Minifetch proxy first (obeys robots.txt),
// or $0.003 if it falls back to the external rotating proxy,
// or $0.004 with { render: true } option.
// { country: 'mx' } option available - choose from 195 countries.

// If you want more control, try the following:

await client.checkAndExtractUrlMetadata(url, options);
// $0.002 · Native Minifetch proxy, obeys robots.txt. Cheapest.

await client.extractUrlMetadata(url, options);
// $0.002 · Native Minifetch proxy, obeys robots.txt. Cheapest.

await client.proxyExtractUrlMetadata(url, options);
// $0.003 · External rotating proxy.
// { country: 'mx' } option available - choose from 195 countries.

await client.proxyRenderExtractUrlMetadata(url, options);
// $0.004 · External rotating proxy + JavaScript render.
// { country: 'mx' } option available - choose from 195 countries.
```

**Extract Content:** returns clean content as markdown from the page after nav, ads and scripts are stripped. You are never charged for blocked or errored pages.

```js
const options = {
  includeMediaUrls: true, // add the page's image URLs, defaults to false
}

await client.extractUrlContentWithProxyFallback(url, options);
// $0.002 tries with native Minifetch proxy first (obeys robots.txt),
// or $0.003 if it falls back to the external rotating proxy,
// or $0.004 with { render: true } option.
// { country: 'mx' } option available - choose from 195 countries.

// If you want more control, try the following:

await client.checkAndExtractUrlContent(url, options);
// $0.002 · Native Minifetch proxy, obeys robots.txt. Cheapest.

await client.extractUrlContent(url, options);
// $0.002 · Native Minifetch proxy, obeys robots.txt. Cheapest.

await client.proxyExtractUrlContent(url, options);
// $0.003 · External rotating proxy.
// { country: 'mx' } option available - choose from 195 countries.

await client.proxyRenderExtractUrlContent(url, options);
// $0.004 · External rotating proxy + JavaScript. For pages whose text
// only appears after scripts run.
// { country: 'mx' } option available - choose from 195 countries.
```

**Extract Preview:** the fields used for a page's share previews, the lightweight cards that represent it on social platforms, chat apps and AI. You are never charged for blocked or errored pages.

```js
await client.extractUrlPreviewWithProxyFallback(url, options);
// $0.001 tries with native Minifetch proxy first (obeys robots.txt),
// or $0.002 if it falls back to the external rotating proxy,
// or $0.003 with { render: true } option.
// { country: 'mx' } option available - choose from 195 countries.

// If you want more control, try the following:

await client.checkAndExtractUrlPreview(url);
// $0.001 · Native Minifetch proxy, obeys robots.txt. Cheapest.

await client.extractUrlPreview(url);
// $0.001 · Native Minifetch proxy, obeys robots.txt. Cheapest.

await client.proxyExtractUrlPreview(url, options);
// $0.002 · External rotating proxy.
// { country: 'mx' } option available - choose from 195 countries.

await client.proxyRenderExtractUrlPreview(url, options);
// $0.003 · External rotating proxy + JavaScript.
// { country: 'mx' } option available - choose from 195 countries.
```

**Extract Links:** every link on the page categorized as internal, external or anchor, with `rel` (nofollow, sponsored, ugc…), `title`, `target` and image detection. Summary stats include the most-linked internal pages (with their anchor text) and the top external domains. You are never charged for blocked or errored pages.

```js
await client.extractUrlLinksWithProxyFallback(url, options);
// $0.002 tries with native Minifetch proxy first (obeys robots.txt),
// or $0.003 if it falls back to the external rotating proxy,
// or $0.004 with { render: true } option.
// { country: 'mx' } option available - choose from 195 countries.

// If you want more control, try the following:

await client.checkAndExtractUrlLinks(url);
// $0.002 · Native Minifetch proxy, obeys robots.txt. Cheapest.

await client.extractUrlLinks(url);
// $0.002 · Native Minifetch proxy, obeys robots.txt. Cheapest.

await client.proxyExtractUrlLinks(url, options);
// $0.003 · External rotating proxy.
// { country: 'mx' } option available - choose from 195 countries.

await client.proxyRenderExtractUrlLinks(url, options);
// $0.004 · External rotating proxy + JavaScript. Catches links added by scripts.
// { country: 'mx' } option available - choose from 195 countries.
```

#### SEO Page Audit

A full technical SEO audit: combines the extractions above and runs deterministic checks that each return PASS / WARN / FAIL. No black-box scoring, just signal you can act on or pipe into an agent. Audit rules: [SKILL.md](https://minifetch.com/skills/seo-page-audit/SKILL.md). Native Minifetch proxy only. You are never charged for blocked or errored pages.

```js
await client.checkAndRunSeoPageAudit(url);
// $0.01 · Native Minifetch proxy, obeys robots.txt.

await client.runSeoPageAudit(url);
// $0.01 · No preflight call.
```

---

### How We Fetch Web Pages
Minifetch offers two ways to fetch a page: the native Minifetch proxy or an external rotating proxy. The native Minifetch proxy is identified with the `minifetch` user agent, respects robots.txt and is cheapest. The external rotating proxy reaches pages the native one can't. You choose per fetch, by choosing the best method for your use-case. Built to be orchestrated by agents and humans who want the best prices and maximal control.

The native Minifetch proxy follows each site's crawl delay (defaults to 1 second between requests to the same domain), so 10 URLs on one site take at least 10 seconds. This is by design, so the native Minifetch proxy never slows a site down for its real users. For site owners: [How To Unblock Minifetch](https://minifetch.com/tutorials/unblock-minifetch).

`extract<X>WithProxyFallback()` methods start on the native Minifetch proxy and move to the rotating external proxy only if the page blocks it. You only pay for the fetch that worked.


| | Native Minifetch proxy | External proxy |
|---|---|---|
| Methods | `checkAndExtract<X>`, `extract<X>` | `proxyExtract<X>`, `proxyRenderExtract<X>` |
| Fetches as | Identified `minifetch` user agent from a fixed IP | External rotating proxy (webscrapingapi.com), optional `country` |
| robots.txt | Respected, including crawl-delay | Not checked |
| JavaScript | Not executed | Executed by `proxyRenderExtract<X>` |
| Cached | Yes | No, every call is a fresh fetch |
| Price | Cheapest | Native price plus a surcharge |

- **Decide before you pay.** The free `preflightUrlCheck()` tells you whether the native Minifetch proxy is allowed to fetch a URL.
- **Proof per request.** Extraction results carry a `proxy` block: which proxy fetched the page, the user agent sent and whether robots.txt was obeyed. For regulated use-cases where provenance matters, stay on the native Minifetch proxy.
- **No charge** for blocked or errored pages.

Not currently available on either proxy: authenticated or logged-in content.

---

### Error Types
You are never charged for errors: blocked pages, failed fetches and bad requests are all free. Every error has a `name` and a `message`. The error classes are exported, so you can optionally check `err instanceof NetworkError` (after you `import { NetworkError } from "minifetch-api"`) or simply check `err.name` like the example below:

```js
try {
  const response = await client.extractUrlMetadata(url);
} catch (err) {
  if (err.name === "NetworkError" && err.serverMessage === "upstream forbidden") {
    // the target URL blocked the native Minifetch proxy, try the external
    // proxy method instead: client.proxyExtractUrlMetadata(url) ... or try
    // client.extractUrlMetadataWithProxyFallback(url) - it will try both
    // automatically, starting with the cheapest option (Minifetch proxy).
  }
  console.log(err.message); // "Request failed: 502 Bad Gateway — upstream forbidden"
}
```

**NetworkError** — Minifetch answered with an error, or couldn't be reached. Most errors are this one. Fields:
- `statusCode` - the HTTP status Minifetch returned, ex: `502`
- `serverMessage` - why, exactly as the server sent it, ex: `"upstream forbidden"` (listed below)
- `upstreamStatus` - the target page's own HTTP status, when it answered, ex: `403`

Each field is only set when the server sent it. If Minifetch couldn't be reached at all (you're offline, DNS, timeout), none are set and the message starts with `Request failed: could not reach Minifetch`.

`serverMessage` values when fetching a web page failed:

| `serverMessage` | `statusCode` | What happened |
|---|---|---|
| `robots blocked` * | 502 | robots.txt disallows the `minifetch` user agent |
| `upstream forbidden` * | 502 | The page returned 403 |
| `upstream rate limited` * | 502 | The page returned 429 |
| `upstream unavailable` * | 502 | The page returned 503 |
| `upstream not found` | 502 | The page returned 404 |
| `upstream bad request` | 502 | The page returned 400 |
| `upstream unauthorized` | 502 | The page returned 401 |
| `upstream payment required` | 502 | The page returned 402 (paywalled) |
| `upstream error` | 502 | Any other error from the page, or the connection failed |
| `upstream too many redirects` | 502 | Redirect chain too long |
| `dns lookup failed` | 502 | The domain doesn't resolve |
| `invalid url` | 400 | Missing, malformed or unsupported URL |
| `queue timeout` | 503 | Timed out waiting on the site's crawl delay, retry later |
| `fetch error` | 503 | The page timed out or the fetch failed, retry later |
| `proxy provider error` | 503 | The external proxy provider failed (external proxy methods only), retry later |
| `server error` | 500 | Unclassified failure |

\* The page blocked the native Minifetch proxy. Retry with `proxyExtract<X>` or `proxyRenderExtract<X>`. The `extract<X>WithProxyFallback` methods do this automatically for you.

Other `statusCode` values:
- `400` - a bad option, ex: an invalid `country`, or `fields` that aren't available on the external proxy. `serverMessage` says which.
- `401` - API key missing, invalid or revoked.
- `402` - out of credits (API key) or out of USDC (x402). Top up and retry.
- `429` - too many requests. Back off and retry, max 5-10 requests per second.

**RobotsBlockedError** — thrown by the `checkAndExtract<X>` and `checkAndRunSeoPageAudit` methods when the free preflight check finds the URL blocked by robots.txt. Nothing was fetched or charged. On `checkAndExtract<X>`, `err.tip` names the external proxy methods that can fetch that page. If this is your site, read [How To Unblock Minifetch](https://minifetch.com/tutorials/unblock-minifetch).

The preflight only checks the URL you pass in, not where it redirects. If a redirect leads to a blocked page, or you call `extract<X>` / `runSeoPageAudit` (no preflight), the server blocks it instead and you get a `NetworkError` with `serverMessage: "robots blocked"`. Handle both.

**ExtractionFailedError** / **SearchFailedError** — an unexpected failure, ex: a response that isn't valid JSON. The message includes the cause.

**InvalidUrlError** — the URL is malformed or too long. Correct it and try again. The `checkAndExtract<X>`, `checkAndRunSeoPageAudit` and `extract<X>WithProxyFallback` methods also throw it when the domain doesn't exist; `extract<X>` and `runSeoPageAudit` throw a `NetworkError` with `serverMessage: "dns lookup failed"` instead.

**PaymentFailedError** — the x402 payment couldn't be made, ex: a wallet or signing problem. `err.network` says which network.

**ConfigurationError** — the client was created with a missing or invalid API key, private key or network.

**InvalidQueryError** — `searchByKeyword` was given an empty query or one over 50 characters.

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
