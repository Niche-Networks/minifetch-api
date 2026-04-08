import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env-dev from the project root (one level up)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env-dev") });

import Minifetch from "minifetch-api";

const URL_TO_FETCH1 = "https://en.wikipedia.org/wiki/API_key";
const URL_TO_FETCH2 = "https://x402.org";

async function main() {

  console.log("🔧 1. Initializing MinifetchClient with API key...\n");
  const client1 = new Minifetch({
    apiKey: process.env.MINIFETCH_API_KEY,
  });

  console.log(`🌐 Fetching metadata for: ${URL_TO_FETCH1}\n`);
  try {
    const result = await client1.extractUrlMetadata(URL_TO_FETCH1);

    console.log("✅ Success!\n");
    console.log("── Metadata ──────────────────────────────────────");
    console.log(`  title:       ${result.results[0].data.title}`);
    console.log(`  og:title:    ${result.results[0].data["og:title"]}`);
    console.log(`  description: ${result.results[0].data.description}`);
    console.log(`  url:         ${result.results[0].data.url}`);
    console.log("");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }

  console.log("🔧 2. Initializing MinifetchClient on base network...\n");

  const client2 = new Minifetch({
    network: "base",
    privateKey: process.env.BASE_PRIVATE_KEY,
  });

  console.log(`🌐 Fetching metadata for: ${URL_TO_FETCH2}\n`);
  try {
    const result = await client2.extractUrlMetadata(URL_TO_FETCH2);

    console.log("✅ Success!\n");
    console.log("── Metadata ──────────────────────────────────────");
    console.log(`  title:       ${result.results[0].data.title}`);
    console.log(`  og:title:    ${result.results[0].data["og:title"]}`);
    console.log(`  description: ${result.results[0].data.description}`);
    console.log(`  url:         ${result.results[0].data.url}`);
    console.log("");
    console.log("── Payment ───────────────────────────────────────");
    console.log(`  success:  ${result.payment.success}`);
    console.log(`  network:  ${result.payment.network}`);
    console.log(`  payer:    ${result.payment.payer}`);
    console.log(`  txHash:   ${result.payment.txHash}`);
    console.log(`  explorer: ${result.payment.explorerLink}`);
    console.log("──────────────────────────────────────────────────\n");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }

}

main();
