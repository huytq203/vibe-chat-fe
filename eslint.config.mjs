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
    // Electron build output — không lint artifact đã build (gây hàng trăm lỗi giả).
    "dist-electron/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    // Electron entrypoints chạy CommonJS và nằm ngoài bundle TypeScript/Next.js.
    "electron/**",
  ]),
]);

export default eslintConfig;
