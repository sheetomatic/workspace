-- Multi-office HR sites and site-linked attendance.
CREATE TABLE "HrWorkSite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "geoFenceRadiusM" INTEGER NOT NULL DEFAULT 200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrWorkSite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HrWorkSite_organizationId_isActive_idx" ON "HrWorkSite"("organizationId", "isActive");

ALTER TABLE "HrWorkSite" ADD CONSTRAINT "HrWorkSite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceRecord" ADD COLUMN "siteId" TEXT;

ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "HrWorkSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
