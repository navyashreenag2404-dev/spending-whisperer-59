import { describe, it, expect } from "vitest";
import { analyze, parseCSV, DEFAULT_CATEGORIES, normalizeMerchant } from "@/lib/engine";
import { SAMPLE_CSV } from "@/lib/sample";

const txns = parseCSV(SAMPLE_CSV);

describe("engine", () => {
  it("normalizes merchant variants", () => {
    expect(normalizeMerchant("AMZN Mktp IN*2K3JD8")).toContain("amazon");
    expect(normalizeMerchant("Amazon.in Order 40-9921")).toContain("amazon");
  });
  it("flags unknown as uncategorized", () => {
    const r = analyze(txns, DEFAULT_CATEGORIES, {}, {});
    expect(r.find((x) => x.description.includes("RAMESH"))!.category).toBe("Uncategorized");
  });
  it("detects recurring netflix and unusual flipkart", () => {
    const r = analyze(txns, DEFAULT_CATEGORIES, {}, {});
    expect(r.find((x) => x.description.includes("NETFLIX"))!.recurring).toBe(true);
    expect(r.filter((x) => x.unusual).length).toBeGreaterThan(0);
  });
  it("learns from corrections by merchant", () => {
    const m = normalizeMerchant("POS 4471 SRI LAKSHMI TRADERS");
    const r = analyze(txns, DEFAULT_CATEGORIES, { [m]: "Groceries" }, {});
    expect(r.find((x) => x.merchant === m)!.category).toBe("Groceries");
  });
});
