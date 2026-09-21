import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    // main.js is a plain CommonJS plugin bundle loaded directly by Obsidian.
    files: ["main.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "writable",
        exports: "writable",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);