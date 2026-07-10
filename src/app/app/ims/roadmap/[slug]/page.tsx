import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import {
  STORE_DASHBOARD_MODULES,
  STORE_MASTER_MODULES,
  STORE_REPORT_MODULES,
} from "@/lib/ims/store-modules";

const ALL_MODULES = [
  ...STORE_DASHBOARD_MODULES,
  ...STORE_MASTER_MODULES,
  ...STORE_REPORT_MODULES,
];

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ImsRoadmapPage({ params }: PageProps) {
  const { slug } = await params;
  const mod = ALL_MODULES.find((entry) => entry.id === slug);

  if (!mod || mod.status !== "phase2") {
    notFound();
  }

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title={mod.label}
        description={mod.description}
        actions={
          <Link href="/app/ims" className="ws-btn ws-btn-ghost">
            Store dashboard
          </Link>
        }
      />

      <section className="ws-ims-panel">
        <p className="ws-ims-help">
          <strong>{mod.label}</strong> is planned for Phase 2. Current live flows: MR, GRN, MIN,
          stock register, and item/vendor masters.
        </p>
        <p className="ws-ims-help">
          Need this sooner? Tell your admin — we prioritise by EM exceptions (reorder breaches,
          pending approvals, SLA delays).
        </p>
      </section>
    </div>
  );
}
