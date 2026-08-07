/**
 * One-off: renders the S-through-4-points brand mark into every raster asset.
 * Run: npx tsx scripts/generate-brand-assets.ts
 */
import sharp from "sharp";

const GRADIENT = `
  <linearGradient id="g" x1="140" y1="140" x2="372" y2="372" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#10B981"/>
    <stop offset="0.5" stop-color="#14B8A6"/>
    <stop offset="1" stop-color="#2563EB"/>
  </linearGradient>`;

function markSvg(strokeWidth: number, dotR: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="96 96 320 320" fill="none">
  <defs>${GRADIENT}</defs>
  <path d="M 372 140 C 300 116 212 116 140 140 C 140 258 372 254 372 372 C 300 396 212 396 140 372"
    stroke="url(#g)" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  <circle cx="140" cy="140" r="${dotR}" fill="url(#g)"/>
  <circle cx="372" cy="140" r="${dotR}" fill="url(#g)"/>
  <circle cx="140" cy="372" r="${dotR}" fill="url(#g)"/>
  <circle cx="372" cy="372" r="${dotR}" fill="url(#g)"/>
</svg>`;
}

const normalMark = Buffer.from(markSvg(14, 22));
// Thicker for tiny favicon sizes so the line survives 16px.
const thickMark = Buffer.from(markSvg(30, 36));

async function renderMark(svg: Buffer, px: number) {
  return sharp(svg, { density: 300 }).resize(px, px).png().toBuffer();
}

/** Mark centered on an opaque white square (app tiles need a solid bg). */
async function onWhite(svg: Buffer, canvasPx: number, markPx: number, out: string) {
  const mark = await renderMark(svg, markPx);
  const pad = Math.round((canvasPx - markPx) / 2);
  await sharp({
    create: { width: canvasPx, height: canvasPx, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: mark, top: pad, left: pad }])
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(out);
  console.log("wrote", out);
}

async function transparent(svg: Buffer, px: number, out: string) {
  await sharp(await renderMark(svg, px)).png().toFile(out);
  console.log("wrote", out);
}

async function ogImage(out: string) {
  const mark = await renderMark(normalMark, 200);
  const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <text x="600" y="440" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
      font-size="74" font-weight="bold" letter-spacing="-1" fill="#0A1B2E">sheetomatic</text>
    <text x="600" y="505" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
      font-size="30" fill="#475569">AI-Powered Business Automation</text>
  </svg>`);
  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: "#ffffff" },
  })
    .composite([
      { input: mark, top: 110, left: 500 },
      { input: textSvg, top: 0, left: 0 },
    ])
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(out);
  console.log("wrote", out);
}

async function main() {
  // Root site icons
  await transparent(normalMark, 512, "public/icon.png");
  await transparent(thickMark, 32, "public/images/sheetomatic-icon.png");
  await onWhite(normalMark, 180, 132, "public/apple-icon.png");
  await onWhite(thickMark, 32, 28, "public/favicon-32.png");
  await onWhite(thickMark, 16, 15, "/tmp/favicon-16.png");
  await onWhite(thickMark, 48, 42, "/tmp/favicon-48.png");
  // Workspace PWA icons (maskable-safe: mark at ~62% of canvas)
  await onWhite(normalMark, 192, 122, "public/icons/workspace-icon-192.png");
  await onWhite(normalMark, 512, 324, "public/icons/workspace-icon-512.png");
  // Social share card
  await ogImage("public/images/og-default.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
