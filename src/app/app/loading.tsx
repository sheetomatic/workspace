export default function AppLoading() {
  return (
    <div className="saas-page crm-dashboard-page">
      <div className="crm-dashboard">
        <header className="crm-dashboard-topbar">
          <h1>Dashboard</h1>
        </header>
        <div className="crm-metric-grid" aria-hidden>
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="crm-metric-card ws-skeleton" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
