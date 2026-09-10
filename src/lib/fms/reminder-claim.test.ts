import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateMany } = vi.hoisted(() => ({
  updateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    fmsStepState: { updateMany },
  },
}));

import { claimFmsReminder, releaseFmsReminder } from "@/lib/fms/reminder-claim";

describe("FMS reminder claim", () => {
  beforeEach(() => {
    updateMany.mockReset();
  });

  it("wins when the sent-at flag is still null", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await expect(
      claimFmsReminder("step-1", "whatsappOverdueSentAt"),
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "step-1",
        status: "IN_PROGRESS",
        whatsappOverdueSentAt: null,
      },
      data: { whatsappOverdueSentAt: expect.any(Date) },
    });
  });

  it("loses when another tick already claimed the flag", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      claimFmsReminder("step-1", "whatsappOverdueSentAt"),
    ).resolves.toBe(false);
  });

  it("clears the flag so a failed send can retry", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await releaseFmsReminder("step-1", "whatsappDueSoonSentAt");
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "step-1",
        whatsappDueSoonSentAt: { not: null },
      },
      data: { whatsappDueSoonSentAt: null },
    });
  });
});
