// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect } from 'vitest';
import { MinifetchClient } from '../src/client.js';

describe("MinifetchClient", { timeout: 30000 }, () => {

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

});
