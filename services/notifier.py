"""Notifier service — sends alert emails when invoice discrepancies are found."""

import logging
from models.invoice import Invoice

logger = logging.getLogger("invoice_monitor")


def send_discrepancy_alerts(invoice: Invoice, gmail_service, account: str,
                            message: dict) -> None:
    """Send internal alert and freelancer reply when a discrepancy is detected.

    Args:
        invoice: Validated Invoice with has_discrepancy=True.
        gmail_service: Authenticated GmailService instance.
        account: 'invoice' or 'kevin'.
        message: Original Gmail message object (for threading).
    """
    if not invoice.has_discrepancy:
        return

    try:
        _send_internal_alert(invoice, gmail_service, account, message)
    except Exception as e:
        logger.error(f"Failed to send internal alert: {e}")

    try:
        _send_freelancer_reply(invoice, gmail_service, account, message)
    except Exception as e:
        logger.error(f"Failed to send freelancer reply: {e}")


def _send_internal_alert(invoice: Invoice, gmail_service, account: str,
                         message: dict) -> None:
    """Send an internal alert email to the inbox that received the invoice."""
    from services.gmail_service import ACCOUNTS

    inbox_email = ACCOUNTS[account]["email"]
    original_subject = gmail_service.get_message_subject(message)

    line_items_text = "\n".join(
        f"  - {item.get('description', 'N/A')}: ${item.get('amount', 0):.2f}"
        for item in invoice.line_items
    )

    body = f"""Invoice Discrepancy Alert

Freelancer: {invoice.freelancer_name}
Invoice Number: {invoice.invoice_number or 'N/A'}
Invoice Date: {invoice.invoice_date or 'N/A'}

Stated Total: ${invoice.stated_total:.2f}
Calculated Total: ${invoice.calculated_total:.2f}
Discrepancy Amount: ${invoice.discrepancy_amount:.2f}

Line Items:
{line_items_text}

Original Email Subject: {original_subject}
Source Inbox: {inbox_email}

This is an automated alert from Invoice Monitor.
"""

    subject = f"\u26a0\ufe0f Invoice Discrepancy Detected \u2014 {invoice.freelancer_name}"

    gmail_service.send_email(
        account=account,
        to=inbox_email,
        subject=subject,
        body=body,
    )

    logger.info(f"Internal alert sent to {inbox_email} for {invoice.freelancer_name}")


def _send_freelancer_reply(invoice: Invoice, gmail_service, account: str,
                           message: dict) -> None:
    """Send a reply to the freelancer flagging the math discrepancy."""
    sender_email = gmail_service.get_sender_email(message)
    if not sender_email:
        logger.warning("Could not determine sender email — skipping freelancer reply")
        return

    original_subject = gmail_service.get_message_subject(message)
    thread_id = message.get("threadId")

    line_items_text = "\n".join(
        f"  - {item.get('description', 'N/A')}: ${item.get('amount', 0):.2f}"
        for item in invoice.line_items
    )

    body = f"""Hi {invoice.freelancer_name},

Thank you for your invoice. During our review, we noticed a discrepancy in the math:

  Stated Total: ${invoice.stated_total:.2f}
  Our Calculated Total (sum of line items): ${invoice.calculated_total:.2f}
  Difference: ${invoice.discrepancy_amount:.2f}

Here are the line items as we read them:
{line_items_text}

Could you please review and resubmit a corrected invoice? If we've misread something, just let us know and we'll take another look.

Thank you,
Invoice Monitor
"""

    subject = f"Re: {original_subject}"

    gmail_service.send_email(
        account=account,
        to=sender_email,
        subject=subject,
        body=body,
        thread_id=thread_id,
    )

    logger.info(f"Freelancer reply sent to {sender_email} for {invoice.freelancer_name}")
