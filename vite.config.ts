import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID = "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Miniflare's local Worker TCP shim can leave a PostgreSQL socket unusable
  // between RSC prefetch requests. Use Vinext's Node runtime for local dev,
  // where PostgreSQL works reliably, and keep the Cloudflare plugin for
  // production builds (or when explicitly requested with CLOUDFLARE_DEV).
  const useCloudflareRuntime = command === "build" || process.env.CLOUDFLARE_DEV === "true";
  const plugins = [vinext(), sites()];

  if (useCloudflareRuntime) {
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    plugins.push(
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }) as (typeof plugins)[number],
    );
  }

  return {
    // Prisma's generated runtime references CommonJS __dirname. Vinext emits
    // the server bundle as an ES module, so provide an equivalent Node-safe
    // expression during bundling (also harmless under Workers' nodejs_compat).
    // Use a literal build-time path. Defining `process.cwd()` here leaks a
    // Node-only expression into Vite's browser client (`env.mjs`), which
    // prevents React from hydrating and makes buttons appear unresponsive.
    define: { __dirname: JSON.stringify(process.cwd()) },
    // Vinext's RSC/Worker dev bridge can load the Vite client before its
    // websocket transport is ready. The client then tries `ws.send(...)`
    // with an undefined socket and surfaces an unhandled promise rejection
    // in the page (the "Cannot read properties of undefined (reading send)"
    // overlay). Disable HMR for the local portal runtime; reload the page
    // after edits. Production builds are unaffected.
    server: {
      hmr: false,
      ...(isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : {}),
    },
    plugins,
  };
});
