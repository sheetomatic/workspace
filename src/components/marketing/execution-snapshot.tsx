import "./execution-snapshot.css";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";

const queue = [
  {
    title: "Demo follow-up - Rahul Mehta",
    meta: "Assigned to sales team",
    time: "4:30 PM",
    status: "In progress",
    tone: "progress",
  },
  {
    title: "Quote sent - Metro Retail",
    meta: "CRM stage updated",
    time: "Done",
    status: "Completed",
    tone: "done",
  },
  {
    title: "New lead - pricing inquiry",
    meta: "AI captured overnight",
    time: "New",
    status: "Pending",
    tone: "pending",
  },
];

export function ExecutionSnapshot() {
  return (
    <div className="execution-snapshot">
      <div className="execution-snapshot-head">
        <div>
          <p>Converting sales</p>
          <h3>Follow-up system</h3>
        </div>
        <span className="execution-snapshot-score">12 hot leads</span>
      </div>

      <div className="execution-snapshot-progress">
        <span>Pipeline progress</span>
        <div className="execution-progress-track">
          <i style={{ width: "76%" }} />
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
        AI captured the lead. CRM assigned follow-ups. Your team closes - no manual
        chasing.
      </p>
    </div>
  );
}
