"""Snapshot the ML track of the Kaizen roadmap (Endeavours/CS229/ROADMAP.html) into build/kaizen_ml_plan.json.

The dashboard schedules these tasks into 2026AIB1099's days (merge.py's SEQUENTIAL_COURSES, kaizen mode). Only the ML
units (U01..U16) are taken: the DSA track (D01..D15) is never published (the user's decision, see Kaizen's
tools/build_site.py), so the dashboard fetches it live from the Kaizen app on the user's Mac instead.

Re-run whenever the roadmap changes: python3 build/extract_kaizen.py, then merge.py and splice.py.
"""
import json
import re
from pathlib import Path

PORTAL = Path(__file__).resolve().parent.parent
ROADMAP = PORTAL.parent / 'Endeavours' / 'CS229' / 'ROADMAP.html'
OUT = PORTAL / 'build' / 'kaizen_ml_plan.json'


def plan():
    html = ROADMAP.read_text()
    start = html.index('[', html.index('const PLAN'))
    depth = 0
    for i in range(start, len(html)):
        if html[i] == '[':
            depth += 1
        elif html[i] == ']':
            depth -= 1
            if depth == 0:
                break
    return json.loads(re.sub(r',(\s*[\]}])', r'\1', html[start:i + 1]))


def main():
    tasks = []
    for part, units in plan():
        for unit, _why, unit_tasks in units:
            if re.match(r'D\d\d ', unit):
                continue
            for t in unit_tasks:
                code, title, links, hours = t[0], t[1], t[2], t[4]
                tasks.append({'code': code, 'title': title, 'unit': unit, 'part': part,
                              'hours': hours or 1, 'links': links})
    assert tasks and not any(t['code'].startswith('D') for t in tasks)
    OUT.write_text(json.dumps(tasks, ensure_ascii=False, indent=1))
    print('kaizen ML tasks:', len(tasks), 'hours:', round(sum(t['hours'] for t in tasks), 1))


if __name__ == '__main__':
    main()
