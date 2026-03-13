/**
 * Excel document parser — extracts cell values from .xlsx using SheetJS.
 */
import * as XLSX from "xlsx";

export function extractExcelText(buffer: Buffer): string {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const parts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });

      const nonEmptyRows = rows.filter((row) =>
        row.some((cell) => cell !== "" && cell != null)
      );

      if (nonEmptyRows.length > 0) {
        parts.push(`Sheet: ${sheetName}`);
        nonEmptyRows.forEach((row, i) => {
          const cells = row.map((c) => String(c ?? "").trim());
          parts.push(`Row ${i + 1}: ${cells.join(" | ")}`);
        });
        parts.push("");
      }
    }

    return parts.join("\n").trim();
  } catch (e) {
    console.error("Error parsing Excel:", e);
    return `[ERROR] Could not parse Excel document: ${e}`;
  }
}
