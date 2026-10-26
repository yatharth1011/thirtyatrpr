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
sub_theme_css += '\n' + monthpick_css   # the month picker's styles ride along for /spectate and /br


def inject_shared(html, label):
    for ph, val in [('/*__SUB_THEME_CSS__*/', sub_theme_css), ('/*__ENGINE_JS__*/', engine_js), ('/*__PICKER_JS__*/', picker_js), ('/*__MONTHPICK_JS__*/', monthpick_js)]:
        if ph not in html:
            raise SystemExit('splice.py: ' + label + ' is missing ' + ph + ' — aborting')
        html = html.replace(ph, val)
    return html

out = template.replace('/*__THIRTY_DATA__*/', data_js)
out = out.replace('/*__APP_JS__*/', app_js)
out = out.replace('/*__LIVE_OVERLAY_JS__*/', live_overlay_js)
out = out.replace('/*__KAIZEN_BRIDGE_JS__*/', kaizen_bridge_js)
out = out.replace('/*__MONTHPICK_CSS__*/', monthpick_css).replace('/*__MONTHPICK_JS__*/', monthpick_js)

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
spectate_out = inject_shared(spectate_template, 'spectate').replace('/*__THIRTY_DATA__*/', data_js)
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
br_out = inject_shared(br_template, '/br').replace('/*__THIRTY_DATA__*/', data_js)
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
