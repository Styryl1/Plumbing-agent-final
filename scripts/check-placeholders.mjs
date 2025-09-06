#!/usr/bin/env node

/**
 * Pre-commit safety net: Check for banned placeholders and patterns
 * 
 * This script uses ripgrep to quickly scan all files for placeholder strings,
 * hardcoded UUIDs, and other banned patterns that could indicate temporary/test data.
 * 
 * Designed for Dutch plumbing SaaS to prevent "Tijdelijke klant" issues.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

// ANSI colors for better output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function logError(message) {
  console.error(`${colors.red}✖${colors.reset} ${message}`);
}

function logWarning(message) {
  console.warn(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

// Check if ripgrep (rg) is available
function checkRipgrepAvailable() {
  try {
    execSync('rg --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Banned patterns with context-aware descriptions
const BANNED_PATTERNS = [
  {
    pattern: 'Tijdelijke klant',
    description: 'Dutch placeholder customer name',
    severity: 'error'
  },
  {
    pattern: 'Temporary Customer',
    description: 'English placeholder customer name', 
    severity: 'error'
  },
  {
    pattern: 'Test Customer',
    description: 'Test placeholder customer name',
    severity: 'error'
  },
  {
    pattern: 'Placeholder Customer',
    description: 'Generic placeholder customer name',
    severity: 'error'
  },
  {
    pattern: '00000000-0000-0000-0000-000000000000',
    description: 'All-zero UUID (nil UUID)',
    severity: 'error'
  },
  {
    pattern: 'TEMP_CUSTOMER_ID',
    description: 'Hardcoded temporary customer ID constant',
    severity: 'error'
  },
  {
    pattern: 'test.loodgieter@',
    description: 'Test plumber email address',
    severity: 'warning'
  },
  {
    pattern: 'voorbeeld.klant@',
    description: 'Example customer email (Dutch)',
    severity: 'warning'
  },
  {
    pattern: 'dummy',
    description: 'Dummy/placeholder data indicator',
    severity: 'warning',
    // Only flag if it appears in strings/comments, not code identifiers
    context: 'string'
  }
];

// File patterns to exclude from scanning
const EXCLUDE_PATTERNS = [
  '--glob', '!node_modules/**',
  '--glob', '!.next/**', 
  '--glob', '!dist/**',
  '--glob', '!coverage/**',
  '--glob', '!*.log',
  '--glob', '!package-lock.json',
  '--glob', '!pnpm-lock.yaml',
  '--glob', '!yarn.lock',
  '--glob', '!.git/**',
  // Allow in test files and scripts (they may legitimately use placeholders)
  '--glob', '!**/*.test.*',
  '--glob', '!**/*.spec.*', 
  '--glob', '!scripts/**',
  '--glob', '!tools/**',
  // Allow in this check script itself
  '--glob', '!scripts/check-placeholders.mjs'
];

async function scanForPattern(pattern, description, severity = 'error') {
  const rgArgs = [
    '--color=never',
    '--line-number',
    '--with-filename',
    '--ignore-case',
    ...EXCLUDE_PATTERNS,
    pattern
  ];

  try {
    // Build command properly for execSync - first arg is full command string
    const rgCommand = 'rg ' + rgArgs.map(arg => `"${arg}"`).join(' ');
    const result = execSync(rgCommand, { 
      encoding: 'utf8',
      stdio: 'pipe',
      shell: true
    });

    if (result.trim()) {
      const lines = result.trim().split('\n');
      if (severity === 'error') {
        logError(`Found banned pattern: ${colorize('bold', pattern)} (${description})`);
      } else {
        logWarning(`Found suspicious pattern: ${colorize('bold', pattern)} (${description})`);
      }
      
      lines.forEach(line => {
        console.log(`  ${colorize('blue', line)}`);
      });
      
      return { pattern, description, severity, matches: lines.length };
    }
    
    return null;
  } catch (error) {
    // rg exits with code 1 when no matches found, which is expected
    if (error.status === 1) {
      return null;
    }
    
    // Actual error occurred
    logError(`Error scanning for pattern "${pattern}": ${error.message}`);
    return { error: true, pattern, description };
  }
}

async function main() {
  logInfo(`${colorize('bold', 'Plumbing Agent')}: Scanning for banned placeholders and patterns...`);
  
  if (!checkRipgrepAvailable()) {
    logError('ripgrep (rg) is required but not found in PATH.');
    logInfo('Install ripgrep: https://github.com/BurntSushi/ripgrep#installation');
    process.exit(1);
  }

  const results = [];
  let hasErrors = false;
  let hasWarnings = false;

  // Scan for each banned pattern
  for (const { pattern, description, severity } of BANNED_PATTERNS) {
    const result = await scanForPattern(pattern, description, severity);
    if (result) {
      results.push(result);
      
      if (result.error) {
        hasErrors = true;
      } else if (result.severity === 'error') {
        hasErrors = true;
      } else if (result.severity === 'warning') {
        hasWarnings = true;
      }
    }
  }

  // Advanced UUID pattern scan (catches hardcoded UUIDs in general)
  const uuidResult = await scanForPattern(
    '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
    'Hardcoded UUID pattern (potential placeholder)',
    'warning'
  );
  
  if (uuidResult && !uuidResult.error) {
    results.push(uuidResult);
    hasWarnings = true;
  }

  console.log(); // Empty line for readability

  if (results.length === 0) {
    logSuccess('No banned placeholders or patterns found!');
    logInfo('Codebase appears clean of temporary/placeholder data.');
    process.exit(0);
  }

  // Summary
  const errorCount = results.filter(r => !r.error && r.severity === 'error').length;
  const warningCount = results.filter(r => !r.error && r.severity === 'warning').length;
  const totalMatches = results.reduce((sum, r) => sum + (r.matches || 0), 0);

  if (hasErrors) {
    logError(`Found ${errorCount} error pattern(s) with ${totalMatches} total matches.`);
    logError('Please replace placeholder/temporary data with proper values before committing.');
  }

  if (hasWarnings) {
    logWarning(`Found ${warningCount} suspicious pattern(s). Review these carefully.`);
  }

  console.log();
  logInfo('Common fixes:');
  console.log('  • Replace "Tijdelijke klant" with real customer data or database queries');
  console.log('  • Replace hardcoded UUIDs with variables or proper data flow');
  console.log('  • Use i18n keys instead of placeholder UI strings');
  console.log('  • Remove test/dummy data from production code');

  // Exit with error code if any error-level patterns found
  process.exit(hasErrors ? 1 : 0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logError(`Unhandled promise rejection: ${error.message}`);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  logError(`Script failed: ${error.message}`);
  process.exit(1);
});