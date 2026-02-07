// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect } from 'vitest';
import { MinifetchClient } from '../src/client.js';
import { InvalidUrlError } from '../src/types/errors.js';

describe("preflightUrlCheck() e2e", { timeout: 30000 }, () => {

  it("preflightUrlCheck() success", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.preflightUrlCheck('https://minifetch.com');

    expect(response.success).toBe(true);
    expect(response.results[0].url).toBe("https://minifetch.com");
    expect(response.results[0].allowed).toBe(true);
    expect(response.results[0].message).toContain("allowed by robots.txt");
    expect(response.results[0].crawlDelay).toBe(1);
  });

  it("preflightUrlCheck() throws on validation error", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.preflightUrlCheck('vvv'))
      .rejects.toThrow(InvalidUrlError);
  });


});
