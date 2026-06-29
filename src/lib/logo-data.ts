export type ParsedLogoData = {
  mime: string;
  buffer: Buffer;
};

export function parseLogoDataUrl(value: string): ParsedLogoData | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  if (dataUrlMatch) {
    return {
      mime: dataUrlMatch[1]!,
      buffer: Buffer.from(dataUrlMatch[2]!, "base64"),
    };
  }

  try {
    return {
      mime: "image/png",
      buffer: Buffer.from(trimmed, "base64"),
    };
  } catch {
    return null;
  }
}
