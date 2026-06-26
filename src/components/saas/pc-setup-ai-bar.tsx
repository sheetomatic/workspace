"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PcAiPanel } from "@/components/saas/pc-ai-panel";
import type { ParsedChecklistDraft } from "@/lib/integrations/openai";

export function PcSetupAiBar({ canConfigure }: { canConfigure: boolean }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");

  function handleDraft(draft: ParsedChecklistDraft) {
    sessionStorage.setItem("pc-ai-draft", JSON.stringify(draft));
    if (canConfigure) {
      router.push("/app/checklists/new");
      return;
    }
    setNotice("AI draft saved. Share with your admin to activate this PC schedule.");
  }

  return (
    <div className="ws-pc-setup-ai-bar-wrap">
      <PcAiPanel compact onDraft={handleDraft} />
      {notice ? <p className="saas-form-message ok">{notice}</p> : null}
    </div>
  );
}
