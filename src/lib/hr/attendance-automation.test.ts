import { describe, expect, it } from "vitest";
import {
  computeLateDeduction,
  selectCheckoutReminderRecipients,
  selectMarkReminderRecipients,
  summarizeAttendance,
} from "@/lib/hr/attendance-automation";

const members = [
  { userId: "u1", name: "Amit", phone: "9111", role: "STAFF" },
  { userId: "u2", name: "Priya", phone: "9222", role: "MANAGER" },
  { userId: "u3", name: "Neha", phone: null, role: "STAFF" },
  { userId: "u4", name: "Ravi", phone: "9444", role: "OWNER" },
];

function rec(
  userId: string,
  over: Partial<{
    checkInAt: Date | null;
    checkOutAt: Date | null;
    status: string;
    isLate: boolean;
  }> = {},
) {
  return {
    userId,
    checkInAt: over.checkInAt ?? null,
    checkOutAt: over.checkOutAt ?? null,
    status: over.status ?? "PRESENT",
    isLate: over.isLate ?? false,
  };
}

describe("computeLateDeduction", () => {
  it("deducts one day pay for every N late marks", () => {
    expect(computeLateDeduction({ lateDays: 3, ratio: 3, perDayPay: 1000 })).toEqual({
      deductionDays: 1,
      amount: 1000,
    });
    expect(computeLateDeduction({ lateDays: 7, ratio: 3, perDayPay: 1000 })).toEqual({
      deductionDays: 2,
      amount: 2000,
    });
  });

  it("returns zero below the ratio or with bad inputs", () => {
    expect(computeLateDeduction({ lateDays: 2, ratio: 3, perDayPay: 1000 }).amount).toBe(0);
    expect(computeLateDeduction({ lateDays: 5, ratio: 0, perDayPay: 1000 }).amount).toBe(0);
    expect(computeLateDeduction({ lateDays: 5, ratio: 3, perDayPay: 0 }).amount).toBe(0);
  });
});

describe("attendance reminder selection", () => {
  it("nudges only members who have not checked in (and not on leave/holiday)", () => {
    const records = [
      rec("u1", { checkInAt: new Date() }), // checked in → skip
      rec("u2", { status: "ON_LEAVE" }), // on leave → skip
      // u3, u4 have no record → remind
    ];
    const ids = selectMarkReminderRecipients(members, records).map((m) => m.userId);
    expect(ids).toEqual(["u3", "u4"]);
  });

  it("reminds only members checked in but not out", () => {
    const records = [
      rec("u1", { checkInAt: new Date() }), // in, not out → remind
      rec("u2", { checkInAt: new Date(), checkOutAt: new Date() }), // done → skip
      rec("u4", { checkInAt: new Date() }), // in, not out → remind
    ];
    const ids = selectCheckoutReminderRecipients(members, records).map((m) => m.userId);
    expect(ids).toEqual(["u1", "u4"]);
  });
});

describe("summarizeAttendance", () => {
  it("rolls up present/late/pending-checkout/leave/not-marked", () => {
    const records = [
      rec("u1", { checkInAt: new Date(), isLate: true }), // present, late, no checkout
      rec("u2", { checkInAt: new Date(), checkOutAt: new Date() }), // present, done
      rec("u3", { status: "ON_LEAVE" }), // leave
      // u4 no record → not marked
    ];
    expect(summarizeAttendance(members, records)).toEqual({
      total: 4,
      present: 2,
      late: 1,
      pendingCheckout: 1,
      onLeave: 1,
      notMarked: 1,
    });
  });
});
