/**
 * Monitoring rules engine — applies user-defined filters to Outlook messages.
 */
import { OutlookMessage, getSubject, getSenderEmail, getMessageDate } from "./outlook";

export interface RuleConfig {
  ruleType: string;
  ruleValue: string; // JSON
}

/**
 * Check if a message passes all active rules for an account.
 * Returns true if the message should be processed, false if filtered out.
 */
export function messagePassesRules(
  message: OutlookMessage,
  rules: RuleConfig[]
): boolean {
  for (const rule of rules) {
    if (!applyRule(message, rule)) return false;
  }
  return true;
}

function applyRule(message: OutlookMessage, rule: RuleConfig): boolean {
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
        const subject = getSubject(message).toLowerCase();
        if (config.startsWith && !subject.startsWith(config.startsWith.toLowerCase())) return false;
        if (config.contains && !subject.includes(config.contains.toLowerCase())) return false;
        if (config.regex && !new RegExp(config.regex, "i").test(subject)) return false;
        return true;
      }

      case "sender_filter": {
        // config: { email?: string, domain?: string }
        const sender = getSenderEmail(message).toLowerCase();
        if (config.email && sender !== config.email.toLowerCase()) return false;
        if (config.domain && !sender.endsWith(config.domain.toLowerCase())) return false;
        return true;
      }

      case "attachment_only": {
        // config: { required: true } — only process messages with attachments
        if (config.required) {
          return message.hasAttachments === true;
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
