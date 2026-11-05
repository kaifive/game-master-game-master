import next from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

// Import boundaries from docs/conventions/engineering.md, enforced here so
// they don't depend on anyone remembering them.
const FIREBASE = ["firebase", "firebase/*", "firebase-admin", "firebase-admin/*"];
const msg = {
  firebase: "Only lib/firebase/ may import Firebase SDKs. Use a repository instead.",
  deep: "Import other features through their index: '@/lib/<feature>'.",
  pure: "rules.ts, model.ts and game logic must stay pure: no I/O, React or Next.",
  ui: "components/ui may only use lib/themes, lib/motion and lib/ui.",
};

/** Builds a no-restricted-imports rule from groups of [patterns, message]. */
const restrict = (...groups) => [
  "error",
  { patterns: groups.map(([group, message]) => ({ group, message })) },
];

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      ".claude/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...next,
  ...nextTs,
  ...tseslint.configs.strictTypeChecked.map((c) => ({ ...c, files: ["**/*.ts", "**/*.tsx"] })),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "import/no-default-export": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-restricted-imports": restrict([FIREBASE, msg.firebase], [["@/lib/*/*"], msg.deep]),
    },
  },
  {
    // Next.js requires default exports here.
    files: [
      "app/**/{page,layout,not-found,error,loading,template,default,global-error}.tsx",
      "*.config.{ts,mts}",
      "**/*.config.{ts,mts}",
    ],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: ["lib/firebase/**"],
    rules: { "no-restricted-imports": restrict([["@/lib/*/*"], msg.deep]) },
  },
  {
    files: ["lib/**/rules.ts", "lib/**/model.ts", "lib/games/**/logic.ts"],
    rules: {
      "no-restricted-imports": restrict(
        [
          [
            ...FIREBASE,
            "react",
            "react-dom",
            "next",
            "next/*",
            "server-only",
            "@/lib/firebase",
            "@/lib/firebase/*",
          ],
          msg.pure,
        ],
        [["@/lib/*/*"], msg.deep],
      ),
    },
  },
  {
    files: ["components/ui/**"],
    rules: {
      "no-restricted-imports": restrict(
        [FIREBASE, msg.firebase],
        [["@/lib/*", "!@/lib/themes", "!@/lib/motion", "!@/lib/ui", "@/lib/*/*"], msg.ui],
      ),
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "tests/**", "e2e/**"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
];

export default config;
