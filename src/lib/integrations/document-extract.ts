import {
  AI_KNOWLEDGE_MAX_CONTENT_CHARS,
  AI_KNOWLEDGE_MAX_UPLOAD_BYTES,
  AI_KNOWLEDGE_MIN_DOCUMENT_CHARS,
  formatKnowledgeMaxUploadSize,
  validateKnowledgeUploadFile,
} from "@/lib/ai-knowledge-limits";

export async function extractDocumentText(
  file: File,
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const fileCheck = validateKnowledgeUploadFile(file);
  if (!fileCheck.ok) {
    return fileCheck;
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0) {
    return { ok: false, message: "The uploaded file is empty." };
  }

  if (buffer.length > AI_KNOWLEDGE_MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `File must be ${formatKnowledgeMaxUploadSize()} or smaller.`,
    };
  }

  const isText =
    file.type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv");

  if (isText) {
    const text = buffer.toString("utf8").trim();
    if (text.length < AI_KNOWLEDGE_MIN_DOCUMENT_CHARS) {
      return {
        ok: false,
        message: "Text file must contain at least 30 characters.",
      };
    }
    return { ok: true, text: text.slice(0, AI_KNOWLEDGE_MAX_CONTENT_CHARS) };
  }

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    try {
      const pdfModule = await import("pdf-parse");
      const pdfParse =
        typeof pdfModule.default === "function"
          ? pdfModule.default
          : (pdfModule as unknown as (input: Buffer) => Promise<{ text?: string }>);
      const result = await pdfParse(buffer);
      const text = result.text?.trim() ?? "";
      if (text.length < AI_KNOWLEDGE_MIN_DOCUMENT_CHARS) {
        return {
          ok: false,
          message:
            "Could not extract enough text from the PDF. Try a text-based PDF or paste content manually.",
        };
      }
      return { ok: true, text: text.slice(0, AI_KNOWLEDGE_MAX_CONTENT_CHARS) };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "PDF read failed";
      return {
        ok: false,
        message: `Could not read the PDF (${detail}). Try a text-based PDF or paste content manually.`,
      };
    }
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    try {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer });
      const text = parsed.value?.trim() ?? "";
      if (text.length < AI_KNOWLEDGE_MIN_DOCUMENT_CHARS) {
        return {
          ok: false,
          message: "Could not extract enough text from the DOCX file.",
        };
      }
      return { ok: true, text: text.slice(0, AI_KNOWLEDGE_MAX_CONTENT_CHARS) };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "DOCX read failed";
      return {
        ok: false,
        message: `Could not read the DOCX file (${detail}). Paste content manually.`,
      };
    }
  }

  return {
    ok: false,
    message: "Unsupported file type. Upload PDF, DOCX, TXT, or MD.",
  };
}

function autoTitleFromContent(content: string) {
  const line = content
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length >= 3);
  return line?.slice(0, 120) ?? "";
}

export function resolveDocumentTitle(params: {
  titleInput: string;
  content: string;
  fileName?: string;
}) {
  if (params.titleInput.trim().length >= 3) {
    return params.titleInput.trim().slice(0, 120);
  }

  if (params.fileName) {
    const fromFile = params.fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();
    if (fromFile.length >= 3) {
      return fromFile.slice(0, 120);
    }
  }

  const fromContent = autoTitleFromContent(params.content);
  if (fromContent.length >= 3) {
    return fromContent;
  }

  return "";
}
