"""Invoice Monitor — Main entry point and orchestrator.

Monitors two Gmail inboxes for freelancer invoices, extracts financial data
using the Anthropic API, validates the math, logs to Google Sheets, and sends
alerts when discrepancies are found.
"""

import os
import logging
from datetime import datetime
from apscheduler.schedulers.blocking import BlockingScheduler

# Configure logging before importing anything else
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("logs/invoice_monitor.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("invoice_monitor")

# Now import project modules (config validates env vars on import)
import config
from services.gmail_service import GmailService
from services.sheets_service import SheetsService
from services.extractor import extract_invoice_data
from services.validator import validate_invoice
from services.notifier import send_discrepancy_alerts
from parsers.email_body_parser import extract_email_body
from parsers.docx_parser import extract_docx_text
from parsers.excel_parser import extract_excel_text


# Initialize services
gmail = GmailService()
sheets = SheetsService()


def process_inbox(account: str, sheet_id: str) -> None:
    """Process all unread messages in a single inbox.

    Args:
        account: 'invoice' or 'kevin'
        sheet_id: Google Sheets ID for this inbox's spreadsheet.
    """
    logger.info(f"--- Processing inbox: {account} ---")

    messages = gmail.get_unread_messages(account)
    if not messages:
        return

    for message in messages:
        message_id = message["id"]
        subject = gmail.get_message_subject(message)

        try:
            logger.info(f"Processing message: {subject} (ID: {message_id})")

            # Step 1: Extract email body text
            body_text = extract_email_body(message.get("payload", {}))

            # Step 2: Download and parse attachments
            attachment_texts = []
            attachment_name = ""
            attachments = gmail.get_attachments(account, message)

            for att in attachments:
                filename = att["filename"]
                data = att["data"]
                ext = os.path.splitext(filename)[1].lower()

                if ext in (".docx", ".doc"):
                    parsed = extract_docx_text(data)
                elif ext in (".xlsx", ".xls"):
                    parsed = extract_excel_text(data)
                else:
                    logger.warning(f"Skipping unsupported attachment: {filename}")
                    continue

                if parsed and not parsed.startswith("[ERROR]"):
                    attachment_texts.append(parsed)
                    attachment_name = filename
                    logger.info(f"Parsed attachment: {filename}")
                elif parsed.startswith("[ERROR]"):
                    logger.warning(f"Failed to parse {filename}: {parsed}")

            # Step 3: Combine all text
            combined_text = body_text
            if attachment_texts:
                combined_text += "\n\n--- ATTACHMENT CONTENT ---\n\n"
                combined_text += "\n\n".join(attachment_texts)

            if not combined_text.strip():
                logger.warning(f"No text content found in message {message_id} — skipping")
                gmail.mark_as_read(account, message_id)
                continue

            # Step 4: Extract invoice data via Anthropic
            invoice = extract_invoice_data(
                raw_text=combined_text,
                source_email=config.INBOX_1_EMAIL if account == "invoice" else config.INBOX_2_EMAIL,
                attachment_name=attachment_name,
            )

            if not invoice:
                logger.info(f"No invoice data extracted from message {message_id} — skipping")
                gmail.mark_as_read(account, message_id)
                continue

            # Step 5: Validate the math
            invoice = validate_invoice(invoice)

            # Step 6: Append to Google Sheets
            sheets.append_invoice(invoice, sheet_id, message_id=message_id)

            # Step 7: Send notifications if discrepancy found
            if invoice.has_discrepancy:
                send_discrepancy_alerts(invoice, gmail, account, message)

            # Step 8: Mark as read
            gmail.mark_as_read(account, message_id)

            status = "DISCREPANCY" if invoice.has_discrepancy else "OK"
            logger.info(
                f"Completed: {invoice.freelancer_name} — ${invoice.stated_total:.2f} — {status}"
            )

        except Exception as e:
            logger.error(f"Error processing message {message_id}: {e}", exc_info=True)
            # Still mark as read to prevent infinite retry loops
            gmail.mark_as_read(account, message_id)


def run_monitoring_cycle() -> None:
    """Run one full monitoring cycle for both inboxes."""
    logger.info(f"=== Monitoring cycle started at {datetime.now().isoformat()} ===")

    # Ensure spreadsheets exist
    sheet_ids = sheets.ensure_spreadsheets_exist()

    # Process each inbox independently — failure in one doesn't stop the other
    for account in ["invoice", "kevin"]:
        try:
            sheet_id = sheet_ids.get(account, "")
            if not sheet_id:
                logger.error(f"No sheet ID for {account} — skipping")
                continue
            process_inbox(account, sheet_id)
        except Exception as e:
            logger.error(f"Error processing {account} inbox: {e}", exc_info=True)

    logger.info("=== Monitoring cycle complete ===\n")


def main():
    """Entry point — run one immediate cycle then start the scheduler."""
    logger.info("=" * 60)
    logger.info("  Invoice Monitor starting up")
    logger.info(f"  Inbox 1: {config.INBOX_1_EMAIL}")
    logger.info(f"  Inbox 2: {config.INBOX_2_EMAIL}")
    logger.info(f"  Poll interval: {config.POLL_INTERVAL_MINUTES} minutes")
    logger.info("=" * 60)

    # Run one immediate pass
    run_monitoring_cycle()

    # Start the scheduler
    scheduler = BlockingScheduler()
    scheduler.add_job(
        run_monitoring_cycle,
        "interval",
        minutes=config.POLL_INTERVAL_MINUTES,
    )

    logger.info(f"Scheduler started — polling every {config.POLL_INTERVAL_MINUTES} minutes")
    logger.info("Press Ctrl+C to stop\n")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Invoice Monitor shutting down")
        scheduler.shutdown()


if __name__ == "__main__":
    main()
