"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import {
  DEFAULT_FOCUSED_NAV_IDS,
  DEFAULT_WORKSPACE_NAV_PREFS,
  parseWorkspaceNavPrefs,
  type WorkspaceNavPrefs,
  type WorkspaceNavPrefsMode,
} from "@/lib/workspace-nav-prefs";
import { listNavPreferenceOptions } from "@/lib/workspace-navigation";

function revalidateNavPrefs() {
  ["/app", "/app/settings"].forEach((path) => revalidatePath(path));
}

async function updateMembershipPrefs(prefs: WorkspaceNavPrefs) {
  const user = await requireSession();

  if (user.isSuperAdmin) {
    // Super-admins may lack a Membership row for the active org.
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.organizationId,
        },
      },
      select: { id: true },
    });
    if (!membership) {
      return { ok: false as const, error: "No membership for this workspace." };
    }
  }

  await prisma.membership.update({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: user.organizationId,
      },
    },
    data: { workspacePrefs: prefs as unknown as Prisma.InputJsonValue },
  });

  revalidateNavPrefs();
  return { ok: true as const };
}

export async function getWorkspaceNavPrefsForUser() {
  const user = await requireSession();
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: user.organizationId,
      },
    },
    select: { workspacePrefs: true },
  });

  return parseWorkspaceNavPrefs(membership?.workspacePrefs);
}

export async function saveWorkspaceNavPrefs(formData: FormData) {
  const user = await requireSession();
  const modeRaw = String(formData.get("mode") ?? "focus");
  const mode: WorkspaceNavPrefsMode =
    modeRaw === "all" || modeRaw === "custom" || modeRaw === "focus"
      ? modeRaw
      : "focus";

  const allowed = new Set(
    listNavPreferenceOptions({
      user,
      organizationSlug: user.organizationSlug,
    }).map((option) => option.id),
  );

  const visibleIds = formData
    .getAll("visibleId")
    .map((value) => String(value))
    .filter((id) => allowed.has(id));

  const prefs: WorkspaceNavPrefs = {
    version: 1,
    mode,
    visibleIds:
      mode === "custom"
        ? visibleIds
        : mode === "focus"
          ? [...DEFAULT_FOCUSED_NAV_IDS]
          : [...allowed],
  };

  return updateMembershipPrefs(prefs);
}

export async function setWorkspaceNavPrefsMode(mode: WorkspaceNavPrefsMode) {
  const user = await requireSession();
  const current = await getWorkspaceNavPrefsForUser();
  const allowed = listNavPreferenceOptions({
    user,
    organizationSlug: user.organizationSlug,
  }).map((option) => option.id);

  const prefs: WorkspaceNavPrefs = {
    version: 1,
    mode,
    visibleIds:
      mode === "custom"
        ? current.visibleIds.length > 0
          ? current.visibleIds
          : [...DEFAULT_FOCUSED_NAV_IDS]
        : mode === "focus"
          ? [...DEFAULT_FOCUSED_NAV_IDS]
          : allowed,
  };

  return updateMembershipPrefs(prefs);
}

export async function resetWorkspaceNavPrefs() {
  return updateMembershipPrefs({ ...DEFAULT_WORKSPACE_NAV_PREFS });
}
