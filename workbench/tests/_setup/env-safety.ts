/**
 * Workbench Environment Safety Setup
 * 
 * This file runs before ALL workbench tests to validate the testing environment
 * and warn about database testing capabilities.
 */
// Load Temporal globally for all tests (no app-path dependency)
import "temporal-polyfill/global";
import * as dotenv from 'dotenv'
import * as path from 'path'
import { vi } from 'vitest'
import { fileURLToPath } from 'url'

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from main project
// Working directory is workbench/, so need to go up one level to reach project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })

// Mock server-only module to prevent import errors
vi.mock('server-only', () => ({}))

console.log('🔧 Workbench Test Environment Setup')

// Check if database testing is enabled
if (process.env.WB_ALLOW_DB) {
  console.log('🔥 DATABASE TESTING ENABLED')
  console.log(`📍 Supabase URL: ${process.env.SUPABASE_URL || 'NOT SET'}`)
  console.log('⚠️  WARNING: Some tests will modify real database tables!')
  console.log('   Make sure you\'re using a development environment.')
} else {
  console.log('🛡️  Database testing DISABLED (WB_ALLOW_DB not set)')
  console.log('   Tests requiring database access will be skipped.')
}

// Validate required environment variables for basic tests
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
]

const missingVars = requiredVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`)
  console.warn('   Some tests may fail. Check your .env.local file.')
}

// CI Safety Check
if (process.env.CI && process.env.WB_ALLOW_DB) {
  console.error('🚨 CI SAFETY VIOLATION: Database testing enabled in CI environment!')
  console.error('   Set WB_RUN=1 explicitly if you really want to run DB tests in CI.')
  
  if (!process.env.WB_RUN) {
    process.exit(1)
  }
}

console.log('✅ Environment safety check complete\n')