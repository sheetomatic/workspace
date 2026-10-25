export async function readUpdatesBody(request: Request) {
  if (!["https://sheetomatic.com", "https://www.sheetomatic.com"].includes(request.headers.get("origin") ?? "")) throw new Response(null, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Response(null, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) throw new Response(null, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 2048) { await reader.cancel(); throw new Response(null, { status: 413 }); } chunks.push(part.value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new Response(null, { status: 400 }); }
}
