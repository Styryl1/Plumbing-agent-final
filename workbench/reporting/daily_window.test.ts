import { describe, it, expect } from "vitest";
import { Temporal } from "temporal-polyfill";

function dayWindow(dateISO: string) {
  const z = Temporal.ZonedDateTime.from(dateISO).withTimeZone("Europe/Amsterdam");
  const start = z.with({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  const end = start.add({ days: 1 });
  return { start, end, day: start.toPlainDate().toString() };
}

describe("reporting: local daily window", () => {
  it("places 23:59 and 00:01 into adjacent local days", () => {
    const base = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
    const at2359 = base.with({ hour: 23, minute: 59, second: 0, millisecond: 0 });
    const at0001 = at2359.add({ minutes: 2 });

    const d1 = dayWindow(at2359.toString()).day;
    const d2 = dayWindow(at0001.toString()).day;

    expect(d1 === d2).toBe(false);
  });
});