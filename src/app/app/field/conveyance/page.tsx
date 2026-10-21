import { redirect } from "next/navigation";
import { PageHeader } from "@/components/saas/page-header";
import { FieldSubNav } from "@/components/hr/field-sub-nav";
import { FieldConveyanceWorkspace } from "@/components/hr/field-conveyance-workspace";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getEffectiveHrSubModulesForUser } from "@/lib/hr/hr-access";
import { getFieldConveyanceActor } from "@/lib/hr/field-conveyance-access";
import { isFieldDirectorRole } from "@/lib/hr/field-conveyance-rules";
import { listFieldConveyanceClaims } from "@/lib/hr/field-conveyance-store";
import { listFieldVisits } from "@/lib/hr/hr-store";
import { listTodayRecordedDistances } from "@/lib/hr/field-pings";

export default async function FieldConveyancePage() {
  const user = await requireSession(undefined, { module: "HR" });
  const [hrAccess, actor] = await Promise.all([
    getEffectiveHrSubModulesForUser(user),
    getFieldConveyanceActor(user),
  ]);
  if (!hrAccess.allowed("field") || !actor) redirect("/app/field");

  const canApprove = hasMinimumRole(user.role, "MANAGER");
  const canPay =
    isFieldDirectorRole(actor.role) ||
    (actor.department === "ACCOUNTS" && actor.role !== "VIEWER");

  const claimRequests: Promise<Awaited<ReturnType<typeof listFieldConveyanceClaims>>>[] = [];
  if (canApprove) {
    claimRequests.push(listFieldConveyanceClaims(user.organizationId, { limit: 100 }));
  } else {
    claimRequests.push(listFieldConveyanceClaims(user.organizationId, { claimantUserId: user.id, limit: 100 }));
    if (canPay) {
      claimRequests.push(listFieldConveyanceClaims(user.organizationId, {
        statuses: ["APPROVED", "PAID"],
        limit: 100,
      }));
    }
  }

  const [claimGroups, visits, todayDistances] = await Promise.all([
    Promise.all(claimRequests),
    listFieldVisits(user.organizationId),
    listTodayRecordedDistances(user.organizationId, [user.id]),
  ]);
  const claimsById = new Map(claimGroups.flat().map((claim) => [claim.id, claim]));
  const claims = [...claimsById.values()].sort(
    (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
  );

  const viewClaims = claims.map((claim) => ({
    id: claim.id,
    claimantUserId: claim.claimantUserId,
    claimantName: claim.claimant.name ?? claim.claimant.email,
    visitId: claim.visitId,
    visitName: claim.visit?.clientName ?? null,
    claimDate: claim.claimDate.toISOString().slice(0, 10),
    claimedDistanceKm: claim.claimedDistanceKm,
    amount: claim.amount,
    journeyDetails: claim.journeyDetails,
    status: claim.status,
    revision: claim.revision,
    reviewedByUserId: claim.reviewedByUserId,
    reviewerName: claim.reviewedBy?.name ?? claim.reviewedBy?.email ?? null,
    reviewedAt: claim.reviewedAt?.toISOString() ?? null,
    rejectionReason: claim.rejectionReason,
    paidByName: claim.paidBy?.name ?? claim.paidBy?.email ?? null,
    paidAt: claim.paidAt?.toISOString() ?? null,
    paymentReference: claim.paymentReference,
    attachments: claim.attachments.map((attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      submissionRound: attachment.submissionRound,
      fileName: attachment.fileName,
      downloadUrl: attachment.downloadUrl,
    })),
    auditEvents: claim.auditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
      actorName: event.actor.name ?? event.actor.email,
    })),
  }));

  const visitOptions = visits
    .filter((visit) => visit.assigneeUserId === user.id)
    .map((visit) => ({
      id: visit.id,
      clientName: visit.clientName,
      plannedAt: visit.plannedAt?.toISOString() ?? null,
    }));

  return (
    <div className="workspace-app">
      <PageHeader
        title="Field conveyance"
        description="Submit journey claims, review proof, and record Accounts payment status."
      />
      <FieldSubNav activePath="/app/field/conveyance" />
      <FieldConveyanceWorkspace
        actorUserId={user.id}
        canApprove={canApprove}
        canPay={canPay}
        claims={viewClaims}
        visits={visitOptions}
        todayEstimate={todayDistances[user.id]}
      />
    </div>
  );
}
