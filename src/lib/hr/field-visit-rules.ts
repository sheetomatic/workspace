export function hasFieldVisitProof(
  photoAttachmentId: string | null | undefined,
  photoUrl: string | null | undefined,
) {
  return Boolean(photoAttachmentId?.trim() || photoUrl?.trim());
}
