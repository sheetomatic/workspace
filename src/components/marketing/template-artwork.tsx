import {
  Boxes,
  ClipboardCheck,
  ContactRound,
  MessageSquareText,
  ReceiptText,
  Truck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

/** Purpose-built cover illustrations, not screenshots or fabricated customer metrics. */
export function TemplateArtwork({
  slug,
  name,
  type,
}: {
  slug: string;
  name: string;
  type: string;
}) {
  const theme = slug.includes("sales-to-dispatch")
    ? {
        title: "Sales → dispatch",
        sub: "Keep every delivery in view",
        Icon: Truck,
        tone: "amber",
        rows: ["Sales", "Loading", "Dispatch"],
      }
    : slug.includes("attendance")
      ? {
          title: "Your team. In sync.",
          sub: "Attendance & leave, simplified",
          Icon: Users,
          tone: "violet",
          rows: ["Attendance", "Leave", "Reports"],
        }
      : slug.includes("inventory")
        ? {
            title: "Know your stock.",
            sub: "One place for inventory",
            Icon: Boxes,
            tone: "teal",
            rows: ["Stock in", "Stock out", "Balance"],
          }
        : slug.includes("expense")
          ? {
              title: "Track every rupee.",
              sub: "Make expenses easier to see",
              Icon: ReceiptText,
              tone: "amber",
              rows: ["Expenses", "Categories", "Budgets"],
            }
          : slug.includes("fms")
            ? {
                title: "Make work flow.",
                sub: "A clearer view of your process",
                Icon: Workflow,
                tone: "green",
                rows: ["Plan", "Follow up", "Complete"],
              }
            : slug.includes("task")
              ? {
                  title: "From to-do to done.",
                  sub: "Assign. Follow up. Finish.",
                  Icon: ClipboardCheck,
                  tone: "violet",
                  rows: ["Assigned", "In progress", "Done"],
                }
              : slug.includes("visitor")
                ? {
                    title: "Every visit, logged.",
                    sub: "A simpler visitor register",
                    Icon: ContactRound,
                    tone: "teal",
                    rows: ["Visitor", "Check-in", "History"],
                  }
                : slug.includes("grievance")
                  ? {
                      title: "Listen. Track. Resolve.",
                      sub: "Keep complaints organised",
                      Icon: MessageSquareText,
                      tone: "violet",
                      rows: ["Raised", "Assigned", "Resolved"],
                    }
                  : slug.includes("electric")
                    ? {
                        title: "Power your follow-ups.",
                        sub: "CRM for electric works shops",
                        Icon: Zap,
                        tone: "amber",
                        rows: ["Enquiries", "Quotes", "Jobs"],
                      }
                    : {
                        title: "Never lose a lead.",
                        sub: "Keep your next follow-up in sight",
                        Icon: ContactRound,
                        tone: "green",
                        rows: ["New lead", "Follow-up", "Customer"],
                      };
  const { Icon } = theme;
  return (
    <div
      className={`tpl-art tpl-art-${theme.tone}`}
      role="img"
      aria-label={`${name}: ${theme.sub}. Product illustration.`}
    >
      <div className="tpl-art-top">
        <span>
          {type === "APPSHEET"
            ? "APPSHEET"
            : type === "EXCEL"
              ? "EXCEL"
              : "GOOGLE SHEETS"}
        </span>
        <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <strong className="tpl-art-title">{theme.title}</strong>
      <span className="tpl-art-sub">{theme.sub}</span>
      <div className="tpl-art-workflow" aria-hidden="true">
        {theme.rows.map((row, index) => (
          <div key={row}>
            <span className="tpl-art-step">0{index + 1}</span>
            <span>{row}</span>
            <i />
          </div>
        ))}
      </div>
      <span className="tpl-art-caption">STANDARD TEMPLATE · ILLUSTRATION</span>
    </div>
  );
}
