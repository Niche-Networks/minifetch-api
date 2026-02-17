// First, set env
import { config } from "dotenv";

import { describe, it, expect } from "vitest";
import Minifetch from "../src/index.js";
import { MinifetchClient } from "../src/index.js";
import { ConfigurationError } from "../src/types/errors.js";
config({ path: ".env-dev" });

describe.sequential("package exports from index.js", { timeout: 30000 }, () => {
  it("default export -> initialized MinifetchClient instance", () => {
    const client1 = new Minifetch({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    expect(Minifetch).toBe(MinifetchClient);
    expect(client1).toBeInstanceOf(MinifetchClient);
  });

  it("MinifetchClient export -> initialized MinifetchClient instance", () => {
    const client2 = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    expect(client2).toBeInstanceOf(MinifetchClient);
  });
});
