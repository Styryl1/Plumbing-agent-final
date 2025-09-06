import { describe, it, expect } from "vitest";
import { Temporal } from "temporal-polyfill";

type Inv = { total_cents: number; due_date: string; paid?: boolean };
function bucket(inv: Inv, endOfDay: Temporal.ZonedDateTime): "0_7"|"8_30"|"31_60"|"61_plus"|"none" {
  const due = Temporal.PlainDate.from(inv.due_date);
  const dEnd = endOfDay.toPlainDate();
  const diff = dEnd.since(due).days;
  if (diff <= 0 || inv.paid) return "none";
  if (diff <= 7) return "0_7";
  if (diff <= 30) return "8_30";
  if (diff <= 60) return "31_60";
  return "61_plus";
}

describe("reporting: aging buckets", () => {
  it("assigns invoices to correct aging buckets", () => {
    const eod = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").with({ hour: 23, minute: 59, second: 59, millisecond: 0 });
    const invs: Inv[] = [
      { total_cents: 100, due_date: eod.toPlainDate().subtract({ days: 3 }).toString() },   // 0-7
      { total_cents: 200, due_date: eod.toPlainDate().subtract({ days: 10 }).toString() },  // 8-30
      { total_cents: 300, due_date: eod.toPlainDate().subtract({ days: 45 }).toString() },  // 31-60
      { total_cents: 400, due_date: eod.toPlainDate().subtract({ days: 80 }).toString() },  // 61+
    ];
    expect(bucket(invs[0], eod)).toBe("0_7");
    expect(bucket(invs[1], eod)).toBe("8_30");
    expect(bucket(invs[2], eod)).toBe("31_60");
    expect(bucket(invs[3], eod)).toBe("61_plus");
  });
});