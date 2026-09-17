-- FMS loop/condition engine: per-step route rules + revisit history.

ALTER TABLE "FmsTemplateStep" ADD COLUMN "routeRules" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "FmsStepState" ADD COLUMN "visitIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FmsStepState" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX "FmsStepState_instanceId_stepId_key";

CREATE UNIQUE INDEX "FmsStepState_instanceId_stepId_visitIndex_key" ON "FmsStepState"("instanceId", "stepId", "visitIndex");
