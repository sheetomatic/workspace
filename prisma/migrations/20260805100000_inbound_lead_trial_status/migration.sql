-- Add TRIAL stage (3-day trial after quotation/proposal is sent)
ALTER TYPE "InboundLeadStatus" ADD VALUE IF NOT EXISTS 'TRIAL' AFTER 'PROPOSAL';
