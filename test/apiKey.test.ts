/**
 * API key e2e tests — runs against production only.
 * Requires MINIFETCH_API_KEY in .env-prod (a valid mf_prod_* key with credits).
 *
 * Run with: pnpm test:file test/apiKey.test.ts
 */

import { config } from "dotenv";
import { describe, it, expect, beforeEach } from "vitest";
import { MinifetchClient } from "../src/client.js";
import { ConfigurationError, InvalidUrlError, NetworkError } from "../src/types/errors.js";
config({ path: ".env-prod" });

const TEST_URL = "https://minifetch.com";

// Rate-limit guard between calls
beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

describe.sequential("apiKey: preflightUrlCheck() e2e (prod)", { timeout: 30000 }, () => {

  it("preflight success w allowed URL", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });
    const response = await client.preflightUrlCheck(TEST_URL);
    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toBe("https://minifetch.com");
    expect(response.results[0].data.allowed).toBe(true);
    expect(response.results[0].data.message).toContain("allowed by robots.txt");
    expect(response.results[0].data.crawlDelay).toBe(1);
  });

    it("works, even w bad api key (has correct prefix tho)", async () => {
    const client = new MinifetchClient({
      apiKey: 'mf_prod_badkeynowork'
    });

    const response = await client.preflightUrlCheck("https://minifetch.com");
    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toBe("https://minifetch.com");
    expect(response.results[0].data.allowed).toBe(true);
    expect(response.results[0].data.message).toContain("allowed by robots.txt");
    expect(response.results[0].data.crawlDelay).toBe(1);
  });

});

describe.sequential("apiKey: preflightUrlCheck() fails gracefully", { timeout: 30000 }, () => {

  it("handles DNS lookup error", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });

    const dnsErrUrl = "https://mydns1.errrrrr";

    const response = await client.preflightUrlCheck(dnsErrUrl);
    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toBe(dnsErrUrl);
    expect(response.results[0].data.allowed).toBe(false);
    expect(response.results[0].data.message).toContain("Invalid or non-existent domain");
  });

  it("throws on malformed URL", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });

    await expect(client.preflightUrlCheck("vvv")).rejects.toThrow(InvalidUrlError);
  });

  it("throws on URL w unsupported file extension", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });

    await expect(client.preflightUrlCheck("http://foo.bar/baz.pdf")).rejects.toThrow(
      InvalidUrlError,
    );
  });

});

describe.sequential("apiKey: extractUrlPreview() e2e (prod)", { timeout: 30000 }, () => {

  it("returns preview for allowed URL", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });
    const response = await client.extractUrlPreview(TEST_URL);
    expect(response.success).toBe(true);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.payment).toBeUndefined();
  });

});

describe.sequential("apiKey: extractUrlPreview() fails gracefully (prod)", { timeout: 30000 }, () => {

  it("throws on robots.txt check = blocked URL", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });

    const blockedUrl = "https://www.npmjs.com/package/url-metadata/v/5.4.3";

    await expect(client.extractUrlPreview(blockedUrl)).rejects.toMatchObject({
      name: "NetworkError",
      message: "Request failed: 502 Bad Gateway",
    });
  });

  it("throws on DNS lookup error", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });

    const dnsErrUrl = "https://mydns2.errrrrr";

    await expect(client.extractUrlPreview(dnsErrUrl)).rejects.toMatchObject({
      name: "NetworkError",
      message: "Request failed: 502 Bad Gateway",
    });
  });

  it("throws on malformed URL", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });

    await expect(client.extractUrlPreview("vvv")).rejects.toThrow(InvalidUrlError);
  });

  it("throws on URL w unsupported file extension", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.extractUrlPreview("http://foo.bar/baz.pdf")).rejects.toThrow(
      InvalidUrlError,
    );
  });

});

describe.sequential("apiKey: extractUrlContent() e2e (prod)", { timeout: 30000 }, () => {

  it("returns content for allowed URL", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });
    const response = await client.extractUrlContent(TEST_URL);
    expect(response.success).toBe(true);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.payment).toBeUndefined();
  });

});

describe.sequential("apiKey: checkAndExtractUrlContent() e2e (prod)", { timeout: 30000 }, () => {

  it("success w ?includeMediaUrls=true", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });
    const response = await client.checkAndExtractUrlContent(TEST_URL, {
      includeMediaUrls: true,
    });

    expect(response.success).toBe(true);
    expect(response.results).toHaveLength(1);
    expect(response.results[0].data.url).toContain("minifetch.com");
    expect(typeof response.results[0].data.summary).toBe("string");
    expect(typeof response.results[0].data.mediaUrls).toBe("object"); // is array
    // payment field should be absent for apiKey auth
    expect(response.payment).toBeUndefined();
  });

});

describe.sequential("apiKey: extractUrlLinks() e2e (prod)", { timeout: 30000 }, () => {

  it("returns links for allowed URL", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });
    const response = await client.extractUrlLinks(TEST_URL);
    expect(response.success).toBe(true);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.payment).toBeUndefined();
  });

});

describe.sequential("apiKey: extractUrlMetadata() e2e (prod)", { timeout: 30000 }, () => {

  it("returns metadata for allowed URL", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });
    const response = await client.extractUrlMetadata(TEST_URL);
    expect(response.success).toBe(true);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].data).toBeDefined();
    // payment field should be absent for apiKey auth
    expect(response.payment).toBeUndefined();
  });

});

describe.sequential("apiKey: checkAndExtractUrlMetadata() e2e (prod)", { timeout: 30000 }, () => {

  it("preflight + extract metadata in one call", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });
    const response = await client.checkAndExtractUrlMetadata(TEST_URL);
    expect(response.success).toBe(true);
    expect(response.results.length).toBeGreaterThan(0);
    // verbosity = "standard" (default):
    expect(typeof response.results[0].data.headings).toBe("undefined");
    expect(typeof response.results[0].data.imgTags).toBe("undefined");
    // payment field should be absent for apiKey auth
    expect(response.payment).toBeUndefined();
  });

  it("returns metadata w ?verbosity=full & ?includeResponseBody=true", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });
    const response = await client.checkAndExtractUrlMetadata("https://minifetch.com", {
      verbosity: "full",
      includeResponseBody: true
    });
    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toContain("minifetch.com");
    expect(response.results[0].data.title).toContain("Minifetch.com");
    expect(response.results[0].data["og:title"]).toContain("Minifetch.com");
    expect(response.results[0].data.responseBody).toContain("<!DOCTYPE html>");
    // verbosity = "full"
    expect(typeof response.results[0].data.headings).toBe("object");
    expect(typeof response.results[0].data.imgTags).toBe("object");
    // payment field should be absent for apiKey auth
    expect(response.payment).toBeUndefined();
  });

});

describe.sequential("apiKey: checkAndExtractUrlMetadata() fails gracefully (prod)", { timeout: 30000 }, () => {

  it("throws when robots.txt check fails", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });

    const blockedUrl = "https://www.npmjs.com/package/url-metadata/v/5.4.3";

    await expect(client.checkAndExtractUrlMetadata(blockedUrl)).rejects.toMatchObject({
      name: "RobotsBlockedError",
      message: expect.stringContaining("URL is blocked by robots.txt"),
      url: blockedUrl,
    });
  });

  it("throws when robots check passes but page 403s anyway", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });

    await expect(client.checkAndExtractUrlMetadata("http://coinbase.com")).rejects.toMatchObject({
      name: "NetworkError",
      message: "Request failed: 502 Bad Gateway",
    });
  });

  it("throws on URL w unsupported file extension", async () => {
    const client = new MinifetchClient({
      apiKey: process.env.MINIFETCH_API_KEY as string,
    });

    await expect(client.checkAndExtractUrlMetadata("http://foo.bar/baz.pdf")).rejects.toThrow(
      InvalidUrlError,
    );
  });

});;
