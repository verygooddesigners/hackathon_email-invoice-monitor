/**
 * Gmail service — handles OAuth, message fetching, attachments, and sending.
 * Uses googleapis npm package for Vercel serverless compatibility.
 */
import { google, gmail_v1 } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

export interface GmailAttachment {
  filename: string;
  data: Buffer;
  mimeType: string;
}

/**
 * Create an authenticated Gmail API client from stored tokens.
 */
export function getGmailClient(tokens: GmailTokens): gmail_v1.Gmail {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials(tokens);
  return google.gmail({ version: "v1", auth: oauth2 });
}

/**
 * Generate the OAuth consent URL for a user to connect their Gmail.
 */
export function getOAuthUrl(state: string): string {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCode(code: string): Promise<GmailTokens> {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  const { tokens } = await oauth2.getToken(code);
  return tokens as GmailTokens;
}

/**
 * Fetch all unread messages from the inbox.
 */
export async function getUnreadMessages(
  gmail: gmail_v1.Gmail
): Promise<gmail_v1.Schema$Message[]> {
  const res = await gmail.users.messages.list({
    userId: "me",
    labelIds: ["INBOX", "UNREAD"],
  });

  const stubs = res.data.messages || [];
  if (stubs.length === 0) return [];

  const messages: gmail_v1.Schema$Message[] = [];
  for (const stub of stubs) {
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: stub.id!,
      format: "full",
    });
    messages.push(msg.data);
  }

  return messages;
}

/**
 * Mark a message as read.
 */
export async function markAsRead(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<void> {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

/**
 * Download supported attachments from a message.
 */
export async function getAttachments(
  gmail: gmail_v1.Gmail,
  message: gmail_v1.Schema$Message
): Promise<GmailAttachment[]> {
  const attachments: GmailAttachment[] = [];
  const parts = message.payload?.parts || [];
  const supported = [".docx", ".doc", ".xlsx", ".xls"];

  for (const part of parts) {
    const filename = part.filename || "";
    if (!filename) continue;

    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    if (!supported.includes(ext)) continue;

    const attachmentId = part.body?.attachmentId;
    if (!attachmentId) continue;

    const att = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: message.id!,
      id: attachmentId,
    });

    if (att.data.data) {
      const base64 = att.data.data.replace(/-/g, "+").replace(/_/g, "/");
      attachments.push({
        filename,
        data: Buffer.from(base64, "base64"),
        mimeType: part.mimeType || "",
      });
    }
  }

  return attachments;
}

/**
 * Get subject from message headers.
 */
export function getSubject(message: gmail_v1.Schema$Message): string {
  const headers = message.payload?.headers || [];
  const subj = headers.find((h) => h.name?.toLowerCase() === "subject");
  return subj?.value || "(No Subject)";
}

/**
 * Get sender email from message headers.
 */
export function getSenderEmail(message: gmail_v1.Schema$Message): string {
  const headers = message.payload?.headers || [];
  const from = headers.find((h) => h.name?.toLowerCase() === "from");
  const value = from?.value || "";
  if (value.includes("<") && value.includes(">")) {
    return value.split("<")[1].split(">")[0];
  }
  return value;
}

/**
 * Get the internal date of a message as a Date object.
 */
export function getMessageDate(message: gmail_v1.Schema$Message): Date {
  return new Date(parseInt(message.internalDate || "0", 10));
}

/**
 * Send an email via Gmail API.
 */
export async function sendEmail(
  gmail: gmail_v1.Gmail,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<void> {
  const raw = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sendBody: any = { raw };
  if (threadId) sendBody.threadId = threadId;

  await gmail.users.messages.send({ userId: "me", requestBody: sendBody });
}
