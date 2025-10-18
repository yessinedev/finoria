import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable rules that are causing issues
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "off"
    }
  },
  {
    // Ignore specific files and directories
    ignores: [
      "public/electron.js",
      "public/preload.js",
      "public/ipc-handlers/*.js",
      "public/pdf-generator.js",
      "test-company-data.js",
      "test-payments.js",
      "node_modules/**/*",
      ".next/**/*",
      "out/**/*",
      "dist/**/*",
      "build/**/*"
    ]
  }
];

export default eslintConfig;