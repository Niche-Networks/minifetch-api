// First, set env
import { config } from "dotenv";

import { describe, it, expect, beforeEach } from "vitest";
import { MinifetchClient } from "../src/client.js";
config({ path: ".env-dev" });

/**
 * x402 e2e tests for the external proxy methods, against the local dev server.
 * Every successful call here spends a WebScrapingAPI credit on the server's
 * account (render and non-render cost the same), on top of the testnet payment.
 *
 * Hard-to-reproduce cases (a target that 403s / 429s / 503s, the client being
 * offline) are covered with mocks in proxyMethods.test.ts.
 */

// Our own site: allowed by robots.txt, works through the external proxy.
const TEST_URL = "https://minifetch.com";
// A page that only has content once its JavaScript runs (0 quotes without
// rendering, 10 with). Built for scraping practice.
const JS_URL = "https://quotes.toscrape.com/js/";
// Blocked by robots.txt for minifetch (same URL the native tests use). If npm
// ever starts blocking the external proxy too, swap this for another blocked URL.
const BLOCKED_URL = "https://www.npmjs.com/package/url-metadata/v/5.4.3";

// External proxy calls can take up to ~60s, rendering especially.
const TIMEOUT = 90000;

beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

/** Every external proxy response carries the managed proxy block and no cache hit. */
const expectManaged = (data: any, render: boolean) => {
  expect(data.proxy.proxyType).toBe("managed");
  expect(data.proxy.provider).toBe("webscrapingapi.com");
  expect(data.proxy.render).toBe(render);
  expect(data.proxy.robotsTxt.allowed).toBe(null);
  expect(data.minifetchCache).toEqual({ hit: false });
};

/** x402 receipt, as in the native e2e tests. */
const expectBasePayment = (payment: any) => {
  expect(payment.success).toBe(true);
  expect(payment.payer).toContain("0x");
  expect(payment.network).toBe("base-sepolia");
  expect(payment.txHash).toContain("0x");
  expect(payment.explorerLink).toBe(`https://sepolia.basescan.org/tx/${payment.txHash}`);
};

const baseClient = () =>
  new MinifetchClient({
    network: "base-sepolia",
    privateKey: process.env.BASE_PRIVATE_KEY as any,
  });

const solanaClient = () =>
  new MinifetchClient({
    network: "solana-devnet",
    privateKey: process.env.SVM_PRIVATE_KEY as any,
  });

// ─────────────────────────────────────────────────────────────
// proxyExtract* — external proxy, no rendering
// ─────────────────────────────────────────────────────────────

describe.sequential("x402: proxyExtract*() e2e", { timeout: TIMEOUT }, () => {
  it("proxyExtractUrlMetadata: base-sepolia success w ?fields, no performance/redirects", async () => {
    const response = await baseClient().proxyExtractUrlMetadata(TEST_URL, {
      fields: ["title", "description"],
    });

    expect(response.success).toBe(true);
    const data = response.results[0].data;
    expect(data.title).toContain("SEO");
    expect(typeof data.description).toBe("string");
    expect(typeof data.performance).toBe("undefined");
    expect(typeof data.redirects).toBe("undefined");
    expectManaged(data, false);
    expectBasePayment(response.payment);
  });

  it("proxyExtractUrlLinks: solana-devnet success w GET method option", async () => {
    const response = await solanaClient().proxyExtractUrlLinks(TEST_URL, { method: "GET" });

    expect(response.success).toBe(true);
    const data = response.results[0].data;
    expect(data.url).toContain("minifetch.com");
    expect(data.links.internal.length).toBeGreaterThan(0);
    expectManaged(data, false);
    expect(response.payment.success).toBe(true);
    expect(response.payment.network).toBe("solana-devnet");
  });

  it("proxyExtractUrlPreview: base-sepolia success w ?country", async () => {
    const response = await baseClient().proxyExtractUrlPreview(TEST_URL, { country: "de" });

    expect(response.success).toBe(true);
    const data = response.results[0].data;
    expect(data.title).toContain("SEO");
    expectManaged(data, false);
    expect(data.proxy.country).toBe("de");
    expectBasePayment(response.payment);
  });

  it("proxyExtractUrlContent: base-sepolia success w ?includeMediaUrls=true", async () => {
    const response = await baseClient().proxyExtractUrlContent(TEST_URL, { includeMediaUrls: true });

    expect(response.success).toBe(true);
    const data = response.results[0].data;
    expect(typeof data.summary).toBe("string");
    expect(typeof data.mediaUrls).toBe("object"); // is array
    expectManaged(data, false);
    expectBasePayment(response.payment);
  });
});

// ─────────────────────────────────────────────────────────────
// proxyRenderExtract* — external proxy with JavaScript rendering
// ─────────────────────────────────────────────────────────────

describe.sequential("x402: proxyRenderExtract*() e2e", { timeout: TIMEOUT }, () => {
  it("proxyRenderExtractUrlContent: base-sepolia success, content only exists after JS runs", async () => {
    const response = await baseClient().proxyRenderExtractUrlContent(JS_URL);

    expect(response.success).toBe(true);
    const data = response.results[0].data;
    expect(data.summary).toContain("Albert Einstein");
    expectManaged(data, true);
    expectBasePayment(response.payment);
  });

  it("proxyRenderExtractUrlLinks: solana-devnet success", async () => {
    const response = await solanaClient().proxyRenderExtractUrlLinks(JS_URL);

    expect(response.success).toBe(true);
    const data = response.results[0].data;
    expect(data.links.internal.length).toBeGreaterThan(0);
    expectManaged(data, true);
    expect(response.payment.network).toBe("solana-devnet");
  });

  it("proxyRenderExtractUrlMetadata: base-sepolia success", async () => {
    const response = await baseClient().proxyRenderExtractUrlMetadata(TEST_URL, { omitEmpty: true });

    expect(response.success).toBe(true);
    const data = response.results[0].data;
    expect(data.title).toContain("SEO");
    expectManaged(data, true);
    expectBasePayment(response.payment);
  });

  it("proxyRenderExtractUrlPreview: base-sepolia success", async () => {
    const response = await baseClient().proxyRenderExtractUrlPreview(TEST_URL);

    expect(response.success).toBe(true);
    const data = response.results[0].data;
    expect(data["og:title"]).toBeDefined();
    expectManaged(data, true);
    expectBasePayment(response.payment);
  });
});

// ─────────────────────────────────────────────────────────────
// extract*WithProxyFallback
// ─────────────────────────────────────────────────────────────

describe.sequential("x402: extract*WithProxyFallback() e2e", { timeout: TIMEOUT }, () => {
  it("allowed URL: stays on the native Minifetch proxy", async () => {
    const response = await baseClient().extractUrlPreviewWithProxyFallback(TEST_URL);

    expect(response.success).toBe(true);
    expect(response.results[0].data.proxy.proxyType).toBe("minifetch");
    expectBasePayment(response.payment);
  });

  it("robots.txt-blocked URL: falls back to the external proxy", async () => {
    const response = await baseClient().extractUrlMetadataWithProxyFallback(BLOCKED_URL, {
      fields: ["title"],
    });

    expect(response.success).toBe(true);
    expectManaged(response.results[0].data, false);
    expectBasePayment(response.payment);
  });

  it("render: true goes straight to the external proxy with rendering", async () => {
    const response = await solanaClient().extractUrlContentWithProxyFallback(JS_URL, { render: true });

    expect(response.success).toBe(true);
    expect(response.results[0].data.summary).toContain("Albert Einstein");
    expectManaged(response.results[0].data, true);
  });

  it("country goes straight to the external proxy", async () => {
    const response = await baseClient().extractUrlLinksWithProxyFallback(TEST_URL, { country: "fr" });

    expect(response.success).toBe(true);
    expectManaged(response.results[0].data, false);
    expect(response.results[0].data.proxy.country).toBe("fr");
  });
});

// ─────────────────────────────────────────────────────────────
// Fails gracefully (no charge for any of these)
// ─────────────────────────────────────────────────────────────

describe.sequential("x402: proxy methods fail gracefully", { timeout: TIMEOUT }, () => {
  it("throws w bad private key", async () => {
    const failClient = new MinifetchClient({
      network: "base-sepolia",
      privateKey: "0xDEADBEEF00000000000000000000000000000000000000000000000000FACADE" as any,
    });

    await expect(failClient.proxyExtractUrlPreview(TEST_URL)).rejects.toMatchObject({
      name: "NetworkError",
      message: "Request failed: 402 Payment Required",
    });
  });

  it("invalid country: 400 from the server, before any fetch", async () => {
    await expect(baseClient().proxyExtractUrlPreview(TEST_URL, { country: "xx" })).rejects.toMatchObject({
      name: "NetworkError",
      statusCode: 400,
      serverMessage: expect.stringContaining("Invalid country param"),
    });
  });

  it("?fields=performance is rejected on the proxy routes", async () => {
    await expect(
      baseClient().proxyExtractUrlMetadata(TEST_URL, { fields: ["performance"] }),
    ).rejects.toMatchObject({
      name: "NetworkError",
      statusCode: 400,
      serverMessage: expect.stringContaining("performance"),
    });
  });

  it("fallback: non-existent domain throws InvalidUrlError, no proxy attempt", async () => {
    await expect(
      baseClient().extractUrlMetadataWithProxyFallback("https://mydns3.errrrrr"),
    ).rejects.toMatchObject({
      name: "InvalidUrlError",
      message: expect.stringContaining("non-existent domain"),
    });
  });

  it("checkAndExtract*: robots.txt block keeps its message and names the proxy methods in tip", async () => {
    await expect(baseClient().checkAndExtractUrlMetadata(BLOCKED_URL)).rejects.toMatchObject({
      name: "RobotsBlockedError",
      message: expect.stringContaining("URL is blocked by robots.txt"),
      tip: expect.stringContaining("proxyExtractUrlMetadata or extractUrlMetadataWithProxyFallback"),
    });
  });
});
