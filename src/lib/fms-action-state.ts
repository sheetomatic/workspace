import type { ParsedFmsFormDraft } from "@/lib/integrations/openai";
import type { TableCalcAiSuggestion } from "@/lib/fms/table-calc-ai";
import type {
  FmsTableColumn,
  FmsTableFooterTotal,
} from "@/lib/fms/constants";

export type FmsActionState = {
  ok: boolean;
  message?: string;
};

export const fmsInitialState: FmsActionState = { ok: false };

export type FmsAiGenerateResult =
  | { ok: true; draft: ParsedFmsFormDraft }
  | { ok: false; message: string };

export type TableCalcAiGenerateResult =
  | { ok: true; suggestion: TableCalcAiSuggestion }
  | { ok: false; message: string };

export type TableCalcAiApplyInput = {
  columns: FmsTableColumn[];
  footerTotals: FmsTableFooterTotal[];
  suggestion: TableCalcAiSuggestion;
};

export type FmsFlowAiClarifyResult = {
  ok: true;
  needsClarification: true;
  questions: string[];
};

export type FmsFlowAiReadyResult = {
  ok: true;
  needsClarification: false;
  draft: import("@/lib/integrations/openai").ParsedFmsFlowDraft;
};

export type FmsFlowAiGenerateResult =
  | FmsFlowAiClarifyResult
  | FmsFlowAiReadyResult
  | { ok: false; message: string };
