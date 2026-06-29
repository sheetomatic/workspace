-- Separate Tasks from BCI bundle: optional TASKS_ADDON plan for Executive Assistant module.
ALTER TYPE "OrgPlan" ADD VALUE IF NOT EXISTS 'TASKS_ADDON';
