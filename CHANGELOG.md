# CHANGELOG

1.9.2
- README: misc changes, incl dropped prices on /url-content and /search/keyword endpoints

1.9.1
- "ssrf blocked" (a private, loopback or reserved target address, ex: `http://127.0.0.1`) now throws `InvalidUrlError` from every method, matching `preflightUrlCheck()` in 1.9.0. Previously the extract, proxy and SEO audit methods threw `NetworkError: Request failed: 502 Bad Gateway — ssrf blocked`. `extract<X>WithProxyFallback()` does not retry these via the external proxy

1.9.0
- `preflightUrlCheck()`: a private, loopback or reserved target address throws `InvalidUrlError` (`ssrf blocked`); other errors now end with the server's reason, ex: `Preflight check failed: 502 Bad Gateway — server error`
- `extract<X>WithProxyFallback()` also falls back to the external proxy on `robots unreachable` (the site's robots.txt returned a 5xx or couldn't be reached, treated as a disallow)
- `RobotsBlockedError.message` passes through the server's reason, ex: `robots.txt fetch refused (403), defaulting to disallowed`; check the error type, not the message text
- add CHANGELOG to package.json publish manifest

1.8.1
- improve README Quick Start, add keywords to package.json

1.8.0
- add `extract<X>WithProxyFallback()`: tries the native Minifetch proxy first, falls back to the external proxy if the page blocks it; `{ render: true, country: 'xx' }` options
- add external proxy methods, for pages that block the native Minifetch proxy: `proxyExtract<X>()` and `proxyRenderExtract<X>()` (with JavaScript rendering) for metadata, links, preview & content; `{ country: 'xx' }` option
- `NetworkError` now carries `statusCode`, and its message ends with the server's reason, ex: `Request failed: 502 Bad Gateway — upstream forbidden`
- `RobotsBlockedError` from `checkAndExtract<X>()` methods has a `tip` recommending the proxy methods for that URL
- error classes are now exported: `import { NetworkError } from "minifetch-api"`
- behavior changes:
  - a failure to reach Minifetch (offline, DNS, timeout) is now a `NetworkError`; it was (mistakenly) a `PaymentFailedError` (x402) or `ExtractionFailedError` / `SearchFailedError` (API key)
  - `checkAndExtract<X>()` / `checkAndRunSeoPageAudit()` on a non-existent domain now throw `InvalidUrlError`; it was (mistakenly) a `RobotsBlockedError`

1.7.1
- README changes only; add search by keyword options

1.7.0
- add `searchByKeyword('lorem ipsum')` method

1.6.0
- all methods default to POST now with optional { method: 'GET' }

1.5.0
- preflight check: { "fresh": true } cache-busting option

1.4.0
- metadata endpoints: omitEmpty & fields options

1.3.4
- update /url-preview price and description

1.3.3,
1.3.2,
1.3.1,
1.2.3
- README
- package.json description
- example updates: minifetch api key

1.2.2,
1.2.1
- README changes only

1.2.0
- API key support
