"""Draws assets/banner.png (README header) with Geist. Black and white, no gradients.

Run from the project root after `npm install` in web/ (the Geist font files come from there):
    python assets/make_banner.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "web" / "node_modules" / "geist" / "dist" / "fonts" / "geist-sans"
OUT = ROOT / "assets" / "banner.png"

S = 2  # draw at 2x and scale down for smooth edges
W, H = 1600, 640
BLACK, GRAY, LIGHT, LINE = (0, 0, 0), (115, 115, 115), (245, 245, 245), (229, 229, 229)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"Geist-{name}.ttf"), size * S)


img = Image.new("RGB", (W * S, H * S), "white")
d = ImageDraw.Draw(img)


def box(x0, y0, x1, y1):
    return [x0 * S, y0 * S, x1 * S, y1 * S]


def text(x, y, s, f, fill=BLACK, anchor="la"):
    d.text((x * S, y * S), s, font=f, fill=fill, anchor=anchor)


def mark(x, y, size, color=BLACK, weight=1.8):
    """The logo: a document with a tickmark (same geometry as the extension icon)."""
    u = size * S / 24
    w = max(2, int(weight * u * 1.1))
    pts = lambda p: [(x * S + a * u, y * S + b * u) for a, b in p]
    for line in (
        [(6, 3), (14, 3), (18, 7), (18, 21), (6, 21), (6, 3)],
        [(14, 3), (14, 7), (18, 7)],
        [(9, 14.2), (11.2, 16.4), (15.2, 12)],
    ):
        d.line(pts(line), fill=color, width=w, joint="curve")
        for px, py in (pts([line[0]])[0], pts([line[-1]])[0]):  # round the ends
            d.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=color)


# ---------------------------------------------------------------- left: brand and message
mark(120, 120, 84)
text(220, 128, "applier", font("SemiBold", 72))
text(120, 246, "Apply to jobs", font("SemiBold", 76))
text(120, 330, "with a resume that fits.", font("SemiBold", 76))
text(122, 440, "A Chrome extension that tailors a one-page resume", font("Regular", 31), GRAY)
text(122, 484, "to every job posting, using only your own facts.", font("Regular", 31), GRAY)

# ---------------------------------------------------------------- right: the side panel
px, py, pw, ph = 1040, 70, 420, 500
d.rounded_rectangle(box(px, py, px + pw, py + ph), radius=26 * S, fill="white", outline=BLACK, width=3 * S)
mark(px + 24, py + 22, 30)
text(px + 62, py + 26, "applier", font("SemiBold", 24))
d.rounded_rectangle(box(px + pw - 196, py + 24, px + pw - 136, py + 54), radius=15 * S, outline=LINE, width=2 * S)
text(px + pw - 166, py + 39, "7/10", font("Regular", 17), BLACK, "mm")
text(px + pw - 24, py + 39, "Buy credits", font("Medium", 18), BLACK, "rm")
d.line([px * S, (py + 78) * S, (px + pw) * S, (py + 78) * S], fill=LINE, width=2 * S)

text(px + 24, py + 98, "Backend Engineer", font("Medium", 22))
text(px + 24, py + 128, "Acme", font("Regular", 18), GRAY)
d.rounded_rectangle(box(px + pw - 88, py + 100, px + pw - 24, py + 128), radius=14 * S, outline=BLACK, width=2 * S)
text(px + pw - 56, py + 114, "Draft", font("Medium", 15), BLACK, "mm")

cx0, cy0, cx1, cy1 = px + 24, py + 166, px + pw - 24, py + 410
d.rounded_rectangle(box(cx0, cy0, cx1, cy1), radius=12 * S, outline=LINE, width=2 * S)
text(cx0 + 18, cy0 + 16, "Jane Doe", font("SemiBold", 24))


def bar(y, width):
    d.rounded_rectangle(box(cx0 + 18, y, cx0 + 18 + width, y + 8), radius=4 * S, fill=LINE)


bar(cy0 + 56, 200)
for label, y0, widths in (("EXPERIENCE", cy0 + 84, (110, 300, 270, 290)), ("SKILLS", cy0 + 186, (230,))):
    text(cx0 + 18, y0, label, font("SemiBold", 12), BLACK)
    d.line([(cx0 + 18) * S, (y0 + 22) * S, (cx1 - 18) * S, (y0 + 22) * S], fill=BLACK, width=S)
    for i, wd in enumerate(widths):
        bar(y0 + 34 + i * 20, wd)

cx = px + 24
for label in ("PDF", "DOCX", "MD", "TXT"):
    f = font("Medium", 15)
    tw = d.textlength(label, font=f) / S
    d.rounded_rectangle(box(cx, py + 428, cx + tw + 28, py + 460), radius=16 * S, fill=LIGHT)
    text(cx + 14 + tw / 2, py + 444, label, f, GRAY, "mm")
    cx += tw + 28 + 8
text(px + 24, py + 474, "1 credit used. Edits and downloads are free.", font("Regular", 15), GRAY)

img.resize((W, H), Image.LANCZOS).save(OUT, optimize=True)
print("wrote", OUT)
