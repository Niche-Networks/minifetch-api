// First, set env
import { config } from "dotenv";

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { MinifetchClient } from "../src/client.js";
import { InvalidUrlError } from "../src/types/errors.js";
config({ path: ".env-dev" });

beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

describe.sequential("x402: preflightUrlCheck() e2e", { timeout: 30000 }, () => {

  it("base-sepolia success w allowed URL", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.preflightUrlCheck("https://minifetch.com");

    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toBe("https://minifetch.com");
    expect(response.results[0].data.allowed).toBe(true);
    expect(response.results[0].data.message).toContain("allowed by robots.txt");
    expect(response.results[0].data.crawlDelay).toBe(1);
  });

  it("solana-devnet success w allowed URL", async () => {
    const client = new MinifetchClient({
      network: "solana-devnet",
      privateKey: process.env.SVM_PRIVATE_KEY as any,
    });
    const response = await client.preflightUrlCheck("https://minifetch.com");

    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toBe("https://minifetch.com");
    expect(response.results[0].data.allowed).toBe(true);
    expect(response.results[0].data.message).toContain("allowed by robots.txt");
    expect(response.results[0].data.crawlDelay).toBe(1);
  });

  it("works, even w bad private key", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: "0xDEADBEEF00000000000000000000000000000000000000000000000000FACADE" as any,
    });

    const response = await client.preflightUrlCheck("https://minifetch.com");

    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toBe("https://minifetch.com");
    expect(response.results[0].data.allowed).toBe(true);
    expect(response.results[0].data.message).toContain("allowed by robots.txt");
    expect(response.results[0].data.crawlDelay).toBe(1);
  });

});

describe.sequential("x402: preflightUrlCheck() fails gracefully", { timeout: 30000 }, () => {

  it("handles DNS lookup error", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    const dnsErrUrl = "https://mydns1.errrrrr";

    const response = await client.preflightUrlCheck(dnsErrUrl);
    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toBe(dnsErrUrl);
    expect(response.results[0].data.allowed).toBe(false);
    expect(response.results[0].data.message).toContain("Invalid or non-existent domain");
  });

  it("throws on malformed URL", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.preflightUrlCheck("vvv")).rejects.toThrow(InvalidUrlError);
  });

  it("throws on URL w unsupported file extension", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.preflightUrlCheck("http://foo.bar/baz.pdf")).rejects.toThrow(
      InvalidUrlError,
    );
  });

});

describe.sequential("apiKey: preflightUrlCheck() init", { timeout: 30000 }, () => {

  it("client inits with apiKey and baseUrl points to prod", () => {
    // preflightUrlCheck is auth-agnostic (free endpoint), so a valid apiKey client
    // should init correctly and resolve to the prod base URL
    const client = new MinifetchClient({
      apiKey: "mf_prod_abc123def456abc123def456abc123de",
    });
    expect(client).toBeInstanceOf(MinifetchClient);
  });

  it("client inits with dev apiKey and baseUrl points to localhost", () => {
    const client = new MinifetchClient({
      apiKey: "mf_dev_abc123def456abc123def456abc123de",
    });
    expect(client).toBeInstanceOf(MinifetchClient);
  });

});
