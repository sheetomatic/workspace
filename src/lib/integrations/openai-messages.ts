export const AI_SERVICE_UNAVAILABLE =
  "Voice and AI parsing are temporarily unavailable. Type your task in the form below.";

export const AI_PARSE_UNAVAILABLE =
  "AI parsing is temporarily unavailable. Fill in the task form manually.";

export function mapOpenAiServiceError(message: string) {
  if (message === "OPENAI_NOT_CONFIGURED") {
    return AI_SERVICE_UNAVAILABLE;
  }

  if (message.includes(".env.local") || message.includes("OPENAI_API_KEY")) {
    return AI_SERVICE_UNAVAILABLE;
  }

  return message;
}
