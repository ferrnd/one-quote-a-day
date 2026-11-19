"""Draw the Android launcher, notification and splash images.

The mark is a single opening quotation mark, black on white, like the site.
Run:  python android/tools/icons.py [path/to/serif.ttf]
Needs Pillow. The default font is Georgia, which ships with Windows.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RES = Path(__file__).resolve().parent.parent / "app/src/main/res"
FONT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("C:/Windows/Fonts/georgia.ttf")
MARK = "\u201c"
INK, PAPER = (0, 0, 0, 255), (255, 255, 255, 255)
SS = 4  # supersampling factor

DENSITY = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def mark(size: int, glyph_ratio: float, ink, paper, shape: str = "square") -> Image.Image:
    """A size x size image with the mark centred, glyph_ratio of the side tall."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if shape == "circle":
        draw.ellipse((0, 0, big - 1, big - 1), fill=paper)
    elif shape == "rounded":
        draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=big // 6, fill=paper)
    elif paper:
        draw.rectangle((0, 0, big, big), fill=paper)
    # rasterise the glyph alone and crop to its real ink, since font metrics
    # include the line's ascent and would push the mark off centre
    font = ImageFont.truetype(str(FONT), 1000)
    glyph = Image.new("L", (2000, 2000), 0)
    ImageDraw.Draw(glyph).text((500, 500), MARK, font=font, fill=255)
    glyph = glyph.crop(glyph.getbbox())
    scale = glyph_ratio * big / max(glyph.size)
    glyph = glyph.resize((max(1, round(glyph.width * scale)), max(1, round(glyph.height * scale))), Image.LANCZOS)
    solid = Image.new("RGBA", glyph.size, ink)
    img.paste(solid, ((big - glyph.width) // 2, (big - glyph.height) // 2), glyph)
    return img.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, folder: str, name: str) -> None:
    out = RES / folder
    out.mkdir(parents=True, exist_ok=True)
    img.save(out / name, optimize=True)


def main() -> None:
    for dpi, d in DENSITY.items():
        legacy = round(48 * d)
        save(mark(legacy, 0.42, INK, PAPER, "rounded"), f"mipmap-{dpi}", "ic_launcher.png")
        save(mark(legacy, 0.42, INK, PAPER, "circle"), f"mipmap-{dpi}", "ic_launcher_round.png")
        # adaptive foreground: 108dp canvas, keep the mark well inside the 66dp safe zone
        save(mark(round(108 * d), 0.36, INK, None), f"mipmap-{dpi}", "ic_launcher_foreground.png")
        # the night icon: the same mark, white on black (shown from 21:00 to 06:00, or always in dark mode)
        save(mark(legacy, 0.42, PAPER, INK, "rounded"), f"mipmap-{dpi}", "ic_launcher_night.png")
        save(mark(legacy, 0.42, PAPER, INK, "circle"), f"mipmap-{dpi}", "ic_launcher_night_round.png")
        save(mark(round(108 * d), 0.36, PAPER, None), f"mipmap-{dpi}", "ic_launcher_night_foreground.png")
        # status-bar icon: white on transparent, Android tints it
        save(mark(round(24 * d), 0.80, PAPER, None), f"drawable-{dpi}", "ic_stat_quote.png")

    adaptive = RES / "mipmap-anydpi-v26"
    adaptive.mkdir(exist_ok=True)
    template = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/{background}" />
    <foreground android:drawable="@mipmap/{foreground}" />
    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"""
    for name, background, foreground in (("ic_launcher", "white", "ic_launcher_foreground"),
                                         ("ic_launcher_night", "black", "ic_launcher_night_foreground")):
        xml = template.format(background=background, foreground=foreground)
        for suffix in ("", "_round"):
            (adaptive / f"{name}{suffix}.xml").write_bytes(xml.encode("utf-8"))
    print("icons written to", RES)


if __name__ == "__main__":
    main()
