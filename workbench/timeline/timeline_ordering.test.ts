import { describe, it, expect } from "vitest";
import { Temporal } from "temporal-polyfill";

type Row = { at: string; source: "system"|"provider"|"payment"|"dunning"|"note"; type: string };
const cmp = (a: Row, b: Row) =>
  a.at === b.at ? (a.source === b.source ? a.type.localeCompare(b.type) : a.source.localeCompare(b.source))
                : (a.at < b.at ? -1 : 1);

describe("timeline ordering", () => {
  it("orders by at asc, then source, then type", () => {
    const base = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").with({ minute: 0, second: 0, millisecond: 0 });
    const rows: Row[] = [
      { at: base.add({ minutes: 1 }).toString(), source: "dunning", type: "reminder_sent" },
      { at: base.toString(), source: "system", type: "created" },
      { at: base.add({ minutes: 1 }).toString(), source: "provider", type: "sent" },
      { at: base.add({ minutes: 2 }).toString(), source: "payment", type: "paid" },
    ];
    const ordered = [...rows].sort(cmp);
    expect(ordered.map(r => r.type)).toEqual(["created", "reminder_sent", "sent", "paid"]);
  });
});