import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

// ⚠️ CRITICAL SAFETY CHECKS FOR DATABASE TESTING ⚠️
function validateTestEnvironment(): void {
  // 1. Require explicit opt-in flag
  if (!process.env.WB_ALLOW_DB) {
    throw new Error(
      '🚨 DATABASE TESTING DISABLED: Set WB_ALLOW_DB=1 to enable workbench database tests.\n' +
      '⚠️  WARNING: These tests modify real database tables with SERVICE_ROLE access!'
    )
  }

  // 2. Validate we're not pointing to production
  const url = process.env.SUPABASE_URL
  if (!url) {
    throw new Error('❌ SUPABASE_URL not configured')
  }

  // 3. Block production-like URLs
  const safePatterns = ['-dev', '-local', '-test', '-staging', 'localhost', '127.0.0.1', 'akuktezoisvblrnkaljb']
  const isSafeUrl = safePatterns.some(pattern => url.includes(pattern))
  
  if (!isSafeUrl) {
    throw new Error(
      `🚨 PRODUCTION URL BLOCKED: ${url}\n` +
      '   Safe patterns: -dev, -local, -test, -staging, localhost\n' +
      '   If this is actually a dev environment, update the URL to include a safe pattern.'
    )
  }

  // 4. Warn about SERVICE_ROLE usage
  console.warn('🔥 WORKBENCH DB TESTING ENABLED - Using SERVICE_ROLE with full database access!')
  console.warn(`📍 Target: ${url}`)
}

// Validate environment before creating client
validateTestEnvironment()

// Create database client for testing
export const db = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * ⚠️ DANGEROUS: Ensure phone number mappings exist for testing
 * 
 * MODIFIES DATABASE: UPSERTS to wa_numbers table
 * Only use with WB_ALLOW_DB=1 and verified dev environment
 */
export async function ensureMappings(orgId: string, phoneNumberId: string, controlPhoneId: string): Promise<void> {
  console.warn(`🔥 MODIFYING DATABASE: Upserting wa_numbers for org ${orgId}`)
  
  // Insert or update phone number mapping
  // Primary key is phone_number_id, so use that for conflict resolution
  const { error } = await db
    .from('wa_numbers')
    .upsert({
      org_id: orgId,
      phone_number_id: phoneNumberId,
      label: 'business'  // Must be 'business' or 'control' per check constraint
    }, {
      onConflict: 'phone_number_id'
    })
  
  if (error) {
    console.warn('Failed to ensure phone mappings:', error)
  }
}

/**
 * 🚨 EXTREMELY DANGEROUS: Clean up WhatsApp test data for an organization
 * 
 * DELETES FROM: wa_read_markers, wa_messages, wa_conversations, webhook_events
 * This permanently removes data! Only use with WB_ALLOW_DB=1 and verified dev environment
 */
export async function truncateWa(orgId: string): Promise<void> {
  console.warn(`🚨 DELETING DATA: Truncating WhatsApp tables for org ${orgId}`)
  console.warn('   Tables affected: wa_read_markers, wa_messages, wa_conversations, webhook_events')
  
  // Clean up in correct order to respect foreign keys
  await db.from('wa_read_markers').delete().eq('org_id', orgId)
  await db.from('wa_messages').delete().eq('org_id', orgId)
  await db.from('wa_conversations').delete().eq('org_id', orgId)
  await db.from('webhook_events').delete().eq('org_id', orgId)
}

/**
 * Get test organization data
 */
export async function getTestOrg(orgId: string) {
  const { data, error } = await db
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()
  
  if (error || !data) {
    throw new Error(`Test organization ${orgId} not found. Please set up test data.`)
  }
  
  return data
}