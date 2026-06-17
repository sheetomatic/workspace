/** Keep below next.config serverActions.bodySizeLimit (5mb). */
export const FMS_MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

export function formatFmsAttachmentMaxSize() {
  return "4 MB";
}

export function validateFmsAttachmentFile(
  file: File,
): { ok: true } | { ok: false; message: string } {
  if (file.size === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }

  if (file.size > FMS_MAX_ATTACHMENT_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      message: `File is too large (${sizeMb} MB). Maximum attachment size is ${formatFmsAttachmentMaxSize()}.`,
    };
  }

  return { ok: true };
}
