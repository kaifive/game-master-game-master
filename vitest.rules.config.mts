import { defineConfig } from "vitest/config";

// Security rules tests. They need the Firebase emulators, so they run
// through `npm run test:rules`, not `npm test`.
export default defineConfig({
  test: {
    name: "rules",
    environment: "node",
    include: ["firebase/tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
