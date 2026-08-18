import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { normalizeGroupJoinUrl } from "@/lib/learn/group-class";

function newGroupKey() {
  return `grp_${randomBytes(8).toString("hex")}`;
}

async function loadManageableEnrollments(params: {
  enrollmentIds: string[];
  organizationId: string;
  isSuperAdmin?: boolean;
}) {
  const ids = [...new Set(params.enrollmentIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { ok: false as const, message: "Select at least one student." };
  }

  const rows = await prisma.courseEnrollment.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      organizationId: true,
      inboundLeadId: true,
    },
  });
  if (rows.length !== ids.length) {
    return { ok: false as const, message: "One or more students were not found." };
  }

  if (params.isSuperAdmin) {
    return { ok: true as const, rows };
  }

  const leadIds = rows
    .map((row) => row.inboundLeadId)
    .filter((id): id is string => Boolean(id));
  const leadsInOrg =
    leadIds.length > 0
      ? await prisma.inboundLead.findMany({
          where: {
            id: { in: leadIds },
            organizationId: params.organizationId,
          },
          select: { id: true },
        })
      : [];
  const leadSet = new Set(leadsInOrg.map((lead) => lead.id));
  const allowed = rows.filter(
    (row) =>
      row.organizationId === params.organizationId ||
      (row.inboundLeadId != null && leadSet.has(row.inboundLeadId)),
  );
  if (allowed.length !== rows.length) {
    return { ok: false as const, message: "One or more students were not found." };
  }
  return { ok: true as const, rows };
}

export async function assignTrainingGroupClass(params: {
  enrollmentIds: string[];
  organizationId: string;
  isSuperAdmin?: boolean;
  groupMeetUrl: string;
  groupLabel?: string | null;
}) {
  const groupMeetUrl = normalizeGroupJoinUrl(params.groupMeetUrl);
  if (!groupMeetUrl) {
    return {
      ok: false as const,
      message: "Enter a valid https join link (Google Meet, Zoom, or Daily).",
    };
  }

  const loaded = await loadManageableEnrollments(params);
  if (!loaded.ok) return loaded;

  const groupLabel = params.groupLabel?.trim().slice(0, 80) || null;
  const groupKey = newGroupKey();

  await prisma.courseEnrollment.updateMany({
    where: { id: { in: loaded.rows.map((row) => row.id) } },
    data: { groupMeetUrl, groupLabel, groupKey },
  });

  const names = loaded.rows.map((row) => row.name).join(", ");
  return {
    ok: true as const,
    groupMeetUrl,
    groupKey,
    count: loaded.rows.length,
    message: `Group class link saved for ${loaded.rows.length} student${loaded.rows.length === 1 ? "" : "s"}${names ? ` (${names})` : ""}.`,
  };
}

export async function clearTrainingGroupClass(params: {
  enrollmentIds: string[];
  organizationId: string;
  isSuperAdmin?: boolean;
}) {
  const loaded = await loadManageableEnrollments(params);
  if (!loaded.ok) return loaded;

  await prisma.courseEnrollment.updateMany({
    where: { id: { in: loaded.rows.map((row) => row.id) } },
    data: { groupMeetUrl: null, groupLabel: null, groupKey: null },
  });

  return {
    ok: true as const,
    count: loaded.rows.length,
    message: `Removed group class from ${loaded.rows.length} student${loaded.rows.length === 1 ? "" : "s"}.`,
  };
}
