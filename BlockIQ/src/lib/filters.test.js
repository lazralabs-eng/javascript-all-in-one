import { describe, it, expect } from "vitest";
import { filterVehicles, REASON } from "./filters.js";

describe("filterVehicles", () => {
  const base = {
    make: "Nissan",
    miles: 20000,
    cr: 4.0,
    mmr: 18000,
    drive: "All-Wheel Drive",
    isAsIs: false,
  };

  it("returns empty stats for empty input", () => {
    const { survivors, eliminated, stats } = filterVehicles([], {
      brand: "all",
    });
    expect(survivors).toEqual([]);
    expect(eliminated).toEqual([]);
    expect(stats).toEqual({
      total: 0,
      survivorCount: 0,
      eliminatedCount: 0,
      avgMmr: null,
      avgBuyTarget: null,
    });
  });

  it("applies brand when not all", () => {
    const vs = [base, { ...base, make: "Honda" }];
    const { survivors, eliminated } = filterVehicles(vs, { brand: "Nissan" });
    expect(survivors).toHaveLength(1);
    expect(eliminated[0].reason).toBe(REASON.BRAND);
  });

  it("killFWD removes front wheel drive", () => {
    const fwd = { ...base, drive: "FWD" };
    const { survivors, eliminated } = filterVehicles([fwd, base], {
      killFWD: true,
    });
    expect(survivors).toEqual([base]);
    expect(eliminated.some((e) => e.reason === REASON.FWD)).toBe(true);
  });

  it("enforces maxMiles and MMR/CR bounds", () => {
    const lowCr = { ...base, cr: 2.0 };
    const { eliminated } = filterVehicles([lowCr], { minCR: 3, maxMiles: 50000 });
    expect(eliminated[0].reason).toBe(REASON.CR);
  });
});
