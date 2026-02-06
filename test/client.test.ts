// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect } from 'vitest';
import { MinifetchClient } from '../src/client.js';

describe("MinifetchClient E2E Tests", { timeout: 30000 }, () => {

  it("client should init instanceof MinifetchClient", () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    expect(client).toBeInstanceOf(MinifetchClient);
  });

  it("throws error if EVM key is invalid", () => {
    expect(() => {
      const client = new MinifetchClient({
        network: "base-sepolia",
        privateKey: "123...notaprivatekey!" as any,
      });
    }).toThrow("Invalid EVM private key format (expected hex string that starts with 0x)");
  });

  it("throws error if SVM key is invalid", () => {
    expect(() => {
      const client = new MinifetchClient({
        network: "solana-devnet",
        privateKey: "123...notaprivatekey!" as any,
      });
    }).toThrow("Invalid Solana private key format (expected base58 string)");
  });

  it("preflightCheckUrl()", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.preflightCheckUrl('https://minifetch.com');

    expect(response.success).toBe(true);
    expect(response.results[0].url).toBe("https://minifetch.com");
    expect(response.results[0].allowed).toBe(true);
    expect(response.results[0].message).toContain("allowed by robots.txt");
    expect(response.results[0].crawlDelay).toBe(1);
  });

  it("extractUrlMetadata() on base-sepolia testnet", async () => {
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
    expect(response.payment.explorerLink).toContain("sepolia");
    expect(response.payment.explorerLink).toContain(response.payment.txHash);

  });

  it("extractUrlMetadata() on solana-devnet", async () => {
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
    expect(response.payment.explorerLink).toContain("?cluster=devnet");
    expect(response.payment.explorerLink).toContain(response.payment.txHash);

  });

});
