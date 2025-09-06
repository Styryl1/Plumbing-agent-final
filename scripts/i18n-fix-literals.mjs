#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();

// Common patterns to replace with translation keys
const replacements = [
  // UI common patterns - be more specific to avoid over-matching
  { pattern: />Close</g, replacement: '>{t("ui.close")}<' },
  { pattern: /€(\d+)/g, replacement: '{t("money.euro")}$1' },
  
  // Invoices page - match in JSX content
  { pattern: />Facturen</g, replacement: '>{t("invoice.title")}<' },
  { pattern: />Beheer alle facturen en betalingen</g, replacement: '>{t("invoice.manage")}<' },
  { pattern: />Totaal Openstaand</g, replacement: '>{t("invoice.totalOutstanding")}<' },
  { pattern: />Deze Maand</g, replacement: '>{t("invoice.thisMonth")}<' },
  { pattern: />Achterstallig</g, replacement: '>{t("invoice.overdue")}<' },
  { pattern: />Gemiddeld</g, replacement: '>{t("invoice.average")}<' },
  { pattern: />Per factuur dit jaar</g, replacement: '>{t("invoice.perInvoiceYear")}<' },
  { pattern: />Facturoverzicht</g, replacement: '>{t("invoice.overview")}<' },
  { pattern: />Beheer openstaande en betaalde facturen</g, replacement: '>{t("invoice.managePending")}<' },
  { pattern: />Open</g, replacement: '>{t("invoice.open")}<' },
  { pattern: />Betaald</g, replacement: '>{t("invoice.paid")}<' },
  
  // Table headers
  { pattern: />Factuur</g, replacement: '>{t("table.invoice")}<' },
  { pattern: />Klant</g, replacement: '>{t("table.customer")}<' },
  { pattern: />Datum</g, replacement: '>{t("table.date")}<' },
  { pattern: />Vervaldatum</g, replacement: '>{t("table.dueDate")}<' },
  { pattern: />Bedrag</g, replacement: '>{t("table.amount")}<' },
  { pattern: />Status</g, replacement: '>{t("table.status")}<' },
  
  // Form labels - more specific patterns
  { pattern: />Titel \*</g, replacement: '>{t("form.title")} {t("form.required")}<' },
  { pattern: />Prioriteit</g, replacement: '>{t("form.priority")}<' },
  { pattern: />Beschrijving</g, replacement: '>{t("form.description")}<' },
  { pattern: />Start tijd \*</g, replacement: '>{t("form.startTime")} {t("form.required")}<' },
  { pattern: />Duur \(min\)</g, replacement: '>{t("form.duration")}<' },
  { pattern: />Hoofdmonteur \*</g, replacement: '>{t("form.primaryEmployee")} {t("form.required")}<' },
  
  // Priority SelectItem values
  { pattern: />Normaal</g, replacement: '>{t("priority.normal")}<' },
  { pattern: />Urgent</g, replacement: '>{t("priority.urgent")}<' },
  { pattern: />Spoed</g, replacement: '>{t("priority.emergency")}<' },
  
  // WhatsApp
  { pattern: />Geen WhatsApp-berichten beschikbaar</g, replacement: '>{t("whatsapp.noMessages")}<' },
  { pattern: />Laatste activiteit:/g, replacement: '>{t("whatsapp.lastActivity")}:<' },
  { pattern: />Klus aanmaken</g, replacement: '>{t("whatsapp.createJob")}<' },
  
  // Actions
  { pattern: />Opslaan</g, replacement: '>{t("actions.save")}<' },
  { pattern: />Annuleren</g, replacement: '>{t("actions.cancel")}<' },
  
  // Complex pattern for multi-line strings
  { pattern: />\s*Beheer alle facturen en betalingen\s*</g, replacement: '>{t("invoice.manage")}<' },
  { pattern: />\s*Beheer openstaande en betaalde facturen\s*</g, replacement: '>{t("invoice.managePending")}<' },
];

// Files to process (excluding ui components and tests)
const filesToProcess = [
  "src/app/(dashboard)/page.tsx",
  "src/app/invoices/page.tsx",
  "src/app/jobs/**/*.tsx",
  "src/app/customers/**/*.tsx",
  "src/components/!(ui)/**/*.tsx"
];

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;
  
  // Apply replacements
  for (const { pattern, replacement } of replacements) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) {
      modified = true;
      console.log(`✓ Applied replacement in ${filePath}: ${pattern}`);
    }
  }
  
  // Ensure useT import exists if we made changes
  if (modified) {
    // Check if it's a client component
    if (content.includes('"use client"')) {
      if (!content.includes('import { useT }') && content.includes('{t("')) {
        // Add useT import after existing imports
        const importMatch = content.match(/(import.*from.*;\n)/g);
        if (importMatch) {
          const lastImport = importMatch[importMatch.length - 1];
          content = content.replace(lastImport, lastImport + 'import { useT } from "~/i18n/client";\n');
        }
        
        // Add const t = useT(); after function declaration
        content = content.replace(
          /(export\s+(?:default\s+)?function\s+\w+.*?\{)/,
          '$1\n\tconst t = useT();\n'
        );
      }
    } else {
      // Server component - use tServer
      if (!content.includes('import { tServer }') && content.includes('{t("')) {
        const importMatch = content.match(/(import.*from.*;\n)/g);
        if (importMatch) {
          const lastImport = importMatch[importMatch.length - 1];
          content = content.replace(lastImport, lastImport + 'import { tServer } from "~/i18n/server";\n');
        }
        
        // Add const t = await tServer(); in async function
        content = content.replace(
          /(export\s+(?:default\s+)?async\s+function\s+\w+.*?\{)/,
          '$1\n\tconst t = await tServer();\n'
        );
      }
      // Remove unused tServer import
      if (content.includes('import { tServer }') && !content.includes('tServer(')) {
        content = content.replace(/import { tServer } from "~\/i18n\/server";\n/, '');
      }
    }
    
    fs.writeFileSync(filePath, content);
  }
  
  return modified;
}

async function main() {
  console.log("🔧 i18n Literal String Fixer");
  console.log("===============================");
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  // Process specific known files with hardcoded strings
  const knownFiles = [
    "src/app/(dashboard)/page.tsx",
    "src/app/invoices/page.tsx",
  ];
  
  for (const file of knownFiles) {
    const fullPath = path.join(root, file);
    if (processFile(fullPath)) {
      modifiedFiles++;
    }
    totalFiles++;
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Files modified: ${modifiedFiles}`);
  
  if (modifiedFiles > 0) {
    console.log("\n🎨 Running Biome formatter...");
    try {
      execSync("pnpm biome format --write .", { stdio: "inherit" });
      console.log("✓ Formatted successfully");
    } catch (error) {
      console.log("⚠️  Formatter failed:", error.message);
    }
    
    console.log("\n🔍 Running ESLint to check remaining violations...");
    try {
      execSync("pnpm lint --quiet", { stdio: "pipe" });
      console.log("✅ No more i18n violations!");
    } catch (error) {
      console.log("⚠️  Still have violations. Manual fixes may be needed.");
    }
  }
  
  console.log("\n✨ Done! Run 'pnpm lint' to see remaining violations.");
}

main().catch(console.error);