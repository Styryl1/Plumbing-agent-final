import { describe, it, expect, vi, beforeEach } from "vitest";
import { textMessagePayloads, statusUpdatePayloads } from "../fixtures/whatsapp_payloads";

// Mock the database and webhook processing to test in isolation
vi.mock('~/server/db/serviceClient', () => ({
  getServiceDbForWebhook: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { org_id: 'test_org', label: 'Test Number' }
          }))
        }))
      }))
    }))
  }))
}));

vi.mock('~/server/services/whatsapp/message-store', () => ({
  isWebhookEventDuplicate: vi.fn(() => Promise.resolve(false)),
  persistWhatsAppMessages: vi.fn(() => Promise.resolve([])),
  recordWebhookEvent: vi.fn(() => Promise.resolve())
}));

vi.mock('~/server/services/whatsapp/message-status', () => ({
  applyStatuses: vi.fn(() => Promise.resolve())
}));

describe("WhatsApp Mock Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate valid WhatsApp webhook payloads", () => {
    const payload = textMessagePayloads.simple("test_phone_id", "+31612345678");
    
    expect(payload).toHaveProperty('object', 'whatsapp_business_account');
    expect(payload.entry).toBeInstanceOf(Array);
    expect(payload.entry[0]).toHaveProperty('changes');
    expect(payload.entry[0]?.changes[0]?.field).toBe('messages');
    expect(payload.entry[0]?.changes[0]?.value.messages[0]?.type).toBe('text');
  });

  it("should create emoji-containing payloads correctly", () => {
    const payload = textMessagePayloads.withEmojis("test_phone_id", "+31612345678");
    const message = payload.entry[0]?.changes[0]?.value.messages[0];
    
    expect(message?.text?.body).toContain('🚰');
    expect(message?.text?.body).toContain('🔧');
    expect(message?.text?.body).toContain('💧');
  });

  it("should handle maximum length messages", () => {
    const payload = textMessagePayloads.maxLength("test_phone_id", "+31612345678");
    const message = payload.entry[0]?.changes[0]?.value.messages[0];
    
    expect(message?.text?.body?.length).toBe(4096);
    expect(message?.text?.body).toBe('A'.repeat(4096));
  });

  it("should create valid status update payloads", () => {
    const sentPayload = statusUpdatePayloads.sent("test_phone_id", "wamid.test123");
    expect(sentPayload.entry[0]?.changes[0]?.value.statuses[0]?.status).toBe('sent');
    
    const deliveredPayload = statusUpdatePayloads.delivered("test_phone_id", "wamid.test123");
    expect(deliveredPayload.entry[0]?.changes[0]?.value.statuses[0]?.status).toBe('delivered');
  });
});
