import { config } from "dotenv";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

// Determine which env file to use
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith("--env="));
const env = envArg ? envArg.split("=")[1] : "default";
console.log("env: " + env);

// Set dotenv config to use correct .env file
let envPath = ".env";
if (env !== "default") {
  envPath = `.env-${env}`;
}
console.log("using env file: " + envPath);
config({ path: envPath });

// Set network
const networkPrefixArg = args.find(arg => arg.startsWith("--network=")) as string;
const networkPrefix = networkPrefixArg.split("=")[1].toUpperCase() as string;
console.log(networkPrefix);
const network = process.env[`${networkPrefix}_NETWORK`] as string;
console.log("using network: " + network);

// Set x402 & API URL constants from .env file
const privateKey = process.env[`${networkPrefix}_PRIVATE_KEY`] as string;
const signer = privateKeyToAccount(privateKey) as string;
const explorerBaseUrl = process.env[`EXPLORER_${networkPrefix}_URL`] as string;
const baseURL = process.env.API_SERVER_URL as string;

// Parse endpoint flag (if any)
const endpointArg = args.find(arg => arg.startsWith("--endpoint=")) as string;
const endpoint = endpointArg.split("=")[1] as string;
console.log("endpoint: " + endpoint);

// Pick the right endpoint path based on flag
const endpointPath = endpoint === "check"
  ? process.env.CHECK_ROBOTS_API_PATH as string
  : process.env.METADATA_API_PATH as string;

// Rest of the querystring params
const metadataUrl = process.env.METADATA_URL as string; // url to fetch metadata from
const boolInclRespBody = process.env.METADATA_API_PARAM_INCLUDE_RESPONSE_BODY as string;
const paramInclRespBody = boolInclRespBody === 'true' ? `&includeResponseBody=true` : '';

if (endpoint === "check") {
  if (!baseURL || !endpointPath || !metadataUrl) {
    console.error("Missing required environment variables");
    process.exit(1);
  }
  const url = `${baseURL}${endpointPath}?url=${metadataUrl}`;
  console.log("querying url via free check endpoint: " + url);
  const checkURL = fetch(url, { method: "GET"})
    .then(async response => {
      const body = await response.json();
      console.log("response body:");
      console.log(body);
    })
    .catch(error => {
      console.log("ERROR!");
      console.dir(error);
      console.error(error.response?.data?.error);
    });

} else {
  if (!privateKey || !baseURL || !endpointPath || !metadataUrl) {
    console.error("Missing required environment variables");
    process.exit(1);
  }
  const url = `${baseURL}${endpointPath}?url=${metadataUrl}${paramInclRespBody}`;
  console.log("querying url via fetchWithPayment: " + url);

  // Fetch metadata url endpoint with payment
  const fetchWithPayment = wrapFetchWithPayment(fetch, account);
  fetchWithPayment(url, {
    method: "GET",
  })
    .then(async response => {
      const body = await response.json();
      console.log("response body:");
      console.log(body);

      const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
      console.log("payment response:");
      console.log(paymentResponse);
      console.log(`View transaction: ${explorerBaseUrl}/tx/${paymentResponse.transaction}`);
    })
    .catch(error => {
      console.log("ERROR!");
      console.dir(error);
      console.error(error.response?.data?.error);
    });
}
