// ESM flat config - corrected for proper Next.js plugin detection
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import * as tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import importX from "eslint-plugin-import-x";
import eslintComments from "eslint-plugin-eslint-comments";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";
import i18next from "eslint-plugin-i18next";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

// Next.js core-web-vitals ruleset (detection-friendly)
const nextCore = nextPlugin.configs["core-web-vitals"] || nextPlugin.configs.recommended;

// Ensure Next.js plugin is available at the top level
const nextEslintPlugin = nextPlugin;

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Next.js plugin registration - MUST be first for detection
  {
    name: "next/core-web-vitals",
    plugins: {
      "@next/eslint-plugin-next": nextEslintPlugin
    }
  },
  
  // Base ignores
  { 
    ignores: [
      "**/.next/**", 
      "**/dist/**",
      "**/workbench/**", 
      "**/coverage/**", 
      "**/node_modules/**",
      "scripts/**",
      "*.config.{js,cjs,mjs,ts}",
      "eslint.config.*",
      "postcss.config.*",
      "tailwind.config.*",
      "next.config.*",
      // Test and development folders
      "tests/**",
      "workbench/**",
      // S1 Legacy code quarantine (ignored during v2 transition)
      "src/components/_legacy_*/**/*",
      "src/server/**/*.legacy.ts",
      "src/schema/**/*.legacy.ts",
      // Generated Supabase types
      "src/types/supabase.generated.ts"
    ] 
  },

  // Base JS config
  js.configs.recommended,

  // Next.js configuration using FlatCompat (for proper detection)
  ...compat.extends("next/core-web-vitals"),

  // Include as a top-level config (no files filter), so Next detects it
  {
    plugins: { 
      "@next/eslint-plugin-next": nextPlugin 
    },
    rules: { 
      ...nextCore.rules 
    },
  },

  // TypeScript (v8) — enable parser service for TS files only
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ["**/*.{ts,tsx}", "middleware.ts"],
    plugins: {
      ...cfg.plugins,
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      ...cfg.languageOptions,
      parserOptions: {
        ...cfg.languageOptions?.parserOptions,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  })),

  // Next.js plugin explicit registration (for proper detection)
  {
    files: ["**/*.{ts,tsx}", "middleware.ts"],
    plugins: { 
      "@next/eslint-plugin-next": nextPlugin 
    },
    rules: { 
      ...nextCore.rules 
    },
  },

  // TypeScript rules (typed rules for TS files only)
  {
    files: ["**/*.{ts,tsx}", "middleware.ts"],
    plugins: { 
      "@typescript-eslint": tseslint.plugin,
      "import-x": importX,
      "eslint-comments": eslintComments,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "security": security,
      "no-secrets": noSecrets,
      "local-rules": {
        rules: {
          "no-banned-strings": require("./tools/eslint-rules/no-banned-strings.js"),
          "i18n-root-hook-only": require("./tools/eslint-rules/i18n-root-hook-only.js"),
        },
      }
    },
    rules: {
      // Import hygiene
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-cycle": "warn",
      
      // TypeScript strictness (extras beyond recommended)
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: true }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/await-thenable": "error",

      // Temporal enforcement (Dutch plumber SaaS requirement)
      "no-restricted-globals": ["error", { 
        "name": "Date", 
        "message": "Use Temporal.* instead - required for Europe/Amsterdam timezone handling" 
      }],
      "no-restricted-imports": ["error", { 
        "paths": [{ 
          "name": "moment", 
          "message": "Use Temporal.* instead - moment.js is deprecated for new projects" 
        }] 
      }],

      // ESLint comments guard (BAN ALL DISABLES)
      "eslint-comments/no-unused-disable": "error",
      "eslint-comments/disable-enable-pair": "error",
      "eslint-comments/no-unlimited-disable": "error",
      "eslint-comments/no-restricted-disable": ["error", "*"], // Ban all disables
      "eslint-comments/no-use": "error", // Complete ban on eslint-disable

      // Console logging prevention (GDPR/security)
      "no-console": ["error", { "allow": ["warn", "error"] }],
      "no-debugger": "error",

      // Security headers & env validation (force ~/lib/env usage)
      "no-process-env": "error",
      "no-restricted-properties": ["error", {
        "object": "process",
        "property": "env", 
        "message": "Use ~/lib/env.ts for environment variables"
      }],

      // React performance guards
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/prefer-optional-chain": "error",

      // Enhanced nullish coalescing enforcement
      "@typescript-eslint/prefer-nullish-coalescing": ["error", {
        ignoreTernaryTests: false,
        ignoreMixedLogicalExpressions: false,
        ignoreConditionalTests: false,
        ignoreBooleanCoercion: false
      }],

      // Make boolean checks explicit; avoids truthiness traps
      "@typescript-eslint/strict-boolean-expressions": ["error", {
        allowString: false,
        allowNumber: false,
        allowNullableObject: true,
        allowNullableBoolean: true,
        allowNullableString: true,
        allowNullableNumber: true,
        allowAny: false
      }],

      // Encourage logical assignment where appropriate
      "logical-assignment-operators": ["error", "always", { enforceForIfStatements: true }],

      // Ban || as a defaulting operator in assignments & var inits (still allowed in explicit boolean logic)
      "no-restricted-syntax": ["error", 
        {
          selector: "CallExpression[callee.property.name='toLocaleDateString'][arguments.0.value!='nl-NL']",
          message: "Must use nl-NL locale for Dutch market compliance"
        },
        {
          selector: "VariableDeclarator > LogicalExpression[operator=\"||\"]",
          message: "Use ?? for defaulting instead of || (or justify with a comment)."
        },
        {
          selector: "AssignmentExpression > LogicalExpression[operator=\"||\"]",
          message: "Use ??= for defaulting instead of || (or justify with a comment)."
        },
        // ANTI-PLACEHOLDER PROTECTION: Hardcoded ID detection
        {
          selector: "Property[key.name=/Id$/][value.type='Literal']",
          message: "Do not hardcode IDs (…Id property has a literal value). Use proper data flow or constants."
        },
        {
          selector: "AssignmentExpression[left.property.name=/Id$/][right.type='Literal']",
          message: "Do not assign literals to …Id properties. Use variables or function returns."
        },
        {
          selector: "VariableDeclarator[id.name=/.*Id$/][init.type='Literal']",
          message: "Do not initialize …Id variables with literals. Use proper data sources."
        },
        // ANTI-PLACEHOLDER PROTECTION: Banned placeholder strings
        {
          selector: "Literal[value='Tijdelijke klant']",
          message: "Banned placeholder string 'Tijdelijke klant'. Use real customer data or i18n key."
        },
        {
          selector: "Literal[value='Temporary Customer']",
          message: "Banned placeholder string 'Temporary Customer'. Use real customer data or i18n key."
        },
        {
          selector: "Literal[value='Test Customer']",
          message: "Banned placeholder string 'Test Customer'. Use proper test data or i18n key."
        },
        {
          selector: "Literal[value='Placeholder Customer']",
          message: "Banned placeholder string. Use real customer data or i18n key."
        }
      ],

      // ANTI-PLACEHOLDER PROTECTION: Banned identifiers
      "id-denylist": ["error", "tempCustomer", "TEMP_CUSTOMER_ID", "dummyCustomer", "placeholder", "tijdelijkeKlant", "temporaryCustomer"],

      // ANTI-PLACEHOLDER PROTECTION: Advanced pattern detection (custom rule)
      "local-rules/no-banned-strings": "error",

      // i18n ROOT HOOK ENFORCEMENT: Forbid namespaced useTranslations
      "local-rules/i18n-root-hook-only": "error",

      // Enhanced async/promise safety
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/no-misused-promises": ["error", { 
        "checksVoidReturn": false,
        "checksConditionals": true 
      }],


      // 1. ADVANCED TYPE SAFETY & RUNTIME SOUNDNESS
      "@typescript-eslint/only-throw-error": "error", 
      "@typescript-eslint/no-confusing-void-expression": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error", 
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-argument": "error",

      // 2. REACT/NEXT CORRECTNESS & ACCESSIBILITY  
      "@next/next/no-img-element": "error",
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/label-has-associated-control": "error", 
      "jsx-a11y/click-events-have-key-events": "error",

      // 3. IMPORTS & BOUNDARIES (scale hygiene)
      "import-x/no-extraneous-dependencies": ["error", {
        "devDependencies": ["**/*.test.{ts,tsx}", "**/playwright/**", "**/scripts/**"]
      }],
      "import-x/no-relative-parent-imports": "error",
      "import-x/no-useless-path-segments": "error",

      // 4. SECURITY LINT (lightweight)
      "security/detect-unsafe-regex": "error",
      "security/detect-non-literal-regexp": "error", 
      "no-secrets/no-secrets": ["error", { "tolerance": 4.2 }],

      // 7. ENHANCED TEMPORAL ENFORCEMENT (close loopholes)
      "no-restricted-properties": ["error", 
        {
          "object": "process",
          "property": "env", 
          "message": "Use ~/lib/env.ts for environment variables"
        },
        {
          "object": "Date", 
          "property": "now", 
          "message": "Use Temporal.Now.* instead"
        },
        {
          "object": "Date", 
          "property": "parse", 
          "message": "Use Temporal.* parsing instead"
        }
      ],
    },
  },

  // JavaScript/JSX rules (non-typed rules)
  {
    files: ["**/*.{js,jsx}"],
    plugins: { 
      "import-x": importX,
      "eslint-comments": eslintComments,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "security": security,
      "no-secrets": noSecrets,
      "local-rules": {
        rules: {
          "no-banned-strings": require("./tools/eslint-rules/no-banned-strings.js"),
          "i18n-root-hook-only": require("./tools/eslint-rules/i18n-root-hook-only.js"),
        },
      }
    },
    rules: {
      // Import hygiene
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-cycle": "warn",
      
      // ESLint comments guard (BAN ALL DISABLES)
      "eslint-comments/no-unused-disable": "error",
      "eslint-comments/disable-enable-pair": "error",
      "eslint-comments/no-unlimited-disable": "error",
      "eslint-comments/no-restricted-disable": ["error", "*"], // Ban all disables
      "eslint-comments/no-use": "error", // Complete ban on eslint-disable

      // Console logging prevention (GDPR/security)
      "no-console": ["error", { "allow": ["warn", "error"] }],
      "no-debugger": "error",

      // Security
      "security/detect-unsafe-regex": "error",
      "security/detect-non-literal-regexp": "error", 
      "no-secrets/no-secrets": ["error", { "tolerance": 4.2 }],

      // React performance guards
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // ANTI-PLACEHOLDER PROTECTION: Advanced pattern detection (custom rule)
      "local-rules/no-banned-strings": "error",

      // i18n ROOT HOOK ENFORCEMENT: Forbid namespaced useTranslations
      "local-rules/i18n-root-hook-only": "error",
    },
  },

  // React 19 + next-intl compatibility guard for App Router
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", 
        // Ban direct NextIntlClientProvider usage
        {
          selector: "ImportDeclaration[source.value='next-intl'] ImportSpecifier[imported.name='NextIntlClientProvider']",
          message: "Do not import NextIntlClientProvider in app/**. Use SafeNextIntlClientProvider instead."
        },
        // Ban passing function props to SafeNextIntlClientProvider
        {
          selector: "JSXOpeningElement[name.name='SafeNextIntlClientProvider'] JSXAttribute[name.name=/^on[A-Z].*/]",
          message: "Do not pass function props (on*) to SafeNextIntlClientProvider; handlers are defined inside the wrapper."
        },
        {
          selector: "JSXOpeningElement[name.name='SafeNextIntlClientProvider'] JSXAttribute[name.name='getMessageFallback']",
          message: "Do not pass getMessageFallback to SafeNextIntlClientProvider; it's defined inside the wrapper."
        },
        // Ban any NextIntlClientProvider usage if it slips through
        {
          selector: "JSXOpeningElement[name.name='NextIntlClientProvider']",
          message: "Never use NextIntlClientProvider directly in app/**. Use SafeNextIntlClientProvider instead."
        }
      ],
      "no-restricted-imports": ["error", {
        "paths": [
          {
            "name": "next-intl",
            "importNames": ["NextIntlClientProvider"],
            "message": "Use SafeNextIntlClientProvider from ~/lib/i18n/SafeNextIntlClientProvider instead"
          },
          {
            "name": "moment",
            "message": "Use Temporal.* instead - moment.js is deprecated for new projects"
          }
        ]
      }]
    },
  },

  // UI overrides: relax boolean/defaulting rules for natural UI patterns
  {
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/page.tsx", "src/app/**/layout.tsx"],
    plugins: { 
      "i18next": i18next 
    },
    rules: {
      // Prevent UI from importing server/DB types
      "no-restricted-imports": ["error", {
        "patterns": ["**/server/**", "**/RouterOutputs**", "**/RouterInputs**"]
      }],
      // Block new literal strings in UI components - enforce i18n
      "i18next/no-literal-string": ["error", {
        markupOnly: true,
        ignoreAttribute: ["id", "className", "data-testid", "href", "src", "aria-label", "title", "placeholder", "key", "type", "name", "role"]
      }],
      
      // Relax strict boolean expressions for UI conditionals
      "@typescript-eslint/strict-boolean-expressions": ["error", {
        allowString: true,
        allowNumber: true,
        allowNullableObject: true,
        allowNullableBoolean: true,
        allowNullableString: true,
        allowNullableNumber: true,
        allowAny: false
      }],
      
      // Turn off AST-based || restrictions in UI (rely on prefer-nullish-coalescing)
      "no-restricted-syntax": "off"
    },
  },
  
  // Ignore literal-string rule in UI primitives (must come AFTER the broader UI rule)
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "i18next/no-literal-string": "off",
      "id-denylist": "off", // Allow "placeholder" prop in UI components
      "local-rules/no-banned-strings": "off" // Allow "placeholder" in UI components
    }
  },
  {
    files: ["src/server/**/*.{ts,tsx}", "src/emails/**/*.{ts,tsx}"],
    plugins: { 
      "i18next": i18next 
    },
    rules: {
      "i18next/no-literal-string": "error"
    },
  },

  // UI components overrides (from eslint.ui-overrides.mjs)
  {
    files: ["src/components/ui/**"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { fixStyle: "inline-type-imports" },
      ],
    },
  },

  // Whitelist src/lib/env.ts for process.env access (it's the env parser)
  {
    files: ["src/lib/env.ts"],
    rules: {
      "no-process-env": "off",
      "no-restricted-properties": ["error", 
        {
          "object": "Date", 
          "property": "now", 
          "message": "Use Temporal.Now.* instead"
        },
        {
          "object": "Date", 
          "property": "parse", 
          "message": "Use Temporal.* parsing instead"
        }
      ],
    },
  },

  // Client-side env shim: allow NEXT_PUBLIC_* reads here only
  {
    files: ["src/lib/env-client.ts"],
    rules: {
      "no-process-env": "off",
      "no-restricted-properties": ["error", 
        {
          "object": "Date", 
          "property": "now", 
          "message": "Use Temporal.Now.* instead"
        },
        {
          "object": "Date", 
          "property": "parse", 
          "message": "Use Temporal.* parsing instead"
        }
      ],
    },
  },


  // Whitelist src/lib/date-bridge.ts for Date constructor (UI compatibility bridge)
  {
    files: ["src/lib/date-bridge.ts"],
    rules: {
      "no-restricted-globals": "off",
    },
  },

  // Whitelist SafeNextIntlClientProvider for Date constructor (next-intl compatibility)
  {
    files: ["src/lib/i18n/SafeNextIntlClientProvider.tsx"],
    rules: {
      "no-restricted-globals": "off",
    },
  },

  // Keep typed rules off config & scripts
  {
    files: [
      "**/*.config.{js,cjs,mjs,ts}", 
      "scripts/**", 
      "eslint.config.*", 
      "postcss.config.*", 
      "tailwind.config.*", 
      "next.config.*",
      "**/*.d.ts",
      "next-env.d.ts"
    ],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },

  // Disable i18n rules for tests and scripts
  {
    files: ["**/*.test.*", "**/scripts/**", "**/*.spec.*"],
    rules: {
      "i18next/no-literal-string": "off"
    },
  },

  // Generated file exceptions (Supabase types)
  { 
    files: ["src/types/supabase.ts"], 
    rules: {
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-duplicate-type-constituents": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  },

  // Webhook and health check exceptions for deprecated APIs
  {
    files: [
      "src/app/api/webhooks/**/*.{ts,tsx}",
      "src/app/api/health/route.ts"
    ],
    rules: {
      "@typescript-eslint/no-deprecated": "off"
    }
  },

  // Declaration file overrides
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
];