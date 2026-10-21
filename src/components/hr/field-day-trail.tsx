import {
  buildFieldTourEmbedMaps,
  buildFieldTourMapLinks,
} from "@/lib/hr/field-google-maps";

export type FieldTrailPoint = {
  id: string;
  checkedInAt: Date | string;
  clientName: string | null;
  activityNote: string | null;
  geoLat: number;
  geoLng: number;
  isLivePing?: boolean;
  proofUrl?: string | null;
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
  googleMapsApiKey,
  embedded = false,
}: {
  title: string;
  points: FieldTrailPoint[];
  googleMapsApiKey?: string | null;
  /** When true, skip the outer panel chrome (for nesting inside another panel). */
  embedded?: boolean;
}) {
  const visitedStops = points
    .filter((point) => !point.isLivePing)
    .map((point) => ({ lat: point.geoLat, lng: point.geoLng }));
  const mapLinks = buildFieldTourMapLinks(visitedStops);
  const embeddedMaps = googleMapsApiKey
    ? buildFieldTourEmbedMaps(visitedStops, googleMapsApiKey)
    : [];
  let visitedStopSequence = 0;
  const trailPoints = points.map((point) => ({
    ...point,
    visitedStopNumber: point.isLivePing ? null : ++visitedStopSequence,
  }));

  const body = (
    <>
      {!embedded ? (
        <div className="ws-hr-panel-heading">
          <div>
            <h2>{title}</h2>
            <p className="ws-hr-help">
              Visit location stamps and timestamps. Travel distance is estimated separately from continuous live GPS pings.
            </p>
          </div>
        </div>
      ) : (
        <h3 className="field-map-trail-title">{title}</h3>
      )}
      {points.length === 0 ? (
        <p className="ws-hr-note">No visit stamps or live GPS pings on this trail yet.</p>
      ) : (
        <ol className="ws-hr-field-trail">
          {trailPoints.map((point) => (
            <li key={point.id} className="ws-hr-field-trail-item">
              <span className="ws-hr-field-trail-step" aria-hidden>
                {point.visitedStopNumber ?? "•"}
              </span>
              <div>
                <strong>{formatStamp(point.checkedInAt)} IST</strong>
                {point.isLivePing ? (
                  <span className="ws-hr-live-badge">Live while app open</span>
                ) : null}
                <div className="ws-apple-cell-secondary">
                  <strong>Location stamp:</strong>{" "}
                  {point.isLivePing
                    ? "Live ping"
                    : (point.clientName ?? "Field check-in")}{" "}
                  · {point.geoLat.toFixed(4)}, {point.geoLng.toFixed(4)}
                </div>
                {point.activityNote && !point.isLivePing ? (
                  <p>{point.activityNote}</p>
                ) : null}
                {!point.isLivePing && point.proofUrl ? (
                  <a className="btn-secondary btn-sm" href={point.proofUrl} target="_blank" rel="noopener noreferrer">
                    Open visit proof
                  </a>
                ) : !point.isLivePing ? (
                  <span className="ws-hr-feedback-error">Proof missing for this older check-in</span>
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
      {mapLinks.length ? (
        <nav className="ws-hr-note field-tour-map-links" aria-label="Google Maps visited-stop tour">
          <strong>Visited stops in order</strong>
          <div>
            {mapLinks.map((link) => (
              <a
                key={`${link.fromStop}-${link.toStop}`}
                className="btn-secondary btn-sm"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.fromStop === link.toStop
                  ? "Open visited location in Google Maps"
                  : `Open tour: stops ${link.fromStop}–${link.toStop}`}
              </a>
            ))}
          </div>
          {visitedStops.length > 1 ? (
            <span>Routes follow the numbered visit stamps in order. Longer tours continue in linked segments with one shared stop between segments.</span>
          ) : null}
        </nav>
      ) : null}
      {embeddedMaps.map((map) => (
        <figure className="field-tour-embed" key={`${map.fromStop}-${map.toStop}`}>
          <figcaption>
            {map.fromStop === map.toStop
              ? "Visited location"
              : `Google Maps tour · stops ${map.fromStop}–${map.toStop}`}
          </figcaption>
          <iframe
            title={`${title}: Google Maps tour stops ${map.fromStop} to ${map.toStop}`}
            src={map.src}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </figure>
      ))}
    </>
  );

  if (embedded) {
    return <div className="field-map-trail-embed" aria-label="Field day trail">{body}</div>;
  }

  return (
    <section className="ws-hr-panel" aria-label="Field day trail">
      {body}
    </section>
  );
}
