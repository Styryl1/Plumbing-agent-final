import { vi } from 'vitest'
import 'temporal-polyfill/global'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Mock server-only to allow testing of server components
vi.mock('server-only', () => ({}))

// Set up environment variables for testing
// Add any missing required environment variables for tests
// eslint-disable-next-line no-process-env
if (!process.env.INTERNAL_JOB_TOKEN) {
  // eslint-disable-next-line no-process-env
  process.env.INTERNAL_JOB_TOKEN = 'test_internal_job_token_32_characters_long'
}

// Set up test-specific environment variables
// eslint-disable-next-line no-process-env
process.env.WHATSAPP_APP_SECRET ??= 'test_whatsapp_app_secret_32_chars'
// eslint-disable-next-line no-process-env
process.env.TEST_ORG_ID ??= 'org_test'
// eslint-disable-next-line no-process-env
process.env.WHATSAPP_BUSINESS_PHONE_ID ??= 'test_phone_id'
// eslint-disable-next-line no-process-env
process.env.WHATSAPP_CONTROL_PHONE_ID ??= 'test_control_phone'
// eslint-disable-next-line no-process-env
process.env.SECOND_TEST_ORG_ID ??= 'org_test_2'
// eslint-disable-next-line no-process-env
process.env.SECOND_WHATSAPP_PHONE_ID ??= 'test_phone_2'

// Global test timeout
vi.setConfig({ testTimeout: 30000 })

// Suppress console logs during tests unless DEBUG=true
// eslint-disable-next-line no-process-env
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}