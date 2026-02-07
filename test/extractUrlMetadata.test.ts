// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect } from 'vitest';
import { MinifetchClient } from '../src/client.js';

describe("extractUrlMetadata() e2e", { timeout: 30000 }, () => {

  it("checkAndExtractMetadata() on base-sepolia testnet success", async () => {
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

  it("extractUrlMetadata() on base-sepolia testnet success", async () => {
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

  it("extractUrlMetadata() on solana-devnet success", async () => {
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

});
