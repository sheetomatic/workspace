import "./mis-careers.css";
import { Briefcase, CheckCircle2 } from "lucide-react";
import { misTalentCareers } from "@/app/marketing-content";
import { ContactButtons } from "@/components/marketing/marketing-buttons";

export function MisCareersSection() {
  const content = misTalentCareers;

  return (
    <section className="mis-careers-band" id="join-mis">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mis-careers-inner">
          <div>
            <p className="mis-careers-kicker flex items-center gap-2">
              <Briefcase size={16} />
              {content.kicker}
            </p>
            <h2 className="mis-careers-title">{content.title}</h2>
            <p className="mis-careers-lead">{content.lead}</p>
            <div className="mis-careers-actions">
              <ContactButtons
                whatsappLabel="Apply on WhatsApp"
                callLabel="Call us"
                message={content.whatsappApplyMessage}
              />
            </div>
            <p className="mis-careers-note">{content.ctaNote}</p>
          </div>

          <div className="mis-careers-panel">
            <article className="mis-careers-card">
              <h3>{content.fitTitle}</h3>
              <ul className="mis-careers-list">
                {content.fitPoints.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="mis-careers-card">
              <h3>{content.perksTitle}</h3>
              <ul className="mis-careers-list">
                {content.perks.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>

        <div className="mis-careers-steps mt-10">
          {content.steps.map((item) => (
            <article className="mis-careers-step" key={item.step}>
              <span>Step {item.step}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
