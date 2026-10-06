import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";

/** Registration list for the driver page. No positions, no other tenants. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  const vehicles = await prisma.fleetVehicle.findMany({
    where: { organizationId: user.organizationId, status: { not: "RETIRED" } },
    select: { id: true, registrationNumber: true, fuelCapacityLiters: true },
    orderBy: { registrationNumber: "asc" },
  });
  return NextResponse.json({ vehicles });
}
