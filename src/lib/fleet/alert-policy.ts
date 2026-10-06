import type { FleetAlertPriority, FleetAlertType } from "@prisma/client";

const PRIORITY: Record<FleetAlertType, FleetAlertPriority> = {
  FUEL_THEFT: "CRITICAL",
  UNAUTHORIZED_DUMP: "CRITICAL",
  BREAKDOWN: "CRITICAL",
  GHOST_TRIP: "CRITICAL",
  EXCESS_IDLING: "WARNING",
  SILO_QUEUE_DELAY: "WARNING",
  OFFLINE_TOO_LONG: "WARNING",
  PAYLOAD_ANOMALY: "WARNING",
  FUEL_SLIP_VARIANCE: "WARNING",
  ROUTE_EXIT: "WARNING",
  SENSOR_FAULT: "INFO",
  SHIFT_START: "INFO",
  SHIFT_END: "INFO",
  MAINTENANCE_DUE: "INFO",
};

export function priorityFor(type: FleetAlertType): FleetAlertPriority {
  return PRIORITY[type];
}

export function alertHeadline(type: FleetAlertType, registration: string): string {
  switch (type) {
    case "FUEL_THEFT":
      return `Fuel drop on ${registration}`;
    case "UNAUTHORIZED_DUMP":
      return `${registration} stopped outside the dyke`;
    case "BREAKDOWN":
      return `${registration} has not moved for 45 minutes`;
    case "GHOST_TRIP":
      return `${registration} weighed a trip with no dyke track`;
    case "EXCESS_IDLING":
      return `${registration} idling past 20 minutes`;
    case "SILO_QUEUE_DELAY":
      return `${registration} queued at the silo past 30 minutes`;
    case "OFFLINE_TOO_LONG":
      return `${registration} has been dark for 2 hours`;
    case "PAYLOAD_ANOMALY":
      return `${registration} weight is outside the dumper band`;
    case "FUEL_SLIP_VARIANCE":
      return `${registration} pump slip does not match the tank`;
    case "ROUTE_EXIT":
      return `${registration} left the haul road`;
    case "SENSOR_FAULT":
      return `${registration} fuel sensor jumped`;
    case "SHIFT_START":
      return `${registration} shift started`;
    case "SHIFT_END":
      return `${registration} shift ended`;
    case "MAINTENANCE_DUE":
      return `${registration} maintenance due`;
    default:
      return registration;
  }
}

/** Body a supervisor can paste into WhatsApp. Sending stays with the WA settings already on the org. */
export function escalationText(input: {
  type: FleetAlertType;
  registration: string;
  detail: string;
}): string {
  return `Ash yard — ${alertHeadline(input.type, input.registration)}. ${input.detail}`.trim();
}
