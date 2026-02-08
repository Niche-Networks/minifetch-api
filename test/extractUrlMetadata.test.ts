// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect } from 'vitest';
import { MinifetchClient } from '../src/client.js';
import { InvalidUrlError, NetworkError } from '../src/types/errors.js';

describe("extractUrlMetadata() e2e", { timeout: 30000 }, () => {

  it("checkAndExtractUrlMetadata() when robots check passes but page 403s anyway", async () => {
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

  it("checkAndExtractUrlMetadata() on base-sepolia success w includeResponseBody true", async () => {
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

  it("checkAndExtractMetadata() throws on URL w unsupported extension", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.checkAndExtractUrlMetadata('http://foo.bar/baz.pdf'))
      .rejects.toThrow(InvalidUrlError);
  });

  it("base-sepolia testnet success", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.extractUrlMetadata('https://minifetch.com');

    expect(response.success).toBe(true);
    expect(response.results[0].metadata.url).toContain("minifetch.com");
    expect(response.results[0].metadata.title).toContain("Minifetch.com");
    expect(response.results[0].metadata["og:title"]).toContain("Minifetch.com");
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
    const response = await client.extractUrlMetadata('https://minifetch.com');

    expect(response.success).toBe(true);
    expect(response.results[0].metadata.url).toContain("minifetch.com");
    expect(response.results[0].metadata.title).toContain("Minifetch.com");
    expect(response.results[0].metadata["og:title"]).toContain("Minifetch.com");
    expect(response.payment.success).toBe(true);
    expect(typeof response.payment.payer).toBe("string");
    expect(response.payment.network).toBe("solana-devnet");
    expect(typeof response.payment.txHash).toBe("string");
    expect(response.payment.explorerLink).toBe(`https://explorer.solana.com/tx/${response.payment.txHash}?cluster=devnet`);
  });

  it("throws on malformed URL", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.extractUrlMetadata('vvv'))
      .rejects.toThrow(InvalidUrlError);
  });

  it("throws on URL w unsupported extension", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.extractUrlMetadata('http://foo.bar/baz.pdf'))
      .rejects.toThrow(InvalidUrlError);
  });

});
