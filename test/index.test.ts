// First, set env
import { config } from 'dotenv';
config({ path: '.env-dev' });

import { describe, it, expect } from 'vitest';
import Minifetch from '../src/index.js';
import { MinifetchClient } from '../src/index.js';
import { ConfigurationError } from '../src/types/errors.js';

describe.sequential("package exports from index.js", { timeout: 30000 }, () => {

  it("exports Minifetch as default", () => {
    const client1 = new Minifetch({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    expect(client1).toBeInstanceOf(MinifetchClient);
  });

  it("exports MinifetchClient", () => {
    const client2 = new MinifetchClient({
      network: "base-sepolia",
      privateKey: process.env.BASE_PRIVATE_KEY as any,
    });
    expect(client2).toBeInstanceOf(MinifetchClient);
  });

});
