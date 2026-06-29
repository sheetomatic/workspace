import { howWeWork } from "@/app/sales-framework-content";
import { ExecutionSnapshot } from "./execution-snapshot";
import { WhatsAppButton } from "./marketing-buttons";
import { whatsappDisplayNumber } from "@/app/site-content";
import "./how-we-work.css";

export function HowWeWorkSection() {
  return (
    <section
      aria-labelledby="how-we-work-title"
      className="section how-we-work-section"
      id="how-we-work"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading text-left">
          <p>{howWeWork.eyebrow}</p>
          <h2 id="how-we-work-title">{howWeWork.title}</h2>
          <div className="section-subcopy">{howWeWork.lead}</div>
        </div>

        <div className="how-we-work-layout">
          <ol className="how-we-work-steps">
            {howWeWork.steps.map((item) => (
              <li className="how-we-work-step" key={item.step}>
                <span className="how-we-work-step-num">{item.step}</span>
                <div className="how-we-work-step-body">
                  <h3>{item.title}</h3>
                  <dl className="how-we-work-detail">
                    <div>
                      <dt>You</dt>
                      <dd>{item.userAction}</dd>
                    </div>
                    <div>
                      <dt>We</dt>
                      <dd>{item.weDo}</dd>
                    </div>
                    <div className="how-we-work-outcome">
                      <dt>Outcome</dt>
                      <dd>{item.outcome}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ol>

          <aside className="how-we-work-visual" aria-label="Live workspace preview">
            <p className="how-we-work-visual-kicker">What live ops looks like</p>
            <ExecutionSnapshot />
            <ul className="how-we-work-principles">
              {howWeWork.principles.map((principle) => (
                <li key={principle}>{principle}</li>
              ))}
            </ul>
            <WhatsAppButton label={whatsappDisplayNumber} />
          </aside>
        </div>
      </div>
    </section>
  );
}
