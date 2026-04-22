const BRAND_ALL = "all";

/**
 * @typedef {object} Filters
 * @property {string} [brand] Tab: brand name, or "all" / empty = no filter
 * @property {number} [maxMiles] Max odometer
 * @property {number} [minCR] Minimum condition report score
 * @property {number} [minMMR] Minimum MMR
 * @property {number} [maxMMR] Maximum MMR
 * @property {boolean} [killFWD] When true, drop FWD
 * @property {boolean} [killAsIs] When true, drop as-is
 */

/**
 * @typedef {object} Vehicle
 * @property {string} [make]
 * @property {string} [brand]
 * @property {number} [miles]
 * @property {number} [odometer]
 * @property {number} [mmr]
 * @property {number} [mmrValue]
 * @property {number} [cr]
 * @property {string} [drive]
 * @property {number} [buyTarget]
 * @property {boolean} [isAsIs]
 * @property {string[]} [announcements]
 */

const REASON = {
  BRAND: "brand",
  FWD: "fwd",
  MILES: "miles",
  CR: "cr",
  MMR_MIN: "mmr_min",
  MMR_MAX: "mmr_max",
  AS_IS: "as_is",
};

/**
 * @param {unknown} v
 * @returns {string}
 */
function strBrand(v) {
  if (v == null || typeof v !== "object") return "";
  const b = "brand" in v ? v.brand : "make" in v ? v.make : "";
  return String(b).trim();
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function numMiles(v) {
  if (v == null || typeof v !== "object") return null;
  const m =
    "miles" in v
      ? v.miles
      : "odometer" in v
        ? v.odometer
        : "mileage" in v
          ? v.mileage
          : null;
  if (m == null) return null;
  const n = Number(m);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function numCR(v) {
  if (v == null || typeof v !== "object") return null;
  const c =
    "cr" in v
      ? v.cr
      : "conditionReportScore" in v
        ? v.conditionReportScore
        : "conditionReport" in v
          ? v.conditionReport
          : null;
  if (c == null) return null;
  const n = Number(c);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function numMMR(v) {
  if (v == null || typeof v !== "object") return null;
  const m = "mmr" in v ? v.mmr : "mmrValue" in v ? v.mmrValue : null;
  if (m == null) return null;
  const n = Number(m);
  return Number.isFinite(n) ? n : null;
}

/**
 * NHTSA / listing drive text — used when killFWD is on (documented pipeline: drop FWD before MMR work).
 * Unknown / non-string does not count as FWD.
 * @param {unknown} v
 * @returns {string}
 */
function strDrive(v) {
  if (v == null || typeof v !== "object") return "";
  const d = "drive" in v
    ? v.drive
    : "drivetrain" in v
      ? v.drivetrain
      : "driveType" in v
        ? v.driveType
        : "";
  return d == null ? "" : String(d);
}

/**
 * @param {string} drive
 * @returns {boolean}
 */
function isFwdDrive(drive) {
  const t = drive.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (/\b(awd|all[- ]wheel|4wd|4x4|four|quattro|4matic)\b/.test(t)) {
    return false;
  }
  if (/\b(rwd|rear)\b/.test(t)) return false;
  if (t === "fwd" || t.includes("front-wheel") || t.includes("front wheel")) {
    return true;
  }
  if (/\b(fwd|f\/?wd)\b/.test(t)) return true;
  if (/\b(4x2|2wd)\b/.test(t)) return true;
  return false;
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
function vehicleIsAsIs(v) {
  if (v == null || typeof v !== "object") return false;
  if (v.isAsIs === true || v.asIs === true) return true;
  if (v.asis === true) return true;
  if (typeof v.saleType === "string" && v.saleType.toLowerCase().includes("as is")) {
    return true;
  }
  if (Array.isArray(v.announcements)) {
    return v.announcements.some(
      (a) =>
        String(a)
          .toLowerCase()
          .includes("as is") || String(a).toLowerCase() === "as-is",
    );
  }
  return false;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function sameBrand(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * @param {Filters} filters
 * @param {Vehicle} vehicle
 * @returns {{ pass: true } | { pass: false, reason: string }}
 */
function applyFilters(filters, vehicle) {
  const brand = typeof filters.brand === "string" ? filters.brand.trim() : "";
  if (brand && brand.toLowerCase() !== BRAND_ALL) {
    const vb = strBrand(vehicle);
    if (!vb || !sameBrand(vb, brand)) {
      return { pass: false, reason: REASON.BRAND };
    }
  }

  if (filters.killFWD === true) {
    if (isFwdDrive(strDrive(vehicle))) {
      return { pass: false, reason: REASON.FWD };
    }
  }

  if (typeof filters.maxMiles === "number" && Number.isFinite(filters.maxMiles)) {
    const miles = numMiles(vehicle);
    if (miles == null || miles > filters.maxMiles) {
      return { pass: false, reason: REASON.MILES };
    }
  }

  if (typeof filters.minCR === "number" && Number.isFinite(filters.minCR)) {
    const cr = numCR(vehicle);
    if (cr == null || cr < filters.minCR) {
      return { pass: false, reason: REASON.CR };
    }
  }

  if (typeof filters.minMMR === "number" && Number.isFinite(filters.minMMR)) {
    const mmr = numMMR(vehicle);
    if (mmr == null || mmr < filters.minMMR) {
      return { pass: false, reason: REASON.MMR_MIN };
    }
  }

  if (typeof filters.maxMMR === "number" && Number.isFinite(filters.maxMMR)) {
    const mmr = numMMR(vehicle);
    if (mmr == null || mmr > filters.maxMMR) {
      return { pass: false, reason: REASON.MMR_MAX };
    }
  }

  if (filters.killAsIs === true && vehicleIsAsIs(vehicle)) {
    return { pass: false, reason: REASON.AS_IS };
  }

  return { pass: true };
}

/**
 * @typedef {object} Eliminated
 * @property {Vehicle} vehicle
 * @property {string} reason
 */

/**
 * @typedef {object} Stats
 * @property {number} total
 * @property {number} survivorCount
 * @property {number} eliminatedCount
 * @property {number | null} avgMmr
 * @property {number | null} avgBuyTarget
 */

/**
 * @typedef {object} FilterResult
 * @property {Vehicle[]} survivors
 * @property {Eliminated[]} eliminated
 * @property {Stats} stats
 */

/**
 * @param {Vehicle[]} vehicles
 * @param {Filters} filters
 * @returns {FilterResult}
 */
export function filterVehicles(vehicles, filters) {
  const list = Array.isArray(vehicles) ? vehicles : [];
  const survivors = [];
  const eliminated = [];

  for (const vehicle of list) {
    const result = applyFilters(filters, vehicle);
    if (result.pass) {
      survivors.push(vehicle);
    } else {
      eliminated.push({ vehicle, reason: result.reason });
    }
  }

  const n = list.length;
  const sumMmr = survivors.reduce(
    (acc, v) => {
      const m = numMMR(v);
      if (m != null) return { sum: acc.sum + m, c: acc.c + 1 };
      return acc;
    },
    { sum: 0, c: 0 },
  );
  const sumBuy = survivors.reduce(
    (acc, v) => {
      if (v == null || typeof v !== "object" || !("buyTarget" in v)) {
        return acc;
      }
      const bt = Number(v.buyTarget);
      if (!Number.isFinite(bt)) return acc;
      return { sum: acc.sum + bt, c: acc.c + 1 };
    },
    { sum: 0, c: 0 },
  );

  const stats = {
    total: n,
    survivorCount: survivors.length,
    eliminatedCount: eliminated.length,
    avgMmr: sumMmr.c > 0 ? sumMmr.sum / sumMmr.c : null,
    avgBuyTarget: sumBuy.c > 0 ? sumBuy.sum / sumBuy.c : null,
  };

  return { survivors, eliminated, stats };
}

export { REASON };
