// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { MinifetchClient } from '../src/client.js';
import { InvalidUrlError, NetworkError } from '../src/types/errors.js';

beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

describe.sequential("extractUrlPreview() e2e", { timeout: 30000 }, () => {

  it("base-sepolia testnet success", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.extractUrlPreview('https://minifetch.com');

    expect(response.success).toBe(true);
    expect(response.results).toHaveLength(1);
    expect(response.results[0].data.url).toContain("minifetch.com");
    expect(response.results[0].data.title.length).toBeGreaterThan(10);
    expect(response.results[0].data.description.length).toBeGreaterThan(10);
    expect(response.results[0].data.image.length).toBeGreaterThan(1);

    expect(response.payment.success).toBe(true);
    expect(response.payment.payer).toContain("0x");
    expect(response.payment.network).toBe("base-sepolia");
    expect(response.payment.txHash).toContain("0x");
    expect(response.payment.explorerLink).toBe(`https://sepolia.basescan.org/tx/${response.payment.txHash}`);
  });

  it("solana-devnet success", async () => {
    const client = new MinifetchClient({
      network: "solana-devnet",
      privateKey: process.env.SVM_PRIVATE_KEY as any,
    });
    const response = await client.extractUrlPreview('https://minifetch.com');

    expect(response.success).toBe(true);
    expect(response.results).toHaveLength(1);
    expect(response.results[0].data.url).toContain("minifetch.com");
    expect(response.results[0].data.title.length).toBeGreaterThan(10);
    expect(response.results[0].data.description.length).toBeGreaterThan(10);
    expect(response.results[0].data.image.length).toBeGreaterThan(1);

    expect(response.payment.success).toBe(true);
    expect(typeof response.payment.payer).toBe("string");
    expect(response.payment.network).toBe("solana-devnet");
    expect(typeof response.payment.txHash).toBe("string");
    expect(response.payment.explorerLink).toBe(`https://explorer.solana.com/tx/${response.payment.txHash}?cluster=devnet`);
  });

  it("throws on robots.txt check = blocked URL", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    const blockedUrl = "https://www.npmjs.com/package/url-metadata";

    await expect(client.extractUrlPreview(blockedUrl))
      .rejects.toMatchObject({
        name: "NetworkError",
        message: "Request failed: 502 Bad Gateway",
      });
  });

  it("throws on DNS lookup error", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    const dnsErrUrl = "https://mydns2.errrrrr";

    await expect(client.extractUrlPreview(dnsErrUrl))
      .rejects.toMatchObject({
        name: "NetworkError",
        message: "Request failed: 502 Bad Gateway",
      });
  });

  it("throws on malformed URL", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.extractUrlPreview('vvv'))
      .rejects.toThrow(InvalidUrlError);
  });

  it("throws on URL w unsupported file extension", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.extractUrlPreview('http://foo.bar/baz.pdf'))
      .rejects.toThrow(InvalidUrlError);
  });

});
