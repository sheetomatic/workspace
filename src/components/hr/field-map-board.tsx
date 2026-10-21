"use client";

import { useMemo, useState } from "react";
import { FieldDayTrail } from "@/components/hr/field-day-trail";

export type FieldMapPoint = {
  id: string;
  userId: string;
  userName: string;
  checkedInAt: string;
  clientName: string | null;
  activityNote: string | null;
  geoLat: number;
  geoLng: number;
  proofUrl?: string | null;
  visitId?: string | null;
  visitStatus?: string | null;
};

type TeamMember = { id: string; name: string };

function istYmd(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function todayIstYmd() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function FieldMapBoard({
  points,
  teamMembers,
  canFilterTeam,
  googleMapsApiKey,
  initialDate,
}: {
  points: FieldMapPoint[];
  teamMembers: TeamMember[];
  canFilterTeam: boolean;
  googleMapsApiKey?: string | null;
  initialDate?: string;
}) {
  const [date, setDate] = useState(initialDate || todayIstYmd());
  const [teamUserId, setTeamUserId] = useState("all");

  const filtered = useMemo(() => {
    return points
      .filter((point) => istYmd(point.checkedInAt) === date)
      .filter((point) => (teamUserId === "all" ? true : point.userId === teamUserId))
      .sort(
        (a, b) =>
          new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime(),
      );
  }, [points, date, teamUserId]);

  const trailTitle =
    canFilterTeam && teamUserId !== "all"
      ? `Map · ${teamMembers.find((member) => member.id === teamUserId)?.name ?? "Executive"} · ${date}`
      : `Map · ${date}`;

  return (
    <section className="ws-hr-panel" aria-label="Field map view">
      <div className="ws-hr-panel-heading">
        <div>
          <h2>Map view</h2>
          <p className="ws-hr-help">
            Visit stamps for the selected day
            {canFilterTeam ? ", filterable by executive (Admin / Manager)." : "."}
          </p>
        </div>
      </div>

      <div className="field-map-filters">
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        {canFilterTeam ? (
          <label>
            Team
            <select
              value={teamUserId}
              onChange={(event) => setTeamUserId(event.target.value)}
            >
              <option value="all">All executives</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="ws-hr-note field-map-filter-count">
          {filtered.length} visit stamp{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="ws-hr-note">No visit stamps for this date and filter.</p>
      ) : (
        <FieldDayTrail
          embedded
          title={trailTitle}
          points={filtered.map((point) => ({
            id: point.id,
            checkedInAt: point.checkedInAt,
            clientName:
              canFilterTeam && teamUserId === "all"
                ? `${point.userName}${point.clientName ? ` · ${point.clientName}` : ""}`
                : point.clientName,
            activityNote: point.visitStatus
              ? `${point.activityNote ? `${point.activityNote} · ` : ""}Visit ${point.visitStatus.replaceAll("_", " ")}`
              : point.activityNote,
            geoLat: point.geoLat,
            geoLng: point.geoLng,
            isLivePing: false,
            proofUrl: point.proofUrl,
          }))}
          googleMapsApiKey={googleMapsApiKey}
        />
      )}
    </section>
  );
}
