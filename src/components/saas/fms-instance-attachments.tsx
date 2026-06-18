type AttachmentRow = {
  id: string;
  fileName: string;
  fileSize: number;
  stepName: string;
};

export function FmsInstanceAttachments({ rows }: { rows: AttachmentRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="ws-sf-card ws-fms-section">
      <header className="ws-fms-section-heading">
        <h2>Step attachments</h2>
        <p>Files, images, and videos uploaded at each stop.</p>
      </header>
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
    </section>
  );
}
