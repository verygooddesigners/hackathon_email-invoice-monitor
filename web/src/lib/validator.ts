/**
 * Validator — sums line items and compares to stated total.
 */
import { ExtractedInvoice } from "./extractor";

export interface ValidatedInvoice extends ExtractedInvoice {
  calculated_total: number;
  has_discrepancy: boolean;
  discrepancy_amount: number;
}

export function validateInvoice(invoice: ExtractedInvoice): ValidatedInvoice {
  const calculated = invoice.line_items.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  const calcRounded = Math.round(calculated * 100) / 100;
  const statedRounded = Math.round(invoice.stated_total * 100) / 100;

  let hasDiscrepancy = false;
  let discrepancyAmount = 0;

  if (statedRounded === 0 && invoice.line_items.length === 0) {
    // No data to validate
  } else if (statedRounded === 0 && invoice.line_items.length > 0) {
    // Can't validate without stated total
  } else if (calcRounded !== statedRounded) {
    hasDiscrepancy = true;
    discrepancyAmount = Math.round(Math.abs(calcRounded - statedRounded) * 100) / 100;
  }

  return {
    ...invoice,
    calculated_total: calcRounded,
    has_discrepancy: hasDiscrepancy,
    discrepancy_amount: discrepancyAmount,
  };
}
