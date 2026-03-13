/**
 * Word document parser — extracts text from .docx using mammoth.
 */
import mammoth from "mammoth";

export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch (e) {
    console.error("Error parsing DOCX:", e);
    return `[ERROR] Could not parse Word document: ${e}`;
  }
}
