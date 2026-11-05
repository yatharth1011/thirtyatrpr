#!/usr/bin/env python3
"""App icons for thirty@rpr: the in-app logo tile (Clay gradient tile, dark "30") as PNGs.

Writes public/icons/v4/ (a NEW path, so installed copies re-fetch them):
- icon-192.png, icon-512.png (purpose "any"): the tile on Apple's icon grid, an 824/1024 rounded square in transparent
  margins. Desktop Chrome uses these as they are, and macOS 26+ shrinks anything else onto a white plate. Android uses
  the maskable icons, so it is unaffected. Never make these full-bleed. Old note: full-bleed Clay gradient tile (noe squircle plate)
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
DIRS = ['public/icons/v4/']
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


def on_apple_grid(size, text_frac):
    """The tile as a macOS icon: 824/1024 of the canvas, in a continuous-corner rounded square, transparent around it."""
    n = size * SS
    side = round(n * 824 / 1024)
    art = tile(side, False, text_frac)  # tile() supersamples internally; side is already large
    half = side / 2
    power = 5.0  # a superellipse: the continuous corners of Apple's shape, not a circular arc
    mask = Image.new('L', (side, side), 0)
    px = mask.load()
    for y in range(side):
        for x in range(side):
            if abs((x + .5 - half) / half) ** power + abs((y + .5 - half) / half) ** power <= 1:
                px[x, y] = 255
    art.putalpha(mask)
    canvas = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    at = (n - side) // 2
    canvas.paste(art, (at, at), art)
    return canvas.resize((size, size), Image.LANCZOS)


for out_dir in DIRS:
    os.makedirs(out_dir, exist_ok=True)
    # Maskable icons must be FULL-BLEED (rounded=False) so Android launchers never add a white plate;
    # "any" icons must sit on Apple's grid so macOS does not add one either.
    for size in (192, 512):
        on_apple_grid(size, 0.5).save(f'{out_dir}icon-{size}.png')
        tile(size, False, 0.46).save(f'{out_dir}icon-maskable-{size}.png')
    tile(180, False, 0.52).convert('RGB').save(f'{out_dir}apple-touch-180.png')
    tile(64, True, 0.66).save(f'{out_dir}favicon-64.png')
    print('icons written to', out_dir)
