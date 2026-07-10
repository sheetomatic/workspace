export type FieldTrailPoint = {
  id: string;
  checkedInAt: Date | string;
  clientName: string | null;
  activityNote: string | null;
  geoLat: number;
  geoLng: number;
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

export function FieldDayTrail({
  title,
  points,
}: {
  title: string;
  points: FieldTrailPoint[];
}) {
  return (
    <section className="ws-hr-panel" aria-label="Field day trail">
      <h2>{title}</h2>
      {points.length === 0 ? (
        <p className="ws-hr-note">No check-ins on this trail yet.</p>
      ) : (
        <ol className="ws-hr-field-trail">
          {points.map((point, index) => (
            <li key={point.id} className="ws-hr-field-trail-item">
              <span className="ws-hr-field-trail-step" aria-hidden>
                {index + 1}
              </span>
              <div>
                <strong>{formatStamp(point.checkedInAt)}</strong>
                <div className="ws-apple-cell-secondary">
                  {point.clientName ?? "Field ping"} · {point.geoLat.toFixed(4)},{" "}
                  {point.geoLng.toFixed(4)}
                </div>
                {point.activityNote ? <p>{point.activityNote}</p> : null}
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
