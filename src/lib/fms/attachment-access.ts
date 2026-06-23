import type { SessionUser } from "@/lib/auth";
import { canViewFmsInstance, type FmsInstanceAccessContext } from "@/lib/fms/access";

type AttachmentContext = FmsInstanceAccessContext & {
  organizationId: string;
};

export function canAccessFmsStepAttachment(
  user: SessionUser,
  attachment: AttachmentContext,
) {
  if (attachment.organizationId !== user.organizationId) {
    return false;
  }
  return canViewFmsInstance(user, attachment);
}
