/**
 * Monitoring rules engine — applies user-defined filters to messages.
 */
import { gmail_v1 } from "googleapis";
import { getSubject, getSenderEmail, getMessageDate } from "./gmail";

export interface RuleConfig {
  ruleType: string;
  ruleValue: string; // JSON
}

/**
 * Check if a message passes all active rules for an account.
 * Returns true if the message should be processed, false if filtered out.
 */
export function messagePassesRules(
  message: gmail_v1.Schema$Message,
  rules: RuleConfig[]
): boolean {
  for (const rule of rules) {
    if (!applyRule(message, rule)) return false;
  }
  return true;
}

function applyRule(message: gmail_v1.Schema$Message, rule: RuleConfig): boolean {
  try {
    const config = JSON.parse(rule.ruleValue);

    switch (rule.ruleType) {
      case "date_range": {
        // config: { days: 7 } — only messages from the last N days
        const days = config.days || 7;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const msgDate = getMessageDate(message);
        return msgDate >= cutoff;
      }

      case "subject_filter": {
        // config: { startsWith?: string, contains?: string, regex?: string }
        const subject = getSubject(message);
        if (config.startsWith && !subject.startsWith(config.startsWith)) return false;
        if (config.contains && !subject.includes(config.contains)) return false;
        if (config.regex && !new RegExp(config.regex, "i").test(subject)) return false;
        return true;
      }

      case "sender_filter": {
        // config: { email?: string, domain?: string }
        const sender = getSenderEmail(message);
        if (config.email && sender.toLowerCase() !== config.email.toLowerCase()) return false;
        if (config.domain && !sender.toLowerCase().endsWith(config.domain.toLowerCase())) return false;
        return true;
      }

      case "attachment_only": {
        // config: { required: true } — only process messages with attachments
        if (config.required) {
          const parts = message.payload?.parts || [];
          const hasAttachment = parts.some((p) => p.filename && p.filename.length > 0);
          return hasAttachment;
        }
        return true;
      }

      default:
        return true; // Unknown rule type — don't filter
    }
  } catch (e) {
    console.error(`Error applying rule ${rule.ruleType}:`, e);
    return true; // On error, don't filter
  }
}
