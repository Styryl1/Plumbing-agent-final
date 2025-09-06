import { describe, it, expect } from "vitest";
import { Temporal } from "temporal-polyfill";

type Inv = { total_cents: number; issued_at?: string|null; paid_at?: string|null; payment_status: "paid"|"unpaid" };
function aggregateDay(invoices: Inv[], start: string, end: string) {
  const s = Temporal.ZonedDateTime.from(start).toInstant();
  const e = Temporal.ZonedDateTime.from(end).toInstant();
  let sent = 0, paid = 0, revPaid = 0, revOut = 0;
  for (const inv of invoices) {
    if (inv.issued_at) {
      const t = Temporal.Instant.from(inv.issued_at);
      if (Temporal.Instant.compare(t, s) >= 0 && Temporal.Instant.compare(t, e) < 0) sent++;
    }
    if (inv.paid_at) {
      const t = Temporal.Instant.from(inv.paid_at);
      if (Temporal.Instant.compare(t, s) >= 0 && Temporal.Instant.compare(t, e) < 0) {
        paid++; revPaid += inv.total_cents;
      }
    }
    if (inv.payment_status !== "paid") revOut += inv.total_cents;
  }
  return { sent, paid, revPaid, revOut };
}

describe("reporting: daily aggregate counts", () => {
  it("computes sent/paid/outstanding correctly", () => {
    const day = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").with({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    const next = day.add({ days: 1 });
    const invs: Inv[] = [
      { total_cents: 1000, issued_at: day.add({ hours: 1 }).toString(), payment_status: "unpaid" },
      { total_cents: 2000, paid_at: day.add({ hours: 2 }).toString(), payment_status: "paid" },
      { total_cents: 3000, payment_status: "unpaid" },
    ];
    const a = aggregateDay(invs, day.toString(), next.toString());
    expect(a.sent).toBe(1);
    expect(a.paid).toBe(1);
    expect(a.revPaid).toBe(2000);
    expect(a.revOut).toBe(1000 + 3000);
  });
});