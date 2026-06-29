import { LEAD_CHANNEL_LABELS } from "@/lib/leads/channels";

type PeriodStats = {
  total: number;
  openPipeline: number;
  won: number;
  conversionRate: number;
  withFms: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
};

export function LeadsMachineOverview({
  periodStats,
  lifetimeTotal,
}: {
  periodStats: PeriodStats;
  lifetimeTotal: number;
}) {
  const fmsRate =
    periodStats.total > 0
      ? Math.round((periodStats.withFms / periodStats.total) * 100)
      : 0;

  return (
    <section className="leads-overview" aria-label="Lead metrics">
      <div className="hs-quick-stats">
        <article className="hs-quick-stat accent-blue">
          <span>Leads in period</span>
          <strong>{periodStats.total}</strong>
        </article>
        <article className="hs-quick-stat">
          <span>Open pipeline</span>
          <strong>{periodStats.openPipeline}</strong>
        </article>
        <article className="hs-quick-stat accent-success">
          <span>Won</span>
          <strong>{periodStats.won}</strong>
        </article>
        <article className="hs-quick-stat accent-warning">
          <span>Conversion</span>
          <strong>{periodStats.conversionRate}%</strong>
        </article>
        <article className="hs-quick-stat accent-blue">
          <span>Linked to FMS</span>
          <strong>
            {periodStats.withFms}
            <small className="leads-kpi-sub">{fmsRate}%</small>
          </strong>
        </article>
        <article className="hs-quick-stat">
          <span>Lifetime leads</span>
          <strong>{lifetimeTotal}</strong>
        </article>
      </div>

      {(Object.keys(periodStats.byStatus).length > 0 ||
        Object.keys(periodStats.byChannel).length > 0) && (
        <div className="leads-overview-breakdown">
          {Object.entries(periodStats.byStatus).map(([status, count]) => (
            <div className="leads-status-pill" key={status}>
              <span>{status.replaceAll("_", " ").toLowerCase()}</span>
              <strong>{count}</strong>
            </div>
          ))}
          {Object.entries(periodStats.byChannel).map(([channel, count]) => (
            <span
              key={channel}
              className={`leads-channel-badge channel-${channel.toLowerCase()}`}
            >
              {LEAD_CHANNEL_LABELS[channel as keyof typeof LEAD_CHANNEL_LABELS]} · {count}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
