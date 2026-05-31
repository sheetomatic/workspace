"use client";

import { assigneeInitials } from "@/lib/tasks";

type Member = {
  id: string;
  name: string;
  email: string;
};

export function TaskMemberPicker({
  members,
  selectedIds,
  onChange,
}: {
  members: Member[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }
    onChange([...selectedIds, id]);
  }

  function selectAll() {
    onChange(members.map((member) => member.id));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="ws-member-picker">
      <div className="ws-member-picker-toolbar">
        <span className="ws-member-picker-count">
          {selectedIds.length} selected
        </span>
        <div className="ws-member-picker-actions">
          <button
            className="ws-member-picker-link"
            type="button"
            onClick={selectAll}
          >
            Select all
          </button>
          <button
            className="ws-member-picker-link"
            type="button"
            onClick={clearAll}
          >
            Clear
          </button>
        </div>
      </div>

      <ul className="ws-member-picker-list">
        {members.map((member) => {
          const checked = selectedIds.includes(member.id);
          const label = member.name || member.email.split("@")[0];

          return (
            <li key={member.id}>
              <button
                aria-pressed={checked}
                className={`ws-member-picker-item${checked ? " is-selected" : ""}`}
                type="button"
                onClick={() => toggle(member.id)}
              >
                <span className="ws-member-picker-avatar">
                  {assigneeInitials(member.name, member.email)}
                </span>
                <span className="ws-member-picker-meta">
                  <strong>{label}</strong>
                  <span>{member.email}</span>
                </span>
                <span aria-hidden className="ws-member-picker-check">
                  {checked ? "✓" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selectedIds.map((id) => (
        <input key={id} name="assigneeUserIds" type="hidden" value={id} />
      ))}

      <p className="ws-member-picker-hint">
        Each selected person gets their own copy of this task.
      </p>
    </div>
  );
}
