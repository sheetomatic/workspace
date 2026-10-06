import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { shapeContains } from "@/lib/fleet/geofence";
import type { GeofenceShape, LngLat } from "@/lib/fleet/types";

type Fix = { id: string; longitude: number; latitude: number };

let postgis: boolean | null = null;

/** One probe per process. Missing extension is normal on local Postgres. */
export async function postgisAvailable(): Promise<boolean> {
  if (postgis != null) return postgis;
  try {
    const rows = await prisma.$queryRaw<{ ok: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS ok
    `;
    postgis = Boolean(rows[0]?.ok);
  } catch {
    postgis = false;
  }
  return postgis;
}

/**
 * Points inside a fence. Uses PostGIS ST_Contains / ST_DWithin when the
 * extension is present, otherwise the same test in TypeScript.
 */
export async function fixesInside(
  shape: GeofenceShape,
  fixes: Fix[],
): Promise<Set<string>> {
  if (fixes.length === 0) return new Set();
  if (await postgisAvailable()) {
    try {
      return await fixesInsidePostgis(shape, fixes);
    } catch {
      postgis = false;
    }
  }
  const hit = new Set<string>();
  for (const fix of fixes) {
    const point: LngLat = [fix.longitude, fix.latitude];
    if (shapeContains(shape, point)) hit.add(fix.id);
  }
  return hit;
}

async function fixesInsidePostgis(shape: GeofenceShape, fixes: Fix[]): Promise<Set<string>> {
  const payload = JSON.stringify(
    fixes.map((f) => ({ id: f.id, lng: f.longitude, lat: f.latitude })),
  );
  if (shape.kind === "circle") {
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id
      FROM jsonb_to_recordset(${payload}::jsonb) AS p(id text, lng double precision, lat double precision)
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${shape.center[0]}, ${shape.center[1]}), 4326)::geography,
        ${shape.radiusM}
      )
    `);
    return new Set(rows.map((row) => row.id));
  }
  const geo = JSON.stringify({
    type: "Polygon",
    coordinates: [[...shape.ring, shape.ring[0]]],
  });
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT p.id
    FROM jsonb_to_recordset(${payload}::jsonb) AS p(id text, lng double precision, lat double precision)
    WHERE ST_Contains(
      ST_SetSRID(ST_GeomFromGeoJSON(${geo}), 4326),
      ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)
    )
  `);
  return new Set(rows.map((row) => row.id));
}
