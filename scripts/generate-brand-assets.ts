/**
 * Renders the four-dot squircle into every raster brand asset.
 * Run: npx tsx scripts/generate-brand-assets.ts
 */
import sharp from "sharp";

const INK = "#1D1D1F";

function markSvg(color: string, stroke: number, dotR: number) {
  const inset = stroke / 2;
  const rx = Math.max(8, 38 - inset);
  const size = 240 - stroke;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
  <rect x="${inset}" y="${inset}" width="${size}" height="${size}" rx="${rx}" stroke="${color}" stroke-width="${stroke}"/>
  <circle cx="67" cy="67" r="${dotR}" fill="${color}"/>
  <circle cx="172" cy="67" r="${dotR}" fill="${color}"/>
  <circle cx="67" cy="172" r="${dotR}" fill="${color}"/>
  <circle cx="172" cy="172" r="${dotR}" fill="${color}"/>
</svg>`;
}

const normalMark = Buffer.from(markSvg(INK, 15, 17.5));
const thickMark = Buffer.from(markSvg(INK, 26, 22));
const whiteMark = Buffer.from(markSvg("#FFFFFF", 15, 17.5));

async function renderMark(svg: Buffer, px: number) {
  return sharp(svg, { density: 384 }).resize(px, px).png().toBuffer();
}

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

async function onDark(svg: Buffer, canvasPx: number, markPx: number, out: string) {
  const mark = await renderMark(svg, markPx);
  const pad = Math.round((canvasPx - markPx) / 2);
  await sharp({
    create: { width: canvasPx, height: canvasPx, channels: 4, background: "#1D1D1F" },
  })
    .composite([{ input: mark, top: pad, left: pad }])
    .flatten({ background: "#1D1D1F" })
    .png()
    .toFile(out);
  console.log("wrote", out);
}

async function transparent(svg: Buffer, px: number, out: string) {
  await sharp(await renderMark(svg, px)).png().toFile(out);
  console.log("wrote", out);
}

async function lockup(out: string, dark: boolean) {
  const mark = await renderMark(dark ? whiteMark : normalMark, 220);
  const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="280">
    <text x="280" y="175" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="92" font-weight="500" letter-spacing="4" fill="${dark ? "#FFFFFF" : INK}">SHEETOMATIC</text>
  </svg>`);
  await sharp({
    create: {
      width: 1400,
      height: 280,
      channels: 4,
      background: dark ? "#1D1D1F" : "#ffffff",
    },
  })
    .composite([
      { input: mark, top: 30, left: 36 },
      { input: textSvg, top: 0, left: 0 },
    ])
    .flatten({ background: dark ? "#1D1D1F" : "#ffffff" })
    .png()
    .toFile(out);
  console.log("wrote", out);
}

async function ogImage(out: string) {
  const mark = await renderMark(normalMark, 180);
  const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <text x="600" y="430" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="64" font-weight="500" letter-spacing="6" fill="${INK}">SHEETOMATIC</text>
  </svg>`);
  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: "#ffffff" },
  })
    .composite([
      { input: mark, top: 150, left: 510 },
      { input: textSvg, top: 0, left: 0 },
    ])
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(out);
  console.log("wrote", out);
}

async function main() {
  await transparent(normalMark, 512, "public/icon.png");
  await transparent(thickMark, 64, "public/images/sheetomatic-icon.png");
  await onWhite(normalMark, 180, 132, "public/apple-icon.png");
  await onWhite(thickMark, 32, 28, "public/favicon-32.png");
  await onWhite(thickMark, 16, 15, "public/favicon-16.png");
  await onWhite(thickMark, 48, 42, "public/favicon-48.png");
  await onWhite(normalMark, 192, 122, "public/icons/workspace-icon-192.png");
  await onWhite(normalMark, 512, 324, "public/icons/workspace-icon-512.png");

  await transparent(normalMark, 512, "public/brand/sheetomatic-logo-symbol.png");
  await transparent(normalMark, 512, "public/brand/sheetomatic-logo-s-mark.png");
  await transparent(normalMark, 512, "public/brand/sheetomatic-logo-s-mark-transparent.png");
  await transparent(normalMark, 512, "public/brand/kit/icons/symbol.png");
  await onWhite(normalMark, 512, 420, "public/brand/kit/icons/symbol-white-bg.png");
  await onDark(whiteMark, 512, 420, "public/brand/kit/icons/app-icon-navy.png");
  await transparent(normalMark, 512, "public/brand/sheetomatic-ai-icon.png");
  await onWhite(normalMark, 512, 360, "public/brand/kit/ai/icon.png");

  const webSizes = [16, 32, 48, 64, 128, 180, 192, 256, 512];
  for (const size of webSizes) {
    const mark = size <= 32 ? thickMark : normalMark;
    const markPx = Math.round(size * (size <= 32 ? 0.88 : 0.78));
    await onWhite(mark, size, Math.min(size - 2, markPx), `public/brand/kit/web/icon-${size}.png`);
  }

  await lockup("public/brand/sheetomatic-logo-primary-horizontal.png", false);
  await lockup("public/brand/sheetomatic-logo-primary-dark.png", true);
  await lockup("public/brand/kit/lockups/primary-horizontal.png", false);
  await lockup("public/brand/kit/lockups/primary-dark.png", true);
  await lockup("public/brand/kit/ai/lockup.png", false);
  await ogImage("public/images/og-default.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
