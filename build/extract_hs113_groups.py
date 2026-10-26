"""HS113 (Self, Society & Technology) project groups -> build/hs113_project_groups.json ({entry: group number}).

Source: the class's own "Project Group Formation" sheet (26 groups x 5), shared by Prabhnoor Singh (2026AIB1067),
kept in 2026AIB1067/. Its first column names the group only on each group's first row, so the group carries down.
Used by merge.py for the HS113 progress sessions (Wed groups 1-10, Thu 11-20, Fri 20-29).
"""
import json
import re
from pathlib import Path

import openpyxl

PORTAL = Path(__file__).resolve().parent.parent
SRC = PORTAL / 'sources' / 'contributors' / '2026AIB1067' / 'Prabhnoor Singh _ HS113 Project_Group_Formation_26_Groups_130_Students.xlsx'
OUT = PORTAL / 'build' / 'hs113_project_groups.json'


def main():
    ws = openpyxl.load_workbook(SRC, data_only=True)['Project Group Formation']
    groups, group = {}, None
    for row in ws.iter_rows(min_row=5, values_only=True):
        label, roll = row[0], row[2]
        if isinstance(label, str) and re.match(r'\s*Group\s+\d+', label):
            group = int(re.search(r'\d+', label).group())
        if group and isinstance(roll, str) and re.fullmatch(r'\s*2026[A-Z]{3}\d{4}\s*', roll.upper()):
            groups[roll.strip().upper()] = group
    OUT.write_text(json.dumps(dict(sorted(groups.items())), indent=1))
    print('hs113 project groups:', len(groups), 'students in', len(set(groups.values())), 'groups')


if __name__ == '__main__':
    main()
