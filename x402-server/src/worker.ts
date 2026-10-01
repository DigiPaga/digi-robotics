/**
 * Cloudflare Workers entry point. `server.ts` stays the Node entry point.
 *
 * The Express app is unchanged: Workers run it through the Node.js HTTP server support of
 * `nodejs_compat`. What does change is where it runs. The app keeps its state in memory (agent
 * runs and their SSE listeners, rate limit windows, the demo spend budget, the key that signs
 * download links) and plain Worker isolates are created and dropped per location and load, so
 * two requests of one agent run could land in two isolates that know nothing of each other.
 * Every request is therefore forwarded to a single Durable Object instance, which gives the app
 * the one long-lived process it was written for.
 */
import { handleAsNodeRequest } from "cloudflare:node";
import { DurableObject } from "cloudflare:workers";
import { createApp } from "./app";
import { loadEnv } from "./config/env";

/** Routing key between this module and the Express server; nothing listens on a real port. */
const NODE_PORT = 8402;

let listening: Promise<void> | undefined;

function stringBindings(bindings: object): Record<string, string> {
  const entries = Object.entries(bindings).filter((entry): entry is [string, string] => typeof entry[1] === "string");
  return Object.fromEntries(entries);
}

/**
 * Starts the Express app once per isolate, on the first request. Workers only allow timers and
 * random values while a request is being handled, and creating the app starts both.
 */
function listen(bindings: object): Promise<void> {
  listening ??= (async () => {
    const env = loadEnv(stringBindings(bindings));
    const origin = new URL(env.resourceBaseUrl).origin;
    // The buyer agent calls this server's own paid route. Answer those requests in-process
    // rather than through a public round trip from the Worker to its own hostname.
    const buyerFetch: typeof fetch = (input, init) => {
      const request = new Request(input, init);
      return new URL(request.url).origin === origin ? handleAsNodeRequest(NODE_PORT, request) : fetch(request);
    };
    const app = createApp(env, { buyerFetch });
    // The Worker below replaces X-Forwarded-For with the address Cloudflare saw.
    app.set("trust proxy", true);
    await new Promise<void>(resolve => app.listen(NODE_PORT, resolve));
  })();
  listening.catch(() => { listening = undefined; });
  return listening;
}

export class X402Server extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    try {
      await listen(this.env);
    } catch (error) {
      // loadEnv errors name the variable at fault and never include its value.
      const message = error instanceof Error ? error.message : "The server could not start.";
      console.error(JSON.stringify({ level: "error", event: "x402_server_start_failed", message }));
      return Response.json({ error: "SERVER_NOT_CONFIGURED", message }, { status: 503 });
    }
    return handleAsNodeRequest(NODE_PORT, request);
  }
}

export default {
  fetch(request, env) {
    const headers = new Headers(request.headers);
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) headers.set("x-forwarded-for", clientIp);
    else headers.delete("x-forwarded-for");
    return env.X402_SERVER.getByName("x402-server").fetch(new Request(request, { headers }));
  },
} satisfies ExportedHandler<Env>;
