UPDATE "InboundLead"
SET status = 'PROPOSAL'
WHERE status = 'PROPOSAL_INVOICE';

UPDATE "InboundLead"
SET "aiSuggestedStatus" = 'PROPOSAL'
WHERE "aiSuggestedStatus" = 'PROPOSAL_INVOICE';
