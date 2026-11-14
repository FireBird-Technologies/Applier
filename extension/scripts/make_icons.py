"""Render the logo (document + tick) to PNG icons at 16/32/48/128. Black on white, no gradients."""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)
S = 1024  # supersample, then downscale for clean edges


def draw() -> Image.Image:
    img = Image.new("RGBA", (S, S), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    u = S / 24
    w = int(1.8 * u * 1.15)
    pts = [(6, 3), (14, 3), (18, 7), (18, 21), (6, 21), (6, 3)]
    d.line([(x * u, y * u) for x, y in pts], fill="black", width=w, joint="curve")
    d.line([(14 * u, 3 * u), (14 * u, 7 * u), (18 * u, 7 * u)], fill="black", width=w, joint="curve")
    d.line([(9 * u, 14.2 * u), (11.2 * u, 16.4 * u), (15.2 * u, 12 * u)], fill="black", width=w, joint="curve")
    for p in [(6, 3), (18, 21), (6, 21), (9, 14.2), (15.2, 12)]:  # round the caps
        r = w / 2
        d.ellipse([p[0] * u - r, p[1] * u - r, p[0] * u + r, p[1] * u + r], fill="black")
    return img


base = draw()
for size in (16, 32, 48, 128):
    base.resize((size, size), Image.LANCZOS).convert("RGB").save(OUT / f"icon{size}.png")
print("icons written to", OUT)
