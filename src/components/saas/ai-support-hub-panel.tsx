import Link from "next/link";
import { Ticket, MessageCircle, Clock, ChevronRight } from "lucide-react";
import { formatWhatsAppPhone } from "@/lib/phone";
import { safeCustomerDisplayName } from "@/lib/wa-safe-customer-name";
import type { getSupportHubQueue } from "@/lib/ai-module-data";

type SupportData = Awaited<ReturnType<typeof getSupportHubQueue>>;

export function AiSupportHubPanel({ data }: { data: SupportData }) {
  return (
    <div className="ai-support-page">
      <header className="ai-support-head">
        <span className="ai-support-icon" aria-hidden>
          <Ticket size={22} />
        </span>
        <div>
          <h1>Support hub</h1>
          <p>
            Live queue from WhatsApp - unread chats and overdue CRM follow-ups that need a
            human response.
          </p>
        </div>
        <Link className="ai-support-head-cta wa-crm-btn-wa" href="/ai/app/inbox">
          <MessageCircle size={14} />
          Open Chats
        </Link>
      </header>

      <div className="ai-support-stats">
        <article>
          <span>Open chats</span>
          <strong>{data.stats.openConversations}</strong>
        </article>
        <article>
          <span>Unread messages</span>
          <strong>{data.stats.unreadMessages}</strong>
        </article>
        <article>
          <span>Queue items</span>
          <strong>{data.queueTotal}</strong>
        </article>
        <article>
          <span>Contacts</span>
          <strong>{data.stats.contacts}</strong>
        </article>
      </div>

      <div className="ai-support-grid">
        <section className="ai-support-panel">
          <header>
            <h2>Needs reply</h2>
            <span>{data.unreadContacts.length}</span>
          </header>
          {data.unreadContacts.length === 0 ? (
            <p className="ai-support-empty">No unread leads - inbox is clear.</p>
          ) : (
            <ul>
              {data.unreadContacts.map((contact) => {
                const chatId = contact.conversations[0]?.id;
                return (
                  <li key={contact.id}>
                    <div>
                      <strong>
                        {safeCustomerDisplayName(contact.name) ??
                          formatWhatsAppPhone(contact.phone)}
                      </strong>
                      <span>{contact.unreadCount} unread - {contact.pipelineStage}</span>
                    </div>
                    {chatId ? (
                      <Link href={`/ai/app/inbox?c=${chatId}`}>
                        Reply
                        <ChevronRight size={14} aria-hidden />
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="ai-support-panel tone-warn">
          <header>
            <h2>
              <Clock size={14} aria-hidden />
              Overdue follow-ups
            </h2>
            <span>{data.overdueFollowUps.length}</span>
          </header>
          {data.overdueFollowUps.length === 0 ? (
            <p className="ai-support-empty">No overdue CRM follow-ups.</p>
          ) : (
            <ul>
              {data.overdueFollowUps.map((item) => {
                const chatId = item.contact.conversations[0]?.id;
                return (
                  <li key={item.id}>
                    <div>
                      <strong>
                        {safeCustomerDisplayName(item.contact.name) ??
                          formatWhatsAppPhone(item.contact.phone)}
                      </strong>
                      <span>
                        Due {item.scheduledAt.toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <Link href={chatId ? `/ai/app/inbox?c=${chatId}` : "/ai/app/contacts"}>
                      Open
                      <ChevronRight size={14} aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="ai-support-links">
        <Link href="/ai/app/contacts">CRM pipeline</Link>
        <Link href="/ai/app/templates">WhatsApp templates</Link>
        <Link href="/ai/app/analytics">Analytics</Link>
      </div>
    </div>
  );
}
