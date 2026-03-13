/**
 * PDF parser — extracts text from .pdf using pdf-parse.
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid bundling issues with Next.js
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (e) {
    console.error("Error parsing PDF:", e);
    return `[ERROR] Could not parse PDF: ${e}`;
  }
}
