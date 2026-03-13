"""Extractor service — uses Anthropic API to extract structured invoice data from raw text."""

import json
import logging
from datetime import datetime

import anthropic

import config
from models.invoice import Invoice

logger = logging.getLogger("invoice_monitor")

SYSTEM_PROMPT = """You are an invoice data extraction assistant. Your job is to read raw text from emails and document attachments, then extract structured invoice data.

Extract the following fields:
- freelancer_name: The name of the person or company who sent the invoice
- invoice_number: The invoice number or reference (null if not found)
- invoice_date: The date on the invoice itself (null if not found)
- line_items: An array of objects, each with "description" (string) and "amount" (float). Extract every individual line item.
- stated_total: The grand total as written on the invoice (float)

Rules:
- Handle currency symbols ($, €, £, etc.) — strip them and return numeric values
- Handle commas in numbers (e.g., "1,250.00" → 1250.00)
- If a field genuinely cannot be found, return null for that field
- If you find NO financial data at all (e.g., the email is not an invoice), return {"no_invoice_found": true}
- Return ONLY valid JSON with no preamble, no explanation, no markdown formatting
- Do not wrap the response in code blocks

Response schema:
{
  "freelancer_name": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "string or null",
  "line_items": [
    {"description": "string", "amount": 123.45}
  ],
  "stated_total": 123.45
}"""


def extract_invoice_data(raw_text: str, source_email: str = "",
                         attachment_name: str = "") -> Invoice | None:
    """Send raw text to Claude and extract structured invoice data.

    Args:
        raw_text: Combined text from email body and/or attachments.
        source_email: Which inbox received this email.
        attachment_name: Name of the attachment file, if any.

    Returns:
        Partially populated Invoice object (validator fills calculated fields),
        or None if extraction fails or no invoice found.
    """
    if not raw_text or not raw_text.strip():
        logger.warning("Empty text passed to extractor — skipping")
        return None

    try:
        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Extract invoice data from the following text:\n\n{raw_text}",
                }
            ],
        )

        response_text = response.content[0].text.strip()

        # Parse the JSON response
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            logger.error(f"Claude returned invalid JSON: {response_text[:500]}")
            return None

        # Check for no-invoice-found response
        if data.get("no_invoice_found"):
            logger.info("No invoice data found in the provided text")
            return None

        # Build the Invoice object
        invoice = Invoice(
            freelancer_name=data.get("freelancer_name") or "",
            invoice_number=data.get("invoice_number") or "",
            invoice_date=data.get("invoice_date") or "",
            line_items=data.get("line_items") or [],
            stated_total=float(data.get("stated_total") or 0.0),
            date_processed=datetime.now().strftime("%m/%d/%Y"),
            source_email=source_email,
            attachment_name=attachment_name,
            raw_text=raw_text,
        )

        logger.info(
            f"Extracted invoice from {invoice.freelancer_name}: "
            f"${invoice.stated_total:.2f}, {len(invoice.line_items)} line items"
        )
        return invoice

    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error in extractor: {e}")
        return None
