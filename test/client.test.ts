// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect } from 'vitest';
import { MinifetchClient } from '../src/client.js';

describe("MinifetchClient", () => {

  it("throws error if EVM key is invalid", () => {
    expect(() => {
      const client = new MinifetchClient({
        network: "base-sepolia",
        privateKey: "123...notaprivatekey!" as any,
      })
    }).toThrow("Invalid EVM private key format (expected 64-character hex string)");
  });

  it("client should init instanceof MinifetchClient", () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    })
    expect(client).toBeInstanceOf(MinifetchClient);
  });

  it("preflightCheckUrl()", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    })
    const response = await client.preflightCheckUrl('https://minifetch.com');
    console.log(response);
    expect(response.success).toBe(true);
    expect(response.results[0].url).toBe("https://minifetch.com");
    expect(response.results[0].allowed).toBe(true);
    expect(response.results[0].message).toContain("allowed by robots.txt");
    expect(response.results[0].crawlDelay).toBe(1);
  });

});
