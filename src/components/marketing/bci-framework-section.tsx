import "./bci-framework.css";

const bciBlocks = [
  {
    label: "FMS",
    title: "Flow Monitoring System",
    text: "Maps enquiry, production, dispatch, payment, and closure with clear owners so delays surface before they turn into margin leaks.",
  },
  {
    label: "IMS",
    title: "Inventory Management System",
    text: "Keeps stock tied to live movement and demand so purchase, production, and dispatch decisions stop running on guesswork.",
  },
  {
    label: "Full Kitting",
    title: "The execution kit your team needs",
    text: "Checklists, tasks, proofs, reminders, and handoff context sit in one operating layer so work can move without repeated explanation.",
  },
  {
    label: "PC",
    title: "Process Coordinator",
    text: "Owns daily operating discipline, watches checklist completion, and keeps standards from slipping back into verbal follow-ups.",
  },
  {
    label: "EA",
    title: "Executive Assistant",
    text: "Owns action follow-through, closes loops after decisions, and makes sure critical tasks do not die in chat threads or memory.",
  },
  {
    label: "Review Rhythm",
    title: "A fixed cadence for exception review",
    text: "Weekly review happens on live data, person-wise deficits, and pending actions so leaders coach from signals instead of collecting updates.",
  },
] as const;

const bciSequence = [
  {
    title: "Control the work",
    text: "FMS, IMS, and Full Kitting create one visible operating layer for flow, stock, and execution.",
  },
  {
    title: "Hold the rhythm",
    text: "PC and EA roles keep standards and follow-through running daily without the owner becoming the reminder system.",
  },
  {
    title: "Review the exceptions",
    text: "A weekly review rhythm turns live operating data into decisions, coaching, and owner clarity.",
  },
] as const;

export function BciFrameworkSection() {
  return (
    <section
      aria-labelledby="bci-framework-title"
      className="section bci-framework-section"
      id="bci-framework"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading">
          <p>BCI Suite</p>
          <h2 id="bci-framework-title">
            Business Control &amp; Intelligence for system-driven MSMEs
          </h2>
          <div className="section-subcopy">
            BCI is the operating framework behind Sheetomatic. It combines flow
            control, stock accuracy, execution discipline, and a weekly review
            cadence so your team runs the work and you review the board.
          </div>
        </div>

        <div className="bci-formula-band" aria-label="BCI formula">
          <p className="bci-formula-label">The BCI formula</p>
          <p className="bci-formula-copy">
            BCI = FMS + IMS + Full Kitting + PC + EA + Review Rhythm
          </p>
          <p className="bci-formula-note">
            Six layers that turn daily operations into visible control, owned
            execution, and Monday-ready intelligence.
          </p>
        </div>

        <div className="bci-blocks-grid">
          {bciBlocks.map((block) => (
            <article className="bci-block-card" key={block.label}>
              <span className="bci-block-label">{block.label}</span>
              <h3>{block.title}</h3>
              <p>{block.text}</p>
            </article>
          ))}
        </div>

        <div className="bci-synthesis-panel">
          <div className="bci-synthesis-copy">
            <p className="bci-synthesis-kicker">How BCI works together</p>
            <h3>Control the work. Hold the rhythm. Review the exceptions.</h3>
            <p>
              BCI starts by making operations visible, equips the team to
              execute with clarity, and closes the loop with a review cadence
              leaders can actually trust.
            </p>
          </div>

          <div className="bci-synthesis-grid">
            {bciSequence.map((step, index) => (
              <article className="bci-synthesis-card" key={step.title}>
                <span className="bci-synthesis-step">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </article>
            ))}
          </div>

          <div className="bci-outcome-band">
            <span>Final outcome</span>
            <p>
              A business that runs on systems, role clarity, and review
              intelligence - not founder memory, spreadsheet patching, or
              WhatsApp chasing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
