// Runs before `npm run deploy`. Next.js inlines NEXT_PUBLIC_* into the browser bundle at build
// time, from .env.production.local (see .env.production.example). Without that file the build
// still succeeds and the deployed /agent-demo calls http://localhost:3001 from every visitor's
// browser, so stop here instead.
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

const backend = process.env.NEXT_PUBLIC_X402_BACKEND_URL?.trim();
let problem;
if (!backend) problem = "is not set";
else {
  try {
    const url = new URL(backend);
    if (url.protocol !== "https:") problem = `must be an https URL, got ${backend}`;
    else if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) problem = `points at ${url.hostname}`;
  } catch {
    problem = `is not a URL: ${backend}`;
  }
}
if (problem) {
  console.error(`NEXT_PUBLIC_X402_BACKEND_URL ${problem}. Copy .env.production.example to .env.production.local and fill it in before deploying.`);
  process.exit(1);
}

// These fail visibly where they are used, so a missing one is worth a warning, not a stop.
const unset = ["NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "NEXT_PUBLIC_STORE_WALLET_ADDRESS", "NEXT_PUBLIC_ZERODEV_PROJECT_ID"]
  .filter(name => !process.env[name]?.trim());
if (unset.length) console.warn(`Deploying without ${unset.join(", ")}; the features that need them will report they are not configured.`);
