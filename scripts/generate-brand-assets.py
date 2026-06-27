#!/usr/bin/env python3
"""Generate Sheetomatic brand PNG/ICO assets from the compact monochrome mark."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)


def load_font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Neue Bold.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Neue.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_icon(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], stroke: float) -> None:
    x0, y0, x1, y1 = box
    radius = max(2, int((x1 - x0) * 0.22))
    draw.rounded_rectangle(box, radius=radius, outline=BLACK, width=max(1, int(stroke)))

    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    half = (x1 - x0) * 0.22
    dot_r = max(1, int((x1 - x0) * 0.075))
    for ox, oy in ((-half, -half), (half, -half), (-half, half), (half, half)):
        draw.ellipse(
            (cx + ox - dot_r, cy + oy - dot_r, cx + ox + dot_r, cy + oy + dot_r),
            fill=BLACK,
        )


def render_icon(size: int, padding_ratio: float = 0.125) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = int(size * padding_ratio)
    box = (pad, pad, size - pad, size - pad)
    stroke = max(2, size * 0.047)
    draw_icon(draw, box, stroke)
    return img


def render_lockup(scale: int = 4) -> Image.Image:
    icon_size = 32 * scale
    gap = 8 * scale
    font_size = int(17.5 * scale)
    font = load_font(font_size)

    text = "Sheetomatic"
    tmp = Image.new("RGBA", (1, 1))
    tmp_draw = ImageDraw.Draw(tmp)
    bbox = tmp_draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    width = icon_size + gap + text_w
    height = max(icon_size, text_h + 4 * scale)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    icon_box = (0, (height - icon_size) // 2, icon_size, (height + icon_size) // 2)
    draw_icon(draw, icon_box, stroke=max(2, scale * 1.75))

    text_x = icon_size + gap
    text_y = (height - text_h) // 2 - bbox[1]
    draw.text((text_x, text_y), text, fill=BLACK, font=font)
    return img


def render_ai_lockup(scale: int = 4) -> Image.Image:
    icon_size = 32 * scale
    gap = 8 * scale
    font_size = int(16 * scale)
    font = load_font(font_size)

    text = "Sheetomatic AI"
    tmp = Image.new("RGBA", (1, 1))
    tmp_draw = ImageDraw.Draw(tmp)
    bbox = tmp_draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    width = icon_size + gap + text_w
    height = max(icon_size, text_h + 4 * scale)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    icon_box = (0, (height - icon_size) // 2, icon_size, (height + icon_size) // 2)
    draw_icon(draw, icon_box, stroke=max(2, scale * 1.75))

    text_x = icon_size + gap
    text_y = (height - text_h) // 2 - bbox[1]
    draw.text((text_x, text_y), text, fill=BLACK, font=font)
    return img


def render_og_card() -> Image.Image:
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), WHITE)
    lockup = render_lockup(scale=6)
    x = (w - lockup.width) // 2
    y = (h - lockup.height) // 2
    img.paste(lockup, (x, y), lockup)
    return img


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.mode == "RGBA":
        bg = Image.new("RGBA", img.size, WHITE + (255,))
        bg.alpha_composite(img)
        bg.convert("RGB").save(path, optimize=True)
    else:
        img.save(path, optimize=True)


def save_ico(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sizes = [16, 32, 48]
    icons = [render_icon(s).convert("RGBA") for s in sizes]
    icons[0].save(path, format="ICO", sizes=[(s, s) for s in sizes], append_images=icons[1:])


def main() -> None:
    outputs = {
        PUBLIC / "images/sheetomatic-logo.png": render_lockup(scale=4),
        PUBLIC / "images/sheetomatic-icon.png": render_icon(512),
        PUBLIC / "icon.png": render_icon(512),
        PUBLIC / "apple-icon.png": render_icon(180),
        PUBLIC / "icons/workspace-icon-192.png": render_icon(192),
        PUBLIC / "icons/workspace-icon-512.png": render_icon(512),
        PUBLIC / "brand/sheetomatic-ai-icon.png": render_icon(512),
        PUBLIC / "brand/sheetomatic-ai-logo.png": render_ai_lockup(scale=4),
        PUBLIC / "images/og-default.png": render_og_card(),
    }

    for path, image in outputs.items():
        save_png(image, path)
        print(f"wrote {path.relative_to(ROOT)}")

    favicon = PUBLIC / "favicon.ico"
    save_ico(favicon)
    print(f"wrote {favicon.relative_to(ROOT)}")

    # Next.js App Router file conventions override public/ static files.
    app_dir = ROOT / "src/app"
    for name in ("icon.png", "apple-icon.png"):
        src = PUBLIC / name
        dest = app_dir / name
        dest.write_bytes(src.read_bytes())
        print(f"wrote {dest.relative_to(ROOT)}")
    app_favicon = app_dir / "favicon.ico"
    app_favicon.write_bytes(favicon.read_bytes())
    print(f"wrote {app_favicon.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
