export type TaskAiUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  audioBytes?: number;
};

export function taskAiDailyOrgLimit() {
  const raw = Number(process.env.TASK_AI_DAILY_ORG_LIMIT ?? "200");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 200;
}
