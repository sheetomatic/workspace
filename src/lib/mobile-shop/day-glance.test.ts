import { describe, expect, it } from "vitest";
import {
  classifySale,
  isOverdueRepair,
  startOfShopDay,
  summarizeShopDay,
} from "@/lib/mobile-shop/day-glance";

const NOW = new Date("2026-09-04T08:00:00.000Z"); // 1:30 PM IST
const TODAY = new Date("2026-09-04T03:30:00.000Z"); // 9:00 AM IST
const YESTERDAY = new Date("2026-09-03T10:00:00.000Z");

describe("startOfShopDay", () => {
  it("uses midnight Asia/Kolkata, not UTC", () => {
    expect(startOfShopDay(NOW).toISOString()).toBe("2026-09-03T18:30:00.000Z");
    expect(startOfShopDay(new Date("2026-09-03T18:29:00.000Z")).toISOString()).toBe(
      "2026-09-02T18:30:00.000Z",
    );
  });
});

describe("classifySale", () => {
  it("splits SALE rupees by item kind and phone condition", () => {
    expect(classifySale("PHONE", "NEW")).toBe("newPhones");
    expect(classifySale("PHONE", "USED")).toBe("usedPhones");
    expect(classifySale("PHONE", "REFURBISHED")).toBe("usedPhones");
    expect(classifySale("ACCESSORY", null)).toBe("accessories");
    expect(classifySale("PART", null)).toBeNull();
  });
});

describe("summarizeShopDay", () => {
  it("counts today's money, stock, repairs, and exceptions — not % done", () => {
    const glance = summarizeShopDay({
      now: NOW,
      movements: [
        {
          kind: "SALE",
          qty: 1,
          amountPaise: 8_000_000,
          createdAt: TODAY,
          item: { kind: "PHONE", condition: "NEW" },
        },
        {
          kind: "SALE",
          qty: 1,
          amountPaise: 1_200_000,
          createdAt: TODAY,
          item: { kind: "PHONE", condition: "USED" },
        },
        {
          kind: "SALE",
          qty: 3,
          amountPaise: 45_000,
          createdAt: TODAY,
          item: { kind: "ACCESSORY", condition: null },
        },
        {
          kind: "SALE",
          qty: 1,
          amountPaise: 99_000,
          createdAt: YESTERDAY,
          item: { kind: "PHONE", condition: "NEW" },
        },
        {
          kind: "STOCK_IN",
          qty: 4,
          amountPaise: 0,
          createdAt: TODAY,
          item: { kind: "ACCESSORY", condition: null },
        },
        {
          kind: "STOCK_OUT",
          qty: 1,
          amountPaise: 0,
          createdAt: TODAY,
          item: { kind: "ACCESSORY", condition: null },
        },
        {
          kind: "PART_TO_REPAIR",
          qty: 1,
          amountPaise: 0,
          createdAt: TODAY,
          item: { kind: "PART", condition: null },
        },
      ],
      repairs: [
        {
          id: "r1",
          status: "IN_PROGRESS",
          createdAt: TODAY,
          updatedAt: TODAY,
          promisedAt: new Date("2026-09-03T12:00:00.000Z"),
          customerName: "Rahul",
          deviceName: "Redmi 13",
        },
        {
          id: "r2",
          status: "READY",
          createdAt: YESTERDAY,
          updatedAt: TODAY,
          promisedAt: new Date("2026-09-10T12:00:00.000Z"),
          customerName: "Neha",
          deviceName: "A15",
        },
        {
          id: "r3",
          status: "DELIVERED",
          createdAt: TODAY,
          updatedAt: TODAY,
          promisedAt: new Date("2026-09-04T12:00:00.000Z"),
          customerName: "Amit",
          deviceName: "Narzo",
        },
        {
          id: "r4",
          status: "DELIVERED",
          createdAt: YESTERDAY,
          updatedAt: YESTERDAY,
          promisedAt: new Date("2026-09-01T12:00:00.000Z"),
          customerName: "Old",
          deviceName: "Done",
        },
      ],
      stockItems: [
        { id: "s1", name: "Plain cover", kind: "ACCESSORY", qty: 2 },
        { id: "s2", name: "A15 screen", kind: "PART", qty: 0 },
        { id: "s3", name: "20W charger", kind: "ACCESSORY", qty: 12 },
        { id: "s4", name: "Pixel 8", kind: "PHONE", qty: 1 },
      ],
    });

    expect(glance.sales.newPhones).toEqual({ count: 1, qty: 1, paise: 8_000_000 });
    expect(glance.sales.usedPhones).toEqual({ count: 1, qty: 1, paise: 1_200_000 });
    expect(glance.sales.accessories).toEqual({ count: 1, qty: 3, paise: 45_000 });
    expect(glance.sales.total.paise).toBe(9_245_000);
    expect(glance.sales.total.count).toBe(3);
    expect(glance.accessoriesSold.qty).toBe(3);
    expect(glance.stockIn).toEqual({ count: 1, qty: 4, paise: 0 });
    expect(glance.stockOut).toEqual({ count: 2, qty: 2, paise: 0 });
    expect(glance.repairs).toEqual({
      received: 2,
      inProgress: 1,
      ready: 1,
      delivered: 1,
    });
    expect(glance.lowStock.map((item) => item.name)).toEqual([
      "Plain cover",
      "A15 screen",
    ]);
    expect(glance.overdueRepairs.map((job) => job.id)).toEqual(["r1"]);
  });
});

describe("isOverdueRepair", () => {
  it("flags promisedAt in the past unless delivered or cancelled", () => {
    const past = new Date("2026-09-01T00:00:00.000Z");
    expect(isOverdueRepair("IN_PROGRESS", past, NOW)).toBe(true);
    expect(isOverdueRepair("DELIVERED", past, NOW)).toBe(false);
    expect(isOverdueRepair("CANCELLED", past, NOW)).toBe(false);
    expect(isOverdueRepair("READY", null, NOW)).toBe(false);
  });
});
