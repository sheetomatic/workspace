"use client";

import { useRef, useState } from "react";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; id: string; fileName: string }
  | { status: "error"; message: string };

/**
 * Field visit proof: take photo (mobile camera), upload file, or paste a web link.
 * Mirrors IMS receipt pre-upload → hidden attachmentId pattern.
 */
export function FieldProofUpload() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [webLink, setWebLink] = useState("");

  async function uploadFile(file: File) {
    setUpload({ status: "uploading" });
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/hr/field-attachments", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        attachment?: { id: string; fileName: string };
        error?: string;
      };
      if (!res.ok || !data.attachment) {
        setUpload({
          status: "error",
          message: data.error ?? "Upload failed.",
        });
        return;
      }
      setUpload({
        status: "done",
        id: data.attachment.id,
        fileName: data.attachment.fileName,
      });
      setWebLink("");
    } catch {
      setUpload({ status: "error", message: "Network error during upload." });
    }
  }

  async function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    event.target.value = "";
  }

  function clearUpload() {
    setUpload({ status: "idle" });
    if (cameraRef.current) cameraRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="ws-hr-field-proof">
      <span className="ws-hr-field-proof-label">Visit proof</span>
      <p className="ws-hr-help">
        Take a photo, upload an image/PDF, or paste a Drive/WhatsApp link.
      </p>

      <div className="ws-hr-field-proof-actions">
        <button
          type="button"
          className="btn-cta btn-secondary btn-compact"
          disabled={upload.status === "uploading"}
          onClick={() => cameraRef.current?.click()}
        >
          Take photo
        </button>
        <button
          type="button"
          className="btn-cta btn-secondary btn-compact"
          disabled={upload.status === "uploading"}
          onClick={() => fileRef.current?.click()}
        >
          Upload file
        </button>
        {upload.status === "done" ? (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={clearUpload}
          >
            Remove
          </button>
        ) : null}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="ws-hr-field-proof-hidden"
        tabIndex={-1}
        aria-hidden
        onChange={handleInputChange}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp,.heic"
        className="ws-hr-field-proof-hidden"
        tabIndex={-1}
        aria-hidden
        onChange={handleInputChange}
      />

      {upload.status === "uploading" ? (
        <p className="ws-hr-meta" role="status">
          Uploading proof…
        </p>
      ) : null}
      {upload.status === "done" ? (
        <>
          <input type="hidden" name="photoAttachmentId" value={upload.id} />
          <p className="ws-hr-meta" role="status">
            Attached: {upload.fileName}
          </p>
        </>
      ) : null}
      {upload.status === "error" ? (
        <p className="ws-hr-feedback-error" role="alert">
          {upload.message}
        </p>
      ) : null}

      {upload.status !== "done" ? (
        <label>
          Or paste web link
          <input
            name="photoUrl"
            type="url"
            value={webLink}
            onChange={(event) => setWebLink(event.target.value)}
            placeholder="Drive, WhatsApp, or site photo link"
          />
        </label>
      ) : null}
    </div>
  );
}
