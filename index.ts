import { config } from "dotenv";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { decodeXPaymentResponse, wrapFetchWithPayment } from "x402-fetch";

// Determine which env file to use
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const env = envArg ? envArg.split('=')[1] : 'default';
console.log('env: ' + env);

let envPath = '.env';
if (env === 'base-testnet') {
  envPath = '.env-base-testnet';
} else if (env === 'local') {
  envPath = '.env-local';
}
console.log('using env file: ' + envPath);

// Set dotenv config to use correct .env file
config({ path: envPath });
console.log('using network: ' + process.env.NETWORK);

// Set x402 constants from env file
const privateKey = `0x${process.env.PRIVATE_KEY}` as Hex;
const baseURL = process.env.RESOURCE_SERVER_URL as string; // e.g. https://example.com
const endpointPath = process.env.ENDPOINT_PATH as string; // e.g. /weather
const url = `${baseURL}${endpointPath}`; // e.g. https://example.com/weather

if (!baseURL || !privateKey || !endpointPath) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const account = privateKeyToAccount(privateKey);
const fetchWithPayment = wrapFetchWithPayment(fetch, account);

console.log('querying url via fetchWithPayment: ' + url);
fetchWithPayment(url, {
  method: "GET",
})
  .then(async response => {
    const body = await response.json();
    console.log('response body:');
    console.log(body);

    const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
    console.log('payment response:');
    console.log(paymentResponse);
  })
  .catch(error => {
    console.log('ERROR!')
    console.dir(error);
    console.error(error.response?.data?.error);
  });
