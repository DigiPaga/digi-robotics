import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // "server-only" is a marker package Next.js aliases internally at build time
      // (via the "react-server" export condition) to a no-op. It is not a real
      // resolvable dependency outside Next's webpack build, so point at the same
      // no-op Next itself ships, instead of adding an unused direct dependency.
      "server-only": path.resolve(dirname, "node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    include: ["src/**/*.test.{ts,tsx}"],
    // Set globally (before any test module loads) so CheckoutFlow.tsx -> lib/thirdweb.ts's
    // module-scope createThirdwebClient() call does not throw for every test file by
    // default. The one test that documents main's real "unset clientId crashes" bug
    // deletes this at runtime and re-imports the module dynamically with vi.resetModules().
    env: {
      NEXT_PUBLIC_THIRDWEB_CLIENT_ID: "test_client_id_for_vitest",
    },
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["src/lib/**", "src/components/cart/**", "src/components/checkout/**"],
    },
  },
});
