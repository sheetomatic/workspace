import Link from "next/link";
import { Suspense } from "react";
import { DiaryQuickUpdateList } from "@/components/legal/diary-quick-update";
import { LegalViewsNav } from "@/components/legal/legal-views-nav";
import { PageHeader } from "@/components/saas/page-header";
import { parseLegalNextDate } from "@/lib/legal-cases/parse-next-date";
import { getLegalViewNavCounts, listAllLegalViewCases } from "@/lib/legal-cases/view-queries";
import { requireLegalCasesSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";

function sortByNextDate(cases: Awaited<ReturnType<typeof listAllLegalViewCases>>) {
  return [...cases].sort((a, b) => {
    const da = parseLegalNextDate(a.nextDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const db = parseLegalNextDate(b.nextDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) {
      return da - db;
    }
    return a.fileNumber.localeCompare(b.fileNumber);
  });
}

export default async function DiaryQuickUpdatePage() {
  const user = await requireLegalCasesSession();

  const [cases, counts] = await Promise.all([
    listAllLegalViewCases(user, "diary"),
    getLegalViewNavCounts(user),
  ]);

  const sorted = sortByNextDate(cases);

  return (
    <div className="saas-page legal-list-page legal-diary-quick-page">
      <div className="legal-list-toolbar">
        <div className="legal-list-toolbar-main">
          <Link className="legal-back-link" href="/app/cases/views/diary">
            &larr; Diary
          </Link>
          <PageHeader
            description={`${sorted.length.toLocaleString()} cases — mobile red-pen workflow from voice note 3. Tap Done after court, or No-show for B/C/D/E marks.`}
            title="Diary quick update"
          />
        </div>
      </div>

      <Suspense fallback={null}>
        <LegalViewsNav counts={counts} />
      </Suspense>

      <section className="legal-panel legal-panel-compact">
        <DiaryQuickUpdateList items={sorted} />
      </section>
    </div>
  );
}
