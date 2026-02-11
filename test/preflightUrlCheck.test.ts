// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { MinifetchClient } from '../src/client.js';
import { InvalidUrlError } from '../src/types/errors.js';

beforeEach(async () => {
  await new Promise(r => setTimeout(r, 1000));
});

describe.sequential("preflightUrlCheck() e2e", { timeout: 30000 }, () => {

  it("success with allowed URL", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    const response = await client.preflightUrlCheck('https://minifetch.com');

    expect(response.success).toBe(true);
    expect(response.results[0].data.url).toBe("https://minifetch.com");
    expect(response.results[0].data.allowed).toBe(true);
    expect(response.results[0].data.message).toContain("allowed by robots.txt");
    expect(response.results[0].data.crawlDelay).toBe(1);
  });

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

    await expect(client.preflightUrlCheck('vvv'))
      .rejects.toThrow(InvalidUrlError);
  });

  it("throws on URL w unsupported file extension", async () => {
    const client = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });

    await expect(client.preflightUrlCheck('http://foo.bar/baz.pdf'))
      .rejects.toThrow(InvalidUrlError);
  });

});
