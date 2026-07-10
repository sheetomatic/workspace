import Link from "next/link";

function attendanceHref(opts: { siteId?: string | null; month?: string | null }) {
  const params = new URLSearchParams();
  if (opts.month) {
    params.set("month", opts.month);
  }
  if (opts.siteId) {
    params.set("site", opts.siteId);
  }
  const qs = params.toString();
  return qs ? `/app/hr/attendance?${qs}` : "/app/hr/attendance";
}

export function AttendanceSiteToolbar({
  sites,
  activeSiteId,
  month,
  stats,
}: {
  sites: Array<{ id: string; name: string }>;
  activeSiteId: string | null;
  month?: string | null;
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
          href={attendanceHref({ month })}
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
            href={attendanceHref({ siteId: site.id, month })}
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
