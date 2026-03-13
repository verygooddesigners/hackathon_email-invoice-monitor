# Invoice Monitor — User Guide

*Last updated: March 13, 2026*

> **Note:** This guide is also available in-app at `/dashboard/guide` with the same UI as the rest of the application. The markdown version here serves as a reference copy.

## What This App Does

Invoice Monitor is an AI-powered tool built for GDC Group that automatically scans incoming Outlook emails for invoices, extracts line items using Claude AI, and checks whether the math adds up. When the stated total on an invoice doesn't match the sum of line items, the app flags it as a discrepancy alert so your AP team can follow up before payment.

The app runs on a scheduled basis (configurable per account), so once it's set up you don't need to do anything — it works in the background.

---

## Getting Started

### 1. Create an Account

Go to the app URL and click **Register** to create a login. You'll need an email address and password. This is your Invoice Monitor login — it's separate from your Outlook credentials.

### 2. Sign In

After registering, sign in at the login page with your email and password. You'll land on the **Alerts** dashboard.

### 3. Demo Mode

If no Outlook accounts are connected yet, the app automatically shows **demo data** so you can explore the interface. You'll see a blue banner at the top of each page saying "Showing demo data." Once you connect a real Outlook account, the demo data is replaced with live results.

---

## Dashboard Pages

The app has three main pages, accessible from the navigation bar at the top.

### Alerts (Home Page)

This is the main dashboard. It shows every invoice where the AI detected a math discrepancy.

**Summary Cards** at the top show:

- **Total Discrepancy** — the combined dollar amount of all discrepancies across flagged invoices
- **Average Discrepancy** — the average discrepancy per flagged invoice
- **Largest Discrepancy** — the single biggest discrepancy found (highlighted in red)

**Alerts Table** below the cards lists each flagged invoice with:

- **Date** — when the alert was created
- **Freelancer** — who sent the invoice
- **Invoice #** — the invoice reference number (if found)
- **Account** — which Outlook inbox the email came from
- **Stated** — the total the freelancer wrote on the invoice
- **Calculated** — the total the AI got by summing the line items
- **Discrepancy** — the difference (shown as a red badge)

**Expanding a row**: Click any row to see more details — the invoice date, source email address, attachment filename, and the raw line items the AI extracted.

**Filtering**: Use the dropdown in the top-right to filter alerts by Outlook account if you're monitoring multiple inboxes.

**Pagination**: If there are more than 20 alerts, use the Previous/Next buttons at the bottom to page through them.

### Accounts

This page manages which Outlook inboxes the app monitors.

**Adding an Account**:

1. Click the **Add Account** button
2. Enter the Outlook email address you want to monitor
3. Choose a **Check Frequency** (how often the app scans for new emails) — options range from every minute to daily at 9 AM
4. Click **Connect with Microsoft** — you'll be redirected to Microsoft's login page to authorize access

**Account Cards** show each connected account with:

- **Status badge** — Active (green), Paused (gray), or Awaiting Microsoft sign-in (outline)
- **Alert count** — how many discrepancies have been found
- **Rule count** — how many filtering rules are configured
- **Schedule** — changeable via dropdown without disconnecting
- **Last Run / Next Run** — when the monitor last checked and when it will check next

**Actions**: You can **Pause/Resume** an account (stops monitoring without disconnecting) or **Remove** it entirely (deletes the account and all its alerts and rules).

### Rules

Rules let you control *which* emails the monitor processes for a given account.

**Important**: By default, the app checks **every** incoming email for invoice math errors, even without any rules. Rules are optional filters that narrow which emails get processed — they don't enable the math check (that's always on).

**How rules work**: When you add rules, an email must match **ALL** enabled rules to be processed. Think of rules as filters that exclude irrelevant emails.

**Adding a Rule**:

1. Select the account (if you have more than one)
2. Click **Add Rule**
3. Choose a rule type and configure it
4. Click **Create Rule**

**Rule Types**:

| Type | What It Does | Example |
|------|-------------|---------|
| **Date Range** | Only process emails from the last N days | "Last 30 days" — ignores older emails |
| **Subject Filter** | Filter by subject line (starts with or contains) | Subject contains "invoice" |
| **Sender Filter** | Filter by sender email or domain | From *@freelancer.com |
| **Attachment Only** | Only process emails with file attachments | Skips plain-text emails without .docx/.xlsx |

**Managing Rules**: Each rule can be **Enabled/Disabled** individually (without deleting it) or **Deleted** permanently. Disabled rules are ignored during processing.

---

## How the AI Processing Works

When the monitor runs for an account, here's what happens for each unread email:

1. **Rule Check** — If rules exist, the email must pass all enabled rules. If no rules exist, all emails pass through.
2. **Duplicate Check** — The app tracks which emails have already been processed and skips them.
3. **Text Extraction** — The app reads the email body. If there are .docx or .xlsx attachments, it extracts text from those too.
4. **AI Extraction** — The combined text is sent to Claude AI, which identifies the freelancer name, invoice number, date, line items, and stated total.
5. **Math Validation** — The app sums the extracted line items and compares them to the stated total. If they don't match, it's flagged as a discrepancy.
6. **Alert Creation** — Discrepancies are saved as alerts and appear on the dashboard.
7. **Email Notifications** — Two emails are sent automatically:
   - An **internal alert** to the monitored inbox summarizing the discrepancy
   - A **reply to the freelancer** politely asking them to review and resubmit

The email is then marked as read so it won't be processed again.

---

## Supported File Types

The AI can extract invoice data from:

- **Email body text** — plain text or HTML emails
- **.docx files** — Microsoft Word documents
- **.xlsx / .xls files** — Microsoft Excel spreadsheets

PDF attachments are not currently supported.

---

## Dark Mode

The app includes a light and dark theme. Use the **toggle switch** in the navigation bar (between the nav links and your email address) to switch between them. Your preference is saved automatically and persists across sessions.

---

## Environment & Infrastructure

This section is for administrators setting up or maintaining the app.

### Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: Neon Serverless Postgres via Prisma ORM
- **Auth**: NextAuth.js with credentials provider
- **AI**: Anthropic Claude API (claude-sonnet model)
- **Email**: Microsoft Graph API (Outlook)
- **Hosting**: Vercel
- **Scheduled Monitoring**: Vercel Cron Jobs (runs every minute by default)

### Required Environment Variables

These must be set in Vercel (Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| `POSTGRES_PRISMA_URL` | Neon Postgres connection string (pooled) |
| `POSTGRES_URL_NON_POOLING` | Neon Postgres direct connection string |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session encryption |
| `NEXTAUTH_URL` | The app's public URL (e.g., https://your-app.vercel.app) |
| `MICROSOFT_CLIENT_ID` | Azure AD application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | Azure AD client secret |
| `MICROSOFT_REDIRECT_URI` | OAuth callback URL (e.g., https://your-app.vercel.app/api/auth/microsoft/callback) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |

### Azure AD Setup

To connect Outlook accounts, the app needs an Azure AD app registration:

1. Go to the Azure Portal → Azure Active Directory → App registrations
2. Create a new registration
3. Set the redirect URI to `https://your-app.vercel.app/api/auth/microsoft/callback`
4. Under API permissions, add Microsoft Graph:
   - `Mail.Read` — read inbox messages
   - `Mail.ReadWrite` — mark messages as read
   - `Mail.Send` — send alert emails and replies
5. Create a client secret and copy the value
6. Copy the Application (client) ID
7. Set both as environment variables on Vercel

### Cron Schedule

The monitoring cron job is configured in `vercel.json` and currently runs every minute (`*/1 * * * *`). On each tick, it checks all enabled accounts whose `nextRun` timestamp has passed and processes their inboxes. You can adjust this in `vercel.json` if needed — note that Vercel's free tier supports cron jobs running once per day; paid plans support more frequent schedules.

---

## Troubleshooting

**"Showing demo data" banner won't go away**
→ You haven't connected a real Outlook account yet, or the Microsoft OAuth flow hasn't been completed. Go to Accounts and follow the setup steps.

**Account shows "Awaiting Microsoft sign-in"**
→ The account was added but OAuth wasn't completed. Click the account and re-authorize through Microsoft.

**No alerts appearing after connecting an account**
→ The monitor only flags invoices with math discrepancies. If all your invoices have correct math, no alerts will appear. Also check that the cron job is running and that your rules aren't filtering out all emails.

**Wrong totals or line items**
→ The AI extraction isn't perfect. It works best with clearly structured invoices. Handwritten or heavily formatted invoices may produce inaccurate extractions.

---

## Version History

| Date | Changes |
|------|---------|
| March 13, 2026 | Added in-app user guide at /dashboard/guide, light/dark theme with toggle, mock data preview, summary stat cards, rules page UI improvements, default AI math-check documentation |
| March 12, 2026 | Migrated from Gmail to Outlook (Microsoft Graph API) |
| March 11, 2026 | Initial release — Next.js web app with multi-user auth, rules engine, AI extraction, and Vercel deployment |
