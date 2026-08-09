export type SocialPostStatus =
  | "pending_approval"
  | "approved"
  | "needs_improvement"
  | "posted";

export type SocialPost = {
  id: string;
  date: string;
  day: string;
  time: string;
  title: string;
  pillar: string;
  status: SocialPostStatus;
  caption: string;
  creative: string;
  feedback: string;
  postedAt: string | null;
};

export type SocialSchedule = {
  weekId: string;
  weekLabel: string;
  timezone: string;
  platform: string;
  account: string;
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
