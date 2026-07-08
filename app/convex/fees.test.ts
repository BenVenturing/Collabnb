// ═══════════════════════════════════════════════════════════════════════════════
// Fee calculation unit tests
// ═══════════════════════════════════════════════════════════════════════════════
//
// Run with: npx tsx fees.test.ts
// Or if using vitest: npx vitest run fees.test.ts

import { describe, it, expect } from "vitest";
import { computeFee } from "./fees";

describe("computeFee", () => {
  // ── Normal cases ─────────────────────────────────────────────────────────────
  it("$100 cash → $20 flat fee", () => {
    const result = computeFee({ cashValue: 100 });
    expect(result.fee).toBe(20);
    expect(result.method).toBe("flat");
    expect(result.basis).toBe(100);
  });

  it("$499 cash → $20 flat fee (under $500 threshold)", () => {
    const result = computeFee({ cashValue: 499 });
    expect(result.fee).toBe(20);
    expect(result.method).toBe("flat");
    expect(result.basis).toBe(499);
  });

  it("$500 cash → $25 (5% of $500)", () => {
    const result = computeFee({ cashValue: 500 });
    expect(result.fee).toBe(25);
    expect(result.method).toBe("percent");
    expect(result.basis).toBe(500);
  });

  it("$2,000 cash → $100 (5% of $2,000)", () => {
    const result = computeFee({ cashValue: 2000 });
    expect(result.fee).toBe(100);
    expect(result.method).toBe("percent");
    expect(result.basis).toBe(2000);
  });

  // ── Founding hosts ───────────────────────────────────────────────────────────
  it("Founding host → $0 waived", () => {
    const result = computeFee({ cashValue: 2000, isFoundingHost: true });
    expect(result.fee).toBe(0);
    expect(result.method).toBe("waived");
    expect(result.basis).toBe(2000);
  });

  it("Founding host, $100 → $0 waived (flat case overridden)", () => {
    const result = computeFee({ cashValue: 100, isFoundingHost: true });
    expect(result.fee).toBe(0);
    expect(result.method).toBe("waived");
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────
  it("$0 cash → $20 flat fee (minimum charge)", () => {
    const result = computeFee({ cashValue: 0 });
    expect(result.fee).toBe(20);
    expect(result.method).toBe("flat");
  });

  it("Negative cash → treated as $0", () => {
    const result = computeFee({ cashValue: -100 });
    expect(result.fee).toBe(20);
    expect(result.method).toBe("flat");
    expect(result.basis).toBe(0);
  });

  it("$499.99 → rounds to $499.99, $20 flat", () => {
    const result = computeFee({ cashValue: 499.99 });
    expect(result.fee).toBe(20);
    expect(result.method).toBe("flat");
  });

  it("$500.01 → $25.00 (5%)", () => {
    const result = computeFee({ cashValue: 500.01 });
    expect(result.fee).toBe(25.0);
    expect(result.method).toBe("percent");
  });

  it("$1,234.56 → $61.73 (5%, rounded)", () => {
    const result = computeFee({ cashValue: 1234.56 });
    expect(result.fee).toBe(61.73);
    expect(result.method).toBe("percent");
  });

  it("$10,000 cash → $500 (5% of $10,000)", () => {
    const result = computeFee({ cashValue: 10000 });
    expect(result.fee).toBe(500);
    expect(result.method).toBe("percent");
  });
});
