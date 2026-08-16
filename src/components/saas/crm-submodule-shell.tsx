import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";

export type CrmKpi = {
  label: string;
  value: string;
  accent?: "blue" | "warning" | "success" | "danger";
};

export function CrmSubmoduleShell({
  title,
  description,
  kpis,
  children,
  leadsHref = "/app/leads",
}: {
  title: string;
  description: string;
  kpis: CrmKpi[];
  children: React.ReactNode;
  leadsHref?: string | null;
}) {
  return (
    <div className="saas-page leads-machine-page crm-submodule-page">
      <TaskPageToolbar
        title={title}
        description={description}
        actions={
          leadsHref ? (
            <Link href={leadsHref} className="btn-secondary btn-sm">
              All leads
            </Link>
          ) : null
        }
      />
      <section className="crm-submodule-kpis" aria-label={`${title} summary`}>
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className={`crm-submodule-kpi${kpi.accent ? ` accent-${kpi.accent}` : ""}`}
          >
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
          </article>
        ))}
      </section>
      {children}
    </div>
  );
}
