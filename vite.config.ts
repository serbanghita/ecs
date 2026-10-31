import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import * as path from "node:path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    alias: {},
    // *.test-d.ts files are type-checked (not executed) under a strict tsconfig,
    // so signature regressions that only strict consumers hit are caught here.
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.typecheck.json",
    },
  },
});
