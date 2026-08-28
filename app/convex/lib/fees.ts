// ═══════════════════════════════════════════════════════════════════════════════
// Fee calculation — one pure, testable function
// ═══════════════════════════════════════════════════════════════════════════════
// Lives under convex/lib/ (alongside compensationPoints.ts) so both the Convex
// backend and the Vite frontend can import it directly — see ContractBuilder.jsx
// and ListingDraftContext.jsx, which previously each hardcoded their own copy
// of these thresholds and drifted out of sync with the real charge amount.

export interface FeeInput {
  /** Cash-only contract value (e.g., $300 cash from a $300 cash + $400 stay hybrid) */
  cashValue: number;
  /** Whether the host is a Founding Member (fees waived for life) */
  isFoundingHost?: boolean;
}

export interface FeeResult {
  fee: number;
  basis: number;          // the cashValue used for calculation
  method: 'flat' | 'percent' | 'waived';
  contractValue: number;  // same as cashValue
}

/**
 * Pure fee calculation. Single source of truth — change thresholds here and
 * every caller (charges, invoices, billing display) picks them up.
 *
 * Rules:
 * - Founding hosts → $0 waived (no fee ever)
 * - Under $500 cash value → $20 flat fee
 * - $500+ cash value → 5% of cash value (replaces flat fee; never both)
 * - Hybrid collabs: stay value is excluded (cash-only basis)
 *
 * Tests: see fees.test.ts
 */
export function computeFee(input: FeeInput): FeeResult {
  const { cashValue, isFoundingHost } = input;
  const safeCash = Math.max(0, Math.round(cashValue * 100) / 100); // round to cents

  if (isFoundingHost) {
    return { fee: 0, basis: safeCash, method: 'waived', contractValue: safeCash };
  }

  if (safeCash < 500) {
    return { fee: 20, basis: safeCash, method: 'flat', contractValue: safeCash };
  }

  // 5% of cash value
  const fee = Math.round(safeCash * 0.05 * 100) / 100;
  return { fee, basis: safeCash, method: 'percent', contractValue: safeCash };
}
