import type { FmsFormField } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validateFmsAttachmentFile } from "@/lib/fms/attachment-limits";

export async function persistFmsIntakeFiles(params: {
  formData: FormData;
  fields: FmsFormField[];
  userId: string;
  stepStateId: string;
  values: Record<string, unknown>;
}) {
  const nextValues = { ...params.values };

  for (const field of params.fields) {
    if (field.fieldType !== "FILE") {
      continue;
    }

    const file = params.formData.get(`file_${field.fieldKey}`);
    if (!(file instanceof File) || file.size === 0) {
      continue;
    }

    const fileCheck = validateFmsAttachmentFile(file);
    if (!fileCheck.ok) {
      throw new Error(fileCheck.message);
    }

    const attachmentBuffer = Buffer.from(await file.arrayBuffer());
    const attachment = await prisma.fmsStepAttachment.create({
      data: {
        stepStateId: params.stepStateId,
        uploadedById: params.userId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        data: new Uint8Array(attachmentBuffer),
      },
    });

    nextValues[field.fieldKey] = {
      attachmentId: attachment.id,
      fileName: file.name,
    };
  }

  return nextValues;
}
