import { defineConfig } from "tsup";

// Backend wird zu einem einzelnen, lauffähigen ESM-Bundle gebaut. Die
// Workspace-Pakete (@spotforge/*) werden eingebündelt (source-first), externe
// npm-Abhängigkeiten wie Fastify bleiben extern und liegen zur Laufzeit im
// (via `pnpm deploy` reduzierten) node_modules.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/^@spotforge\//],
});
