import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

/**
 * ESLint 9 flat config. `eslint-config-next` v16 exports flat-config arrays
 * (the legacy .eslintrc.json "extends" form crashes with it, and `next lint`
 * was removed in Next 16 — run plain `eslint` via `npm run lint`).
 */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "supabase/**",
      "next-env.d.ts",
      "*.tsbuildinfo",
    ],
  },
  ...coreWebVitals,
  ...typescript,
]
