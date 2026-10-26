"""Life Skills lecture day per student, from the Academic Section's NEW "Life Skill Divisions Batch 2026" workbook
(oct-new/NEW Life Skill Divisions Batch 2026.xlsx, received 23 Oct 2026) -> build/life_skills_days_oct.json
({entry: 'Monday' | 'Tuesday'}).

It supersedes the September roster (sep-new/ PDF, build/life_skills_days.json) from 23 Oct 2026 onwards: merge.py ends
the old LS101 rules on 22 Oct and starts these per-student days on 23 Oct. Only roster students are kept — the sheet
also lists one 2025-batch student re-registered with 2026 (2025DAB1286), whose last four digits would collide with a
2026 roll number. Rows the sheet marks "not joined" (red) or "withdrawn admission" are still in the roster, so they're
kept here like everyone else (the roster itself isn't pruned by this file).
"""
import json
from pathlib import Path

import openpyxl

PORTAL = Path(__file__).resolve().parent.parent
SRC = PORTAL / 'sources' / 'updates' / 'oct-new' / 'NEW Life Skill Divisions Batch 2026.xlsx'
OUT = PORTAL / 'build' / 'life_skills_days_oct.json'


def main():
    roster = json.load(open(PORTAL / 'build' / 'roster.json'))
    ws = openpyxl.load_workbook(SRC, data_only=True)['Master Copy List']
    days, skipped = {}, []
    for row in ws.iter_rows(min_row=3, values_only=True):
        entry, day = row[2], row[6]
        if not entry or not day:
            continue
        entry = str(entry).strip()
        if entry not in roster:
            skipped.append(entry)
            continue
        assert day in ('Monday', 'Tuesday'), (entry, day)
        days[entry] = day
    # AIDE and MnC (MCB) Life Skills is confirmed on Monday
    for entry in days:
        if roster[entry]['branch'] in ('AIDE', 'MCB'):
            days[entry] = 'Monday'
    OUT.write_text(json.dumps(dict(sorted(days.items())), indent=1))
    print('LS days (Oct):', len(days), 'students; not in roster, skipped:', skipped)


if __name__ == '__main__':
    main()
