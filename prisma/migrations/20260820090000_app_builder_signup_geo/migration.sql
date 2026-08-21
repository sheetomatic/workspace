-- AlterTable
ALTER TABLE "InboundLead" ADD COLUMN "country" TEXT;
ALTER TABLE "InboundLead" ADD COLUMN "industry" TEXT;
ALTER TABLE "InboundLead" ADD COLUMN "state" TEXT;
ALTER TABLE "InboundLead" ADD COLUMN "teamSize" TEXT;

-- CreateTable
CREATE TABLE "GeoCountry" (
    "id" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "iso3" TEXT,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'restcountries',
    "userAdded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoState" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCode" TEXT,
    "source" TEXT NOT NULL DEFAULT 'countriesnow',
    "userAdded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoCity" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'countriesnow',
    "userAdded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessIndustry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'sheetomatic',
    "userAdded" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessIndustry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoCountry_iso2_key" ON "GeoCountry"("iso2");
CREATE INDEX "GeoCountry_name_idx" ON "GeoCountry"("name");
CREATE UNIQUE INDEX "GeoState_countryId_name_key" ON "GeoState"("countryId", "name");
CREATE INDEX "GeoState_countryId_idx" ON "GeoState"("countryId");
CREATE UNIQUE INDEX "GeoCity_stateId_name_key" ON "GeoCity"("stateId", "name");
CREATE INDEX "GeoCity_stateId_idx" ON "GeoCity"("stateId");
CREATE UNIQUE INDEX "BusinessIndustry_name_key" ON "BusinessIndustry"("name");

-- AddForeignKey
ALTER TABLE "GeoState" ADD CONSTRAINT "GeoState_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "GeoCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeoCity" ADD CONSTRAINT "GeoCity_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "GeoState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
