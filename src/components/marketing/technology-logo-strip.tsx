import "./technology-logo-strip.css";

const tools = [
  { name: "Google Sheets", mark: "S", tone: "sheets" },
  { name: "AppSheet", mark: "A", tone: "appsheet" },
  { name: "WhatsApp", mark: "WA", tone: "whatsapp" },
  { name: "Google Workspace", mark: "G", tone: "workspace" },
  { name: "Gmail", mark: "M", tone: "gmail" },
  { name: "OpenAI", mark: "AI", tone: "openai" },
] as const;

function ToolGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="technology-logo-group" aria-hidden={hidden || undefined}>
      {tools.map((tool) => (
        <div className="technology-logo" key={`${hidden ? "copy-" : ""}${tool.name}`}>
          <span className={`technology-logo-mark technology-logo-mark--${tool.tone}`} aria-hidden>{tool.mark}</span>
          <span>{tool.name}</span>
        </div>
      ))}
    </div>
  );
}

export function TechnologyLogoStrip() {
  return (
    <section id="technology-stack" className="technology-strip" aria-labelledby="technology-strip-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="technology-strip-head">
          <p className="type-kicker">Works with your daily tools</p>
          <h2 id="technology-strip-title">Keep the tools. Connect the work.</h2>
          <p>
            Sheetomatic brings the information already moving through your business into one operating rhythm.
          </p>
        </div>
      </div>

      <div className="technology-marquee" aria-label="Tools used in Sheetomatic solutions">
        <div className="technology-track">
          <ToolGroup />
          <ToolGroup hidden />
        </div>
      </div>
      <p className="technology-disclaimer">Product names and marks belong to their respective owners.</p>
    </section>
  );
}
