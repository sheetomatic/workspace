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


def draw_dots_only(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    """Four-dot grid without stroke, crisp at 16px favicon size."""
    x0, y0, x1, y1 = box
    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    half = (x1 - x0) * 0.24
    dot_r = max(2, int((x1 - x0) * 0.11))
    for ox, oy in ((-half, -half), (half, -half), (-half, half), (half, half)):
        draw.ellipse(
            (cx + ox - dot_r, cy + oy - dot_r, cx + ox + dot_r, cy + oy + dot_r),
            fill=BLACK,
        )


def render_favicon(size: int) -> Image.Image:
    """Optimized tab favicon: white tile + four square dots, pixel-crisp at 16px."""
    if size <= 16:
        img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle((1, 1, 14, 14), radius=3, fill=WHITE)
        for x, y in ((4, 4), (9, 4), (4, 9), (9, 9)):
            draw.rectangle((x, y, x + 2, y + 2), fill=BLACK)
        if size < 16:
            return img.resize((size, size), Image.Resampling.NEAREST)
        return img

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = max(1, int(size * 0.06))
    radius = max(2, int(size * 0.2))
    draw.rounded_rectangle(
        (pad, pad, size - pad, size - pad),
        radius=radius,
        fill=WHITE,
        outline=(220, 220, 220),
        width=1 if size >= 32 else 0,
    )
    inner = int(size * 0.2)
    draw_dots_only(draw, (inner, inner, size - inner, size - inner))
    return img


def render_app_icon(size: int) -> Image.Image:
    """App icon with full grid mark for 180px+ (PWA, Apple touch)."""
    if size <= 48:
        return render_favicon(size)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    outer_pad = max(1, int(size * 0.08))
    radius = max(2, int(size * 0.2))
    draw.rounded_rectangle(
        (outer_pad, outer_pad, size - outer_pad, size - outer_pad),
        radius=radius,
        fill=WHITE,
    )
    inner_pad = int(size * 0.2)
    box = (inner_pad, inner_pad, size - inner_pad, size - inner_pad)
    stroke = max(2, int(size * 0.04))
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


def save_png(img: Image.Image, path: Path, *, transparent: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.mode == "RGBA" and transparent:
        img.save(path, optimize=True)
    elif img.mode == "RGBA":
        bg = Image.new("RGBA", img.size, WHITE + (255,))
        bg.alpha_composite(img)
        bg.convert("RGB").save(path, optimize=True)
    else:
        img.save(path, optimize=True)


def save_ico(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sizes = [16, 32, 48, 64]
    icons = [render_favicon(s).convert("RGBA") for s in sizes]
    icons[0].save(path, format="ICO", sizes=[(s, s) for s in sizes], append_images=icons[1:])


def export_drive_pack() -> Path:
    """Copy logo assets to Desktop for Google Drive upload."""
    drive = Path.home() / "Desktop" / "Sheetomatic-Brand-Assets"
    drive.mkdir(parents=True, exist_ok=True)

    svg_sources = {
        "sheetomatic-logo.svg": PUBLIC / "images/sheetomatic-logo.svg",
        "sheetomatic-icon.svg": PUBLIC / "images/sheetomatic-icon.svg",
        "sheetomatic-icon-light.svg": PUBLIC / "images/sheetomatic-icon-light.svg",
    }
    for name, src in svg_sources.items():
        if src.exists():
            (drive / name).write_bytes(src.read_bytes())

    png_outputs = {
        "sheetomatic-logo-lockup.png": (render_lockup(scale=6), False),
        "sheetomatic-icon-transparent-512.png": (render_icon(512), True),
        "sheetomatic-app-icon-512.png": (render_app_icon(512), False),
        "sheetomatic-favicon-tab-512.png": (render_favicon(512), False),
        "apple-touch-icon-180.png": (render_app_icon(180), False),
        "workspace-icon-192.png": (render_app_icon(192), False),
    }
    for name, (image, transparent) in png_outputs.items():
        save_png(image, drive / name, transparent=transparent)

    favicon_dest = drive / "favicon.ico"
    save_ico(favicon_dest)

    readme = drive / "README.txt"
    readme.write_text(
        "Sheetomatic brand assets\n"
        "========================\n\n"
        "SVG (scalable)\n"
        "  sheetomatic-logo.svg          Full lockup (icon + Sheetomatic wordmark)\n"
        "  sheetomatic-icon.svg          Icon only - dark on transparent\n"
        "  sheetomatic-icon-light.svg    Icon only - white on transparent (dark backgrounds)\n\n"
        "PNG\n"
        "  sheetomatic-logo-lockup.png   Full logo for headers, docs, presentations\n"
        "  sheetomatic-icon-transparent-512.png   Icon for light backgrounds\n"
        "  sheetomatic-app-icon-512.png  White tile app icon (PWA / app stores)\n"
        "  sheetomatic-favicon-tab-512.png  Simplified 4-dot tab icon\n"
        "  apple-touch-icon-180.png      iOS home screen\n"
        "  workspace-icon-192.png        PWA workspace\n"
        "  favicon.ico                   Browser tab (16/32/48px)\n\n"
        "Upload this folder to Google Drive.\n",
        encoding="utf-8",
    )
    print(f"wrote drive pack -> {drive}")
    return drive


def main() -> None:
    outputs = {
        PUBLIC / "images/sheetomatic-logo.png": render_lockup(scale=4),
        PUBLIC / "images/sheetomatic-icon.png": render_icon(512),
        PUBLIC / "icon.png": render_favicon(512),
        PUBLIC / "apple-icon.png": render_app_icon(180),
        PUBLIC / "icons/workspace-icon-192.png": render_app_icon(192),
        PUBLIC / "icons/workspace-icon-512.png": render_app_icon(512),
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

    export_drive_pack()


if __name__ == "__main__":
    main()
