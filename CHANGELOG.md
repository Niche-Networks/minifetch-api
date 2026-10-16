# CHANGELOG

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
