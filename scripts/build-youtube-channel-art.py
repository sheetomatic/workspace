#!/usr/bin/env python3
"""Compose YouTube channel art (2560x1440) with logo inside the safe zone."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = ROOT / "public/images/sheetomatic-logo.png"
OUT_PATH = ROOT / "public/images/sheetomatic-youtube-channel-art.png"

W, H = 2560, 1440
SAFE_W, SAFE_H = 1546, 423
SAFE_LEFT = (W - SAFE_W) // 2
SAFE_TOP = (H - SAFE_H) // 2
SAFE_RIGHT = SAFE_LEFT + SAFE_W
SAFE_BOTTOM = SAFE_TOP + SAFE_H

NAVY = (12, 18, 34)
BLUE = (19, 45, 84)
TEAL = (15, 118, 110)
WHITE = (248, 250, 252)
MUTED = (186, 210, 228)
GREEN = (52, 211, 153)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def make_background() -> Image.Image:
    img = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(img)

    for y in range(H):
        t = y / H
        r = int(NAVY[0] * (1 - t) + BLUE[0] * t * 0.7 + TEAL[0] * t * 0.15)
        g = int(NAVY[1] * (1 - t) + BLUE[1] * t * 0.7 + TEAL[1] * t * 0.15)
        b = int(NAVY[2] * (1 - t) + BLUE[2] * t * 0.7 + TEAL[2] * t * 0.15)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse(
        (SAFE_RIGHT - 520, SAFE_TOP - 80, SAFE_RIGHT + 120, SAFE_BOTTOM + 80),
        fill=(16, 185, 129, 38),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGBA")


def logo_rgba() -> Image.Image:
    logo = Image.open(LOGO_PATH).convert("RGBA")
    px = logo.load()
    for y in range(logo.height):
        for x in range(logo.width):
            r, g, b, a = px[x, y]
            if r > 240 and g > 240 and b > 240:
                px[x, y] = (r, g, b, 0)
    target_h = 280
    scale = target_h / logo.height
    target_w = int(logo.width * scale)
    return logo.resize((target_w, target_h), Image.Resampling.LANCZOS)


def draw_pill(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.ImageFont,
) -> int:
    pad_x, pad_y = 20, 11
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    w, h = tw + pad_x * 2, th + pad_y * 2
    x, y = xy
    draw.rounded_rectangle(
        (x, y, x + w, y + h),
        radius=999,
        fill=(24, 52, 82),
        outline=GREEN,
        width=2,
    )
    draw.text((x + pad_x, y + pad_y - 2), text, font=font, fill=WHITE)
    return w + 12


def compose() -> None:
    canvas = make_background()
    draw = ImageDraw.Draw(canvas)
    logo = logo_rgba()

    pad_x, pad_y = 36, 36
    logo_x = SAFE_LEFT + 56
    logo_y = SAFE_TOP + (SAFE_H - logo.height) // 2

    shadow = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.bitmap((0, 0), logo.split()[3], fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    canvas.paste(shadow, (logo_x + 6, logo_y + 8), shadow)
    canvas.paste(logo, (logo_x, logo_y), logo)

    text_x = logo_x + logo.width + 56
    text_max_w = SAFE_RIGHT - text_x - pad_x

    font_kicker = load_font(32)
    font_head = load_font(52, bold=True)
    font_pill = load_font(26, bold=True)

    kicker = "AI Tools  |  WhatsApp Automation"
    headline = "Built for Indian MSME Operations"

    kicker_bbox = draw.textbbox((0, 0), kicker, font=font_kicker)
    head_bbox = draw.textbbox((0, 0), headline, font=font_head)
    kicker_h = kicker_bbox[3] - kicker_bbox[1]
    head_h = head_bbox[3] - head_bbox[1]
    pill_h = 44
    gap = 16
    block_h = kicker_h + gap + head_h + gap + 8 + pill_h
    block_y = SAFE_TOP + (SAFE_H - block_h) // 2

    draw.rectangle((text_x - 14, block_y + 8, text_x - 6, block_y + block_h - 8), fill=GREEN)
    draw.text((text_x, block_y), kicker, font=font_kicker, fill=GREEN)
    draw.text((text_x, block_y + kicker_h + gap), headline, font=font_head, fill=WHITE)
    draw.line(
        (text_x, block_y + kicker_h + gap + head_h + 8, text_x + min(text_max_w, 920), block_y + kicker_h + gap + head_h + 8),
        fill=(255, 255, 255, 40),
        width=1,
    )

    pills = ["WhatsApp AI", "Task Delegation", "Google Workspace"]
    px = text_x
    py = block_y + kicker_h + gap + head_h + gap + 8
    for pill in pills:
        pw = draw_pill(draw, (px, py), pill, font_pill)
        px += pw

    final = canvas.convert("RGB")
    final.save(OUT_PATH, format="PNG", optimize=True)
    print(f"Saved {OUT_PATH} ({W}x{H})")
    print(f"Safe zone: ({SAFE_LEFT}, {SAFE_TOP}) - ({SAFE_RIGHT}, {SAFE_BOTTOM})")


if __name__ == "__main__":
    compose()
