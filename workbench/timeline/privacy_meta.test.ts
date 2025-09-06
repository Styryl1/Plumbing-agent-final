import { describe, it, expect } from "vitest";

function containsPII(meta: Record<string, unknown>): boolean {
  const s = JSON.stringify(meta);
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phone = /\+?\d{6,}/; // crude E.164-ish
  return email.test(s) || phone.test(s) || /messageBody|text/i.test(s);
}

describe("timeline meta privacy", () => {
  it("rejects email/phone/message bodies in meta", () => {
    expect(containsPII({ channel: "whatsapp", template: "urgent", result: "sent" })).toBe(false);
    expect(containsPII({ messageBody: "pay now" })).toBe(true);
    expect(containsPII({ recipient: "someone@example.com" })).toBe(true);
    expect(containsPII({ phone: "+31612345678" })).toBe(true);
  });
});