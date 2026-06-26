"use client";

import { useMemo, useState } from "react";
import { CheckSquare, ChevronRight } from "lucide-react";
import {
  PC_LIBRARY_TEMPLATES,
  listPcLibraryCategories,
  type PcLibraryTemplate,
} from "@/lib/checklists/pc-template-library";

function TemplateCard({ template }: { template: PcLibraryTemplate }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="ws-sf-card ws-pc-library-card">
      <header className="ws-pc-library-card-head">
        <div>
          <span className="ws-pc-library-category">{template.category}</span>
          <h3>{template.name}</h3>
          <p>{template.summary}</p>
        </div>
        <button
          type="button"
          className="ws-pc-library-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Collapse" : "Expand"}
          <ChevronRight size={16} aria-hidden className={open ? "is-open" : undefined} />
        </button>
      </header>

      {open ? (
        <div className="ws-pc-library-card-body">
          <section aria-label="Checklist items">
            <h4>Checklist items</h4>
            <div className="ws-sf-table-wrap">
              <table className="ws-fms-data-table ws-sf-data-table ws-pc-library-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Activity</th>
                    <th>Frequency</th>
                    <th>Owner</th>
                    <th>Proof</th>
                    <th>TAT</th>
                  </tr>
                </thead>
                <tbody>
                  {template.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.order}</td>
                      <td>{item.activity}</td>
                      <td>
                        <span className="ws-pc-library-freq">{item.frequency}</span>
                      </td>
                      <td>{item.ownerRole}</td>
                      <td className="ws-pc-library-proof">{item.proof}</td>
                      <td>{item.tat ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}

export function PcTemplateLibraryBoard() {
  const categories = listPcLibraryCategories();
  const [category, setCategory] = useState<string>("ALL");

  const filtered = useMemo(() => {
    if (category === "ALL") {
      return PC_LIBRARY_TEMPLATES;
    }
    return PC_LIBRARY_TEMPLATES.filter((template) => template.category === category);
  }, [category]);

  const totalItems = PC_LIBRARY_TEMPLATES.reduce(
    (sum, template) => sum + template.items.length,
    0,
  );

  return (
    <div className="ws-pc-library-board">
      <section className="ws-pc-library-hero" aria-label="PC template library overview">
        <div>
          <p className="ws-pc-library-eyebrow">
            <CheckSquare size={14} aria-hidden />
            AI template library
          </p>
          <h2>Department PC starters</h2>
          <p>
            Standard operating checklists with proof and TAT. Activate in
            Sheetomatic for live runs, email reminders, and EM deficit scoring.
          </p>
        </div>
        <div className="ws-pc-library-hero-stat">
          <span>Templates</span>
          <strong>{PC_LIBRARY_TEMPLATES.length}</strong>
          <span className="ws-stat-card-hint">{totalItems} checklist points</span>
        </div>
      </section>

      <div className="ws-task-filter-bar ws-pc-library-filter">
        <div className="ws-filter-group">
          <span className="ws-filter-group-label">Category</span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="Filter by category"
              className="ws-filter-select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="ALL">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
        <span className="ws-pc-library-filter-count">
          {filtered.length} template{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="ws-pc-library-grid">
        {filtered.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}
