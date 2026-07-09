import { LEAD_CHANNEL_LABELS } from "@/lib/leads/channels";

const ROADMAP_SOURCES = [
  {
    id: "meta",
    label: "Meta / Facebook Lead Ads",
    description:
      "Connect Meta app credentials to pull lead forms from Facebook & Instagram ads.",
    channel: "FACEBOOK" as const,
  },
  {
    id: "instagram",
    label: "Instagram DMs",
    description: "Ingest Instagram direct messages and lead ads into Leads Machine.",
    channel: "INSTAGRAM" as const,
  },
  {
    id: "telegram",
    label: "Telegram",
    description: "Bot API intake for Telegram inquiries — planned after Meta connectors.",
    channel: null,
  },
  {
    id: "whatsapp_official",
    label: "WhatsApp (Official API)",
    description:
      "Meta Cloud API for verified business number — separate from nurture Web Based API.",
    channel: "WHATSAPP" as const,
  },
] as const;

export function LeadsSourceSettingsPanel() {
  return (
    <section className="saas-panel leads-settings-card" id="lead-sources">
      <div className="leads-settings-card-head">
        <div>
          <h3>Lead sources</h3>
          <p className="leads-machine-muted">
            Google Sheets sync stays on the main Leads page. Additional connectors
            below are on the roadmap — save API credentials here when we ship them.
          </p>
        </div>
      </div>

      <div className="leads-sources-grid">
        {ROADMAP_SOURCES.map((source) => (
          <article key={source.id} className="leads-settings-card leads-source-card">
            <div className="leads-settings-card-head">
              <h4>
                {source.channel
                  ? LEAD_CHANNEL_LABELS[source.channel]
                  : source.label}
              </h4>
              <span className="leads-coming-soon-badge">Next phase</span>
            </div>
            <p className="leads-machine-muted">{source.description}</p>
            <p className="leads-source-next-note">
              API key / OAuth setup will appear here when this connector is live.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
