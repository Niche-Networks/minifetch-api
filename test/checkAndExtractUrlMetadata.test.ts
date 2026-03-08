// First, set env
import { config } from "dotenv";

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { MinifetchClient } from "../src/client.js";
import { InvalidUrlError, NetworkError } from "../src/types/errors.js";
config({ path: ".env-dev" });

beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

describe.sequential("x402: checkAndExtractUrlMetadata() e2e", { timeout: 30000 }, () => {

  it("base-sepolia success w ?verbosity=standard & ?includeResponseBody=true", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.checkAndExtractUrlMetadata("https://minifetch.com", {
      includeResponseBody: true
    });

    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toContain("minifetch.com");
    expect(response.results[0].data.title).toContain("Minifetch.com");
    expect(response.results[0].data["og:title"]).toContain("Minifetch.com");
    expect(response.results[0].data.responseBody).toContain("<!DOCTYPE html>");
    // verbosity = "standard" (default):
    expect(typeof response.results[0].data.headings).toBe("undefined");
    expect(typeof response.results[0].data.imgTags).toBe("undefined");

    expect(response.payment.success).toBe(true);
    expect(response.payment.payer).toContain("0x");
    expect(response.payment.network).toBe("base-sepolia");
    expect(response.payment.txHash).toContain("0x");
    expect(response.payment.explorerLink).toBe(
      `https://sepolia.basescan.org/tx/${response.payment.txHash}`,
    );
  });

});

describe.sequential("x402: checkAndExtractUrlMetadata() fails gracefully", { timeout: 30000 }, () => {

  it("throws w bad private key", async () => {
    const failClient = new MinifetchClient({
      network: "base-sepolia",
      privateKey: "0xDEADBEEF00000000000000000000000000000000000000000000000000FACADE" as any,
    });

    const r = await expect(failClient.checkAndExtractUrlMetadata("https://anthropic.com")).rejects.toMatchObject({
      name: "NetworkError",
      message: "Request failed: 402 Payment Required",
    });
  });

  it("throws when robots.txt check fails", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    const blockedUrl = "https://www.npmjs.com/package/url-metadata";

    await expect(client.checkAndExtractUrlMetadata(blockedUrl)).rejects.toMatchObject({
      name: "RobotsBlockedError",
      message: expect.stringContaining("URL is blocked by robots.txt"),
      url: blockedUrl,
    });
  });

  it("throws when robots check passes but page 403s anyway", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.checkAndExtractUrlMetadata("http://coinbase.com")).rejects.toMatchObject({
      name: "NetworkError",
      message: "Request failed: 502 Bad Gateway",
    });
  });

  it("throws on URL w unsupported file extension", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.checkAndExtractUrlMetadata("http://foo.bar/baz.pdf")).rejects.toThrow(
      InvalidUrlError,
    );
  });

});
