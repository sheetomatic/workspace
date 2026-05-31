import "./execution-snapshot.css";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";

const queue = [
  {
    title: "Quotation follow-up - Metro Retail",
    meta: "Assigned to Rahul",
    time: "4:30 PM",
    status: "In progress",
    tone: "progress",
  },
  {
    title: "Payment reminder - Invoice #1842",
    meta: "WhatsApp sent automatically",
    time: "Done",
    status: "Completed",
    tone: "done",
  },
  {
    title: "Dispatch approval - SKU 441",
    meta: "Waiting for Manager",
    time: "Urgent",
    status: "Pending",
    tone: "pending",
  },
];

export function ExecutionSnapshot() {
  return (
    <div className="execution-snapshot">
      <div className="execution-snapshot-head">
        <div>
          <p>Today&apos;s execution</p>
          <h3>Operations queue</h3>
        </div>
        <span className="execution-snapshot-score">76% on track</span>
      </div>

      <div className="execution-snapshot-progress">
        <span>Collection progress</span>
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
        AI created tasks, reminders fired, owner dashboard updated - no manual
        chasing.
      </p>
    </div>
  );
}
