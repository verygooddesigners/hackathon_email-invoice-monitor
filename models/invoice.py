"""Invoice dataclass — the standard data structure used across all services."""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Invoice:
    """Represents a single extracted invoice with validation results."""

    freelancer_name: str = ""
    invoice_number: str = ""
    invoice_date: str = ""
    line_items: list[dict] = field(default_factory=list)
    stated_total: float = 0.0
    calculated_total: float = 0.0
    has_discrepancy: bool = False
    discrepancy_amount: float = 0.0
    date_processed: str = field(default_factory=lambda: datetime.now().strftime("%m/%d/%Y"))
    source_email: str = ""
    attachment_name: str = ""
    raw_text: str = ""

    def to_sheet_row(self) -> list:
        """Return a list of values matching the spreadsheet column order.

        Columns: Date Processed, Freelancer Name, Invoice Number, Invoice Date,
                 Line Items (JSON), Stated Total, Calculated Total, Discrepancy,
                 Discrepancy Amount, Source Email, Attachment Name
        """
        line_items_summary = "\n".join(
            f"{item.get('description', 'N/A')}: ${item.get('amount', 0):.2f}"
            for item in self.line_items
        ) if self.line_items else "No line items"

        return [
            self.date_processed,
            self.freelancer_name,
            self.invoice_number,
            self.invoice_date,
            line_items_summary,
            f"${self.stated_total:.2f}",
            f"${self.calculated_total:.2f}",
            "YES" if self.has_discrepancy else "NO",
            f"${self.discrepancy_amount:.2f}" if self.has_discrepancy else "",
            self.source_email,
            self.attachment_name,
        ]
