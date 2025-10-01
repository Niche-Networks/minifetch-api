import { config } from "dotenv";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { decodeXPaymentResponse, wrapFetchWithPayment } from "x402-fetch";

// Determine which env file to use
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith("--env="));
const env = envArg ? envArg.split("=")[1] : "default";
console.log("env: " + env);

let envPath = ".env";
if (env !== "default") {
  envPath = `.env-${env}`;
}
console.log("using env file: " + envPath);

// Set dotenv config to use correct .env file
config({ path: envPath });
console.log("using network: " + process.env.NETWORK);

// Set x402 constants from env
const privateKey = `0x${process.env.PRIVATE_KEY}` as Hex;
const explorerBaseUrl = process.env.EXPLORER_BASE_URL as string;
const account = privateKeyToAccount(privateKey);

// Set API url to query from env
const baseURL = process.env.API_SERVER_URL as string;
const endpointPath = process.env.METADATA_API_PATH as string;
const metadataUrl = process.env.METADATA_URL as string; // url to fetch metadata from
const boolInclRespBody = process.env.METADATA_API_PARAM_INCLUDE_RESPONSE_BODY as string;
const paramInclRespBody = boolInclRespBody === 'true' ? `&includeResponseBody=true` : '';
const url = `${baseURL}${endpointPath}?url=${metadataUrl}${paramInclRespBody}`;


if (!privateKey || !baseURL || !endpointPath || !metadataUrl) {
  console.error("Missing required environment variables");
  process.exit(1);
}
console.log("querying url via fetchWithPayment: " + url);

// Fetch url endpoint with payment
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
