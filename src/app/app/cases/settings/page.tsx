import Link from "next/link";
import { LegalCasesSettingsPanel } from "@/components/legal/legal-cases-settings-panel";
import { PageHeader } from "@/components/saas/page-header";
import { loadLegalCasesSettingsBackupMeta } from "@/app/app/cases/settings-actions";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";
import "@/components/legal/legal-cases.css";

export default async function CasesSettingsPage() {
  const user = await requireSession(undefined, { module: "CASES" });
  if (!isLegalAdmin(user)) {
    return (
      <div className="saas-page">
        <p>Only managers and admins can open Cases settings.</p>
        <Link href="/app/cases">Back to cases</Link>
      </div>
    );
  }

  let organization: {
    legalSheetHeaderRow: number;
  } | null = null;
  let caseCount = 0;
  let backup: Awaited<ReturnType<typeof loadLegalCasesSettingsBackupMeta>> = null;

  try {
    [organization, caseCount, backup] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          legalSheetHeaderRow: true,
        },
      }),
      prisma.legalCase.count({ where: { organizationId: user.organizationId } }),
      loadLegalCasesSettingsBackupMeta(),
    ]);
  } catch (error) {
    console.error("[cases-settings] bootstrap failed", error);
    throw error;
  }

  return (
    <div className="saas-page legal-cases-settings-page">
      <div className="legal-cases-settings-topbar">
        <Link className="btn-ghost" href="/app/cases">
          Back to cases
        </Link>
      </div>

      <PageHeader
        description="Import, export, restore, and edit cases for the whole firm."
        title="Global settings"
      />

      <LegalCasesSettingsPanel
        settings={{
          legalSheetHeaderRow: organization?.legalSheetHeaderRow ?? 1,
          caseCount,
          backup: backup
            ? {
                caseCount: backup.caseCount,
                sourceFilename: backup.sourceFilename,
                createdAt: backup.createdAt.toISOString(),
              }
            : null,
        }}
      />
    </div>
  );
}
