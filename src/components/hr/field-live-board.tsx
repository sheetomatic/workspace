export type FieldLivePing = {
  userId: string;
  name: string;
  checkedInAt: Date | string;
  clientName: string | null;
  geoLat: number;
  geoLng: number;
  checkInCount: number;
  openVisits: number;
  /** True when latest point came from live page ping (not a visit check-in). */
  isLivePing?: boolean;
};

function formatTime(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function FieldLiveBoard({ pings }: { pings: FieldLivePing[] }) {
  return (
    <section className="ws-hr-panel" aria-label="Field live board">
      <div className="ws-ims-panel-head">
        <h2>Live board — today</h2>
        <span className="ws-apple-cell-secondary">
          {pings.length} executive{pings.length === 1 ? "" : "s"} on map
        </span>
      </div>
      <p className="ws-hr-help">
        Latest GPS per field executive today — visit check-ins and{" "}
        <strong>Live while app open</strong> pings. Not background tracking.
      </p>
      <div className="ws-hr-table-wrap">
        <table className="ws-hr-table">
          <thead>
            <tr>
              <th>Executive</th>
              <th>Last ping</th>
              <th>Source</th>
              <th>Client</th>
              <th>Check-ins</th>
              <th>Open visits</th>
              <th>Map</th>
            </tr>
          </thead>
          <tbody>
            {pings.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  No field check-ins or live pings today yet.
                </td>
              </tr>
            ) : (
              pings.map((ping) => (
                <tr key={ping.userId}>
                  <td>
                    <strong>{ping.name}</strong>
                  </td>
                  <td>{formatTime(ping.checkedInAt)}</td>
                  <td>
                    {ping.isLivePing ? (
                      <span className="ws-hr-live-badge">Live while app open</span>
                    ) : (
                      "Check-in"
                    )}
                  </td>
                  <td>{ping.clientName ?? "—"}</td>
                  <td>{ping.checkInCount}</td>
                  <td>{ping.openVisits}</td>
                  <td>
                    <a
                      className="btn-secondary btn-sm"
                      href={`https://www.google.com/maps?q=${ping.geoLat},${ping.geoLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ping.geoLat.toFixed(4)}, {ping.geoLng.toFixed(4)}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
