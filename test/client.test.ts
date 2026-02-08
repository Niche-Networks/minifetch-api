// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect } from 'vitest';
import { MinifetchClient } from '../src/client.js';
import { ConfigurationError } from '../src/types/errors.js';

describe("MinifetchClient", { timeout: 30000 }, () => {

  it("client should init instanceof MinifetchClient", () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    expect(client).toBeInstanceOf(MinifetchClient);
  });

  it("throws error if network misconfigured", () => {
    const fn = () => new MinifetchClient({
      network: "XYZ" as any,
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    expect(fn).toThrow(ConfigurationError);
    expect(fn).toThrow('Invalid network: "XYZ"');
  });

  it("throws error if EVM key is invalid", () => {
    expect(() => {
      const client = new MinifetchClient({
        network: "base-sepolia",
        privateKey: "123...notaprivatekey!" as any,
      });
    }).toThrow(ConfigurationError);
  });

  it("throws error if SVM key is invalid", () => {
    expect(() => {
      const client = new MinifetchClient({
        network: "solana-devnet",
        privateKey: "123...notaprivatekey!" as any,
      });
    }).toThrow(ConfigurationError);
  });

});
