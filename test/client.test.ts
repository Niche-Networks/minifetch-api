// First, set env
import { config } from "dotenv";

import { describe, it, expect } from "vitest";
import { MinifetchClient } from "../src/client.js";
import { ConfigurationError } from "../src/types/errors.js";
config({ path: ".env-dev" });

describe.sequential("x402: MinifetchClient", { timeout: 30000 }, () => {

  it("client should init instanceof MinifetchClient", () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    expect(client).toBeInstanceOf(MinifetchClient);
  });

  it("throws error if network misconfigured", () => {
    const fn = () =>
      new MinifetchClient({
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

describe.sequential("apiKey: MinifetchClient", { timeout: 30000 }, () => {

  it("client should init with mf_prod_ key", () => {
    const client = new MinifetchClient({ apiKey: "mf_prod_abc123def456abc123def456abc123de" });
    expect(client).toBeInstanceOf(MinifetchClient);
  });

  it("client should init with mf_dev_ key", () => {
    const client = new MinifetchClient({ apiKey: "mf_dev_abc123def456abc123def456abc123de" });
    expect(client).toBeInstanceOf(MinifetchClient);
  });

  it("throws ConfigurationError if apiKey is empty", () => {
    expect(() => new MinifetchClient({ apiKey: "" })).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError if apiKey has wrong prefix", () => {
    expect(() => new MinifetchClient({ apiKey: "sk_live_abc123" })).toThrow(ConfigurationError);
    expect(() => new MinifetchClient({ apiKey: "sk_live_abc123" })).toThrow(
      "must start with",
    );
  });

});
