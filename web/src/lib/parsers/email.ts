/**
 * Email body parser — extracts clean text from Gmail message payloads.
 */

export function extractEmailBody(payload: any): string {
  try {
    const parts = getAllParts(payload);

    // Prefer plain text
    for (const part of parts) {
      if (part.mimeType === "text/plain") {
        const text = decodeBody(part);
        if (text.trim()) return text.trim();
      }
    }

    // Fall back to HTML
    for (const part of parts) {
      if (part.mimeType === "text/html") {
        const html = decodeBody(part);
        if (html.trim()) return htmlToText(html);
      }
    }

    // Non-multipart: check payload body directly
    if (payload.body?.data) {
      const text = decodeBase64Url(payload.body.data);
      if (payload.mimeType?.includes("html")) return htmlToText(text);
      return text.trim();
    }

    return "";
  } catch (e) {
    console.error("Error parsing email body:", e);
    return "";
  }
}

function getAllParts(payload: any): any[] {
  const parts: any[] = [];
  if (payload.parts) {
    for (const part of payload.parts) {
      parts.push(part);
      parts.push(...getAllParts(part));
    }
  }
  return parts;
}

function decodeBody(part: any): string {
  const data = part.body?.data;
  if (!data) return "";
  return decodeBase64Url(data);
}

function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function htmlToText(html: string): string {
  // Simple HTML to text — strip tags, decode entities
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
