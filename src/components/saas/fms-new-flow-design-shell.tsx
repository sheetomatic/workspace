"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FmsFlowchartBuilder } from "@/components/saas/fms-flowchart-builder";
import { FmsWorkflowTemplatePicker } from "@/components/saas/fms-workflow-template-picker";
import type { FmsFlowchartStep } from "@/lib/fms/flow-design";
import { getFmsAiStarter } from "@/lib/fms/ai-starters";
import {
  getFmsWorkflowTemplate,
  templateToFlowchartSteps,
} from "@/lib/fms/workflow-templates";
import type { FmsAssignableMember } from "@/lib/fms/flow-owner-resolve";

type Member = FmsAssignableMember;

type FlowSelection = {
  name: string;
  description: string;
  steps: FmsFlowchartStep[];
  aiPrompt: string;
  autoBuildAi: boolean;
  builderKey: number;
};

function resolveInitialSelection(
  templateId?: string | null,
  starterId?: string | null,
): { selection: FlowSelection; hidePicker: boolean } {
  const template = templateId ? getFmsWorkflowTemplate(templateId) : null;
  const starter = !template && starterId ? getFmsAiStarter(starterId) : null;
  const starterTemplate =
    starter?.templateId ? getFmsWorkflowTemplate(starter.templateId) : null;
  const activeTemplate = template ?? starterTemplate;

  if (activeTemplate) {
    return {
      hidePicker: true,
      selection: {
        name: activeTemplate.name,
        description: activeTemplate.description,
        steps: templateToFlowchartSteps(activeTemplate),
        aiPrompt: "",
        autoBuildAi: false,
        builderKey: 0,
      },
    };
  }

  if (starter) {
    return {
      hidePicker: true,
      selection: {
        name: starter.label,
        description: starter.summary,
        steps: [],
        aiPrompt: starter.prompt,
        autoBuildAi: true,
        builderKey: 0,
      },
    };
  }

  return {
    hidePicker: false,
    selection: {
      name: "",
      description: "",
      steps: [],
      aiPrompt: "",
      autoBuildAi: false,
      builderKey: 0,
    },
  };
}

export function FmsNewFlowDesignShell({
  members,
  initialTemplateId,
  initialStarterId,
}: {
  members: Member[];
  initialTemplateId?: string | null;
  initialStarterId?: string | null;
}) {
  const initial = resolveInitialSelection(initialTemplateId, initialStarterId);
  const [pickerHidden, setPickerHidden] = useState(initial.hidePicker);
  const [selection, setSelection] = useState<FlowSelection>(initial.selection);
  const canvasRef = useRef<HTMLDivElement>(null);

  const scrollToCanvas = useCallback(() => {
    window.requestAnimationFrame(() => {
      canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    if (initial.hidePicker) {
      scrollToCanvas();
    }
  }, [initial.hidePicker, scrollToCanvas]);

  function applyTemplate(templateId: string) {
    const template = getFmsWorkflowTemplate(templateId);
    if (!template) {
      return;
    }
    setSelection((prev) => ({
      name: template.name,
      description: template.description,
      steps: templateToFlowchartSteps(template),
      aiPrompt: "",
      autoBuildAi: false,
      builderKey: prev.builderKey + 1,
    }));
    setPickerHidden(true);
    scrollToCanvas();
  }

  function applyStarter(starterId: string) {
    const starter = getFmsAiStarter(starterId);
    if (!starter) {
      return;
    }
    if (starter.templateId) {
      applyTemplate(starter.templateId);
      return;
    }
    setSelection((prev) => ({
      name: starter.label,
      description: starter.summary,
      steps: [],
      aiPrompt: starter.prompt,
      autoBuildAi: true,
      builderKey: prev.builderKey + 1,
    }));
    setPickerHidden(true);
    scrollToCanvas();
  }

  function handleFlowStarted() {
    setPickerHidden(true);
    scrollToCanvas();
  }

  return (
    <>
      {!pickerHidden ? (
        <FmsWorkflowTemplatePicker
          onPickTemplate={applyTemplate}
          onPickStarter={applyStarter}
        />
      ) : (
        <div className="ws-fms-picker-collapsed-bar">
          <button
            type="button"
            className="ws-fms-btn-quiet"
            onClick={() => setPickerHidden(false)}
          >
            Change template
          </button>
        </div>
      )}
      <FmsFlowchartBuilder
        key={selection.builderKey}
        members={members}
        mode="create"
        initialName={selection.name}
        initialDescription={selection.description}
        initialSteps={selection.steps}
        initialAiPrompt={selection.aiPrompt}
        autoBuildAi={selection.autoBuildAi}
        canvasRef={canvasRef}
        onFlowStarted={handleFlowStarted}
      />
    </>
  );
}
