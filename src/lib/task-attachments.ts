export const TASK_PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const TASK_PROOF_MAX_FILES = 3;

const TASK_PROOF_ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export function formatTaskProofMaxSize() {
  return "5 MB";
}

export function validateTaskProofFile(file: File) {
  if (file.size === 0) {
    return { ok: false as const, message: "File is empty." };
  }
  if (file.size > TASK_PROOF_MAX_BYTES) {
    return {
      ok: false as const,
      message: `${file.name} is too large. Maximum size is ${formatTaskProofMaxSize()}.`,
    };
  }
  const mimeType = file.type || "application/octet-stream";
  if (!TASK_PROOF_ALLOWED_TYPES.has(mimeType)) {
    return {
      ok: false as const,
      message: `${file.name} is not supported. Upload PDF, image, or document files.`,
    };
  }
  return { ok: true as const, mimeType };
}

export function parseProofFilesFromForm(formData: FormData) {
  const files = formData
    .getAll("proofFiles")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return { ok: false as const, message: "Upload at least one proof file." };
  }
  if (files.length > TASK_PROOF_MAX_FILES) {
    return {
      ok: false as const,
      message: `You can upload up to ${TASK_PROOF_MAX_FILES} files.`,
    };
  }

  const validated: Array<{ file: File; mimeType: string }> = [];
  for (const file of files) {
    const check = validateTaskProofFile(file);
    if (!check.ok) {
      return check;
    }
    validated.push({ file, mimeType: check.mimeType });
  }

  return { ok: true as const, files: validated };
}
