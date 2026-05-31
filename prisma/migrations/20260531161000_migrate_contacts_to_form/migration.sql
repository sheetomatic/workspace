UPDATE "WaContact"
SET "leadCaptureStep" = 'FORM'
WHERE "leadCaptureComplete" = false
  AND "leadCaptureStep" IN ('NAME', 'EMAIL', 'CITY', 'REQUIREMENT');
