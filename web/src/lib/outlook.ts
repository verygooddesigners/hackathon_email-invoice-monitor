/**
 * Outlook/Microsoft Graph email service.
 * Uses Microsoft Graph API to read emails, download attachments, send replies.
 */

export interface OutlookTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in ms
}

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const TENANT_ID = process.env.MICROSOFT_TENANT_ID || "52c3448d-59b9-4e94-8fd9-d97a2128c819";
const AUTH_BASE = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0`;

const SCOPES = [
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.ReadWrite",
  "https://graph.microsoft.com/Mail.Send",
  "offline_access",
  "openid",
  "email",
];

// --- OAuth helpers ---

export function getOAuthUrl(accountId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
    scope: SCOPES.join(" "),
    state: accountId,
    response_mode: "query",
    prompt: "consent",
  });
  return `${AUTH_BASE}/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<OutlookTokens> {
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

async function refreshTokens(tokens: OutlookTokens): Promise<OutlookTokens> {
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
      scope: SCOPES.join(" "),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Returns a valid access token, refreshing if expired.
 * Also returns updated tokens if a refresh happened.
 */
export async function getValidTokens(
  tokens: OutlookTokens
): Promise<{ accessToken: string; tokens: OutlookTokens; refreshed: boolean }> {
  if (Date.now() < tokens.expires_at - 60_000) {
    return { accessToken: tokens.access_token, tokens, refreshed: false };
  }
  const newTokens = await refreshTokens(tokens);
  return { accessToken: newTokens.access_token, tokens: newTokens, refreshed: true };
}

// --- Graph API helpers ---

async function graphGet(accessToken: string, path: string): Promise<any> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error (${res.status}): ${err}`);
  }
  return res.json();
}

async function graphPost(accessToken: string, path: string, body: any): Promise<any> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error (${res.status}): ${err}`);
  }
  // 202 Accepted for send, 201 for create, etc.
  if (res.status === 202 || res.status === 204) return {};
  return res.json();
}

async function graphPatch(accessToken: string, path: string, body: any): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API PATCH error (${res.status}): ${err}`);
  }
}

// --- Email operations ---

export interface OutlookMessage {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
  body: { contentType: string; content: string };
  hasAttachments: boolean;
  isRead: boolean;
  conversationId: string;
}

export interface OutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  contentBytes: string; // base64
  size: number;
}

export async function getUnreadMessages(
  accessToken: string,
  maxResults: number = 20
): Promise<OutlookMessage[]> {
  const filter = encodeURIComponent("isRead eq false");
  const select = "id,subject,from,receivedDateTime,body,hasAttachments,isRead,conversationId";
  const data = await graphGet(
    accessToken,
    `/me/mailFolders/inbox/messages?$filter=${filter}&$top=${maxResults}&$select=${select}&$orderby=receivedDateTime desc`
  );
  return data.value || [];
}

export async function markAsRead(accessToken: string, messageId: string): Promise<void> {
  await graphPatch(accessToken, `/me/messages/${messageId}`, { isRead: true });
}

export async function getAttachments(
  accessToken: string,
  messageId: string
): Promise<OutlookAttachment[]> {
  const data = await graphGet(
    accessToken,
    `/me/messages/${messageId}/attachments?$select=id,name,contentType,contentBytes,size`
  );
  // Filter to file attachments only (skip inline images, reference attachments, etc.)
  return (data.value || []).filter(
    (a: any) => a["@odata.type"] === "#microsoft.graph.fileAttachment"
  );
}

export function getSubject(message: OutlookMessage): string {
  return message.subject || "(no subject)";
}

export function getSenderEmail(message: OutlookMessage): string {
  return message.from?.emailAddress?.address || "unknown";
}

export function getMessageDate(message: OutlookMessage): Date {
  return new Date(message.receivedDateTime);
}

export function getBodyText(message: OutlookMessage): string {
  if (!message.body?.content) return "";
  if (message.body.contentType === "text") {
    return message.body.content;
  }
  // Strip HTML tags for html content type
  return message.body.content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function sendReply(
  accessToken: string,
  messageId: string,
  replyBody: string
): Promise<void> {
  await graphPost(accessToken, `/me/messages/${messageId}/reply`, {
    message: {
      body: {
        contentType: "Text",
        content: replyBody,
      },
    },
  });
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  await graphPost(accessToken, "/me/sendMail", {
    message: {
      subject,
      body: { contentType: "Text", content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
  });
}
