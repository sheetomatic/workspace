export function formatOpenAiError(status: number, detail: string): string {
  try {
    const parsed = JSON.parse(detail) as {
      error?: { message?: string; type?: string; code?: string };
    };
    const message = parsed.error?.message ?? "";
    const type = parsed.error?.type ?? "";
    const code = parsed.error?.code ?? "";
    const lower = message.toLowerCase();

    if (type === "insufficient_quota" || code === "insufficient_quota") {
      return "OpenAI credits exhausted for this project. Add credits at platform.openai.com/account/billing, then try again.";
    }

    if (
      type === "rate_limit_exceeded" ||
      code === "rate_limit_exceeded" ||
      (status === 429 && !lower.includes("quota") && !lower.includes("billing"))
    ) {
      return "OpenAI rate limit hit. Wait 30-60 seconds and try again.";
    }

    if (
      status === 429 ||
      lower.includes("quota") ||
      lower.includes("billing")
    ) {
      return "OpenAI quota or billing limit reached. Check usage at platform.openai.com/usage, then try again.";
    }

    if (status === 401 || lower.includes("incorrect api key")) {
      return "AI service is unavailable right now. Try again later or type the task manually.";
    }

    if (message) {
      return message.length > 180 ? `${message.slice(0, 180)}...` : message;
    }
  } catch {
    // not JSON
  }

  if (status === 429) {
    return "OpenAI rate limit reached. Wait a moment and try again.";
  }

  return "OpenAI request failed. Try again or type the task.";
}
