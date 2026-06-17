export default function AppLoading() {
  return (
    <div className="saas-page ws-page-loading" aria-busy="true" aria-live="polite">
      <div className="ws-page-loading-bar" />
      <div className="ws-page-loading-stack">
        <div className="ws-skeleton ws-page-loading-title" />
        <div className="ws-skeleton ws-page-loading-copy" />
        <div className="ws-page-loading-grid" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="ws-skeleton ws-page-loading-card" key={index} />
          ))}
        </div>
        <div className="ws-skeleton ws-page-loading-panel" />
      </div>
    </div>
  );
}
