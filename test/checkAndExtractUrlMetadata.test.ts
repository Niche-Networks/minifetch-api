// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect, afterEach } from 'vitest';
import { MinifetchClient } from '../src/client.js';
import { InvalidUrlError, NetworkError } from '../src/types/errors.js';

afterEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

describe.sequential("checkAndExtractUrlMetadata() e2e", { timeout: 30000 }, () => {

  it("base-sepolia success w includeResponseBody true", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.extractUrlMetadata('https://minifetch.com', { includeResponseBody: true});

    expect(response.success).toBe(true);
    expect(response.results[0].metadata.url).toContain("minifetch.com");
    expect(response.results[0].metadata.title).toContain("Minifetch.com");
    expect(response.results[0].metadata["og:title"]).toContain("Minifetch.com");
    expect(response.results[0].metadata.responseBody).toContain("<!DOCTYPE html>");
    expect(response.payment.success).toBe(true);
    expect(response.payment.payer).toContain("0x");
    expect(response.payment.network).toBe("base-sepolia");
    expect(response.payment.txHash).toContain("0x");
    expect(response.payment.explorerLink).toBe(`https://sepolia.basescan.org/tx/${response.payment.txHash}`);
  });

  it("throws when robots.txt check fails", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    const blockedUrl = "https://www.npmjs.com/package/url-metadata";

    await expect(client.checkAndExtractUrlMetadata(blockedUrl))
      .rejects.toMatchObject({
        name: "RobotsBlockedError",
        message: expect.stringContaining("URL is blocked by robots.txt"),
        url: blockedUrl
      });
  });

  it("throws when robots check passes but page 403s anyway", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.checkAndExtractUrlMetadata("http://coinbase.com"))
      .rejects.toMatchObject({
        name: "NetworkError",
        message: "Request failed: 502 Bad Gateway",
      });
  });

  it("throws on URL w unsupported extension", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.checkAndExtractUrlMetadata('http://foo.bar/baz.pdf'))
      .rejects.toThrow(InvalidUrlError);
  });

});
