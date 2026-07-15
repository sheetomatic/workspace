import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { LeaveBalanceCards } from "@/components/hr/leave-balance-cards";
import { LeaveApplyPanel } from "@/components/hr/leave-apply-panel";
import { OdWfhPanel } from "@/components/hr/od-wfh-panel";
import { LeaveSwapPanel } from "@/components/hr/leave-swap-panel";
import { LeaveAllocationPanel } from "@/components/hr/leave-allocation-panel";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import {
  getOrCreateHrSettings,
  listLeaveBalancesForPage,
  listLeaveRequests,
} from "@/lib/hr/hr-store";
import { resolveEnabledHrSubModules, requireHrSubModule } from "@/lib/hr/hr-sub-modules";
import { listLeaveBalances, resolveLeavePolicyDays } from "@/lib/hr/payroll";
import { listAttendanceExceptions } from "@/lib/hr/attendance-exceptions";
import { listSwapRequests } from "@/lib/hr/swap-requests";
import { listAssignableMembers } from "@/lib/tasks";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

const LEAVE_TABS = [
  {
    id: "balances",
    label: "Balances",
    description: "Leave balances and yearly entitlement summary.",
  },
  {
    id: "apply",
    label: "Apply",
    description: "Submit a new leave request.",
  },
  {
    id: "requests",
    label: "Requests",
    description: "Review leave request status and approvals.",
  },
  {
    id: "od-wfh",
    label: "OD / WFH",
    description: "On-duty and work-from-home requests.",
  },
  {
    id: "swaps",
    label: "Swaps",
    description: "Leave swap and off-day swap requests.",
  },
] as const;

type LeaveTabId = (typeof LEAVE_TABS)[number]["id"] | "allocation";

function resolveLeaveTab(raw: string | undefined, isAdmin: boolean): LeaveTabId {
  if (raw === "allocation" && isAdmin) {
    return "allocation";
  }
  if (LEAVE_TABS.some((tab) => tab.id === raw)) {
    return raw as LeaveTabId;
  }
  return "balances";
}

function LeaveTabNav({
  activeTab,
  isAdmin,
}: {
  activeTab: LeaveTabId;
  isAdmin: boolean;
}) {
  const tabs = isAdmin
    ? [
        ...LEAVE_TABS,
        {
          id: "allocation",
          label: "Policy & allocation",
          description: "Admin leave policy and employee allocation.",
        },
      ]
    : LEAVE_TABS;

  return (
    <nav className="ws-hr-leave-tabs" aria-label="Leave sub modules">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/app/hr/leave?tab=${tab.id}`}
          className={
            activeTab === tab.id
              ? "ws-hr-leave-tab is-active"
              : "ws-hr-leave-tab"
          }
        >
          <strong>{tab.label}</strong>
          <span>{tab.description}</span>
        </Link>
      ))}
    </nav>
  );
}

export default async function HrLeavePage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "HR" });
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  const year = new Date().getFullYear();
  const params = await searchParams;
  const activeTab = resolveLeaveTab(params.tab, isAdmin);

  const [requests, balances, exceptions, swaps, policies, allocBalances, members, hrSettings] =
    await Promise.all([
      listLeaveRequests(user.organizationId, isManager ? undefined : user.id),
      listLeaveBalances(user.organizationId, user.id, year),
      listAttendanceExceptions(
        user.organizationId,
        isManager ? undefined : { userId: user.id },
      ),
      listSwapRequests(
        user.organizationId,
        isManager ? undefined : { userId: user.id },
      ),
      isAdmin
        ? resolveLeavePolicyDays(user.organizationId, year)
        : Promise.resolve({} as Awaited<ReturnType<typeof resolveLeavePolicyDays>>),
      isAdmin
        ? listLeaveBalancesForPage(user.organizationId, {
            viewerUserId: user.id,
            includeAllMembers: true,
            year,
          })
        : Promise.resolve([]),
      isAdmin
        ? listAssignableMembers(user.organizationId)
        : Promise.resolve([]),
      getOrCreateHrSettings(user.organizationId),
    ]);

  if (!requireHrSubModule(hrSettings.enabledHrSubModules, "leave")) {
    redirect("/app/hr");
  }

  const enabledSubModules = resolveEnabledHrSubModules(
    hrSettings.enabledHrSubModules,
  );

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Leave"
        description="Balances, leave, OD/WFH, leave/off-day swaps, and manager approvals."
      />
      <HrSubNav
        activePath="/app/hr/leave"
        isAdmin={isAdmin}
        enabledSubModules={enabledSubModules}
      />

      <LeaveTabNav activeTab={activeTab} isAdmin={isAdmin} />

      {activeTab === "balances" ? (
        <>
          <LeaveBalanceCards
            year={year}
            balances={balances.map((row) => ({
              leaveType: row.leaveType,
              balanceDays: row.balanceDays,
              usedDays: row.usedDays,
            }))}
          />
          <div className="ws-hr-module-grid">
            <Link className="ws-hr-module-card" href="/app/hr/leave?tab=apply">
              <strong>Apply for leave</strong>
              <p>Submit casual, sick, earned, unpaid, or comp-off leave.</p>
            </Link>
            <Link className="ws-hr-module-card" href="/app/hr/leave?tab=requests">
              <strong>{isManager ? "Team requests" : "My requests"}</strong>
              <p>Track request status and manager approvals without scrolling.</p>
            </Link>
            <Link className="ws-hr-module-card" href="/app/hr/leave?tab=od-wfh">
              <strong>OD / WFH</strong>
              <p>Mark client travel, official duty, or work-from-home separately.</p>
            </Link>
            <Link className="ws-hr-module-card" href="/app/hr/leave?tab=swaps">
              <strong>Swaps</strong>
              <p>Request leave-day and weekly-off swaps.</p>
            </Link>
          </div>
        </>
      ) : null}

      {activeTab === "allocation" && isAdmin ? (
        <LeaveAllocationPanel
          year={year}
          policies={Object.entries(policies).map(([leaveType, defaultDays]) => ({
            leaveType,
            defaultDays,
          }))}
          members={members.map((m) => ({
            userId: m.id,
            name: m.name,
          }))}
          balances={allocBalances
            .filter((row) => row.leaveType !== "UNPAID")
            .map((row) => ({
              userId: row.userId,
              leaveType: row.leaveType,
              balanceDays: row.balanceDays,
              usedDays: row.usedDays,
            }))}
        />
      ) : null}

      {activeTab === "apply" ? (
        <LeaveApplyPanel
          mode="apply"
          isManager={isManager}
          viewerUserId={user.id}
          requests={[]}
        />
      ) : null}

      {activeTab === "requests" ? (
        <LeaveApplyPanel
          mode="requests"
          isManager={isManager}
          viewerUserId={user.id}
          requests={requests.map((req) => ({
            id: req.id,
            userId: req.userId,
            leaveType: req.leaveType,
            startDate: req.startDate,
            endDate: req.endDate,
            days: req.days,
            status: req.status,
            user: req.user,
          }))}
        />
      ) : null}

      {activeTab === "od-wfh" ? (
        <OdWfhPanel
          isManager={isManager}
          viewerUserId={user.id}
          requests={exceptions.map((req) => ({
            id: req.id,
            userId: req.userId,
            exceptionType: req.exceptionType,
            startDate: req.startDate,
            endDate: req.endDate,
            reason: req.reason,
            status: req.status,
            user: req.user,
          }))}
        />
      ) : null}

      {activeTab === "swaps" ? (
        <LeaveSwapPanel
          isManager={isManager}
          viewerUserId={user.id}
          requests={swaps.map((req) => ({
            id: req.id,
            userId: req.userId,
            swapType: req.swapType,
            fromDate: req.fromDate,
            toDate: req.toDate,
            reason: req.reason,
            status: req.status,
            user: req.user,
          }))}
        />
      ) : null}
    </div>
  );
}
