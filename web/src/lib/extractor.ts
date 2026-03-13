/**
 * Extractor service — uses Anthropic API to pull structured invoice data from raw text.
 */
import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedInvoice {
  freelancer_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  line_items: { description: string; amount: number }[];
  stated_total: number;
}

const SYSTEM_PROMPT = `You are an invoice data extraction assistant. Read raw text from emails and document attachments, then extract structured invoice data.

Extract these fields:
- freelancer_name: The person or company who sent the invoice
- invoice_number: Invoice number/reference (null if not found)
- invoice_date: Date on the invoice (null if not found)
- line_items: Array of objects with "description" (string) and "amount" (float)
- stated_total: Grand total as written on the invoice (float)

Rules:
- Strip currency symbols ($, €, £) and return numeric values
- Handle commas in numbers (e.g., "1,250.00" → 1250.00)
- Return null for fields that genuinely cannot be found
- If NO financial data exists, return {"no_invoice_found": true}
- Return ONLY valid JSON, no preamble, no explanation, no markdown

Response schema:
{
  "freelancer_name": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "string or null",
  "line_items": [{"description": "string", "amount": 123.45}],
  "stated_total": 123.45
}`;

export async function extractInvoiceData(
  rawText: string
): Promise<ExtractedInvoice | null> {
  if (!rawText.trim()) return null;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extract invoice data from the following text:\n\n${rawText}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const data = JSON.parse(text.trim());

    if (data.no_invoice_found) return null;

    return {
      freelancer_name: data.freelancer_name || null,
      invoice_number: data.invoice_number || null,
      invoice_date: data.invoice_date || null,
      line_items: data.line_items || [],
      stated_total: parseFloat(data.stated_total) || 0,
    };
  } catch (e) {
    console.error("Extractor error:", e);
    return null;
  }
}
