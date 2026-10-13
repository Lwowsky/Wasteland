import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import i18nJsxRule from "./scripts/i18n-jsx-rule.mjs";

export default defineConfig([
  globalIgnores(["dist/**", ".wrangler/**"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ["src/**/*.jsx"],
    plugins: { "project-i18n": { rules: { "no-raw-jsx-copy": i18nJsxRule } } },
    rules: { "project-i18n/no-raw-jsx-copy": "error" },
  },
]);
