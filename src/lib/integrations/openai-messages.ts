export const AI_SERVICE_UNAVAILABLE =
  "Voice and AI parsing are temporarily unavailable. Type your task in the form below.";

export const AI_PARSE_UNAVAILABLE =
  "AI parsing is temporarily unavailable. Fill in the task form manually.";

export const FMS_AI_PARSE_UNAVAILABLE =
  "AI form generation is unavailable. Add OPENAI_API_KEY to .env.local or add fields manually below.";

export function mapOpenAiServiceError(message: string) {
  if (message === "OPENAI_NOT_CONFIGURED") {
    return AI_SERVICE_UNAVAILABLE;
  }

  if (message.includes(".env.local") || message.includes("OPENAI_API_KEY")) {
    return AI_SERVICE_UNAVAILABLE;
  }

  return message;
}

export function mapFmsOpenAiServiceError(message: string) {
  if (
    message === "OPENAI_NOT_CONFIGURED" ||
    message.includes(".env.local") ||
    message.includes("OPENAI_API_KEY")
  ) {
    return FMS_AI_PARSE_UNAVAILABLE;
  }

  if (message === "OPENAI_EMPTY") {
    return "AI returned an empty response. Try again with a clearer description.";
  }

  if (message === "OPENAI_TIMEOUT") {
    return "AI took too long to respond. Try a shorter description or add fields manually.";
  }

  return message;
}
