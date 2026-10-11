/**
 * API key e2e tests for the external proxy methods — runs against production only.
 * Requires MINIFETCH_API_KEY in .env-prod (a valid mf_prod_* key with credits).
 * The proxy routes must be deployed to production for these to pass.
 *
 * Every successful call spends account credits (native price + proxy surcharge)
 * and a WebScrapingAPI credit on the server's account.
 *
 * Run with: pnpm test:file test/prodApiKeyProxy.test.ts
 */

import { config } from "dotenv";
import { describe, it, expect, beforeEach } from "vitest";
import { MinifetchClient } from "../src/client.js";
config({ path: ".env-prod" });

const TEST_URL = "https://minifetch.com";
const JS_URL = "https://quotes.toscrape.com/js/";
const BLOCKED_URL = "https://www.npmjs.com/package/url-metadata/v/5.4.3";

// External proxy calls can take up to ~60s, rendering especially.
const TIMEOUT = 90000;

// Rate-limit guard between calls
beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

const client = () =>
  new MinifetchClient({
    apiKey: process.env.MINIFETCH_API_KEY as string,
  });

/** Every external proxy response carries the managed proxy block and no cache hit. */
const expectManaged = (data: any, render: boolean) => {
  expect(data.proxy.proxyType).toBe("managed");
  expect(data.proxy.provider).toBe("webscrapingapi.com");
  expect(data.proxy.render).toBe(render);
  expect(data.proxy.robotsTxt.allowed).toBe(null);
  expect(data.minifetchCache).toEqual({ hit: false });
};

describe.sequential("apiKey: proxy methods e2e (prod)", { timeout: TIMEOUT }, () => {
  it("proxyExtractUrlPreview success", async () => {
    const response = await client().proxyExtractUrlPreview(TEST_URL);

    expect(response.success).toBe(true);
    expect(response.results[0].data.title).toContain("SEO");
    expectManaged(response.results[0].data, false);
    // payment field should be absent for apiKey auth
    expect(response.payment).toBeUndefined();
  });

  it("proxyRenderExtractUrlContent success, content only exists after JS runs", async () => {
    const response = await client().proxyRenderExtractUrlContent(JS_URL);

    expect(response.success).toBe(true);
    expect(response.results[0].data.summary).toContain("Albert Einstein");
    expectManaged(response.results[0].data, true);
    expect(response.payment).toBeUndefined();
  });

  it("extractUrlMetadataWithProxyFallback: allowed URL stays native", async () => {
    const response = await client().extractUrlMetadataWithProxyFallback(TEST_URL, {
      fields: ["title"],
    });

    expect(response.success).toBe(true);
    expect(response.results[0].data.proxy.proxyType).toBe("minifetch");
  });

  it("extractUrlPreviewWithProxyFallback: robots.txt-blocked URL falls back to the external proxy", async () => {
    const response = await client().extractUrlPreviewWithProxyFallback(BLOCKED_URL);

    expect(response.success).toBe(true);
    expectManaged(response.results[0].data, false);
  });
});

describe.sequential("apiKey: proxy methods fail gracefully (prod)", { timeout: TIMEOUT }, () => {
  it("invalid country: 400 from the server, no charge", async () => {
    await expect(client().proxyExtractUrlLinks(TEST_URL, { country: "xx" })).rejects.toMatchObject({
      name: "NetworkError",
      statusCode: 400,
      serverMessage: expect.stringContaining("Invalid country param"),
    });
  });

  it("bad api key (correct prefix): 401", async () => {
    const badClient = new MinifetchClient({ apiKey: "mf_prod_badkeynowork" });
    await expect(badClient.proxyExtractUrlPreview(TEST_URL)).rejects.toMatchObject({
      name: "NetworkError",
      statusCode: 401,
    });
  });

  it("fallback: non-existent domain throws InvalidUrlError", async () => {
    await expect(
      client().extractUrlContentWithProxyFallback("https://mydns4.errrrrr"),
    ).rejects.toMatchObject({
      name: "InvalidUrlError",
      message: expect.stringContaining("non-existent domain"),
    });
  });
});
