import type { ParsedFmsFormDraft } from "@/lib/integrations/openai";

export type FmsActionState = {
  ok: boolean;
  message?: string;
};

export const fmsInitialState: FmsActionState = { ok: false };

export type FmsAiGenerateResult =
  | { ok: true; draft: ParsedFmsFormDraft }
  | { ok: false; message: string };
