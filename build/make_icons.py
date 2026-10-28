#!/usr/bin/env python3
"""App icons for thirty@rpr: the in-app logo tile (gradient tile, dark "30") as PNGs.

Writes public/icons/v2/ (a NEW path, so installed copies re-fetch them; public/icons/icon-*.png at the old path were regenerated once with the same design, so old installs that still request them get the new icon too): icon-192.png, icon-512.png (rounded tile, transparent corners — manifest "any"),
icon-maskable-192.png, icon-maskable-512.png (full-bleed, "30" inside the maskable safe zone),
apple-touch-180.png (full-bleed — iOS rounds it itself and paints transparency black) and
favicon-64.png. Gradient and ink match the Kaizen gradient / GitHub-theme colours used by the logo in
index_template_dashboard.html (.mini-logo). Run from the portal root: python3 build/make_icons.py
"""
from PIL import Image, ImageDraw, ImageFont

FONT = '/Users/yatharthshrivastava/Library/Fonts/JetBrainsMono-ExtraBold.ttf'
STOPS = [(0.0, (0xB3, 0x92, 0xF0)), (0.55, (0x79, 0xB8, 0xFF)), (1.0, (0xD1, 0xD5, 0xDA))]
INK = (0x0D, 0x11, 0x17)
OUT = 'public/icons/v2/'
SS = 4  # supersampling for smooth edges


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(n):
    """Diagonal (top-left -> bottom-right) three-stop gradient, n x n."""
    img = Image.new('RGB', (n, n))
    px = img.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * (n - 1))
            for (t0, c0), (t1, c1) in zip(STOPS, STOPS[1:]):
                if t <= t1:
                    px[x, y] = lerp(c0, c1, (t - t0) / (t1 - t0))
                    break
    return img


def tile(size, rounded, text_frac):
    n = size * SS
    img = gradient(n).convert('RGBA')
    d = ImageDraw.Draw(img)
    # "30" is two monospace cells (advance 0.6 em each) -> em = text width / 1.2
    em = int(n * text_frac / 1.2)
    font = ImageFont.truetype(FONT, em)
    l, t, r, b = d.textbbox((0, 0), '30', font=font)
    x = (n - (r - l)) / 2 - l
    y = (n - (b - t)) / 2 - t
    d.text((x, y), '30', font=font, fill=INK + (225,))
    if rounded:
        mask = Image.new('L', (n, n), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * 0.26), fill=255)
        img.putalpha(mask)
    return img.resize((size, size), Image.LANCZOS)


for size in (192, 512):
    tile(size, True, 0.66).save(f'{OUT}icon-{size}.png')
    tile(size, False, 0.46).save(f'{OUT}icon-maskable-{size}.png')
tile(180, False, 0.56).convert('RGB').save(f'{OUT}apple-touch-180.png')
tile(64, True, 0.7).save(f'{OUT}favicon-64.png')
print('icons written to', OUT)
