// First, set env
import { config } from "dotenv";

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { MinifetchClient } from "../src/client.js";
import { InvalidUrlError, NetworkError } from "../src/types/errors.js";
config({ path: ".env-dev" });

beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

describe.sequential("x402: checkAndRunSeoPageAudit() e2e", { timeout: 30000 }, () => {

  it("base-sepolia success", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.checkAndRunSeoPageAudit("https://minifetch.com");

    expect(response.success).toBe(true);
    expect(response.results).toHaveLength(1);
    expect(response.results[0].data.url).toContain("minifetch.com");
    expect(response.results[0].data.compliance.robotsTxt.status).toBe("pass");
    expect(response.results[0].data.metadata.title.value).toContain("SEO");
    expect(response.results[0].data.content.wordCount).toBeGreaterThan(1);

    expect(response.payment.success).toBe(true);
    expect(response.payment.payer).toContain("0x");
    expect(response.payment.network).toBe("base-sepolia");
    expect(response.payment.txHash).toContain("0x");
    expect(response.payment.explorerLink).toBe(
      `https://sepolia.basescan.org/tx/${response.payment.txHash}`,
    );
  });

});
