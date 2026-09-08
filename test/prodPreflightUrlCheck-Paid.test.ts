// First, set env
import { config } from "dotenv";

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { MinifetchClient } from "../src/client.js";
import { InvalidUrlError } from "../src/types/errors.js";
config({ path: ".env-prod" });

beforeEach(async () => {
  await new Promise(r => setTimeout(r, 2500)); // floor on ?fresh option = 2s
});

describe.sequential("x402: _exercisePaidUrlCheck() e2e", { timeout: 30000 }, () => {

  it("base paid /url-check settles (POST default)", async () => {
    const client = new MinifetchClient({
      network: "base",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    const response = await client._exercisePaidUrlCheck("https://minifetch.com");

    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toBe("https://minifetch.com");
    expect(response.results[0].data.allowed).toBe(true);
    expect(response.payment.success).toBe(true);
    expect(response.payment.payer).toContain("0x");
    expect(response.payment.network).toBe("base");
    expect(response.payment.txHash).toContain("0x");
  });

  it("base paid /url-check settles (GET)", async () => {
    const client = new MinifetchClient({
      network: "base",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    const response = await client._exercisePaidUrlCheck("https://minifetch.com", { method: "GET" });

    expect(response.success).toBe(true);
    expect(response.results[0].data.allowed).toBe(true);
    expect(response.payment.success).toBe(true);
    expect(response.payment.network).toBe("base");
  });

});
