# RotoMath

A Python service that monitors two Gmail inboxes for freelancer invoices, extracts financial data using the Anthropic API (Claude), validates the math, logs everything to Google Sheets, and sends alerts when discrepancies are found.

## How It Works

1. Polls two Gmail inboxes for new (unread) emails
2. Extracts text from email bodies and attachments (Word, Excel)
3. Sends the text to Claude to extract structured invoice data
4. Validates math — sums line items and compares to the stated total
5. Logs every invoice to a dedicated Google Sheet per inbox
6. If a discrepancy is found: sends an internal alert and replies to the freelancer

## Prerequisites

- Python 3.11+
- A Google Cloud project with Gmail API and Google Sheets API enabled
- An Anthropic API key
- Access to both monitored Gmail accounts

## Setup

### 1. Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Gmail API** and **Google Sheets API**
4. Go to **APIs & Services → Credentials**
5. Create an **OAuth 2.0 Client ID** (Application type: Desktop App)
6. Download the JSON credentials file
7. Save it as `credentials/google-credentials.json` in this project

### 2. OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services → OAuth consent screen**
2. Add both email addresses as **test users**:
   - `invoice@rotowire.com`
   - `kevin@rotowire.com`
3. (Or publish the app if you prefer — test user mode is fine for internal tools)

### 3. Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your values:
   ```
   ANTHROPIC_API_KEY=your_key_here
   GOOGLE_CREDENTIALS_PATH=credentials/google-credentials.json
   INBOX_1_EMAIL=invoice@rotowire.com
   INBOX_2_EMAIL=kevin@rotowire.com
   POLL_INTERVAL_MINUTES=5
   ```

3. Leave `SHEET_ID_INVOICE` and `SHEET_ID_KEVIN` empty — they'll be created on first run.

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. First Run

```bash
python main.py
```

On first run, the service will:

1. Open a browser window for **each Gmail account** to complete the OAuth flow. Authenticate with the correct account each time.
2. Create a **Google Sheet** for each inbox and print the Sheet IDs to the console.
3. **Copy those Sheet IDs** into your `.env` file (`SHEET_ID_INVOICE` and `SHEET_ID_KEVIN`).
4. Restart the service.

After the first run, tokens are stored locally in `token/` and the service runs unattended.

## Daily Operation

Once configured, just run:

```bash
python main.py
```

The service will:
- Run one immediate check on startup
- Then poll every 5 minutes (configurable via `POLL_INTERVAL_MINUTES`)
- Log all activity to `logs/invoice_monitor.log` and the console
- Press `Ctrl+C` to stop

## Spreadsheet Columns

| Column | Field | Notes |
|--------|-------|-------|
| A | Date Processed | MM/DD/YYYY |
| B | Freelancer Name | Extracted by Claude |
| C | Invoice Number | If present |
| D | Invoice Date | Date on invoice |
| E | Line Items | Readable summary |
| F | Stated Total | Grand total as written |
| G | Calculated Total | Sum of line items |
| H | Discrepancy | YES (red) / NO |
| I | Discrepancy Amount | Dollar difference |
| J | Source Email | Which inbox |
| K | Attachment Name | Filename if any |

## Project Structure

```
invoice-monitor/
├── main.py                  # Entry point — scheduler and pipeline
├── config.py                # Environment variable loader
├── requirements.txt         # Python dependencies
├── .env.example             # Template for secrets
├── credentials/             # OAuth credentials (not committed)
├── token/                   # Stored OAuth tokens (auto-generated)
├── services/
│   ├── gmail_service.py     # Gmail API integration
│   ├── sheets_service.py    # Google Sheets API integration
│   ├── extractor.py         # Anthropic API for data extraction
│   ├── validator.py         # Math validation
│   └── notifier.py          # Discrepancy alert emails
├── parsers/
│   ├── email_body_parser.py # Email text extraction
│   ├── docx_parser.py       # Word document parsing
│   └── excel_parser.py      # Excel document parsing
├── models/
│   └── invoice.py           # Invoice dataclass
└── logs/
    └── invoice_monitor.log  # Runtime log
```

## Troubleshooting

**"Required environment variable X is missing"** — Check your `.env` file has all required values. See `.env.example`.

**OAuth errors** — Delete the relevant token file in `token/` and restart. You'll reauthenticate through the browser.

**Sheets not updating** — Confirm the Sheet IDs in `.env` are correct. Check `logs/invoice_monitor.log` for errors.

**Attachments not parsing** — Only `.docx` and `.xlsx` are supported. Old `.doc` and `.xls` formats may not work.
