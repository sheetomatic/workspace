type AttachmentRow = {
  id: string;
  fileName: string;
  fileSize: number;
  stepName: string;
};

export function FmsInstanceAttachments({
  rows,
  showUploadHint = false,
}: {
  rows: AttachmentRow[];
  showUploadHint?: boolean;
}) {
  return (
    <section className="ws-sf-card ws-fms-section">
      <header className="ws-fms-section-heading">
        <h2>Step attachments</h2>
        <p>Files, images, and videos uploaded at each stop.</p>
      </header>
      {rows.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state">
          <p>No attachments yet.</p>
          {showUploadHint ? (
            <p className="ws-fms-muted">
              Upload files from the active stop panel above before completing the step.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="ws-fms-attachments-list">
          {rows.map((file) => (
            <li key={file.id}>
              <a
                href={`/api/fms/attachments/${file.id}`}
                className="ws-sf-record-link"
                target="_blank"
                rel="noreferrer"
              >
                {file.fileName}
              </a>
              <span className="ws-fms-muted">
                {file.stepName} | {Math.round(file.fileSize / 1024)} KB
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
