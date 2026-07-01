"use client";

import Link from "next/link";

export function AttendanceSiteToolbar({
  sites,
  activeSiteId,
  stats,
}: {
  sites: Array<{ id: string; name: string }>;
  activeSiteId: string | null;
  stats: { present: number; absent: number; onLeave: number };
}) {
  return (
    <section className="ws-attendance-site-toolbar">
      {sites.length > 0 ? (
        <div className="ws-attendance-site-pills" role="tablist" aria-label="Work sites">
        <Link
          className={
            activeSiteId
              ? "ws-attendance-site-pill"
              : "ws-attendance-site-pill is-active"
          }
          href="/app/hr/attendance"
        >
          All sites
        </Link>
        {sites.map((site) => (
          <Link
            key={site.id}
            className={
              activeSiteId === site.id
                ? "ws-attendance-site-pill is-active"
                : "ws-attendance-site-pill"
            }
            href={`/app/hr/attendance?site=${site.id}`}
          >
            {site.name}
          </Link>
        ))}
        </div>
      ) : null}
      <div className="ws-attendance-pal-stats">
        <div className="ws-attendance-pal-card present">
          <span>Present</span>
          <strong>{stats.present}</strong>
        </div>
        <div className="ws-attendance-pal-card absent">
          <span>Absent</span>
          <strong>{stats.absent}</strong>
        </div>
        <div className="ws-attendance-pal-card leave">
          <span>Leave</span>
          <strong>{stats.onLeave}</strong>
        </div>
      </div>
    </section>
  );
}
