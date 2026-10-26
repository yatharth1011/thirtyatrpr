"""
Derives the PH102 "Group 2" original lab-team allotment (12 teams of 5) from the
roll-call order in `public/ph102/Friday Morn. G2.xlsx` (the "Exp. No." column marks
one new team every 5 rows), and pulls each student's name/branch from the master
roster. Output feeds the seed data baked into public/ph102/teams/index.html — this
is a one-time historical fact, not something that needs to be re-run unless the
original xlsx allotment itself changes.
"""
import json
import openpyxl

TEAM_SIZE = 5

wb = openpyxl.load_workbook('public/ph102/Friday Morn. G2.xlsx', data_only=True)
ws = wb['Sheet1']

rows = []
for row in ws.iter_rows(min_row=6, values_only=True):
    sn, exp_no, name, entry = row
    if not entry:
        continue
    rows.append(entry.strip())

assert len(rows) == 60, f'expected 60 students, got {len(rows)}'

roster = json.load(open('build/roster.json'))

original_team_of = {}
students = {}
teams = {}
for i, entry in enumerate(rows):
    team_no = i // TEAM_SIZE + 1
    original_team_of[entry] = team_no
    teams.setdefault(team_no, []).append(entry)
    s = roster[entry]
    students[entry] = {'name': s['name'].strip(), 'branch': s['branch']}

for team_no, members in teams.items():
    assert len(members) == TEAM_SIZE, f'team {team_no} has {len(members)} members'

seed = {
    'originalTeamOf': original_team_of,
    'students': students,
    'teamSize': TEAM_SIZE,
    'teamCount': len(teams),
}

with open('build/ph102_g2_seed.json', 'w') as f:
    json.dump(seed, f, indent=2, sort_keys=True)

print(f'wrote build/ph102_g2_seed.json — {len(students)} students, {len(teams)} teams of {TEAM_SIZE}')
