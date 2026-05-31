import {
  menuDescriptionForItem,
  menuLabelForItem,
  type KnowledgeMenuItem,
} from "@/lib/whatsapp-bot/knowledge-menu";
import { AI_KNOWLEDGE_TYPE_LABELS } from "@/lib/ai-knowledge-types";

export function AiWhatsappMenuPreview({
  items,
  botLive,
}: {
  items: KnowledgeMenuItem[];
  botLive: boolean;
}) {
  if (items.length === 0) {
    return (
      <section className="ai-wa-menu-preview is-empty">
        <h2>WhatsApp menu preview</h2>
        <p>
          Add FAQ articles first. Up to 10 active training items appear as tappable
          options in the customer WhatsApp list menu.
        </p>
      </section>
    );
  }

  return (
    <section className="ai-wa-menu-preview">
      <div className="ai-wa-menu-preview-head">
        <div>
          <h2>WhatsApp menu preview</h2>
          <p>
            These options appear when customers tap <strong>Browse topics</strong> on
            WhatsApp. The menu refreshes automatically when you add, edit, or remove
            articles.
          </p>
        </div>
        <span className={`ai-joyz-status-pill${botLive ? " is-live" : ""}`}>
          {botLive ? "Live on WhatsApp" : "Go Live to enable menu"}
        </span>
      </div>

      <div className="ai-wa-menu-preview-shell">
        <div className="ai-wa-menu-preview-list-btn">Browse topics</div>
        <ul className="ai-wa-menu-preview-rows">
          {items.map((item, index) => (
            <li key={item.id}>
              <span className="ai-wa-menu-preview-index">{index + 1}</span>
              <div>
                <strong>{menuLabelForItem(item)}</strong>
                <span>{menuDescriptionForItem(item)}</span>
                <small>{AI_KNOWLEDGE_TYPE_LABELS[item.type]}</small>
              </div>
            </li>
          ))}
        </ul>
        <div className="ai-wa-menu-preview-buttons">
          <span>Browse topics</span>
          <span>Ask question</span>
          <span>Talk to team</span>
        </div>
      </div>
    </section>
  );
}
