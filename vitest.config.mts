import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": root } },
  test: {
    // Pure logic runs in Node; anything rendering React runs in jsdom.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["lib/**/*.test.ts", "tests/**/*.test.ts", "scripts/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["components/**/*.test.tsx", "app/**/*.test.tsx", "lib/**/*.test.tsx"],
          setupFiles: ["./tests/setup-dom.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.{ts,tsx}", "components/**/*.tsx"],
      // Firebase adapters run against the emulators (npm run test:rules), not here.
      exclude: ["**/*.test.*", "**/repo.contract.ts", "**/repo.firebase.ts", "**/index.ts"],
      reporter: ["text-summary", "html"],
      // Targets from docs/conventions/engineering.md.
      thresholds: {
        "lib/**": { lines: 90, branches: 85, functions: 90, statements: 90 },
        "components/**": { lines: 80, branches: 75, functions: 80, statements: 80 },
      },
    },
  },
});
