// First, set env
import { config } from "dotenv";

import { describe, it, expect, beforeEach } from "vitest";
import { MinifetchClient } from "../src/client.js";
import { InvalidQueryError } from "../src/types/errors.js";
config({ path: ".env-dev" });

beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

describe.sequential("x402: searchByKeyword() e2e", { timeout: 30000 }, () => {
  it("base-sepolia testnet success", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.searchByKeyword("green tea");

    expect(response.success).toBe(true);

    // Effective params echoed back — defaults, since none were passed
    expect(response.queryParameters.query).toBe("green tea");
    expect(response.queryParameters.limit).toBe(10);
    expect(response.queryParameters.descriptionLength).toBe(750);

    // Ranked results, each a { title, url, description }
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.length).toBeLessThanOrEqual(10);
    expect(typeof response.results[0].data.title).toBe("string");
    expect(response.results[0].data.url).toContain("http");
    expect(typeof response.results[0].data.description).toBe("string");

    expect(response.payment.success).toBe(true);
    expect(response.payment.payer).toContain("0x");
    expect(response.payment.network).toBe("base-sepolia");
    expect(response.payment.txHash).toContain("0x");
    expect(response.payment.explorerLink).toBe(
      `https://sepolia.basescan.org/tx/${response.payment.txHash}`,
    );
  });

  it("solana-devnet success w limit + descriptionLength + GET method option", async () => {
    const client = new MinifetchClient({
      network: "solana-devnet",
      privateKey: process.env.SVM_PRIVATE_KEY as any,
    });
    const response = await client.searchByKeyword("green tea", {
      limit: 3,
      descriptionLength: 0,
      method: "GET",
    });

    expect(response.success).toBe(true);

    // Knobs applied + echoed
    expect(response.queryParameters.limit).toBe(3);
    expect(response.queryParameters.descriptionLength).toBe(0);
    expect(response.results.length).toBeLessThanOrEqual(3);

    // descriptionLength: 0 => titles/URLs only (descriptions trimmed to empty)
    expect(response.results[0].data.description).toBe("");
    expect(response.results[0].data.url).toContain("http");

    expect(response.payment.success).toBe(true);
    expect(typeof response.payment.payer).toBe("string");
    expect(response.payment.network).toBe("solana-devnet");
    expect(typeof response.payment.txHash).toBe("string");
    expect(response.payment.explorerLink).toBe(
      `https://explorer.solana.com/tx/${response.payment.txHash}?cluster=devnet`,
    );
  });

  it("clamps out-of-range query params server-side and echoes the effective values", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.searchByKeyword("green tea", {
      limit: 99, // > 10    -> clamped to 10
      descriptionLength: 99999, // > 5000  -> clamped to 5000
    });

    expect(response.success).toBe(true);
    expect(response.queryParameters.limit).toBe(10);
    expect(response.queryParameters.descriptionLength).toBe(5000);
  });
});

describe.sequential("x402: searchByKeyword() fails gracefully", { timeout: 30000 }, () => {
  it("throws w bad private key", async () => {
    const failClient = new MinifetchClient({
      network: "base-sepolia",
      privateKey: "0xDEADBEEF00000000000000000000000000000000000000000000000000FACADE" as any,
    });

    await expect(failClient.searchByKeyword("green tea")).rejects.toMatchObject({
      name: "NetworkError",
      message: expect.stringContaining("Request failed: 402 Payment Required"),
    });
  });
});

// Client-side query validation runs before any network/payment, so these need no
// funded wallet or deployed endpoint — a dummy key is enough to construct the client.
describe("searchByKeyword() client-side query validation", () => {
  const client = new MinifetchClient({
    network: "base-sepolia",
    privateKey: "0xDEADBEEF00000000000000000000000000000000000000000000000000FACADE" as any,
  });

  it("throws InvalidQueryError on an empty query", async () => {
    await expect(client.searchByKeyword("")).rejects.toThrow(InvalidQueryError);
  });

  it("throws InvalidQueryError on a whitespace-only query", async () => {
    await expect(client.searchByKeyword("   ")).rejects.toThrow(InvalidQueryError);
  });

  it("throws InvalidQueryError on a query over 50 characters", async () => {
    const tooLong = "a".repeat(51);
    await expect(client.searchByKeyword(tooLong)).rejects.toThrow(InvalidQueryError);
  });
});
