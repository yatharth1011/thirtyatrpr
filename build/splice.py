import os
import re

BASE = '/Users/yatharthshrivastava/Documents/IIT AIDE/portal'

template = open(BASE + '/build/index_template_dashboard.html', 'r', encoding='utf-8').read()
data_js = open(BASE + '/build/thirty_data.js', 'r', encoding='utf-8').read()
app_js = open(BASE + '/build/app3.js', 'r', encoding='utf-8').read()
# Read-only Firestore listener shared by every student-facing page (main app + spectate) — see its
# own header comment for why it's a separate <script type="module"> rather than sharing scope with
# app3.js/spectate.js. build/br.js (the write-capable authoring tool) does NOT use this file.
live_overlay_js = open(BASE + '/build/live_overlay_bridge.js', 'r', encoding='utf-8').read()
# Creator-only Kaizen cloud bridge (main dashboard only; inert for everyone else) — see its header.
kaizen_bridge_js = open(BASE + '/build/kaizen_bridge.js', 'r', encoding='utf-8').read()
# Shared by the two sub-pages only (/spectate, /br) — the schedule/cohort/room engine, the cohort
# picker built on it, and the themed look (same colour themes + Theme A/B as the dashboard).
engine_js = open(BASE + '/build/engine.js', 'r', encoding='utf-8').read()
picker_js = open(BASE + '/build/picker.js', 'r', encoding='utf-8').read()
monthpick_js = open(BASE + '/build/monthpick.js', 'r', encoding='utf-8').read()
monthpick_css = open(BASE + '/build/monthpick.css', 'r', encoding='utf-8').read()
sub_theme_css = open(BASE + '/build/sub_theme.css', 'r', encoding='utf-8').read()

# Paper Dark is generated from Paper, so the two can never drift apart: every Paper rule is copied with its colours
# mapped by DARK_MAP, then build/paper_dark.css adds the hand-tuned extras. Change Paper's look and Dark follows.
DARK_MAP = {
  '#ffffff':'#241b1f', '#1c1714':'#f4e9e3', '#443b36':'#d5c6bf', '#6a5f58':'#a99a93', '#5c514a':'#b6a79f', '#7a6e66':'#97897f',
  '#e6dfd9':'#3d3034', '#f6f1ec':'#2e2328', '#faf6f2':'#2a2025', '#efe8e2':'#352a2e', '#f3ece6':'#32272c', '#d9cfc7':'#4a3c40',
  '#fbf8f5':'#2a2025', '#f8f8f7':'#1e1619', '#f6f5f3':'#1e1619',
  '#9d174d':'#f9a8c4', '#db2777':'#f472b6', '#f43f5e':'#fb7185', '#e11d48':'#fb7185', '#be123c':'#fda4af', '#b91c1c':'#fca5a5',
  '#7e2a5e':'#e3a6d0', '#8a3b2a':'#e8a98f', '#5f6f2a':'#c5d08a', '#b45309':'#f0b775', '#854d0e':'#e6bf7e', '#c2410c':'#f2a66f', '#92400e':'#e6b37e',
  '#fbe4ec':'#43222f', '#f3c3d3':'#6a3448', '#f8e6dd':'#40291f', '#ecc9b8':'#664233', '#f6e4ee':'#3f2536', '#e9c5d9':'#65385a',
  '#f5f5e8':'#2e3120', '#dfe3bd':'#4b5230', '#eef0d9':'#333822', '#fff1f2':'#43222f', '#fff5f5':'#43222f', '#ffe4e6':'#4f2636',
  '#fecdd3':'#6a3448', '#fee2e2':'#4a2226', '#fef3c7':'#43351a', '#fde68a':'#6b5525', '#f0b6c9':'#7d4459',
  '#fbd5e0':'#4a2435', '#f29ab5':'#7d3552',
  '#c9b9ae':'#4a3c40', '#e6dbd3':'#171114',
}
def _dark_body(body):
    def one(part):
        part = re.sub(r'#[0-9a-fA-F]{6}\b', lambda m: DARK_MAP.get(m.group(0).lower(), m.group(0)), part)
        part = re.sub(r'rgba\(17,\s*18,\s*19,\s*([.\d]+)\)', lambda m: 'rgba(0,0,0,%.2f)' % min(.9, float(m.group(1)) * 2.4), part)
        # a translucent white surface is still a sheet: only faint highlights stay white
        part = re.sub(r'rgba\(255,\s*255,\s*255,\s*([.\d]+)\)', lambda m: 'rgba(36,27,31,%s)' % m.group(1) if float(m.group(1)) >= .5 else m.group(0), part)
        part = part.replace('rgba(70,48,36,', 'rgba(0,0,0,').replace('rgba(225,29,72,', 'rgba(251,113,133,')
        return part
    return ''.join(p if p.startswith('url("data:') else one(p) for p in re.split(r'(url\("data:[^"]*"\))', body))
def _dark_rules(css):
    out, i = [], 0
    while True:
        j = css.find('{', i)
        if j < 0: break
        head = css[i:j].rsplit(';', 1)[-1].strip()
        depth, k = 1, j + 1
        while depth and k < len(css):
            depth += (css[k] == '{') - (css[k] == '}')
            k += 1
        body = css[j + 1:k - 1]
        i = k
        if head.startswith('@media') or head.startswith('@supports'):
            inner = _dark_rules(body)
            if inner: out.append(head + '{' + inner + '}')
        elif not head.startswith('@'):
            sels = [x.strip() for x in head.split(',') if 'data-theme="paper"' in x]
            if sels: out.append(','.join(sels).replace('data-theme="paper"', 'data-theme="paper-dark"') + '{' + _dark_body(body) + '}')
    return '\n'.join(out)
def paper_dark_css(css):
    return _dark_rules(re.sub(r'/\*.*?\*/', '', css, flags=re.S)) + '\n' + paper_dark_extra
paper_dark_extra = open(BASE + '/build/paper_dark.css', 'r', encoding='utf-8').read()
template = template.replace('/*__PAPER_DARK_CSS__*/', paper_dark_css(''.join(re.findall(r'<style[^>]*>(.*?)</style>', template, flags=re.S))))
sub_theme_css += '\n' + paper_dark_css(sub_theme_css)
sub_theme_css += '\n' + monthpick_css   # the month picker's styles ride along for /spectate and /br


# Boot splash shared by the dashboard, /spectate and /br (the dashboard has no page label; the sub pages name themselves
# under the mark).
splash_html = open(BASE + '/build/splash.html', 'r', encoding='utf-8').read()


def with_splash(html, label_html=''):
    if '<!--__SPLASH__-->' not in html:
        raise SystemExit('splice.py: a page is missing the <!--__SPLASH__--> marker — aborting')
    return html.replace('<!--__SPLASH__-->', splash_html.replace('__SPLASH_LABEL_HTML__', label_html).replace('__SPLASH_WIDGETS_JSON__', _json.dumps(SPLASH_WIDGETS, ensure_ascii=False)).replace('__SPLASH_QUOTES_JSON__', _json.dumps(QUOTES, ensure_ascii=False)))


import json as _json
_data = _json.load(open(BASE + '/build/thirty_data.json', 'r', encoding='utf-8'))
# The loader numbers come from the engine itself (build/loader_counts.js), not from a second way of counting the raw data
import subprocess as _sp
_counts = _json.loads(_sp.run(['node', BASE + '/build/loader_counts.js'], check=True, capture_output=True, text=True).stdout)
_n_students = _counts['students']
_groups = ['G%d' % (i + 1) for i in range(_counts['groups'])]   # one dot column per group
_n_rooms = _counts['rooms']
_branches = _counts['branches']                                   # display names, already MCB -> MnC
_n_reps = _counts['reps']
_short = lambda b: b

# Spectate: one dot per (group column x 4 rows), lighting up column by column; counters tick up to the real totals
SPECTATE_WIDGET = ('  <!--bl-load--><div class="bl-load"><div class="bl-dots">'
    + ''.join('<i style="--c:%d;--r:%d"></i>' % (i % len(_groups), i // len(_groups)) for i in range(len(_groups) * 4))
    + '</div><div class="bl-stats"><b style="--to:%d"></b> students &middot; <b style="--to:%d;--d:.4s"></b> groups &middot; <b style="--to:%d;--d:.6s"></b> rooms</div></div><!--/bl-load-->\n'
    % (_n_students, len(_groups), _n_rooms))
# BR Tools: the branch codes appear one by one, then a pulsing line (this loader really is waiting for the Google sign-in)
BR_WIDGET = ('  <!--bl-load--><div class="bl-load"><div class="bl-chips">'
    + ''.join('<i style="--i:%d">%s</i>' % (i, _short(b)) for i, b in enumerate(_branches))
    + '</div><div class="bl-stats bl-status"><u></u><span>restoring sign-in &middot; <b style="--to:%d"></b> branch reps</span></div></div><!--/bl-load-->\n' % _n_reps)
SPLASH_WIDGETS = {'/spectate': SPECTATE_WIDGET.strip('\n'), '/br': BR_WIDGET.strip('\n')}

# Quotes for the dashboard loader. Only ones with well-documented attribution (several popular "quotes" are misattributed —
# e.g. Durant's line is often credited to Aristotle — so those are credited correctly or left out).
QUOTES = [
    ["The important thing is not to stop questioning.", "Albert Einstein"],
    ["Imagination is more important than knowledge.", "Albert Einstein"],
    ["I have no special talents. I am only passionately curious.", "Albert Einstein"],
    ["If I have seen further, it is by standing on the shoulders of giants.", "Isaac Newton"],
    ["Premature optimization is the root of all evil.", "Donald Knuth"],
    ["Talk is cheap. Show me the code.", "Linus Torvalds"],
    ["Simplicity is prerequisite for reliability.", "Edsger W. Dijkstra"],
    ["The best way to predict the future is to invent it.", "Alan Kay"],
    ["A journey of a thousand miles begins with a single step.", "Lao Tzu"],
    ["Fall seven times, stand up eight.", "Japanese proverb"],
    ["We are what we repeatedly do. Excellence, then, is not an act, but a habit.", "Will Durant"],
    ["The only way to do great work is to love what you do.", "Steve Jobs"],
    ["Genius is one percent inspiration and ninety-nine percent perspiration.", "Thomas Edison"],
    ["There is no royal road to geometry.", "Euclid"],
    ["The first principle is that you must not fool yourself — and you are the easiest person to fool.", "Richard Feynman"],
    ["What I cannot create, I do not understand.", "Richard Feynman"],
    ["Science is a way of thinking much more than it is a body of knowledge.", "Carl Sagan"],
    ["Nothing in life is to be feared, it is only to be understood.", "Marie Curie"],
    ["The function of education is to teach one to think intensively and to think critically.", "Martin Luther King Jr."],
    ["Arise, awake, and stop not till the goal is reached.", "Swami Vivekananda"],
    ["You have to dream before your dreams can come true.", "A. P. J. Abdul Kalam"],
    ["Any sufficiently advanced technology is indistinguishable from magic.", "Arthur C. Clarke"],
    ["Debugging is twice as hard as writing the code in the first place.", "Brian Kernighan"],
    ["Mathematics is the queen of the sciences.", "Carl Friedrich Gauss"],
    ["Programs must be written for people to read, and only incidentally for machines to execute.", "Abelson & Sussman"],
]
DASHBOARD_LABEL = '  <div class="bl-quote"></div>\n'   # filled by the splash script with a random quote

SPECTATE_LABEL = '  <div class="bl-sub"><span><b>&#128301;</b> Spectate</span></div>\n' + SPECTATE_WIDGET
BR_LABEL = '  <div class="bl-sub"><span><b>&#128736;&#65039;</b> BR Tools</span></div>\n' + BR_WIDGET


def inject_shared(html, label):
    for ph, val in [('/*__SUB_THEME_CSS__*/', sub_theme_css), ('/*__ENGINE_JS__*/', engine_js), ('/*__PICKER_JS__*/', picker_js), ('/*__MONTHPICK_JS__*/', monthpick_js)]:
        if ph not in html:
            raise SystemExit('splice.py: ' + label + ' is missing ' + ph + ' — aborting')
        html = html.replace(ph, val)
    return html

out = with_splash(template, DASHBOARD_LABEL).replace('/*__THIRTY_DATA__*/', data_js)
out = out.replace('/*__APP_JS__*/', app_js)
out = out.replace('/*__LIVE_OVERLAY_JS__*/', live_overlay_js)
out = out.replace('/*__KAIZEN_BRIDGE_JS__*/', kaizen_bridge_js)
out = out.replace('/*__MONTHPICK_CSS__*/', monthpick_css).replace('/*__MONTHPICK_JS__*/', monthpick_js)
import time as _time
out = out.replace('__DEV_BUILD_TOKEN__', str(int(_time.time())))

if '/*__THIRTY_DATA__*/' in out or '/*__APP_JS__*/' in out or '/*__LIVE_OVERLAY_JS__*/' in out or '/*__KAIZEN_BRIDGE_JS__*/' in out or '/*__MONTHPICK_JS__*/' in out or '/*__MONTHPICK_CSS__*/' in out:
    raise SystemExit('splice.py: a placeholder was not replaced — aborting')

for target in [BASE + '/public/index.html', BASE + '/public/dashboard-app-preview.html']:
    with open(target, 'w', encoding='utf-8') as f:
        f.write(out)
    print('wrote', target, 'size:', len(out))

# Spectate: a separate, unauthenticated, no-login page — its own template/script, but the same
# thirty_data.js blob (already fully client-embedded with no login gate on the data itself, so this
# introduces no new privacy exposure). Kept out of the main app entirely; not linked from it yet.
spectate_template = open(BASE + '/build/spectate_template.html', 'r', encoding='utf-8').read()
spectate_js = open(BASE + '/build/spectate.js', 'r', encoding='utf-8').read()
spectate_out = with_splash(inject_shared(spectate_template, 'spectate'), SPECTATE_LABEL).replace('/*__THIRTY_DATA__*/', data_js)
spectate_out = spectate_out.replace('/*__SPECTATE_JS__*/', spectate_js)
if '/*__THIRTY_DATA__*/' in spectate_out or '/*__SPECTATE_JS__*/' in spectate_out:
    raise SystemExit('splice.py: a spectate placeholder was not replaced — aborting')
spectate_out = spectate_out.replace('/*__LIVE_OVERLAY_JS__*/', live_overlay_js)
if '/*__LIVE_OVERLAY_JS__*/' in spectate_out:
    raise SystemExit('splice.py: spectate\'s live-overlay placeholder was not replaced — aborting')
spectate_target = BASE + '/public/spectate.html'
with open(spectate_target, 'w', encoding='utf-8') as f:
    f.write(spectate_out)
print('wrote', spectate_target, 'size:', len(spectate_out))

# /br — Branch Rep live schedule-overlay tool. Its own template/script, own Firestore write access
# (unlike spectate/main app, which only ever read scheduleOverlay); a separate, non-linked page at
# /br the same way /spectate launched non-linked. Reuses thirty_data.js for roster/branchNames/
# batchReps lookups (permission checks, scope pickers) — same no-new-privacy-exposure reasoning as
# spectate's reuse of it.
br_template = open(BASE + '/build/br_template.html', 'r', encoding='utf-8').read()
br_js = open(BASE + '/build/br.js', 'r', encoding='utf-8').read()
br_out = with_splash(inject_shared(br_template, '/br'), BR_LABEL).replace('/*__THIRTY_DATA__*/', data_js)
br_out = br_out.replace('/*__BR_JS__*/', br_js)
if '/*__THIRTY_DATA__*/' in br_out or '/*__BR_JS__*/' in br_out:
    raise SystemExit('splice.py: a /br placeholder was not replaced — aborting')
os.makedirs(BASE + '/public/br', exist_ok=True)
br_target = BASE + '/public/br/index.html'
with open(br_target, 'w', encoding='utf-8') as f:
    f.write(br_out)
print('wrote', br_target, 'size:', len(br_out))

# /kaizen — creator-only list of Kaizen users (Google sign-in gate; the list itself is the live /kaizenUsers
# collection). Embeds only the roster fields its table shows, from the same roster the dashboard ships.
import json
_d = json.load(open(BASE + '/build/thirty_data.json', 'r', encoding='utf-8'))
_members = sorted({e for c in _d.get('sequentialCourses', []) if c.get('kaizen') for e in c.get('students', [])})
_students = {e: {'name': s.get('name'), 'branch': s.get('branch'), 'division': s.get('division'), 'group': s.get('academicGroup'),
                 'ismp': s.get('ismpGroup'), 'mentor': s.get('mentor'), 'hs': s.get('hsElective')}
             for e, s in _d['roster'].items()}
kz_template = open(BASE + '/build/kaizen_admin_template.html', 'r', encoding='utf-8').read()
kz_out = inject_shared(kz_template, '/kaizen') if '/*__ENGINE_JS__*/' in kz_template else kz_template.replace('/*__SUB_THEME_CSS__*/', sub_theme_css)
kz_out = kz_out.replace('/*__KAIZEN_ROSTER__*/', json.dumps({'students': _students, 'members': _members}, ensure_ascii=False, separators=(',', ':')))
if '/*__' in kz_out:
    raise SystemExit('splice.py: a /kaizen placeholder was not replaced — aborting')
os.makedirs(BASE + '/public/kaizen', exist_ok=True)
with open(BASE + '/public/kaizen/index.html', 'w', encoding='utf-8') as f:
    f.write(kz_out)
print('wrote', BASE + '/public/kaizen/index.html', 'size:', len(kz_out))
