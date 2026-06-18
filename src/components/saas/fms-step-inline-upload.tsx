"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Upload } from "lucide-react";
import { uploadFmsStepAttachmentAction } from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import { formatFmsAttachmentMaxSize } from "@/lib/fms/attachment-limits";

const FMS_ATTACHMENT_ACCEPT =
  "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv";

type FmsStepInlineUploadProps = {
  stepStateId: string;
  allowUpload: boolean;
  canUpload: boolean;
};

export function FmsStepInlineUpload({
  stepStateId,
  allowUpload,
  canUpload,
}: FmsStepInlineUploadProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    uploadFmsStepAttachmentAction,
    fmsInitialState,
  );

  useEffect(() => {
    if (!state.ok) {
      return;
    }
    formRef.current?.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    router.refresh();
  }, [state.ok, router]);

  if (!allowUpload || !canUpload) {
    return null;
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="ws-fms-journey-inline-upload"
      encType="multipart/form-data"
    >
      <input type="hidden" name="stepStateId" value={stepStateId} />
      <label className="ws-fms-journey-inline-upload-label">
        <Paperclip aria-hidden size={14} />
        <span className="ws-fms-journey-inline-upload-copy">
          <strong>Upload file</strong>
          <small>
            Images, videos, or documents (max {formatFmsAttachmentMaxSize()})
          </small>
        </span>
        <input
          ref={fileInputRef}
          accept={FMS_ATTACHMENT_ACCEPT}
          className="ws-fms-journey-inline-upload-input"
          disabled={pending}
          name="attachment"
          required
          type="file"
        />
      </label>
      <button
        className="btn-secondary btn-sm ws-fms-journey-inline-upload-btn"
        disabled={pending}
        type="submit"
      >
        <Upload aria-hidden size={14} />
        {pending ? "Uploading..." : "Upload"}
      </button>
      {state.message ? (
        <p
          className={
            state.ok
              ? "ws-form-success ws-fms-journey-inline-upload-msg"
              : "ws-form-error ws-fms-journey-inline-upload-msg"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
