import { describe, it, expect } from 'vitest';
import { MinifetchClient } from '../src/client.js';

describe("MinifetchClient", () => {
  it("should throw error when EVM key is invalid on base network", () => {

    expect(() => {
      const client = new MinifetchClient({
        network: "base",
        privateKey: "123...notaprivatekey!" as any,
      })
    }).toThrow("Invalid EVM private key format (expected 64-character hex string)");

    // expect(client).toBeInstanceOf(MinifetchClient);
  });

});
