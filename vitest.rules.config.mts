import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

// Security rules and Firebase repo contract tests. They need the Firebase
// emulators, so they run through `npm run test:rules`, not `npm test`.
export default defineConfig({
  resolve: {
    alias: { "@": root, "server-only": `${root}tests/empty-module.ts` },
  },
  test: {
    name: "rules",
    environment: "node",
    include: ["firebase/tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
