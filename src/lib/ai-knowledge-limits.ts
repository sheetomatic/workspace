/** Shared limits for AI Training Data uploads (keep in sync with next.config serverActions.bodySizeLimit). */
export const AI_KNOWLEDGE_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const AI_KNOWLEDGE_MAX_CONTENT_CHARS = 15_000;
export const AI_KNOWLEDGE_MIN_DOCUMENT_CHARS = 30;
export const AI_KNOWLEDGE_MIN_FAQ_QUESTION_CHARS = 5;
export const AI_KNOWLEDGE_MIN_FAQ_ANSWER_CHARS = 10;

export const AI_KNOWLEDGE_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".csv",
] as const;

export const AI_KNOWLEDGE_FILE_ACCEPT =
  ".pdf,.docx,.txt,.md,.csv,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function formatKnowledgeMaxUploadSize() {
  return "5 MB";
}

export function knowledgeUploadLimitSummary() {
  return `PDF, DOCX, TXT, MD, or CSV - max ${formatKnowledgeMaxUploadSize()} per file - up to ${AI_KNOWLEDGE_MAX_CONTENT_CHARS.toLocaleString()} characters stored after extraction`;
}

export function validateKnowledgeUploadFile(
  file: File,
): { ok: true } | { ok: false; message: string } {
  if (file.size === 0) {
    return { ok: false, message: "The selected file is empty." };
  }

  if (file.size > AI_KNOWLEDGE_MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `File is too large (${formatFileSize(file.size)}). Maximum upload size is ${formatKnowledgeMaxUploadSize()}.`,
    };
  }

  const name = file.name.toLowerCase();
  const allowed = AI_KNOWLEDGE_ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!allowed) {
    return {
      ok: false,
      message: `Unsupported file type. Allowed: ${AI_KNOWLEDGE_ALLOWED_EXTENSIONS.join(", ")}.`,
    };
  }

  return { ok: true };
}

export function validateKnowledgeTextContent(
  content: string,
  minChars = AI_KNOWLEDGE_MIN_DOCUMENT_CHARS,
): { ok: true; text: string } | { ok: false; message: string } {
  const trimmed = content.trim();

  if (trimmed.length < minChars) {
    return {
      ok: false,
      message: `Add at least ${minChars} characters of content.`,
    };
  }

  if (trimmed.length > AI_KNOWLEDGE_MAX_CONTENT_CHARS) {
    return {
      ok: false,
      message: `Content is too long (${trimmed.length.toLocaleString()} characters). Maximum is ${AI_KNOWLEDGE_MAX_CONTENT_CHARS.toLocaleString()} characters.`,
    };
  }

  return { ok: true, text: trimmed.slice(0, AI_KNOWLEDGE_MAX_CONTENT_CHARS) };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
