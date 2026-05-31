import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { requireSession } from "@/lib/require-session";
import { formatWhatsAppPhone } from "@/lib/phone";
import { listWaContacts, parseContactTags } from "@/lib/wa-inbox-store";

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  DEMO_BOOKED: "Demo booked",
  WON: "Won",
  LOST: "Lost",
};

export default async function SheetomaticAiContactsPage() {
  const user = await requireSession("VIEWER", { redirectTo: "/ai/app" });
  const contacts = await listWaContacts(user.organizationId);

  return (
    <div className="saas-page ws-contacts-page">
      <PageHeader
        title="Contacts & CRM"
        description="Live WhatsApp leads with captured name, email, city, and requirement details."
      />

      {contacts.length === 0 ? (
        <section className="saas-panel ws-contacts-empty">
          <h2>No contacts yet</h2>
          <p>
            Contacts are created automatically when someone messages your WhatsApp
            business number. Go live from Campaign to start capturing leads.
          </p>
          <Link className="btn-cta btn-primary" href="/ai/app/campaign">
            Open Campaign
          </Link>
        </section>
      ) : (
        <section className="saas-panel ws-contacts-table-wrap">
          <table className="ws-contacts-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
                <th>Requirement</th>
                <th>Stage</th>
                <th>Last message</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => {
                const tags = parseContactTags(contact.tags);
                const profileComplete = contact.leadCaptureComplete;
                return (
                  <tr key={contact.id}>
                    <td>
                      <strong>{contact.name ?? formatWhatsAppPhone(contact.phone)}</strong>
                      {tags.length > 0 ? (
                        <span className="ws-contacts-tags">{tags.join(", ")}</span>
                      ) : null}
                      {!profileComplete ? (
                        <span className="ws-contacts-tags">Profile incomplete</span>
                      ) : null}
                    </td>
                    <td>{formatWhatsAppPhone(contact.phone)}</td>
                    <td>{contact.email ?? "-"}</td>
                    <td>{contact.city ?? "-"}</td>
                    <td>
                      {contact.requirementDescription
                        ? contact.requirementDescription.length > 80
                          ? `${contact.requirementDescription.slice(0, 80).trim()}...`
                          : contact.requirementDescription
                        : "-"}
                    </td>
                    <td>
                      <span className="ws-contacts-stage">
                        {STAGE_LABELS[contact.pipelineStage] ?? contact.pipelineStage}
                      </span>
                    </td>
                    <td>
                      {contact.lastMessageAt
                        ? new Date(contact.lastMessageAt).toLocaleString("en-IN")
                        : "-"}
                    </td>
                    <td>
                      <Link href={`/ai/app/inbox?c=${contact.conversations[0]?.id ?? ""}`}>
                        Open chat
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
