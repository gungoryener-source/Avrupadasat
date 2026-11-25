import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
