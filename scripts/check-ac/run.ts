import { globSync, readFileSync } from "node:fs";
import { findMissing, parseSpec, type Spec } from "./check-ac";

const specs = globSync("docs/specs/*.md")
  .map((file) => parseSpec(file, readFileSync(file, "utf8")))
  .filter((s): s is Spec => s !== null);

const tests = globSync(["**/*.test.{ts,tsx}", "e2e/**/*.spec.ts"], {
  exclude: (f) => f.includes("node_modules") || f.startsWith(".next"),
}).map((file) => readFileSync(file, "utf8"));

const missing = findMissing(specs, tests);
const checked = specs.filter((s) => ["Ready", "Building", "Done"].includes(s.status));

if (missing.length > 0) {
  console.error("Acceptance criteria with no test naming them:");
  for (const m of missing) console.error(`  ${m.id}  (${m.file})`);
  process.exit(1);
}
process.stdout.write(
  `check:ac: ${checked.length} spec(s) checked; every acceptance criterion has a test.\n`,
);
