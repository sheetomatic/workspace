import type { RecordedRouteDistance } from "@/lib/hr/field-distance";

export type FieldDistanceRow = {
  userId: string;
  name: string;
  distance: RecordedRouteDistance;
};

function formatRange(from: Date | null, through: Date | null) {
  if (!from || !through) return "No valid GPS pings today";
  const format = (value: Date) =>
    value.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  return `${format(from)}–${format(through)} IST`;
}

export function FieldDistanceBoard({
  rows,
  title = "Distance recorded today",
}: {
  rows: FieldDistanceRow[];
  title?: string;
}) {
  return (
    <section className="ws-hr-panel" aria-label={title}>
      <div className="ws-ims-panel-head">
        <h2>{title}</h2>
        <span className="ws-apple-cell-secondary">Asia/Kolkata</span>
      </div>
      <p className="ws-hr-help">
        Partial GPS path estimate from the first to last valid live ping captured
        about every 45 seconds while Field is open. We sum straight-line segments between nearby pings;
        gaps over 3 minutes and inaccurate or mock points are omitted. This is
        not an odometer or full-day travel total.
      </p>
      <div className="ws-hr-table-wrap">
        <table className="ws-hr-table">
          <thead>
            <tr>
              <th>Executive</th>
              <th>Recorded path estimate</th>
              <th>Valid points</th>
              <th>Omitted gaps</th>
              <th>GPS coverage window</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No field executives available.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.userId}>
                  <td><strong>{row.name}</strong></td>
                  <td>
                    {row.distance.distanceKm == null
                      ? "Not enough continuous GPS data"
                      : `${row.distance.distanceKm.toFixed(2)} km · partial`}
                  </td>
                  <td>{row.distance.acceptedPoints}</td>
                  <td>{row.distance.omittedGaps}</td>
                  <td>{formatRange(row.distance.sampledFrom, row.distance.sampledThrough)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="ws-hr-help">
        Check-in locations are excluded from distance because they are too sparse
        to estimate travel. A blank estimate means the minimum sample threshold
        has not been met.
      </p>
    </section>
  );
}
