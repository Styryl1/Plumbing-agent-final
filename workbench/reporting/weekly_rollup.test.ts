import { describe, it, expect } from "vitest";
import { Temporal } from "temporal-polyfill";

type Daily = {
  snapshot_date: string; // "YYYY-MM-DD"
  total_invoices: number;
  sent_count: number;
  paid_count: number;
  revenue_paid_cents: number;
  revenue_outstanding_cents: number;
  overdue_count: number;
  overdue_cents: number;
};

function sumWeekly(rows: Daily[]) {
  // Simple sum over given rows (label omitted to avoid calendar complexity in skeleton)
  return rows.reduce((acc, r) => {
    acc.total_invoices += r.total_invoices;
    acc.sent_count += r.sent_count;
    acc.paid_count += r.paid_count;
    acc.revenue_paid_cents += r.revenue_paid_cents;
    acc.revenue_outstanding_cents += r.revenue_outstanding_cents;
    acc.overdue_count += r.overdue_count;
    acc.overdue_cents += r.overdue_cents;
    return acc;
  }, {
    total_invoices: 0, sent_count: 0, paid_count: 0,
    revenue_paid_cents: 0, revenue_outstanding_cents: 0,
    overdue_count: 0, overdue_cents: 0,
  });
}

describe("reporting: weekly rollup skeleton", () => {
  it("sums daily rows into weekly totals", () => {
    const today = Temporal.Now.plainDateISO("Europe/Amsterdam");
    const d1 = today.toString();
    const d2 = today.add({ days: 1 }).toString();
    const d3 = today.add({ days: 2 }).toString();
    const rows: Daily[] = [
      { snapshot_date: d1, total_invoices: 1, sent_count: 1, paid_count: 0, revenue_paid_cents: 0, revenue_outstanding_cents: 100, overdue_count: 0, overdue_cents: 0 },
      { snapshot_date: d2, total_invoices: 2, sent_count: 1, paid_count: 1, revenue_paid_cents: 200, revenue_outstanding_cents: 100, overdue_count: 1, overdue_cents: 100 },
      { snapshot_date: d3, total_invoices: 1, sent_count: 0, paid_count: 0, revenue_paid_cents: 0,  revenue_outstanding_cents: 300, overdue_count: 1, overdue_cents: 300 },
    ];
    const w = sumWeekly(rows);
    expect(w.total_invoices).toBe(4);
    expect(w.sent_count).toBe(2);
    expect(w.paid_count).toBe(1);
    expect(w.revenue_paid_cents).toBe(200);
    expect(w.revenue_outstanding_cents).toBe(500);
    expect(w.overdue_count).toBe(2);
    expect(w.overdue_cents).toBe(400);
  });
});