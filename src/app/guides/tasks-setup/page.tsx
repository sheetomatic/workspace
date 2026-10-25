import type { Metadata } from "next";
import styles from "./setup.module.css";

export const metadata: Metadata = {
  title: "Tasks setup guide | Sheetomatic",
  description: "Set up your team, assign your first task and track progress in Sheetomatic Tasks.",
};

const steps = [
  { title: "Sign in securely", path: "/login", action: "Open Workspace", items: ["Use the email address supplied at checkout. Payment confirmation and account access are separate checks.", "If you do not have a password, use Forgot password to request a secure email link. Never share your password or OTP.", "Select the workspace named in your activation confirmation. If activation is pending, contact support with your order reference—do not pay again."] },
  { title: "Review your workspace", path: "/app/settings", action: "Open settings", items: ["Check the selected workspace and business details before adding your team.", "Confirm your purchased user allowance and billing term. Monthly purchases have a minimum of eight billed users; annual purchases use the selected user count.", "Access to unrelated products and third-party WhatsApp usage is not included automatically."] },
  { title: "Add your team", path: "/app/team", action: "Open team", items: ["As the workspace owner, add your colleagues using their own email addresses and correct phone numbers.", "Give each person only the role and module access they need. Do not share one owner login across your team.", "Ask each colleague to sign in and confirm they can see the correct workspace. Stay within your purchased seat allowance."] },
  { title: "Create your first task", path: "/app/tasks/create", action: "Create a task", items: ["Enter a clear task title and description, then select the responsible team member or members.", "Set the priority and due date/time. The task form uses IST; confirm the displayed time before saving.", "For repeated work, review the recurrence settings. Check notification availability before choosing email or WhatsApp reminders.", "Assign a harmless internal task first and confirm it appears on the team board."] },
  { title: "Work through the day", path: "/app/tasks/today", action: "Open today’s tasks", items: ["Team members open their daily tasks, review the instructions and update their work using the available task actions.", "Add the requested evidence or notes where applicable. If verification is required, the verifier must review the work before treating it as complete.", "Use the task’s request options when a deadline or assignment needs review instead of creating duplicate tasks."] },
  { title: "Review progress", path: "/app/tasks", action: "Open team board", items: ["Owners and managers use the team board to review status, assignees, overdue work and completed tasks.", "Check the filters and selected workspace before concluding that a task is missing. Staff may see their personal task view instead.", "Review progress regularly and keep team access up to date when colleagues join or leave."] },
] as const;

export default function TasksSetupGuide() {
  return <main className={styles.guide}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>SHEETOMATIC · GETTING STARTED</p>
      <h1>Your team’s first day with Tasks</h1>
      <p>A step-by-step guide from secure sign-in to your first completed task. Use this after your workspace activation is confirmed.</p>
      <nav aria-label="Setup journey" className={styles.journey}>
        {steps.map((step, i) => <a key={step.title} href={`#step-${i + 1}`}><span>{i + 1}</span>{step.title}</a>)}
      </nav>
    </header>
    <div className={styles.grid}>
      {steps.map((step, i) => <section id={`step-${i + 1}`} className={styles.card} key={step.title}>
        <div className={styles.heading}><span className={styles.number}>{String(i + 1).padStart(2, "0")}</span><h2>{step.title}</h2></div>
        <ul>{step.items.map(item => <li key={item}>{item}</li>)}</ul>
        <a className={styles.button} href={`https://workspace.sheetomatic.com${step.path}`}>{step.action} <span aria-hidden="true">→</span></a>
      </section>)}
    </div>
    <section className={styles.help}>
      <h2>WhatsApp and troubleshooting</h2>
      <p>WhatsApp task notifications require a configured integration, a valid recipient number and applicable consent/template or conversation-window rules. Buying Tasks alone does not configure a new WhatsApp API account.</p>
      <details><summary>Payment succeeded but access is missing</summary><p>Keep your order reference, check your confirmation email and selected workspace, then contact support. Do not make a second payment to resolve an activation delay.</p></details>
      <details><summary>No setup or password email</summary><p>Check spam and the checkout email address. Request a fresh link from <a href="https://workspace.sheetomatic.com/login/forgot-password">Forgot password</a>. Never send support your password, OTP or card details.</p></details>
      <details><summary>No WhatsApp notification</summary><p>Check the integration warning on Create task and the recipient’s phone number. A sent message is not proof of delivery. Contact support if configuration or an approved message template is missing.</p></details>
      <p><a href="mailto:founder@sheetomatic.com">Contact support</a> · Include your order reference, not payment credentials.</p>
    </section>
  </main>;
}
