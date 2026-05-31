"use client";

import {
  WEEKDAY_OPTIONS,
  defaultWeeklyDaysFromDue,
  parseMonthDayFromForm,
  serializeWeeklyDays,
} from "@/lib/task-schedule";

type Props = {
  frequency: string;
  weeklyDays: number[];
  monthDay: number;
  onWeeklyDaysChange: (days: number[]) => void;
  onMonthDayChange: (day: number) => void;
};

export function TaskRecurrenceFields({
  frequency,
  weeklyDays,
  monthDay,
  onWeeklyDaysChange,
  onMonthDayChange,
}: Props) {
  function toggleWeekday(day: number) {
    if (weeklyDays.includes(day)) {
      const next = weeklyDays.filter((d) => d !== day);
      onWeeklyDaysChange(next.length ? next : [day]);
      return;
    }
    onWeeklyDaysChange([...weeklyDays, day].sort((a, b) => a - b));
  }

  if (frequency === "WEEKLY") {
    return (
      <div className="ws-recurrence-block">
        <span className="ws-recurrence-label">On days</span>
        <input
          name="recurrenceWeeklyDays"
          type="hidden"
          value={serializeWeeklyDays(weeklyDays)}
        />
        <div className="ws-weekday-pills" role="group" aria-label="Days of week">
          {WEEKDAY_OPTIONS.map((day) => {
            const active = weeklyDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                className={`ws-weekday-pill${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => toggleWeekday(day.value)}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (frequency === "MONTHLY") {
    return (
      <div className="ws-recurrence-block">
        <label className="ws-recurrence-month">
          <span className="ws-recurrence-label">Day of month</span>
          <select
            name="recurrenceMonthDay"
            value={monthDay}
            onChange={(e) =>
              onMonthDayChange(parseMonthDayFromForm(e.target.value))
            }
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  return null;
}

export function initWeeklyDaysFromDue(dueLocal: string): number[] {
  const parsed = dueLocal ? new Date(dueLocal) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return [new Date().getDay()];
  }
  return defaultWeeklyDaysFromDue(parsed);
}

export function initMonthDayFromDue(dueLocal: string): number {
  const parsed = dueLocal ? new Date(dueLocal) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return new Date().getDate();
  }
  return parsed.getDate();
}
