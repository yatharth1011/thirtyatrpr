"""Writes build/paper_specks.css: the stray toner marks of the Paper theme (splice.py injects it).

Like prbsets/build/photocopy.py, but as vectors: a few tiny irregular flecks and the odd hairline, no text residue.
Three tiles of coprime sizes overlap, so the pattern has no visible repeat. They sit behind the content
(z-index -1) and scroll with it. Density is about one mark per 21,000 px2: 14 or so on a phone screen, like a book page.
Run: python3 build/gen_paper_specks.py   (only when changing the look)
"""
import math, os, random
from urllib.parse import quote

TILES = [(1013, 1409, 30, 11), (1291, 1777, 32, 23), (1543, 1153, 22, 37)]

def fleck(r, x, y):
    s = r.uniform(.35, .95) if r.random() > .12 else r.uniform(1, 1.4)
    n = r.randint(4, 6)
    a0 = r.uniform(0, 6.28)
    pts = []
    for i in range(n):
        a = a0 + i * 6.283 / n
        d = s * r.uniform(.55, 1.2)
        pts.append('%.1f %.1f' % (x + d * math.cos(a), y + d * math.sin(a)))
    return 'M' + 'L'.join(pts) + 'z'

def hair(r, x, y):
    a, l = r.uniform(0, 3.14), r.uniform(3, 8)
    return 'M%.1f %.1fl%.1f %.1f' % (x, y, l * math.cos(a), l * math.sin(a))

def tile(w, h, count, seed):
    r = random.Random(seed)
    tones = {'.4': [], '.6': [], '.8': []}
    hairs = []
    for _ in range(count):
        x, y = r.uniform(0, w), r.uniform(0, h)
        if r.random() < .1:
            hairs.append(hair(r, x, y))
        else:
            tones[r.choice(list(tones))].append(fleck(r, x, y))
    body = ''.join('<path fill-opacity="%s" d="%s"/>' % (o, ''.join(d)) for o, d in tones.items() if d)
    if hairs:
        body += '<path fill="none" stroke="#222" stroke-opacity=".45" stroke-width=".5" d="%s"/>' % ''.join(hairs)
    svg = "<svg xmlns='http://www.w3.org/2000/svg' width='%d' height='%d' fill='#222'>%s</svg>" % (w, h, body.replace('"', "'"))
    return 'url("data:image/svg+xml,%s")' % quote(svg, safe="=:/ '")

css = ('body[data-theme="paper"]{ position:relative; }\n'
       '  body[data-theme="paper"]::before{ display:none !important; }\n'
       '  body[data-theme="paper"]::after{\n'
       '    content:""; display:block; position:absolute; inset:0; z-index:-1; pointer-events:none;\n'
       '    background-repeat:repeat;\n'
       '    background-size:%s;\n'
       '    background-image:%s;\n'
       '  }' % (','.join('%dpx %dpx' % t[:2] for t in TILES), ','.join(tile(*t) for t in TILES)))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'paper_specks.css')
open(out, 'w', encoding='utf-8').write(css + '\n')
print(len(css), 'bytes ->', out)
