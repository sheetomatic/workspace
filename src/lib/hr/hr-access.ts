import "server-only";

import { prisma } from "@/lib/db";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import {
  resolveMemberHrSubModules,
  type HrSubModuleId,
} from "@/lib/hr/hr-sub-modules";

/** Org ∩ member effective HR sub-modules for the signed-in user. */
export async function getEffectiveHrSubModulesForUser(user: {
  id: string;
  organizationId: string;
}) {
  const [settings, membership] = await Promise.all([
    getOrCreateHrSettings(user.organizationId),
    prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.organizationId,
        },
      },
      select: { enabledHrSubModules: true },
    }),
  ]);
  const effective = resolveMemberHrSubModules(
    settings.enabledHrSubModules,
    membership?.enabledHrSubModules,
  );
  return {
    settings,
    effective,
    allowed: (id: HrSubModuleId) => effective.includes(id),
  };
}
