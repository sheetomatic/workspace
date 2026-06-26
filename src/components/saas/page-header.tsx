import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={`ws-page-header${actions ? " has-actions" : ""}`}>
      <div className="ws-page-header-copy">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="ws-page-header-actions">{actions}</div> : null}
    </header>
  );
}
