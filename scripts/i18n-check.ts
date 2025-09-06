#!/usr/bin/env tsx
/**
 * Comprehensive i18n validation script
 * Ensures translation key parity, ICU format validation, and usage validation
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

// ANSI colors for terminal output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m", 
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m"
} as const;

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

interface TranslationFiles {
  nl: Record<string, string>;
  en: Record<string, string>;
}

/**
 * Flatten nested object to dot notation keys
 */
function flattenObject(obj: any, prefix = ""): Record<string, string> {
  const flattened: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      flattened[newKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Skip _orphans section in flattening for key parity checks
      if (key !== '_orphans') {
        Object.assign(flattened, flattenObject(value, newKey));
      }
    }
  }
  
  return flattened;
}

/**
 * Load translation files
 */
function loadTranslationFiles(): TranslationFiles {
  const nlPath = join(process.cwd(), "src/i18n/messages/nl.json");
  const enPath = join(process.cwd(), "src/i18n/messages/en.json");

  if (!existsSync(nlPath)) {
    throw new Error(`Dutch translation file not found: ${nlPath}`);
  }
  if (!existsSync(enPath)) {
    throw new Error(`English translation file not found: ${enPath}`);
  }

  try {
    const nlRaw = JSON.parse(readFileSync(nlPath, "utf-8"));
    const enRaw = JSON.parse(readFileSync(enPath, "utf-8"));
    const nl = flattenObject(nlRaw);
    const en = flattenObject(enRaw);
    return { nl, en };
  } catch (error) {
    throw new Error(`Failed to parse translation files: ${error}`);
  }
}

/**
 * Assert no _orphans in runtime JSON files
 * Prevents loading of orphaned keys at runtime
 */
function assertNoOrphans(obj: any, name: string): void {
  if (obj && typeof obj === "object" && "_orphans" in obj) {
    console.error(`${colors.red}❌ [i18n-check] ${name} contains _orphans. Remove them; use archive files instead.${colors.reset}`);
    process.exitCode = 1;
  }
}

/**
 * Validate ICU message format
 */
function validateICUFormat(key: string, message: string): string[] {
  const errors: string[] = [];

  // Check for unmatched braces
  const openBraces = (message.match(/{/g) || []).length;
  const closeBraces = (message.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unmatched braces in key "${key}": "${message}"`);
  }

  // Check for valid ICU syntax patterns
  const icuPatterns = [
    /\{[^}]+,\s*plural,\s*[^}]+\}/g, // Plurals
    /\{[^}]+,\s*select,\s*[^}]+\}/g, // Selects
    /\{[^}]+,\s*number\}/g,          // Numbers
    /\{[^}]+,\s*date\}/g,            // Dates
    /\{[^}]+,\s*time\}/g,            // Times
  ];

  // Find all ICU-like patterns
  const icuMatches = message.match(/\{[^}]+\}/g) || [];
  
  for (const match of icuMatches) {
    // Simple variable substitution is OK: {name}, {count}, etc.
    if (/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(match)) {
      continue;
    }
    
    // Check if it matches any known ICU pattern
    let isValidICU = false;
    for (const pattern of icuPatterns) {
      if (pattern.test(match)) {
        isValidICU = true;
        break;
      }
    }
    
    if (!isValidICU) {
      errors.push(`Potentially invalid ICU syntax in key "${key}": "${match}"`);
    }
  }

  return errors;
}

/**
 * Recursively find files with specified extensions
 */
function findFilesRecursively(dir: string, extensions: string[], excludePaths: string[] = []): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string): void {
    try {
      const entries = readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const relativePath = fullPath.replace(process.cwd(), "").replace(/\\/g, "/");
        
        // Skip excluded paths
        if (excludePaths.some(exclude => relativePath.includes(exclude))) {
          continue;
        }
        
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (stat.isFile() && extensions.includes(extname(entry))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Find all translation key usages in code
 */
async function findTranslationKeyUsages(): Promise<Set<string>> {
  const srcDir = join(process.cwd(), "src");
  const files = [
    ...findFilesRecursively(join(srcDir, "app"), [".ts", ".tsx"]),
    ...findFilesRecursively(join(srcDir, "components"), [".ts", ".tsx"], ["/ui/"]),
  ];

  const usedKeys = new Set<string>();
  const keyPatterns = [
    /\bt\(\s*["']([^"']+)["']\s*\)/g,           // t("key")
    /\bt\(\s*`([^`]+)`\s*\)/g,                   // t(`key`)
    /\buseTranslations\(\)\(\s*["']([^"']+)["']\s*\)/g, // useTranslations()("key")
  ];

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      
      for (const pattern of keyPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1]!;
          
          // Handle dynamic provider keys: providers.${provider}
          if (key === 'providers.${provider}') {
            // Add all known provider keys from InvoiceProviderSchema
            // These are used with useTranslations("invoices") so they become invoices.providers.*
            const providerKeys = ['moneybird', 'wefact', 'eboekhouden', 'peppol'];
            for (const provider of providerKeys) {
              usedKeys.add(`invoices.providers.${provider}`);
            }
          } else {
            usedKeys.add(key);
          }
        }
      }
    } catch (error) {
      console.warn(`${colors.yellow}Warning: Could not read file ${file}: ${error}${colors.reset}`);
    }
  }

  return usedKeys;
}

/**
 * Validate key parity between translation files
 */
function validateKeyParity(translations: TranslationFiles): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nlKeys = new Set(Object.keys(translations.nl));
  const enKeys = new Set(Object.keys(translations.en));

  // Find missing keys in each language
  const missingInEn = [...nlKeys].filter(key => !enKeys.has(key));
  const missingInNl = [...enKeys].filter(key => !nlKeys.has(key));

  if (missingInEn.length > 0) {
    errors.push(`Missing keys in English: ${missingInEn.join(", ")}`);
  }

  if (missingInNl.length > 0) {
    errors.push(`Missing keys in Dutch: ${missingInNl.join(", ")}`);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate ICU format in all messages
 */
function validateICUMessages(translations: TranslationFiles): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate Dutch messages
  for (const [key, message] of Object.entries(translations.nl)) {
    if (typeof message === 'string') {
      const icuErrors = validateICUFormat(key, message);
      errors.push(...icuErrors);
    }
  }

  // Validate English messages
  for (const [key, message] of Object.entries(translations.en)) {
    if (typeof message === 'string') {
      const icuErrors = validateICUFormat(key, message);
      errors.push(...icuErrors);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate key usage - find orphaned and missing keys
 */
async function validateKeyUsage(translations: TranslationFiles): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const usedKeys = await findTranslationKeyUsages();
  const definedKeys = new Set(Object.keys(translations.nl));

  // Find orphaned keys (defined but not used)
  const orphanedKeys = [...definedKeys].filter(key => !usedKeys.has(key));
  if (orphanedKeys.length > 0) {
    warnings.push(`Orphaned translation keys (defined but not used): ${orphanedKeys.join(", ")}`);
  }

  // Find missing keys (used but not defined)
  const missingKeys = [...usedKeys].filter(key => !definedKeys.has(key));
  if (missingKeys.length > 0) {
    errors.push(`Missing translation keys (used but not defined): ${missingKeys.join(", ")}`);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Main validation function
 */
async function validateI18n(): Promise<void> {
  console.log(`${colors.bold}${colors.cyan}🔍 i18n Comprehensive Validation${colors.reset}`);
  console.log("===============================\n");

  try {
    // Load translation files
    console.log("📂 Loading translation files...");
    const translations = loadTranslationFiles();
    
    // Critical: Check for _orphans in runtime JSON (fail fast)
    console.log("🚫 Checking for _orphans in runtime JSON...");
    assertNoOrphans(translations.nl, "nl.json");
    assertNoOrphans(translations.en, "en.json");
    if (process.exitCode === 1) {
      console.log(`   ${colors.red}❌ _orphans detected in runtime JSON${colors.reset}`);
      console.log("🔧 Run 'pnpm i18n:prune' to archive orphaned keys\n");
      process.exit(1);
    }
    console.log(`   ${colors.green}✅ No _orphans in runtime JSON${colors.reset}`);
    
    const nlKeyCount = Object.keys(translations.nl).length;
    const enKeyCount = Object.keys(translations.en).length;
    console.log(`   Dutch: ${nlKeyCount} keys`);
    console.log(`   English: ${enKeyCount} keys\n`);

    let hasErrors = false;
    let hasWarnings = false;

    // Validate key parity
    console.log("🔄 Validating key parity...");
    const parityResult = validateKeyParity(translations);
    if (!parityResult.success) {
      hasErrors = true;
      for (const error of parityResult.errors) {
        console.log(`   ${colors.red}❌ ${error}${colors.reset}`);
      }
    } else {
      console.log(`   ${colors.green}✅ All keys synchronized${colors.reset}`);
    }

    // Validate ICU format
    console.log("\n📝 Validating ICU message formats...");
    const icuResult = validateICUMessages(translations);
    if (!icuResult.success) {
      hasErrors = true;
      for (const error of icuResult.errors) {
        console.log(`   ${colors.red}❌ ${error}${colors.reset}`);
      }
    } else {
      console.log(`   ${colors.green}✅ All ICU formats valid${colors.reset}`);
    }

    // Validate key usage
    console.log("\n🔍 Validating key usage...");
    const usageResult = await validateKeyUsage(translations);
    if (!usageResult.success) {
      hasErrors = true;
      for (const error of usageResult.errors) {
        console.log(`   ${colors.red}❌ ${error}${colors.reset}`);
      }
    }
    if (usageResult.warnings.length > 0) {
      hasWarnings = true;
      for (const warning of usageResult.warnings) {
        console.log(`   ${colors.yellow}⚠️  ${warning}${colors.reset}`);
      }
    }
    if (usageResult.success && usageResult.warnings.length === 0) {
      console.log(`   ${colors.green}✅ All keys properly used${colors.reset}`);
    }

    // Summary
    console.log("\n" + "=".repeat(47));
    if (hasErrors) {
      console.log(`${colors.red}❌ i18n VALIDATION FAILED${colors.reset}`);
      console.log("🔧 Fix the errors above and run the validation again.");
      process.exit(1);
    } else if (hasWarnings) {
      console.log(`${colors.yellow}⚠️  i18n validation passed with warnings${colors.reset}`);
      console.log("💡 Consider addressing the warnings above.");
    } else {
      console.log(`${colors.green}✅ i18n VALIDATION PASSED${colors.reset}`);
      console.log("🚀 All translation files are properly configured!");
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Validation failed: ${error}${colors.reset}`);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
function main(): void {
  validateI18n().catch((error) => {
    console.error(`${colors.red}❌ Validation failed: ${error}${colors.reset}`);
    process.exit(1);
  });
}

// Always run when executed as a script
main();