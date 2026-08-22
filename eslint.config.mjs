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
    // Sorties de build. ESLint ne lit pas .gitignore : sans ces lignes il
    // analyse les bundles minifies et rend 1752 diagnostics sur du code
    // genere, ce qui noie les vrais et fait echouer le script en permanence.
    "dist/**",
    "_deploy/**",
  ]),
]);

export default eslintConfig;
