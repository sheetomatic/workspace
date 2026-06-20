import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { resolveWhatsAppTestPhone } from "@/lib/whatsapp-test-phone";

/** Keep test WA number on admin profiles so inbound Hi opens the task menu. */
export async function syncWhatsAppTestPhoneToTeam(organizationId: string) {
  const testPhone = resolveWhatsAppTestPhone();
  if (!testPhone) {
    return;
  }

  const admins = await prisma.membership.findMany({
    where: {
      organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: { userId: true },
  });

  if (admins.length === 0) {
    return;
  }

  await prisma.user.updateMany({
    where: { id: { in: admins.map((row) => row.userId) } },
    data: { phone: testPhone },
  });
}

export async function syncWhatsAppTestPhoneForUser(
  organizationId: string,
  userId: string,
  role: Parameters<typeof hasMinimumRole>[1],
) {
  if (!hasMinimumRole(role, "ADMIN")) {
    return;
  }

  const testPhone = resolveWhatsAppTestPhone();
  if (!testPhone) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { phone: testPhone },
  });

  await syncWhatsAppTestPhoneToTeam(organizationId);
}
