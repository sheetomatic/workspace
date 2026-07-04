import "./execution-snapshot.css";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";

const queue = [
  {
    title: "Sales order approved",
    meta: "Owner: Sales coordinator",
    time: "Step 3",
    status: "Done",
    tone: "done",
  },
  {
    title: "Design and BOM review",
    meta: "Owner: Design team",
    time: "Step 6",
    status: "In progress",
    tone: "progress",
  },
  {
    title: "Dispatch planning pending",
    meta: "Owner: Dispatch team",
    time: "Step 10",
    status: "Pending",
    tone: "pending",
  },
];

export function ExecutionSnapshot() {
  return (
    <div className="execution-snapshot">
      <div className="execution-snapshot-head">
        <div>
          <p>Sales order processing</p>
          <h3>Workflow tracker</h3>
        </div>
        <span className="execution-snapshot-score">1 live workflow</span>
      </div>

      <div className="execution-snapshot-progress">
        <span>All workflows</span>
        <strong>FMS tracker</strong>
        <h4>Sales Order Processing Workflow workflow</h4>
        <small>1 lead | 12 steps</small>
        <div className="execution-progress-track">
          <i style={{ width: "58%" }} />
        </div>
      </div>

      <ul className="execution-snapshot-list">
        {queue.map((item) => (
          <li className={`execution-item execution-item-${item.tone}`} key={item.title}>
            <span className="execution-item-icon">
              {item.tone === "done" ? (
                <CheckCircle2 size={18} />
              ) : item.tone === "progress" ? (
                <Clock3 size={18} />
              ) : (
                <Circle size={18} />
              )}
            </span>
            <div className="execution-item-body">
              <strong>{item.title}</strong>
              <span>{item.meta}</span>
            </div>
            <div className="execution-item-side">
              <em>{item.status}</em>
              <small>{item.time}</small>
            </div>
          </li>
        ))}
      </ul>

      <p className="execution-snapshot-foot">
        MSME teams see the real working style here: owner, step, and live status in one
        workflow view instead of scattered Google Sheets follow-up.
      </p>
    </div>
  );
}
