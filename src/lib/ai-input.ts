export function pickRecorderMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export function fileExtensionForMime(mime: string) {
  if (mime.includes("mp4")) {
    return "m4a";
  }
  if (mime.includes("ogg")) {
    return "ogg";
  }
  return "webm";
}

export function isAiInputErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.startsWith("hi!")) {
    return false;
  }
  return (
    lower.includes("quota") ||
    lower.includes("billing") ||
    lower.includes("invalid") ||
    lower.includes("failed") ||
    lower.includes("error") ||
    lower.includes("denied") ||
    lower.includes("too short") ||
    lower.includes("network") ||
    lower.includes("unavailable")
  );
}
