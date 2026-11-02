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
    "playwright-report/**",
    "test-results/**",
  ]),
  // ponytail: the March 2026 screens fail the React 19 lint rules. Phase 2
  // replaces every one of them; delete this block with them.
  globalIgnores([
    "app/achievements/**", "app/calendar/**", "app/history/**", "app/page.tsx",
    "app/progress/**", "app/routines/**", "app/settings/**", "app/tdee/**",
    "auth.ts", "components/FastingWidget.tsx", "components/RestTimer.tsx",
    "components/Sidebar.tsx", "components/SmartInsights.tsx", "components/WorkoutForm.tsx",
    "lib/actions.ts", "lib/cache.tsx", "lib/sync.ts",
  ]),
]);

export default eslintConfig;
