/**
 * Minimal PDF writer — local/free render path for vg-b.
 * No pdfkit / vendor PDF libs (boundary lock).
 */

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "");
}

/**
 * Build a simple single-page PDF (Latin-1 / WinAnsi-safe subset).
 * Non-ASCII is replaced so V1 prove stays dependency-free.
 */
export function buildSimplePdf(lines: string[]): Buffer {
  const safeLines = lines.map((line) =>
    [...line]
      .map((ch) => (ch.charCodeAt(0) <= 127 ? ch : "?"))
      .join(""),
  );

  const contentParts: string[] = ["BT", "/F1 11 Tf", "50 780 Td", "14 TL"];
  for (let i = 0; i < safeLines.length; i++) {
    if (i === 0) {
      contentParts.push(`(${escapePdfText(safeLines[i]!)}) Tj`);
    } else {
      contentParts.push("T*");
      contentParts.push(`(${escapePdfText(safeLines[i]!)}) Tj`);
    }
  }
  contentParts.push("ET");
  const stream = contentParts.join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]!).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}
