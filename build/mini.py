# THIRTY@RPR mini — the fallback page served from GitHub Pages while Firebase Hosting is over its bandwidth
# quota (Nov 2026). Classes are over, so it carries only the mess menu and the End-Sem datesheet: one static
# file, no Firebase, no sign-in, no Kaizen. An optional entry number narrows the datesheet to that student's
# division + elective (embedded as entry -> [division, elective] only, no names).
# Run: python3 build/mini.py  -> mini/index.html (publish with build/publish_mini.sh)
import json, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(BASE, 'build', 'thirty_data.json'), encoding='utf-8'))

exams = []
for iso, items in sorted(d['dateOverrides'].items()):
    for it in items:
        if it.get('subject', '').endswith('-ENDSEM'):
            code = it['subject'][:-len('-ENDSEM')]
            exams.append({'d': iso, 'code': code, 'name': d['courseNames'].get(code, code), 'time': it['time'],
                          'div': it.get('division') or [], 'elective': code in ('HS110', 'HS111', 'HS112', 'HS113', 'IK101')})
# Any seating published for End-Sem dates (exam_seating.json) rides along; none yet at the time of writing.
ex = d['calendar']['examWeeks'][-1]
seating = {iso: {e: [s.get('room'), s.get('seat')] for e, s in v.items()}
           for iso, v in d['examSeating'].items() if ex['start'] <= iso <= ex['end']}
students = {e: [s.get('division'), s.get('hsElective')] for e, s in d['roster'].items()}

payload = {'exams': exams, 'examWeek': ex, 'seating': seating, 'students': students,
           'mess': d['mess']}
tpl = open(os.path.join(BASE, 'build', 'mini_template.html'), encoding='utf-8').read()
out = tpl.replace('/*__MINI_DATA__*/', json.dumps(payload, ensure_ascii=False, separators=(',', ':')))
assert '/*__' not in out
os.makedirs(os.path.join(BASE, 'mini'), exist_ok=True)
open(os.path.join(BASE, 'mini', 'index.html'), 'w', encoding='utf-8').write(out)
print('wrote mini/index.html', len(out), 'bytes,', len(exams), 'exams')
