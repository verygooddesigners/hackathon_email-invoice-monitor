"""Validator service — checks invoice math by comparing line item sum to stated total."""

import logging
from models.invoice import Invoice

logger = logging.getLogger("invoice_monitor")


def validate_invoice(invoice: Invoice) -> Invoice:
    """Validate invoice math and flag discrepancies.

    Sums all line item amounts and compares to the stated total.
    Updates the invoice with calculated_total, has_discrepancy, and discrepancy_amount.

    Args:
        invoice: Partially populated Invoice (needs line_items and stated_total).

    Returns:
        Updated Invoice with validation fields populated.
    """
    try:
        # Sum all line item amounts
        if invoice.line_items:
            calculated = sum(
                float(item.get("amount", 0))
                for item in invoice.line_items
            )
        else:
            calculated = 0.0

        # Round to 2 decimal places to avoid floating-point comparison issues
        invoice.calculated_total = round(calculated, 2)
        stated = round(invoice.stated_total, 2)

        # Handle case where stated_total is missing/null
        if invoice.stated_total == 0.0 and not invoice.line_items:
            invoice.has_discrepancy = False
            invoice.discrepancy_amount = 0.0
            logger.warning(
                f"Invoice from {invoice.freelancer_name}: no line items and no stated total"
            )
            return invoice

        if invoice.stated_total == 0.0 and invoice.line_items:
            # Cannot validate without a stated total
            invoice.has_discrepancy = False
            invoice.discrepancy_amount = 0.0
            logger.warning(
                f"Invoice from {invoice.freelancer_name}: "
                f"has line items but no stated total — cannot validate"
            )
            return invoice

        # Compare
        if invoice.calculated_total != stated:
            invoice.has_discrepancy = True
            invoice.discrepancy_amount = round(abs(invoice.calculated_total - stated), 2)
            logger.warning(
                f"DISCREPANCY found for {invoice.freelancer_name}: "
                f"stated ${stated:.2f} vs calculated ${invoice.calculated_total:.2f} "
                f"(difference: ${invoice.discrepancy_amount:.2f})"
            )
        else:
            invoice.has_discrepancy = False
            invoice.discrepancy_amount = 0.0
            logger.info(
                f"Invoice from {invoice.freelancer_name} validated OK: ${stated:.2f}"
            )

        return invoice

    except Exception as e:
        logger.error(f"Error validating invoice from {invoice.freelancer_name}: {e}")
        invoice.has_discrepancy = False
        invoice.discrepancy_amount = 0.0
        return invoice
