import type { LngLat } from "@/lib/fleet/types";

export type FleetMarkerTone = "moving" | "idle" | "alert" | "offline";

export type FleetBoard = {
  empty: boolean;
  headline: string;
  line: string;
  kpis: {
    activeDumpers: number;
    queuedAtSilo: number;
    dumping: number;
    idle: number;
    breakdown: number;
    ashTonnesToday: number;
    fuelStolenLiters: number;
  };
  vehicles: Array<{
    id: string;
    registrationNumber: string;
    vehicleType: string;
    status: string;
    tone: FleetMarkerTone;
    latitude: number | null;
    longitude: number | null;
    speedKmh: number | null;
    fuelLevelLiters: number | null;
    engineState: string | null;
    lastRecordedAt: string | null;
    queueMinutes: number | null;
    dumpMinutes: number | null;
    distanceToSiloM: number | null;
  }>;
  geofences: Array<{
    id: string;
    name: string;
    type: string;
    ring: LngLat[];
  }>;
  alerts: Array<{
    id: string;
    vehicleId: string;
    registrationNumber: string;
    alertType: string;
    priority: "CRITICAL" | "WARNING" | "INFO";
    headline: string;
    detail: string;
    escalation: string;
    createdAt: string;
    escalatedAt: string | null;
  }>;
  trips: Array<{
    id: string;
    registrationNumber: string;
    status: string;
    grossWeightKg: number | null;
    tareWeightKg: number | null;
    ashTonnes: number | null;
    dykeFixCount: number;
    gpsProof: "Dyke track" | "No dyke track" | "Open";
    startTime: string;
    endTime: string | null;
  }>;
};
