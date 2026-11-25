import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // DB testleri aynı veritabanını paylaşır
    fileParallelism: false,
  },
});
