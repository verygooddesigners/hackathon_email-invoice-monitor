"""Google Sheets service — creates spreadsheets and appends invoice rows."""

import os
import logging
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

import config
from models.invoice import Invoice

logger = logging.getLogger("invoice_monitor")

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

HEADERS = [
    "Date Processed",
    "Freelancer Name",
    "Invoice Number",
    "Invoice Date",
    "Line Items (JSON)",
    "Stated Total",
    "Calculated Total",
    "Discrepancy",
    "Discrepancy Amount",
    "Source Email",
    "Attachment Name",
]

# Track processed message IDs to prevent duplicates
_processed_message_ids: set = set()


class SheetsService:
    """Manages Google Sheets API connection, spreadsheet creation, and row appending."""

    def __init__(self):
        self._service = None

    def _get_service(self):
        """Get or create an authenticated Sheets API service."""
        if self._service:
            return self._service

        token_path = "token/token-sheets.json"
        creds = None

        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                logger.info("Starting OAuth flow for Google Sheets")
                print("\n>>> Please authenticate for Google Sheets access <<<\n")
                flow = InstalledAppFlow.from_client_secrets_file(
                    config.GOOGLE_CREDENTIALS_PATH, SCOPES
                )
                creds = flow.run_local_server(port=0)

            os.makedirs(os.path.dirname(token_path), exist_ok=True)
            with open(token_path, "w") as f:
                f.write(creds.to_json())

        self._service = build("sheets", "v4", credentials=creds)
        return self._service

    def ensure_spreadsheets_exist(self) -> dict:
        """Check if spreadsheets exist and create them if needed.

        Returns:
            Dict mapping account names to sheet IDs.
        """
        sheet_ids = {
            "invoice": config.SHEET_ID_INVOICE,
            "kevin": config.SHEET_ID_KEVIN,
        }

        for account, sheet_id in sheet_ids.items():
            if not sheet_id:
                new_id = self._create_spreadsheet(account)
                sheet_ids[account] = new_id

        return sheet_ids

    def _create_spreadsheet(self, account: str) -> str:
        """Create a new spreadsheet for the given account.

        Args:
            account: 'invoice' or 'kevin'

        Returns:
            The new spreadsheet ID.
        """
        try:
            service = self._get_service()
            email = config.INBOX_1_EMAIL if account == "invoice" else config.INBOX_2_EMAIL

            spreadsheet = service.spreadsheets().create(
                body={
                    "properties": {"title": f"Invoice Monitor — {email}"},
                    "sheets": [{"properties": {"title": "Invoices"}}],
                }
            ).execute()

            sheet_id = spreadsheet["spreadsheetId"]
            internal_sheet_id = spreadsheet["sheets"][0]["properties"]["sheetId"]

            # Add headers
            service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range="Invoices!A1",
                valueInputOption="USER_ENTERED",
                body={"values": [HEADERS]},
            ).execute()

            # Freeze header row
            service.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id,
                body={
                    "requests": [
                        {
                            "updateSheetProperties": {
                                "properties": {
                                    "sheetId": internal_sheet_id,
                                    "gridProperties": {"frozenRowCount": 1},
                                },
                                "fields": "gridProperties.frozenRowCount",
                            }
                        },
                        # Bold the header row
                        {
                            "repeatCell": {
                                "range": {
                                    "sheetId": internal_sheet_id,
                                    "startRowIndex": 0,
                                    "endRowIndex": 1,
                                },
                                "cell": {
                                    "userEnteredFormat": {
                                        "textFormat": {"bold": True}
                                    }
                                },
                                "fields": "userEnteredFormat.textFormat.bold",
                            }
                        },
                        # Conditional formatting: red background for Discrepancy = YES
                        {
                            "addConditionalFormatRule": {
                                "rule": {
                                    "ranges": [
                                        {
                                            "sheetId": internal_sheet_id,
                                            "startColumnIndex": 7,  # Column H
                                            "endColumnIndex": 8,
                                            "startRowIndex": 1,
                                        }
                                    ],
                                    "booleanRule": {
                                        "condition": {
                                            "type": "TEXT_EQ",
                                            "values": [{"userEnteredValue": "YES"}],
                                        },
                                        "format": {
                                            "backgroundColor": {
                                                "red": 0.92,
                                                "green": 0.3,
                                                "blue": 0.3,
                                            },
                                            "textFormat": {
                                                "bold": True,
                                                "foregroundColor": {
                                                    "red": 1.0,
                                                    "green": 1.0,
                                                    "blue": 1.0,
                                                },
                                            },
                                        },
                                    },
                                },
                                "index": 0,
                            }
                        },
                    ]
                },
            ).execute()

            env_var = "SHEET_ID_INVOICE" if account == "invoice" else "SHEET_ID_KEVIN"
            print(f"\n{'='*60}")
            print(f"  NEW SPREADSHEET CREATED for {email}")
            print(f"  Sheet ID: {sheet_id}")
            print(f"  Add this to your .env file:")
            print(f"  {env_var}={sheet_id}")
            print(f"{'='*60}\n")

            logger.info(f"Created spreadsheet for {email}: {sheet_id}")
            return sheet_id

        except Exception as e:
            logger.error(f"Error creating spreadsheet for {account}: {e}")
            raise

    def append_invoice(self, invoice: Invoice, sheet_id: str,
                       message_id: str = None) -> bool:
        """Append an invoice row to the specified spreadsheet.

        Args:
            invoice: Validated Invoice object.
            sheet_id: Google Sheets spreadsheet ID.
            message_id: Gmail message ID for deduplication.

        Returns:
            True if row was appended, False if skipped (duplicate) or error.
        """
        # Deduplication check
        if message_id and message_id in _processed_message_ids:
            logger.info(f"Skipping duplicate message {message_id}")
            return False

        try:
            service = self._get_service()
            row = invoice.to_sheet_row()

            service.spreadsheets().values().append(
                spreadsheetId=sheet_id,
                range="Invoices!A:K",
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body={"values": [row]},
            ).execute()

            if message_id:
                _processed_message_ids.add(message_id)

            logger.info(
                f"Appended invoice row for {invoice.freelancer_name} to sheet {sheet_id}"
            )
            return True

        except Exception as e:
            logger.error(f"Error appending invoice to sheet: {e}")
            return False
