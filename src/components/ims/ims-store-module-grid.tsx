import Link from "next/link";
import type { StoreModuleDef } from "@/lib/ims/store-modules";

export function ImsStoreModuleGrid({
  title,
  modules,
}: {
  title: string;
  modules: StoreModuleDef[];
}) {
  return (
    <section className="ws-ims-panel">
      <h2>{title}</h2>
      <div className="ws-ims-module-grid">
        {modules.map((mod) => {
          const href = mod.href ?? `/app/ims/roadmap/${mod.id}`;
          const isPhase2 = mod.status === "phase2";

          return (
            <Link
              key={mod.id}
              className={`ws-ims-module-card${isPhase2 ? " ws-ims-module-card-phase2" : ""}`}
              href={href}
            >
              <strong>{mod.label}</strong>
              <p>{mod.description}</p>
              {isPhase2 ? (
                <span className="ws-ims-pill ws-ims-pill-orange">Phase 2</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
