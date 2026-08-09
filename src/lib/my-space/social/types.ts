export type SocialPostStatus =
  | "pending_approval"
  | "approved"
  | "needs_improvement"
  | "posted";

export type SocialPostFormat = "image" | "carousel";

export type SocialPost = {
  id: string;
  date: string;
  day: string;
  time: string;
  title: string;
  pillar: string;
  /** image = single use-case creative; carousel = swipe pack (esp. weekends) */
  format: SocialPostFormat;
  status: SocialPostStatus;
  /** LinkedIn caption. Empty string = visual-only / no text post. */
  caption: string;
  /** Cover / single image */
  creative: string;
  /** Extra carousel slides (cover is `creative`) */
  carousel: string[];
  feedback: string;
  postedAt: string | null;
  /** Optional story character / shop context for AI improve */
  storyHook?: string;
};

export type SocialSchedule = {
  weekId: string;
  weekLabel: string;
  timezone: string;
  platform: string;
  account: string;
  character: string;
  premise: string;
  slotsPerDay: string[];
  updatedAt: string;
  posts: SocialPost[];
};

export const SOCIAL_SLOT_LABELS: Record<string, string> = {
  "08:00": "8 AM",
  "11:00": "11 AM",
  "16:00": "4 PM",
  "21:00": "9 PM",
};
