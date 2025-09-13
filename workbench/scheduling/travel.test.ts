import { describe, it, expect } from "vitest";
import { getTravelAwareSlots } from "~/server/services/scheduling/travel";

describe("travel-aware slots", () => {
  it("same neighborhood → small buffer, high confidence", () => {
    const out = getTravelAwareSlots({
      org_id: "550e8400-e29b-41d4-a716-446655440000",
      day: "2025-09-15",
      job_duration_minutes: 60,
      risk: "low",
      base_lat: 52.3702, base_lng: 4.8952,     // Amsterdam
      target_lat: 52.3720, target_lng: 4.9000, // close by
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]!.buffer_minutes).toBeLessThanOrEqual(20);
    expect(out[0]!.confidence).toBeGreaterThan(0.7);
  });

  it("cross-town → larger buffer, lower confidence", () => {
    const out = getTravelAwareSlots({
      org_id: "550e8400-e29b-41d4-a716-446655440000",
      day: "2025-09-15",
      job_duration_minutes: 90,
      risk: "high",
      base_lat: 52.3702, base_lng: 4.8952,   // Amsterdam center
      target_lat: 52.315,  target_lng: 4.95, // Zuid-Oost-ish
    });
    expect(out[0]!.buffer_minutes).toBeGreaterThan(25);
    expect(out[0]!.confidence).toBeLessThan(0.8);
  });

  it("returns multiple slot candidates with different times", () => {
    const out = getTravelAwareSlots({
      org_id: "550e8400-e29b-41d4-a716-446655440000",
      day: "2025-09-15",
      job_duration_minutes: 45,
      risk: "med",
      base_lat: 52.3702, base_lng: 4.8952,
      target_lat: 52.3800, target_lng: 4.9100,
    });
    expect(out.length).toBeGreaterThanOrEqual(3);
    // Check that slots have different start times
    const startTimes = out.map(s => s.start);
    const uniqueStartTimes = new Set(startTimes);
    expect(uniqueStartTimes.size).toBe(startTimes.length);
  });

  it("handles missing origin location with reduced confidence", () => {
    const out = getTravelAwareSlots({
      org_id: "550e8400-e29b-41d4-a716-446655440000",
      day: "2025-09-15",
      job_duration_minutes: 60,
      risk: "med",
      // No base_lat/lng or last_job_lat/lng provided
      target_lat: 52.3720, target_lng: 4.9000,
    });
    expect(out.length).toBeGreaterThan(0);
    // Should have lower confidence due to unknown origin
    expect(out[0]!.confidence).toBeLessThanOrEqual(0.8);
    expect(out[0]!.reason).toContain("origin=unknown");
  });

  it("respects maximum buffer minutes constraint", () => {
    const out = getTravelAwareSlots({
      org_id: "550e8400-e29b-41d4-a716-446655440000",
      day: "2025-09-15",
      job_duration_minutes: 120,
      risk: "high",
      base_lat: 52.3702, base_lng: 4.8952,    // Amsterdam
      target_lat: 51.9244, target_lng: 4.4777, // Rotterdam (far)
    });
    // Even for long distances, buffer should not exceed MAX_BUFFER_MINUTES (45)
    for (const slot of out) {
      expect(slot.buffer_minutes).toBeLessThanOrEqual(45);
    }
  });

  it("filters out slots that exceed work hours", () => {
    const out = getTravelAwareSlots({
      org_id: "550e8400-e29b-41d4-a716-446655440000",
      day: "2025-09-15",
      job_duration_minutes: 300, // 5 hours
      risk: "med",
      base_lat: 52.3702, base_lng: 4.8952,
      target_lat: 52.3720, target_lng: 4.9000,
    });
    // Late afternoon slots should be filtered out due to work hour constraint
    expect(out.length).toBeLessThan(4);
    // All remaining slots should end before 17:00
    for (const slot of out) {
      const endTime = new Date(slot.end);
      expect(endTime.getHours()).toBeLessThanOrEqual(17);
    }
  });
});