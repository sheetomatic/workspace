import "./industries-outcomes.css";
import { outcomesSection } from "@/app/marketing-content";

export function OutcomesSection() {
  const section = outcomesSection;

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
