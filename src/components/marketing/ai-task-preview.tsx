import "./ai-task-preview.css";
import { ArrowRight, Bot, Mic, Sparkles } from "lucide-react";

export function AiTaskPreview() {
  return (
    <div className="ai-task-preview">
      <div className="ai-task-preview-badge">
        <Sparkles size={14} />
        AI task creation
      </div>
      <div className="ai-task-flow">
        <article className="ai-task-input">
          <span className="ai-task-label">
            <Mic size={14} />
            Voice or text instruction
          </span>
          <p>
            Create a follow-up task for today&apos;s quotation review and assign
            it to Rahul with high priority.
          </p>
        </article>
        <span className="ai-task-arrow" aria-hidden>
          <ArrowRight size={20} />
        </span>
        <article className="ai-task-output">
          <span className="ai-task-label">
            <Bot size={14} />
            Structured task
          </span>
          <h3>Quotation review follow-up</h3>
          <dl>
            <div>
              <dt>Owner</dt>
              <dd>Rahul</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>High</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>Today, 4:30 PM</dd>
            </div>
          </dl>
          <p className="ai-task-reminder">WhatsApp + email reminder scheduled</p>
        </article>
      </div>
      <div className="ai-task-chips">
        <span>Auto-assign</span>
        <span>Sub-tasks</span>
        <span>Recurring</span>
        <span>Owner alerts</span>
      </div>
    </div>
  );
}
