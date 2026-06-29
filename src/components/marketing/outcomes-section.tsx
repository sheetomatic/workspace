import "./industries-outcomes.css";

const aiOutcomesSection = {
  eyebrow: "Systems that scale",
  title: "Three pillars of WhatsApp revenue",
  subcopy:
    "Attract customers, convert sales, empower teams - one connected system, not scattered chats.",
  items: [
    {
      highlight: "Attracting customers",
      title: "WhatsApp AI captures every lead",
      text: "Train once on your offers and FAQs. AI replies 24/7, qualifies intent, and saves contacts to CRM before your team wakes up.",
    },
    {
      highlight: "Converting sales",
      title: "Inbox, CRM, and follow-up tasks",
      text: "Every chat lands in one pipeline. Assign owners, set tasks, and track stages so no deal goes cold between messages.",
    },
    {
      highlight: "Empowering teams",
      title: "Shared inbox, humans close",
      text: "AI handles routine replies. Your team steps in with full context, notes, and handoff when the deal needs a human.",
    },
    {
      highlight: "Scale without chaos",
      title: "One system replaces scattered tools",
      text: "Lead capture, inbox, CRM, and follow-ups run from one workspace - built to grow with your team and message volume.",
    },
  ],
};

export function OutcomesSection() {
  const section = aiOutcomesSection;

  return (
    <section className="section bg-white" id="outcomes">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading">
          <p>{section.eyebrow}</p>
          <h2>{section.title}</h2>
          <div className="section-subcopy">{section.subcopy}</div>
        </div>
        <div className="outcomes-grid">
          {section.items.map((item) => (
            <article className="saas-outcome-card" key={item.title}>
              <span className="outcome-highlight">{item.highlight}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
