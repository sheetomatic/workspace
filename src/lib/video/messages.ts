import { T2V_ERROR_PREFIX, T2V_NOT_CONFIGURED } from "@/lib/video/provider";

export const VIDEO_UNAVAILABLE =
  "Video generation is not configured on this workspace. You can still write a prompt — generation will run when a text-to-video provider is connected.";

export const VIDEO_FAILED = "Video generation failed. Try a different prompt.";

export function mapVideoServiceError(raw: string): string {
  if (raw === T2V_NOT_CONFIGURED) {
    return VIDEO_UNAVAILABLE;
  }
  if (raw.startsWith(T2V_ERROR_PREFIX)) {
    return raw.slice(T2V_ERROR_PREFIX.length).trim() || VIDEO_FAILED;
  }
  if (raw.toLowerCase().includes("policy") || raw.toLowerCase().includes("unsafe")) {
    return "The provider could not generate that prompt. Try a different description.";
  }
  return raw || VIDEO_FAILED;
}
