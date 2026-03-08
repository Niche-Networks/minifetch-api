// First, set env
import { config } from "dotenv";

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { MinifetchClient } from "../src/client.js";
import { InvalidUrlError, NetworkError } from "../src/types/errors.js";
config({ path: ".env-dev" });

beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

describe.sequential("x402: extractUrlMetadata() e2e", { timeout: 30000 }, () => {

  it("base-sepolia testnet success", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.extractUrlMetadata("https://minifetch.com");

    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toContain("minifetch.com");
    expect(response.results[0].data.title).toContain("Minifetch.com");
    expect(response.results[0].data["og:title"]).toContain("Minifetch.com");
    // verbosity = "standard" (default):
    expect(typeof response.results[0].data.headings).toBe("undefined");
    expect(typeof response.results[0].data.imgTags).toBe("undefined");

    expect(response.payment.success).toBe(true);
    expect(response.payment.payer).toContain("0x");
    expect(response.payment.network).toBe("base-sepolia");
    expect(response.payment.txHash).toContain("0x");
    expect(response.payment.explorerLink).toBe(
      `https://sepolia.basescan.org/tx/${response.payment.txHash}`,
    );
  });

  it("solana-devnet success w ?verbosity=full", async () => {
    const client = new MinifetchClient({
      network: "solana-devnet",
      privateKey: process.env.SVM_PRIVATE_KEY as any,
    });
    const response = await client.extractUrlMetadata("https://minifetch.com", {
      verbosity: "full"
    });

    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toContain("minifetch.com");
    expect(response.results[0].data.title).toContain("Minifetch.com");
    expect(response.results[0].data["og:title"]).toContain("Minifetch.com");
    // verbosity = "full":
    expect(typeof response.results[0].data.headings).toBe("object");
    expect(typeof response.results[0].data.imgTags).toBe("object");

    expect(response.payment.success).toBe(true);
    expect(typeof response.payment.payer).toBe("string");
    expect(response.payment.network).toBe("solana-devnet");
    expect(typeof response.payment.txHash).toBe("string");
    expect(response.payment.explorerLink).toBe(
      `https://explorer.solana.com/tx/${response.payment.txHash}?cluster=devnet`,
    );
  });

});

describe.sequential("x402: extractUrlMetadata() fails gracefully", { timeout: 30000 }, () => {

  it("throws w bad private key", async () => {
    const failClient = new MinifetchClient({
      network: "base-sepolia",
      privateKey: "0xDEADBEEF00000000000000000000000000000000000000000000000000FACADE" as any,
    });

    await expect(failClient.extractUrlMetadata("https://anthropic.com")).rejects.toMatchObject({
      name: "NetworkError",
      message: "Request failed: 402 Payment Required",
    });
  });

  it("throws on robots.txt check = blocked URL", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    const blockedUrl = "https://www.npmjs.com/package/url-metadata";

    await expect(client.extractUrlMetadata(blockedUrl)).rejects.toMatchObject({
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

    await expect(client.extractUrlMetadata(dnsErrUrl)).rejects.toMatchObject({
      name: "NetworkError",
      message: "Request failed: 502 Bad Gateway",
    });
  });

  it("throws on malformed URL", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.extractUrlMetadata("vvv")).rejects.toThrow(InvalidUrlError);
  });

  it("throws on URL w unsupported file extension", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.extractUrlMetadata("http://foo.bar/baz.pdf")).rejects.toThrow(
      InvalidUrlError,
    );
  });

});
