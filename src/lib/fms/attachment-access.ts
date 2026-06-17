import type { SessionUser } from "@/lib/auth";
import { canControlFmsPipeline, canManageFms } from "@/lib/fms/access";

type AttachmentContext = {
  organizationId: string;
  ownerUserId: string | null;
  instance: {
    submission: { submittedById: string } | null;
  };
};

export function canAccessFmsStepAttachment(
  user: SessionUser,
  attachment: AttachmentContext,
) {
  if (attachment.organizationId !== user.organizationId) {
    return false;
  }
  if (canManageFms(user.role) || canControlFmsPipeline(user.role)) {
    return true;
  }
  if (attachment.ownerUserId === user.id) {
    return true;
  }
  if (attachment.instance.submission?.submittedById === user.id) {
    return true;
  }
  return false;
}
