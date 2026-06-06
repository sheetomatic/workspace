import type { ReactNode } from "react";

export function TaskPageToolbar({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ws-sf-page-toolbar">
      <div className="ws-sf-page-toolbar-copy">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="ws-sf-page-toolbar-actions">{actions}</div> : null}
    </header>
  );
}
