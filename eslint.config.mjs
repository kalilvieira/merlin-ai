import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    ".wrangler/**",
    ".vinext/**",
    ".sites-runtime/**",
  ]),
  {
    files: ["components/ui/**/*.{js,jsx}", "hooks/use-mobile.js"],
    rules: {
      // These components originate from shadcn@4.17.0 and were converted
      // to JavaScript. Apply the stricter hooks rules to application code.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
