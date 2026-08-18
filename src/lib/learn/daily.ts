const DAILY_API = "https://api.daily.co/v1";

function dailyApiKey() {
  return process.env.DAILY_API_KEY?.trim() || "";
}

export function isDailyConfigured() {
  return Boolean(dailyApiKey());
}

type DailyJson = {
  name?: string;
  url?: string;
  token?: string;
  error?: string;
  info?: string;
};

async function dailyFetch(path: string, init?: RequestInit): Promise<DailyJson> {
  const key = dailyApiKey();
  if (!key) {
    throw new Error("Add DAILY_API_KEY on Vercel to start an in-panel class.");
  }
  const response = await fetch(`${DAILY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as DailyJson;
  if (!response.ok) {
    const detail = body.info || body.error || `Daily request failed (${response.status})`;
    throw new Error(detail);
  }
  return body;
}

function alreadyExists(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return /already exists|taken|unique/i.test(text);
}

export async function ensureDailyRoom(params: {
  roomName: string;
  expUnix: number;
  maxParticipants?: number;
}) {
  const maxParticipants = params.maxParticipants ?? 6;
  const properties = {
    exp: params.expUnix,
    enable_screenshare: true,
    enable_chat: true,
    start_video_off: false,
    eject_at_room_exp: true,
    max_participants: maxParticipants,
  };
  try {
    const room = await dailyFetch("/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: params.roomName,
        privacy: "private",
        properties,
      }),
    });
    return { name: room.name || params.roomName, url: room.url || "" };
  } catch (error) {
    if (!alreadyExists(error)) throw error;
    try {
      await dailyFetch(`/rooms/${encodeURIComponent(params.roomName)}`, {
        method: "POST",
        body: JSON.stringify({ properties }),
      });
    } catch {
      // Room may already be in use; joining still works.
    }
    const room = await dailyFetch(`/rooms/${encodeURIComponent(params.roomName)}`);
    return { name: room.name || params.roomName, url: room.url || "" };
  }
}

export async function createDailyMeetingToken(params: {
  roomName: string;
  userName: string;
  isOwner: boolean;
  expUnix: number;
}) {
  const data = await dailyFetch("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: params.roomName,
        user_name: params.userName.slice(0, 80) || "Guest",
        is_owner: params.isOwner,
        exp: params.expUnix,
        enable_screenshare: true,
      },
    }),
  });
  if (!data.token) {
    throw new Error("Daily did not return a meeting token.");
  }
  return data.token;
}

export async function deleteDailyRoom(roomName: string) {
  try {
    await dailyFetch(`/rooms/${encodeURIComponent(roomName)}`, {
      method: "DELETE",
    });
  } catch {
    // Room may already have expired.
  }
}
