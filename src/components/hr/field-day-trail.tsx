export type FieldTrailPoint = {
  id: string;
  checkedInAt: Date | string;
  clientName: string | null;
  activityNote: string | null;
  geoLat: number;
  geoLng: number;
  isLivePing?: boolean;
};

function formatStamp(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function formatKm(km: number) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function FieldDayTrail({
  title,
  points,
}: {
  title: string;
  points: FieldTrailPoint[];
}) {
  const legs = points.map((point, index) => {
    if (index === 0) {
      return 0;
    }
    const previous = points[index - 1]!;
    return haversineKm(previous.geoLat, previous.geoLng, point.geoLat, point.geoLng);
  });
  const totalKm = legs.reduce((sum, leg) => sum + leg, 0);

  return (
    <section className="ws-hr-panel" aria-label="Field day trail">
      <div className="ws-hr-panel-heading">
        <div>
          <h2>{title}</h2>
          <p className="ws-hr-help">
            {points.length > 1
              ? `Total run today: ${formatKm(totalKm)} across ${points.length - 1} legs.`
              : "Add at least two GPS points to calculate total KM."}
          </p>
        </div>
        {points.length > 1 ? (
          <span className="ws-hr-km-pill">{formatKm(totalKm)}</span>
        ) : null}
      </div>
      {points.length === 0 ? (
        <p className="ws-hr-note">No check-ins or live pings on this trail yet.</p>
      ) : (
        <ol className="ws-hr-field-trail">
          {points.map((point, index) => (
            <li key={point.id} className="ws-hr-field-trail-item">
              <span className="ws-hr-field-trail-step" aria-hidden>
                {index + 1}
              </span>
              <div>
                <strong>{formatStamp(point.checkedInAt)}</strong>
                {point.isLivePing ? (
                  <span className="ws-hr-live-badge">Live while app open</span>
                ) : null}
                <div className="ws-apple-cell-secondary">
                  {point.isLivePing
                    ? "Live ping"
                    : (point.clientName ?? "Field check-in")}{" "}
                  · {point.geoLat.toFixed(4)}, {point.geoLng.toFixed(4)}
                </div>
                {index > 0 ? (
                  <p className="ws-hr-meta">
                    Point {index} → {index + 1}: {formatKm(legs[index] ?? 0)}
                  </p>
                ) : null}
                {point.activityNote && !point.isLivePing ? (
                  <p>{point.activityNote}</p>
                ) : null}
                <a
                  className="btn-secondary btn-sm"
                  href={`https://www.google.com/maps?q=${point.geoLat},${point.geoLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open map
                </a>
              </div>
            </li>
          ))}
        </ol>
      )}
      {points.length > 1 ? (
        <p className="ws-hr-note">
          <a
            href={`https://www.google.com/maps/dir/${points
              .map((p) => `${p.geoLat},${p.geoLng}`)
              .join("/")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open full day route on Maps
          </a>
        </p>
      ) : null}
    </section>
  );
}
