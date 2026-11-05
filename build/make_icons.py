#!/usr/bin/env python3
"""App icons for thirty@rpr: the in-app logo tile (Clay gradient tile, dark "30") as PNGs.

Writes public/icons/v3/ (a NEW path, so installed copies re-fetch them; public/icons/v2/ and public/icons/
are also updated with the same full-bleed Clay design so existing installs and caches get the new icon too):
- icon-192.png, icon-512.png: full-bleed Clay gradient tile (no transparent corners, so Android never wraps it in a white squircle plate)
- icon-maskable-192.png, icon-maskable-512.png: full-bleed, "30" well inside the maskable safe zone (40% radius)
- apple-touch-180.png: full-bleed RGB (iOS rounds it itself and requires no transparency)
- favicon-64.png: rounded tile for browser tab.

Clay signature gradient: #9d174d -> #db2777 -> #f43f5e.
Ink: #171114 (Clay Dark background).
Run from the portal root: python3 build/make_icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

FONT = '/Users/yatharthshrivastava/Library/Fonts/JetBrainsMono-ExtraBold.ttf'
STOPS = [(0.0, (0x9D, 0x17, 0x4D)), (0.50, (0xDB, 0x27, 0x77)), (1.0, (0xF4, 0x3F, 0x5E))]
INK = (0x17, 0x11, 0x14)
DIRS = ['public/icons/v3/', 'public/icons/v2/', 'public/icons/']
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
    d.text((x, y), '30', font=font, fill=INK + (235,))
    if rounded:
        mask = Image.new('L', (n, n), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * 0.26), fill=255)
        img.putalpha(mask)
    return img.resize((size, size), Image.LANCZOS)


for out_dir in DIRS:
    os.makedirs(out_dir, exist_ok=True)
    # Android adaptive icons must be FULL-BLEED (rounded=False) so Android launchers never
    # place a white plate or border around them!
    for size in (192, 512):
        tile(size, False, 0.48).save(f'{out_dir}icon-{size}.png')
        tile(size, False, 0.46).save(f'{out_dir}icon-maskable-{size}.png')
    tile(180, False, 0.52).convert('RGB').save(f'{out_dir}apple-touch-180.png')
    tile(64, True, 0.66).save(f'{out_dir}favicon-64.png')
    print('icons written to', out_dir)
