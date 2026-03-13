/**
 * Monitoring orchestrator — processes a single account's inbox.
 * Called by the cron endpoint for each account that's due.
 */
import { prisma } from "./db";
import {
  OutlookTokens,
  getValidTokens,
  getUnreadMessages,
  markAsRead,
  getAttachments,
  getSubject,
  getSenderEmail,
  getBodyText,
  sendEmail,
  sendReply,
} from "./outlook";
import { extractDocxText } from "./parsers/docx";
import { extractExcelText } from "./parsers/xlsx";
import { extractPdfText } from "./parsers/pdf";
import { extractInvoiceData } from "./extractor";
import { validateInvoice } from "./validator";
import { messagePassesRules, RuleConfig } from "./rules";

export async function processAccount(accountId: string): Promise<{
  processed: number;
  alerts: number;
  errors: string[];
}> {
  const result = { processed: 0, alerts: 0, errors: [] as string[] };

  try {
    // Load account with rules
    const account = await prisma.monitoredAccount.findUnique({
      where: { id: accountId },
      include: { rules: { where: { enabled: true } } },
    });

    if (!account || !account.enabled || !account.googleTokens) {
      return result;
    }

    // Get valid access token (refresh if needed)
    const storedTokens: OutlookTokens = JSON.parse(account.googleTokens);
    const { accessToken, tokens: currentTokens, refreshed } = await getValidTokens(storedTokens);

    // If tokens were refreshed, save them
    if (refreshed) {
      await prisma.monitoredAccount.update({
        where: { id: account.id },
        data: { googleTokens: JSON.stringify(currentTokens) },
      });
    }

    // Build rules list
    const rules: RuleConfig[] = account.rules.map((r: any) => ({
      ruleType: r.ruleType,
      ruleValue: r.ruleValue,
    }));

    // Fetch unread messages
    const messages = await getUnreadMessages(accessToken);
    if (messages.length === 0) return result;

    for (const message of messages) {
      const messageId = message.id;

      try {
        // Check if already processed
        const existing = await prisma.processedMessage.findUnique({
          where: {
            accountId_gmailMessageId: {
              accountId: account.id,
              gmailMessageId: messageId,
            },
          },
        });

        if (existing) {
          await markAsRead(accessToken, messageId);
          continue;
        }

        // Apply monitoring rules (if no rules exist, ALL emails pass through
        // and get the AI math check — this is the default/intended behavior)
        if (!messagePassesRules(message, rules)) {
          await markAsRead(accessToken, messageId);
          continue;
        }

        const subject = getSubject(message);
        console.log(`Processing: ${subject} (${messageId})`);

        // Extract email body
        const bodyText = getBodyText(message);

        // Download and parse attachments
        const attachmentTexts: string[] = [];
        let attachmentName = "";

        if (message.hasAttachments) {
          const attachments = await getAttachments(accessToken, messageId);
          for (const att of attachments) {
            const ext = att.name.slice(att.name.lastIndexOf(".")).toLowerCase();
            let parsed = "";

            if (ext === ".docx" || ext === ".doc") {
              const buffer = Buffer.from(att.contentBytes, "base64");
              parsed = await extractDocxText(buffer);
            } else if (ext === ".xlsx" || ext === ".xls") {
              const buffer = Buffer.from(att.contentBytes, "base64");
              parsed = extractExcelText(buffer);
            } else if (ext === ".pdf") {
              const buffer = Buffer.from(att.contentBytes, "base64");
              parsed = await extractPdfText(buffer);
            }

            if (parsed && !parsed.startsWith("[ERROR]")) {
              attachmentTexts.push(parsed);
              attachmentName = att.name;
            }
          }
        }

        // Combine text
        let combinedText = bodyText;
        if (attachmentTexts.length > 0) {
          combinedText += "\n\n--- ATTACHMENT ---\n\n" + attachmentTexts.join("\n\n");
        }

        if (!combinedText.trim()) {
          await markAsRead(accessToken, messageId);
          await recordProcessed(account.id, messageId);
          continue;
        }

        // Extract invoice data
        const extracted = await extractInvoiceData(combinedText);
        if (!extracted) {
          await markAsRead(accessToken, messageId);
          await recordProcessed(account.id, messageId);
          continue;
        }

        // Validate
        const validated = validateInvoice(extracted);
        result.processed++;

        // Record alert if discrepancy
        if (validated.has_discrepancy) {
          await prisma.alert.create({
            data: {
              accountId: account.id,
              freelancer: validated.freelancer_name || "Unknown",
              invoiceNumber: validated.invoice_number,
              invoiceDate: validated.invoice_date,
              statedTotal: validated.stated_total,
              calculatedTotal: validated.calculated_total,
              discrepancyAmount: validated.discrepancy_amount,
              lineItems: JSON.stringify(validated.line_items),
              sourceEmail: account.email,
              attachment: attachmentName || null,
            },
          });

          result.alerts++;

          // Send internal alert
          try {
            await sendEmail(
              accessToken,
              account.email,
              `⚠️ Invoice Discrepancy — ${validated.freelancer_name}`,
              buildInternalAlert(validated, subject, account.email)
            );
          } catch (e) {
            console.error("Failed to send internal alert:", e);
          }

          // Reply to freelancer
          try {
            const senderEmail = getSenderEmail(message);
            if (senderEmail) {
              await sendReply(
                accessToken,
                messageId,
                buildFreelancerReply(validated)
              );
            }
          } catch (e) {
            console.error("Failed to send freelancer reply:", e);
          }
        }

        await markAsRead(accessToken, messageId);
        await recordProcessed(account.id, messageId);
      } catch (e: any) {
        console.error(`Error processing message ${messageId}:`, e);
        result.errors.push(e.message || String(e));
        try {
          await markAsRead(accessToken, messageId);
        } catch {}
      }
    }

    // Update last run
    await prisma.monitoredAccount.update({
      where: { id: account.id },
      data: { lastRun: new Date() },
    });
  } catch (e: any) {
    console.error(`Error processing account ${accountId}:`, e);
    result.errors.push(e.message || String(e));
  }

  return result;
}

async function recordProcessed(accountId: string, gmailMessageId: string) {
  await prisma.processedMessage.create({
    data: { accountId, gmailMessageId },
  });
}

function buildInternalAlert(invoice: any, subject: string, inbox: string): string {
  const items = (invoice.line_items || [])
    .map((i: any) => `  - ${i.description}: $${i.amount.toFixed(2)}`)
    .join("\n");

  return `Invoice Discrepancy Alert

Freelancer: ${invoice.freelancer_name}
Invoice #: ${invoice.invoice_number || "N/A"}

Stated Total: $${invoice.stated_total.toFixed(2)}
Calculated Total: $${invoice.calculated_total.toFixed(2)}
Discrepancy: $${invoice.discrepancy_amount.toFixed(2)}

Line Items:
${items}

Original Subject: ${subject}
Source Inbox: ${inbox}

— RotoMath`;
}

function buildFreelancerReply(invoice: any): string {
  const items = (invoice.line_items || [])
    .map((i: any) => `  - ${i.description}: $${i.amount.toFixed(2)}`)
    .join("\n");

  return `Hi ${invoice.freelancer_name},

Thank you for your invoice. We noticed a discrepancy in the math:

  Stated Total: $${invoice.stated_total.toFixed(2)}
  Calculated Total: $${invoice.calculated_total.toFixed(2)}
  Difference: $${invoice.discrepancy_amount.toFixed(2)}

Line items as we read them:
${items}

Could you please review and resubmit? If we misread something, let us know.

Thank you,
RotoMath`;
}
