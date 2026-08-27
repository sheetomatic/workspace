/** Minimal one-page PDF (Helvetica) — no extra dependency. */

function escapePdf(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function wrapLine(text: string, width = 86): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function renderTextPdf(title: string, lines: string[]): Uint8Array {
  const contentLines = [
    "BT",
    "/F1 16 Tf",
    "72 740 Td",
    `(${escapePdf(title.slice(0, 80))}) Tj`,
    "/F1 11 Tf",
    "0 -28 Td",
  ];
  for (const line of lines.flatMap((line) => wrapLine(line))) {
    contentLines.push(`(${escapePdf(line)}) Tj`, "0 -16 Td");
  }
  contentLines.push("ET");
  const stream = contentLines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const startxref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

export function pdfBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function pdfDataUrl(bytes: Uint8Array) {
  return `data:application/pdf;base64,${pdfBase64(bytes)}`;
}

export function downloadPdf(fileName: string, bytes: Uint8Array) {
  const url = pdfDataUrl(bytes);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.replace(/[^\w.\- ]+/g, "_") || "document.pdf";
  link.click();
}
