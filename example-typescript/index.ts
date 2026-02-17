import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env-dev from the project root (one level up)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env-dev") });

import { MinifetchClient } from "minifetch-api";

const URL_TO_FETCH = "https://minifetch.com";

async function main() {
  console.log("🔧 Initializing MinifetchClient on base-sepolia...\n");

  const client = new MinifetchClient({
    network: "base-sepolia",
    privateKey: process.env.BASE_PRIVATE_KEY as `0x${string}`,
  });

  console.log(`🌐 Fetching metadata for: ${URL_TO_FETCH}\n`);

  try {
    const result = await client.extractUrlMetadata(URL_TO_FETCH);

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
