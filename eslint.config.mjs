import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
    "drizzle/**",
  ]),

  // ── Filet de sécurité qualité (refonte architecture) ─────────────────────
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },

  // ── Étanchéité UI ↔ base de données ──────────────────────────────────────
  // Les composants et hooks ne doivent jamais toucher la base : ils passent par
  // une Server Action (features/*/actions) qui vérifie les droits.
  {
    files: ["components/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/src/db", "@/src/db/*"],
              message:
                "Import direct de la base interdit dans components/ et hooks/ : utiliser une Server Action (features/<domaine>/actions).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
