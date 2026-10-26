import json

BRANCH_MAP = {
    'AI':'AIDE','AIB':'AIDE','AIDE':'AIDE',
    'CS':'CSE','CSB':'CSE','CSE':'CSE',
    'EE':'EE','EEB':'EE',
    'EP':'EP','EPB':'EP',
    'ES':'ES','ESB':'ES',
    'DA':'DA','DAB':'DA',
    'CH':'CH','CHB':'CH',
    'CE':'CE','CEB':'CE',
    'ME':'ME','MEB':'ME',
    'MM':'MME','MMB':'MME','MME':'MME',
    'MC':'MCB','MCB':'MCB','MNC':'MCB',
    'ICDT':'ICDT','ICB':'ICDT',
}

roster = json.load(open('build/roster.json'))
ismp = json.load(open('build/ismp_schedule.json'))
tt = json.load(open('build/timetable_parsed.json'))
legend = json.load(open('build/venue_legend.json'))
hss_iks_assignment = json.load(open('build/hss_iks_assignment.json'))
# Official Mid-Sem seating plan (Academic Section workbook, "Mid Sem Seating Plan AY 2026-27 All
# Shifts from 15th Sept. to 22nd Sept."): {date: {entry: {room, seat}}}, parsed once (see
# sep-new/ for the source .xlsx) — only the 4 of 5 Mid-Sem exam dates whose seating had actually
# been finalized in that workbook at parse time have an entry here (the file's own visible/hidden
# sheet split suggested later dates weren't published yet); a 5th (Tinkering Lab, 24 Sep) falls
# outside the workbook's stated 15-22 Sept range entirely, so it's absent rather than guessed at.
exam_seating = json.load(open('build/exam_seating.json'))

# Official NSO (NO101) and NSS (NS101) enrollment lists (Academic Section export, "Final"/"final"
# — see sep-new/) — who is ACTUALLY enrolled in which, not just who structurally matches an
# NSO_CRITERIA day/group. Previously the NSO opt-in flow asked every day/group-matching student
# "are you doing NSO?" even if they were really enrolled in NSS (or neither) instead — this lets
# the app stop asking/showing NSO to anyone not really enrolled in it. A handful (4 of 698) appear
# on both lists (likely an export overlap, not a real dual-enrollment) — nsoEnrolled wins for
# display purposes, since NSO has real day/time data and NSS still doesn't.
nso_nss = json.load(open('build/nso_nss_enrollment.json'))
NSO_ENROLLED = set(nso_nss['nsoEnrolled'])
NSS_ENROLLED = set(nso_nss['nssEnrolled'])
for entry in roster:
    roster[entry]['nsoEnrolled'] = entry in NSO_ENROLLED
    roster[entry]['nssEnrolled'] = entry in NSS_ENROLLED

# HS113 project groups (build/extract_hs113_groups.py, from the class's own group-formation sheet shared by
# Prabhnoor Singh, 2026AIB1067, kept in 2026AIB1067/): 143 students in 29 groups of ~5. From 15 Oct 2026 the
# HS113 slots run as project progress sessions, each group attending one day only (his message: "Wednesday-
# Group 1-10, Thursday- Group 11-20, Friday Group 20-29" — group 20 is listed under both Thursday and Friday,
# so it keeps both rather than guessing). Same 1:00 PM Senate Hall slot. Applies to students whose HS/IKS
# elective resolves to HS113; an HS113 student missing from the sheet keeps all three days. The sheet is newer
# than the official elective list, so it also corrects that list (see HS113_SHEET_OVERRIDES below).
HS113_GROUPS = json.load(open('build/hs113_project_groups.json'))
for entry, grp in HS113_GROUPS.items():
    if entry in roster:
        roster[entry]['hs113Group'] = grp
HS113_PROGRESS = {
    'from': '2026-10-15',
    'days': {'Wednesday': [1, 10], 'Thursday': [11, 20], 'Friday': [20, 29]},
    'contributedBy': '2026AIB1067',
}

# Official per-student HS/IKS elective assignment (see build/extract_hss_iks.py) — attach
# directly to each roster record so the app can look it up instead of asking the student to pick.
for entry, course in hss_iks_assignment.items():
    if entry in roster:
        roster[entry]['hsElective'] = course

# Newer data wins: everyone in the HS113 project-group sheet (15 Oct 2026, mid-semester, filled in by the
# students themselves) is actually in HS113, even where the official assignment list (August) says otherwise —
# 2026ESB1490 and 2026MCB1550 were listed under IK101, 2026EPB1459 had no assignment at all. The reverse is not
# inferred: an official HS113 student missing from the sheet stays HS113 (not filling a sign-up sheet doesn't
# mean they left the course).
HS113_SHEET_OVERRIDES = {}
for entry in HS113_GROUPS:
    if entry in roster and roster[entry].get('hsElective') != 'HS113':
        HS113_SHEET_OVERRIDES[entry] = roster[entry].get('hsElective')
        roster[entry]['hsElective'] = 'HS113'
print('HS113 sheet corrected the official elective for:', HS113_SHEET_OVERRIDES)

# The ISMP concluding event (Ennarators Round 1/2, 23-24 Aug) is branded "KBC - Kaun Banega
# Character" in the official announcement — add that to the title so it's findable by that name
# in the club search, without touching the sheet-sourced date/time/venue/groups.
ISMP_TITLE_RENAMES = {
    'Ennarators Round 1': "Ennarators — KBC: Kaun Banega Character (Round 1)",
    'Ennarators Round 2': "Ennarators — KBC: Kaun Banega Character (Round 2)",
}
for day in ismp:
    for it in day['items']:
        if it['title'] in ISMP_TITLE_RENAMES:
            it['title'] = ISMP_TITLE_RENAMES[it['title']]

mess = {
    'breakfast': {'s':'07:30','e':'09:15'},
    # Sunday breakfast starts later than weekdays (8:00 AM, not 7:30) — same pattern as lunchSun
    # below. End time kept the same as the weekday window (9:15) absent a more specific end time.
    'breakfastSun': {'s':'08:00','e':'09:15'},
    'lunch':     {'s':'12:15','e':'14:30'},
    'lunchSun':  {'s':'12:30','e':'14:30'},
    'dinner':    {'s':'19:30','e':'21:15'},
    # During the ISMP orientation period, dinner opens 30 min earlier (7:00 PM, not 7:30 PM) to
    # spread out crowding — confirmed by 5 separate ISMP WhatsApp announcements (31 Jul - 7 Aug
    # 2026), one of which explicitly bounds it: "Mess will open at 7pm till 18th August". Reverts
    # to the normal 7:30 PM start from 19 Aug 2026 onward.
    'dinnerEarly': {'s':'19:00','e':'21:15'},
    'dinnerEarlyUntil': '2026-08-18',
    # Monthly rotating menus (see mess/Mess menu Sep.pdf) — a list so future months can be appended
    # the same way without restructuring; the app picks whichever entry's validFrom/validTo covers
    # the date being viewed, then looks up that meal's items for the date's weekday. Extracted via
    # pdfplumber's table extraction (not plain text, which interleaves items across the 7 day
    # columns unpredictably) — one item ("Aloo Pyaaz Paratha, Curd" + "Ketchup, Pickle") stayed
    # merged into a single bullet in the source Monday-breakfast cell and is left as-is rather than
    # guessed apart.
    'menus': [
        {
            'validFrom': '2026-09-01',
            'validTo': '2026-09-30',
            'breakfast': {
                'Monday': ['Aloo Pyaaz Paratha, Curd Ketchup, Pickle', 'Banana(2pc)', 'Green Chutney', 'Cornflakes', 'Bournvita, Coffee', 'Bread, Butter, Jam', 'Milk (200mL), Tea', 'Sprouts (Boiled)'],
                'Tuesday': ['Uttapam', 'Upma/Vada (2Pcs)', 'Sambhar', 'Coconut Chutney', 'Ketchup', 'Bournvita, Coffee', 'Bread, Butter, Jam', 'Milk (200mL), Tea', 'Sprouts chaat'],
                'Wednesday': ['Poha', 'Sandwich (2Pcs)', 'Ketchup', 'Chopped Onion', 'Banana(2pc)/ Omelette', 'Bournvita, Coffee', 'Bread, Butter, Jam', 'Cornflakes', 'Milk (200mL), Tea'],
                'Thursday': ['Fried Idli', 'Namkeen Seviyan', 'Sambhar', 'Ketchup, Red Coconut Chutney', 'Bournvita, Coffee', 'Bread, Butter, Jam', 'Milk (200mL), Tea', 'CornChaat'],
                'Friday': ['Mix Paratha', 'Ketchup, Pickle', 'Tomato Chutney', 'Ketchup', 'Papaya(1 Bowl)/Eggs', 'Bournvita, Coffee', 'Bread, Butter, Jam', 'Milk (200mL), Tea', 'Cornflakes'],
                'Saturday': ['Masala Macroni/Pav Bhaji', 'Dalia/Namkeen Khichdi', 'Ketchup, Pickle', 'Bournvita, Coffee', 'Bread, Butter, Jam', 'Milk (200mL), Tea', 'MatarChaat'],
                'Sunday': ['Dosa', 'Sambhar', 'Red Coconut Chutney', 'Banana(2pc)/ Boiled eggs', 'Bournvita, Coffee', 'Bread, Butter, Jam', 'Milk (200mL), Tea', 'Sprouts'],
            },
            'lunch': {
                'Monday': ['Veg Biryani/Egg Biryani', 'Green Chutney', 'Chana Dal', 'Boondi Raita', 'Chapati', 'Salad'],
                'Tuesday': ['Aloo Bhujia/Aloo Chokha', 'ArharDal', 'Rice', 'Chapati', 'Curd', 'Salad'],
                'Wednesday': ['Rajma', 'Laukichana', 'Curd', 'Rice', 'Chapati', 'Salad'],
                'Thursday': ['Dal Makhani', 'Palak Corn', 'Rice', 'Chapati', 'Salad', 'Curd'],
                'Friday': ['Kadhi Pakora', 'Aloo Sem Phali', 'Rice', 'Chapati', 'Salad', 'Fryums'],
                'Saturday': ['Chole', 'Capsicum Aloo', 'Bhatura', 'BhuniMirch', 'Green Chutney', 'Boondi Raita', 'Rice', 'Chapati', 'Salad'],
                'Sunday': ['Dal Makhani', 'Mix Veg', 'Sweet Lassi', 'Rice', 'Chapati', 'Salad'],
            },
            'dinner': {
                'Monday': ['Red Masoor Dal', 'Matar Mushroom', 'Rice', 'Chapati', 'Salad', 'Suji Halwa'],
                'Tuesday': ['Amritsari Chole', 'Dal Tadka', 'Chapati', 'Rice', 'Salad', 'Boondi'],
                'Wednesday': ['Paneer Butter Masala/Paneer Bhurjji', 'Kadhaichicken', 'Moong Dal', 'Rice', 'Chapati', 'Salad', 'Gulab Jamun (2 pcs)'],
                'Thursday': ['Poori', 'Chana Masala', 'Mix Dal', 'Jeera Rice', 'Chapati', 'Salad', 'Kheer'],
                'Friday': ['Soya Chunks Masala', 'Chana Dal', 'Rice', 'Chapati', 'Salad', 'Rasam'],
                'Saturday': ['ArharDal', 'Bhindi Masala', 'Veg-Fried Rice', 'Chapati', 'Salad', 'Shahi Tukda/ Jalebi'],
                'Sunday': ['Paneer Lababdar', 'Butter chicken', 'Black Masoor Dal', 'Chapati', 'Rice', 'Salad', 'Ice Cream (2 scoops)'],
            },
        },
    ],
}

# October's menu hasn't been published — the September menu is assumed to still be in use and is
# carried forward, flagged `assumed` so the app shows it with a disclaimer rather than as fact.
# Replace with the real October entry (and drop this) once the actual menu is available.
mess['menus'].append(dict(mess['menus'][0], validFrom='2026-10-01', validTo='2026-10-31', assumed=True,
    note="October menu not published yet — showing September's, which seems to still be followed. Items may differ."))

def norm_roll(specs):
    out = []
    for spec in specs:
        kind = spec[0]
        if kind == 'range':
            _, prefix, lo, hi = spec
            out.append({'type':'range','branch':BRANCH_MAP[prefix],'lo':lo,'hi':hi})
        elif kind == 'nums':
            _, prefix, nums = spec
            out.append({'type':'nums','branch':BRANCH_MAP[prefix],'nums':nums})
        elif kind == 'branch':
            _, br = spec
            out.append({'type':'branch','branch':BRANCH_MAP.get(br, br)})
    return out

import re as _re
# Builds a ttMatches()-shaped `roll` list directly from a set/list of real entry numbers (e.g.
# '2026CSB1268') — groups by the branch the entry number itself encodes (via BRANCH_MAP), rather
# than trusting a free-text department label from a source sheet, which this batch's own source
# documents spell inconsistently ("MnC"/"MNC"/"MCB", "C.S.E"/"CSE", "AI"/"AIDE", "MEB"/"ME" all seen
# in the same sheet). An entry that doesn't match a known branch prefix, or belongs to a roll number
# we don't recognize, is silently dropped — see e.g. the PH101 Lab Exam 3/Project sheets, which
# include one 2025-batch straggler (2025DAB1286) that has no place in this 2026-batch roster at all.
def roll_from_entries(entries):
    by_branch = {}
    for e in entries:
        m = _re.match(r'^2026([A-Z]+)(\d+)$', e.strip().upper())
        if not m: continue
        prefix, numstr = m.groups()
        branch = BRANCH_MAP.get(prefix)
        if not branch: continue
        by_branch.setdefault(branch, set()).add(int(numstr))
    return [{'type':'nums','branch':b,'nums':sorted(nums)} for b, nums in sorted(by_branch.items())]

timetable = {}
total_confident = 0
for day, entries in tt.items():
    kept = []
    for e in entries:
        if e['division'] or e['group'] or e['branch'] or e['roll'] or e['universal']:
            kept.append({
                'time': e['time'],
                'category': e['category'],
                'subject': e['subject'],
                'venue': e['venue'],
                'division': e['division'],
                'group': e['group'],
                'branch': e['branch'],
                'roll': norm_roll(e['roll']),
                'universal': e['universal'],
                'raw': e['raw'],
            })
    kept.sort(key=lambda x: (x['time'] or ''))
    timetable[day] = kept
    total_confident += len(kept)

# --- Remove the old catch-all "NCC/NSO/NSS" / "LIFE SKILL/ NCC/NSO/NSS" universal placeholder: it
# named three unrelated things in one vague slot with no real per-student info (everyone saw the
# same text regardless of whether NCC/NSO/NSS actually applied to them that day). Replaced below by
# a proper NO101 (NSO) entry per group/day, sourced from the Academic Section's own NSO Schedule
# (Aug 2026) — NCC and NSS have no equivalent real schedule yet, so nothing stands in for them.
for day, entries in timetable.items():
    timetable[day] = [e for e in entries if 'NCC' not in e['subject'] and 'LIFE SKILL' not in e['subject'].upper()]

# --- GE103 -> CS100: the class-timetable sheet's own internal code for this course ("GE103") does
# not match the registrar's actual code, confirmed by cross-checking the official per-student
# enrollment roster embedded in the Sep 2026 Mid-Semester Examination workbook ("Master Sheet New"
# sheet), which lists every enrolled student's real course code/title pair. That roster has no
# "GE103" anywhere, but has ~330 students (matching GE103's own division/count) enrolled in
# "CS100 — Introduction to Computing and Data Structures". Renamed at the source so every downstream
# use (timetable grid, course names, exam entries) is consistent.
for day, entries in timetable.items():
    for e in entries:
        if e['subject'] == 'GE103':
            e['subject'] = 'CS100'

# --- PH101 Lab: replace sheet-derived (partially wrong — G1/G5 were swapped vs. the department's
# own schedule) entries with the authoritative "Department of Physics Schedule for (PH101)" doc,
# shared directly by the department (Aug 2026). All 6 groups, 230-min blocks (9:00-12:50 / 2:00-5:50).
PH101_LAB = [
    {'group': 'G6', 'day': 'Monday',    'time': '2.00 - 2.50', 'instructor': 'Dr. Ritu Gupta'},
    {'group': 'G1', 'day': 'Tuesday',   'time': '2.00 - 2.50', 'instructor': 'Dr. Mukesh Kumar'},
    {'group': 'G5', 'day': 'Thursday',  'time': '9.00 - 9.50', 'instructor': 'Mr. Raja Mondal'},
    {'group': 'G4', 'day': 'Thursday',  'time': '2.00 - 2.50', 'instructor': 'Dr. Danveer Singh'},
    {'group': 'G2', 'day': 'Friday',    'time': '9.00 - 9.50', 'instructor': 'Dr. Srinivasa Rao Konda'},
    {'group': 'G3', 'day': 'Friday',    'time': '2.00 - 2.50', 'instructor': 'Ms. Athira Ravindran K'},
]
for day, entries in timetable.items():
    timetable[day] = [e for e in entries if not e['subject'].startswith('PH101-LAB')]
for row in PH101_LAB:
    timetable[row['day']].append({
        'time': row['time'], 'category': 'Lab', 'subject': 'PH101-LAB', 'venue': None,
        'division': [], 'group': [row['group']], 'branch': [], 'roll': [], 'universal': False,
        'raw': 'PH101 Lab — Dept. of Physics schedule ({})'.format(row['instructor']),
    })

# --- MA101 Tutorial: not tagged anywhere in the sheet at all; confirmed directly by the Math
# department (Dr. Manju Khan, 8 Aug 2026 email) — Tuesday 8-9am for D1/D2 (G1-G6), Friday 8-9am
# for D3/D4 (G7-G12), one room + TA per group.
MA101_TUT = [
    {'group': 'G1', 'day': 'Tuesday', 'venue': 'EE1', 'ta': 'Jashoda Kumari'},
    {'group': 'G2', 'day': 'Tuesday', 'venue': 'EE-SH', 'ta': 'Simran Kaur'},
    {'group': 'G3', 'day': 'Tuesday', 'venue': 'CS1', 'ta': 'Sagar Mandal'},
    {'group': 'G4', 'day': 'Tuesday', 'venue': 'SRC-004', 'ta': 'Anjana'},
    {'group': 'G5', 'day': 'Tuesday', 'venue': 'EE3', 'ta': 'Praveen Kumar'},
    # Venue given as "G6" in the email itself — unclear, left blank until a G6 student
    # (2026EEB1369) confirmed the real room directly.
    {'group': 'G6', 'day': 'Tuesday', 'venue': 'ME1', 'ta': 'Puja Samantaray', 'contributedBy': '2026EEB1369'},
    {'group': 'G7', 'day': 'Friday', 'venue': 'SRC-001', 'ta': 'Sachin Yadav'},
    {'group': 'G8', 'day': 'Friday', 'venue': 'SRC-004', 'ta': 'Ritul Dutta'},
    {'group': 'G9', 'day': 'Friday', 'venue': 'S-001', 'ta': 'Raheli Manna'},
    {'group': 'G10', 'day': 'Friday', 'venue': 'S-002', 'ta': 'Shivani Sharma'},
    {'group': 'G11', 'day': 'Friday', 'venue': 'EE-SH', 'ta': 'Priyanshi Goyal'},
    {'group': 'G12', 'day': 'Friday', 'venue': 'EE3', 'ta': 'Priya Jain'},
]
for row in MA101_TUT:
    entry = {
        'time': '8.00 - 8.50', 'category': 'Tutorial', 'subject': 'MA101-TUT', 'venue': row['venue'],
        'division': [], 'group': [row['group']], 'branch': [], 'roll': [], 'universal': False,
        'ta': row['ta'],
        'raw': 'MA101 Tutorial (TA: {})'.format(row['ta']),
    }
    if row.get('contributedBy'):
        entry['contributedBy'] = row['contributedBy']
    timetable[row['day']].append(entry)

# --- PH101 Tutorial: not present anywhere in the sheet extraction for any group — filled in group
# by group from student contributors' own shared schedules, only for the groups actually confirmed.
PH101_TUT = [
    {'group': 'G5', 'day': 'Monday', 'venue': 'CS-1', 'contributedBy': '2026EEB1369'},
    {'group': 'G6', 'day': 'Monday', 'venue': 'CS-SH', 'contributedBy': '2026EEB1369'},
    {'group': 'G4', 'day': 'Monday', 'venue': 'EE3', 'contributedBy': '2026ESB1499'},
]
for row in PH101_TUT:
    timetable[row['day']].append({
        'time': '8.00 - 8.50', 'category': 'Tutorial', 'subject': 'PH101-TUT', 'venue': row['venue'],
        'division': [], 'group': [row['group']], 'branch': [], 'roll': [], 'universal': False,
        'contributedBy': row['contributedBy'],
        'raw': 'PH101 Tutorial — shared by a {} student contributor'.format(row['group']),
    })

# --- NSO (NO101): official day/group assignment from the Academic Section's "New NSO Schedule
# August-2026" doc, cross-checked against the actual 2026-batch roster (every one of the 698
# students below matches exactly one day, no gaps/overlaps) and independently corroborated by FOUR
# different student contributors' own shared schedules (2026EEB1369 for G5/G6, 2026CEB1162 for
# G12, 2026CHB1125 for G11, 2026CSB1269 for the CSE roll ranges) — all of them show NSO as a single
# ~1-hour period slot, which is what fixed the duration below (an earlier version misread
# 2026EEB1369's own shared "5:00-7:00" note as the literal duration; it's actually 1 hour — see
# classDuration() in app3.js). CSE and MCB are the two branches large enough that the Academic
# Section assigned them by roll-number range instead of by academic group — every other
# branch/group here maps to a single day outright. Kept as separate single-criterion entries per
# day (rather than one combined dict) because ttMatches only checks one of division/group/branch/
# roll per entry — an OR across group/branch/roll needs one entry per criterion, not one entry with
# all three filled in. No `contributedBy` tag here at all: the day/group mapping is straight from
# the Academic Section's own doc, not from any one contributor, and the fixed duration lives in
# code (classDuration), which has no per-entry attribution mechanism — see
# feedback_contributor_attribution_scope for why this matters (a student in some other group must
# never see someone else's attribution just because they happen to also do NSO on some day).
# NSO is officially 2 hours, 5:00-7:00 PM for every batch — a direct user correction superseding
# the earlier "fixed 60-min" call (which had been cross-confirmed by three contributors' own
# shared schedules at the time, but was simply wrong). classDuration() gives NO101 the real 120-min length.
NSO_TIME = '5.00 - 5.50'  # anchor label for a 5:00 PM start
NSO_CRITERIA = {
    'Monday': [
        {'group': ['G12', 'G11', 'G5']},
        {'roll': [{'branch': 'CSE', 'type': 'range', 'lo': 1169, 'hi': 1238}]},
    ],
    'Tuesday': [
        {'group': ['G10']},
        {'branch': ['ICDT', 'EP']},
        {'roll': [
            {'branch': 'CSE', 'type': 'range', 'lo': 1239, 'hi': 1288},
            {'branch': 'CSE', 'type': 'nums', 'nums': [1693, 1694]},
            {'branch': 'MCB', 'type': 'range', 'lo': 1502, 'hi': 1536},
        ]},
    ],
    'Wednesday': [
        {'branch': ['AIDE', 'ES']},
    ],
    'Thursday': [
        {'group': ['G6']},
        {'branch': ['DA']},
        {'roll': [
            {'branch': 'MCB', 'type': 'range', 'lo': 1537, 'hi': 1581},
            {'branch': 'MCB', 'type': 'nums', 'nums': [1696, 1697]},
        ]},
    ],
}
for _day, _criteria_list in NSO_CRITERIA.items():
    for _crit in _criteria_list:
        _entry = {
            'time': NSO_TIME, 'category': 'NSO', 'subject': 'NO101', 'venue': None,
            'division': [], 'group': _crit.get('group', []), 'branch': _crit.get('branch', []),
            'roll': _crit.get('roll', []), 'universal': False,
            'raw': 'NSO — 5:00-6:00 PM, {} (per Academic Section NSO Schedule, Aug 2026; day/group mapping cross-confirmed by 4 student contributors)'.format(_day),
        }
        timetable[_day].append(_entry)

# --- Life Skills (LS101): originally just a handful of groups/branches shared directly by
# student contributors. Superseded on 2026-09-15 by "Life Skill Divisions Batch 2026.xlsx.pdf"
# (sep-new/) — an official Academic Section roster giving a LIFE SKILL LECTURE DAY per student,
# extracted via pdfplumber table parsing (build/life_skills_days.json), covering 663 of 698 roster
# students (35 missing — a few page-break rows the source table itself dropped, left honestly
# absent rather than guessed). Majority day per (branch, group) taken where a combo had a small
# minority of outlier rows (a handful of page-boundary parsing artifacts, not a real intra-group
# split — every OTHER combo was internally 100% consistent).
#
# This corrects EP and ICDT's day from Friday to Monday — the earlier single-contributor reports
# for both said Friday; this comprehensive official document says Monday for every one of their
# students, and independently reproduces the EXACT Tuesday day already confirmed for EE/G5+G6 and
# CH/G11, which is why it's trusted over the two Friday reports where they conflict.
#
# Time/venue updated again same day from an official Academic Section email ("Life Skill Lecture
# Scheduling for Monday and Tuesday" — Monday 184 students, Tuesday 485, 6:00-7:00 PM, Auditorium)
# — a real 60-min block, not the 50-min default. (A brief detour: the user first corrected the
# email's stated venue to Senate Hall, then retracted that and confirmed Auditorium — the email's
# own venue — was right all along; venue below reflects that final word, not the mid-course one.)
# Its headcounts (184/485) roughly, not exactly, match this file's own
# Monday/Tuesday totals — consistent with the same ~35-student gap already known from the source
# roster parse, not a sign of a different population. ICDT is EXCLUDED from this update: it has
# its own separate 5-year-program timetable and a directly-reported 90-min/unknown-venue session
# from its own Branch Rep — the generic batch email doesn't clearly cover it, so ICDT keeps its
# own duration and stays venue-unknown rather than guessing it into this batch.
#
# GOTCHA (same class of bug as the WP101-LAB CE/MME collision): several academic-group labels are
# shared across branches — AIDE/G2 and MCB/G2 both exist — so a bare `group: ['G2']` would wrongly
# give one branch's day to the other. Every row below uses `branch` (unique by construction) unless
# the bare group label is branch-exclusive (CSE's G7/G8, ME's G10) or every branch sharing that
# label happens to resolve to the same day anyway (G11: CH and ME; G9: EP and ICDT, once corrected
# to Monday — kept branch-scoped there anyway so ICDT's own 90-min duration override, keyed on
# branch, still applies only to ICDT). AIDE and MCB both moved to Monday in the 15 Sep override
# below, so the AIDE/G2-vs-MCB/G2 collision that used to force a roll-range workaround for MCB is
# now moot — both are plain `branch` rows on the same day.
LS_OLD_UNTIL, LS_NEW_FROM = '2026-10-22', '2026-10-23'   # the old LS schedule ends here; the new roster starts the next day
LS101_SESSIONS = [
    {'day': 'Tuesday', 'group': ['G5', 'G6'], 'contributedBy': '2026EEB1369'},
    {'day': 'Tuesday', 'group': ['G11'], 'contributedBy': '2026CHB1125'},
    {'day': 'Monday', 'branch': ['EP'], 'contributedBy': '2026EPB1468'},
    # ICDT's own session is a genuinely longer 90-min block, not the 60-min default everyone else
    # now has — same 6:00 PM anchor time (see classDuration's LS101+ICDT branch case for the real
    # 90-min length), same anchor-label pattern already used for NSO's fixed duration. Also kept
    # venue-unknown (excluded from the Auditorium default below) — see the note above.
    {'day': 'Monday', 'branch': ['ICDT'], 'contributedBy': '2026ICB1429', 'venue': None},
    # Override, 15 Sep 2026: AIDE and MCB (MnC) both moved to Monday — was Tuesday (AIDE, full
    # branch) and a Monday roll-range covering only MCB 1502-1522 (21 of MCB's 82 students; the
    # range existed only to dodge the AIDE/G2 vs MCB/G2 label collision, see the GOTCHA note
    # elsewhere in this file — now moot since both branches share Monday anyway). Using
    # branch:['MCB'] instead of that range also fixes a pre-existing gap: the other 61 MCB
    # students (rolls 1523-1581, 1696-1697) had no LS101 entry at all before this change.
    {'day': 'Monday', 'branch': ['AIDE']},
    {'day': 'Tuesday', 'branch': ['CE']},
    {'day': 'Tuesday', 'group': ['G7']},
    {'day': 'Monday', 'group': ['G8']},
    {'day': 'Tuesday', 'branch': ['DA']},
    {'day': 'Tuesday', 'branch': ['ES']},
    {'day': 'Monday', 'branch': ['MCB']},
    # branch:['MCB'] above already covers G3 (MCB's only academic group with that label — see
    # the roster query in this override's commit) — a separate Tuesday group:['G3'] row would
    # give MCB/G3 students LS101 twice (once Monday from the branch match, once Tuesday from
    # this one), so it's removed rather than left stale.
    {'day': 'Monday', 'group': ['G10']},
    {'day': 'Tuesday', 'branch': ['MME']},
]
for row in LS101_SESSIONS:
    entry = {
        'time': '6.00 - 6.50', 'category': 'LS', 'subject': 'LS101',
        'venue': row.get('venue', 'Auditorium'),
        'division': [], 'group': row.get('group', []), 'branch': row.get('branch', []),
        'roll': row.get('roll', []), 'universal': False,
        'raw': 'Life Skills — {} (official Life Skill Divisions roster, 15 Sep 2026)'.format(
            row.get('contributedBy', 'per the Academic Section')),
    }
    if row.get('contributedBy'):
        entry['contributedBy'] = row['contributedBy']
    entry['validUntil'] = LS_OLD_UNTIL   # superseded by the Oct roster below, from LS_NEW_FROM on
    timetable[row['day']].append(entry)

# --- Life Skills, NEW roster (23 Oct 2026): the Academic Section's "NEW Life Skill Divisions Batch 2026" workbook
# (oct-new/, build/extract_ls_oct.py -> life_skills_days_oct.json) gives every student's lecture day, and it
# replaces ALL the rules above from 23 Oct onwards ("old LS schedule not applicable today onwards") — the old entries
# carry validUntil=22 Oct, these carry validFrom=23 Oct, and app3.js / engine.js apply those dates. AIDE (all 99)
# and MnC (MCB, all 82) are on Monday; 11 CSE-G8 students move Monday -> Tuesday; everyone else keeps their day.
# Same time/venue as before (6:00-7:00 PM, Auditorium; ICDT keeps its own 90-min session and unknown venue).
# A branch whose students all share one day is a plain `branch` rule; a mixed branch (CSE, ME) is listed by
# roll number — contiguous runs as ranges — within that branch, since ttMatches only ever checks one criterion
# per entry and a bare group label collides across branches.
LS_OCT_DAYS = json.load(open('build/life_skills_days_oct.json'))
_ls_by_branch = {}
for _e, _day in LS_OCT_DAYS.items():
    _b = roster[_e]['branch']
    _ls_by_branch.setdefault(_b, {}).setdefault(_day, []).append(int(_e[-4:]))
def _ls_roll_spec(branch, nums):
    nums = sorted(set(nums)); out = []; i = 0
    while i < len(nums):
        j = i
        while j + 1 < len(nums) and nums[j + 1] == nums[j] + 1:
            j += 1
        if j - i >= 2:
            out.append({'branch': branch, 'type': 'range', 'lo': nums[i], 'hi': nums[j]})
        else:
            out.append({'branch': branch, 'type': 'nums', 'nums': nums[i:j + 1]})
        i = j + 1
    return out
for _b, _days in sorted(_ls_by_branch.items()):
    _crit = [{'branch': [_b]}] if len(_days) == 1 else [{'roll': _ls_roll_spec(_b, _n), '_day': _d} for _d, _n in _days.items()]
    for _c in _crit:
        _day = _c.pop('_day', None) or next(iter(_days))
        timetable[_day].append({
            'time': '6.00 - 6.50', 'category': 'LS', 'subject': 'LS101',
            'venue': None if _b == 'ICDT' else 'Auditorium',
            'division': [], 'group': [], 'branch': _c.get('branch', []), 'roll': _c.get('roll', []), 'universal': False,
            'raw': 'Life Skills — {} (official NEW Life Skill Divisions roster, 23 Oct 2026)'.format(_day),
            'validFrom': LS_NEW_FROM,
        })

# --- WP101 Lab (G11): the sheet extraction placed this Thursday 9:00-9:50 (2hr), but G11 student
# contributor 2026CHB1125's own shared weekly schedule shows a 3-hour Tuesday 2-5pm block instead.
# Per direction that contributor-shared data is the ground truth for now, this replaces (not adds
# to) the sheet-derived Thursday entry.
for day, entries in timetable.items():
    timetable[day] = [e for e in entries if not (e['subject'] == 'WP101-LAB' and e.get('group') == ['G11'])]
timetable['Tuesday'].append({
    'time': '2.00 - 2.50', 'category': 'PCE-1', 'subject': 'WP101-LAB', 'venue': None,
    'division': [], 'group': ['G11'], 'branch': [], 'roll': [], 'universal': False,
    'contributedBy': '2026CHB1125',
    'raw': 'WP101 Lab (G11) — corrected to Tuesday per student contributor 2026CHB1125',
})

# --- CY101 Lab (MME/CE/CH batch): the sheet extraction placed this Thursday 9:00-9:50, but TWO
# independent student contributors agree it's Wednesday instead — 2026CEB1162 explicitly names
# "WHOLE 2026 BATCH OF MM, CE, CH"; 2026CHB1125 independently shows the same slot for his own CH
# branch. Per direction that contributor-shared data is the ground truth for now, this replaces
# (not adds to) the sheet-derived Thursday entry.
for day, entries in timetable.items():
    timetable[day] = [e for e in entries if not (
        e['subject'] == 'CY101-LAB' and
        any(r.get('type') == 'branch' and r.get('branch') in ('MME', 'CE', 'CH') for r in (e.get('roll') or []))
    )]
timetable['Wednesday'].append({
    'time': '9.00 - 9.50', 'category': 'Lab', 'subject': 'CY101-LAB', 'venue': None,
    'division': [], 'group': [], 'branch': [],
    'roll': [
        {'type': 'branch', 'branch': 'MME'},
        {'type': 'branch', 'branch': 'CE'},
        {'type': 'branch', 'branch': 'CH'},
    ],
    'universal': False,
    'contributedBy': '2026CEB1162',
    'raw': 'CY101 Lab (MME/CE/CH batch) — corrected to Wednesday per student contributors',
})

# --- CY101 Tutorial (CSE): not present anywhere in the sheet extraction at all — shared directly
# by CSE student contributor 2026CSB1269's own batch-wide timetable (Thursday 6-6:50 PM, SRC-005).
timetable['Thursday'].append({
    'time': '6.00 - 6.50', 'category': 'Tutorial', 'subject': 'CY101-TUT', 'venue': 'SRC-005',
    'division': [], 'group': [], 'branch': ['CSE'], 'roll': [], 'universal': False,
    'contributedBy': '2026CSB1269',
    'raw': 'CY101 Tutorial — shared by CSE student contributor 2026CSB1269',
})

# --- WP101 Lab (ES branch): the sheet extraction placed this Wednesday 2:00pm (paired with ICDT),
# but ES student contributor 2026ESB1499's own shared schedule shows it Friday morning instead.
# ICDT is left untouched on Wednesday — no contributor data contradicts that half of the entry, only
# the ES half. Per direction that contributor-shared data is the ground truth for now, this
# replaces (not adds to) the sheet-derived Wednesday assignment for ES specifically. Kept at the
# standard 120-min WP101-LAB duration (classDuration's default '-LAB' rule) rather than the ~230min
# a single account's "9:00-12:50" block would imply, since every other WP101-LAB entry in this
# dataset uses that same 120-min convention and one account isn't enough to break from it.
for day, entries in timetable.items():
    for e in entries:
        if e['subject'] == 'WP101-LAB':
            e['roll'] = [r for r in (e.get('roll') or []) if not (r.get('type') == 'branch' and r.get('branch') == 'ES')]
timetable['Friday'].append({
    'time': '9.00 - 9.50', 'category': 'PCE-1', 'subject': 'WP101-LAB', 'venue': None,
    'division': [], 'group': [], 'branch': ['ES'], 'roll': [], 'universal': False,
    'contributedBy': '2026ESB1499',
    'raw': 'WP101 Lab (ES branch) — corrected to Friday per student contributor 2026ESB1499',
})

# --- TL101 Lecture: the course coordinator (Dr. Shashi Shekhar Jha) announced the weekly lecture
# moves from Monday 6pm (Senate) to Friday 6pm. The announcement itself said "this week's lecture
# is tomorrow at Senate Hall" and "from next week, venue is Auditorium" — confirmed directly (14
# Aug 2026, a Friday): that day's lecture ran at Senate, so the announcement was posted Thu 13 Aug
# ("tomorrow" = Fri 14 Aug = Senate, this transition week only), meaning the Auditorium steady
# state starts the following Friday, 21 Aug 2026 onward. The regular Friday grid entry below is set
# to Auditorium (the eventual default); the one-off DATE_OVERRIDES entry for 14 Aug suppresses it
# for that single date and substitutes Senate instead (see the suppression logic in app2.js's
# buildDays, which skips a weekday-grid entry for a subject/date that has a date override).
for day, entries in timetable.items():
    timetable[day] = [e for e in entries if e['subject'] != 'TL101']
timetable['Friday'].append({
    'time': '6.00 - 6.50', 'category': 'Lecture', 'subject': 'TL101', 'venue': 'AUDITORIUM',
    'division': [], 'group': [], 'branch': ['AIDE', 'CSE', 'MCB', 'DA', 'EP'], 'roll': [], 'universal': False,
    'raw': 'TL101 lecture — Fridays, Auditorium, from 21 Aug 2026 onward (coordinator announcement)',
})

# --- TL101 Mid-Semester Viva (23-26 Sep): the announcement splits students by "your regular lab
# batch day" — which we don't need told to us separately, since the sheet's own TL101-LAB entries
# (extracted with explicit roll ranges, still sitting in `timetable` at this point, untouched by
# the TL101-lecture rewrite above since that only touched the plain 'TL101' subject) already say
# exactly who's in which weekday's lab. A follow-up email gave roll ranges for one slice of this
# (academic group G2's Thursday/Friday split) — cross-checked below and found to be a subset of
# the full Thursday/Friday lab rosters already in the sheet, confirming the "same day as your lab"
# rule rather than replacing it with something narrower.
TL101_VIVA_OVERRIDES = {}
for wd, date in [('Wednesday', '2026-09-23'), ('Thursday', '2026-09-24'), ('Friday', '2026-09-25')]:
    labs = [e for e in timetable[wd] if e['subject'] == 'TL101-LAB']
    combined_roll = []
    for lab in labs:
        combined_roll.extend(lab['roll'])
    TL101_VIVA_OVERRIDES[date] = [{
        'time': 'Time not specified — ' + wd + ' batches', 'category': 'Viva', 'subject': 'TL101-VIVA', 'venue': None,
        'division': [], 'group': [], 'branch': [], 'roll': combined_roll, 'universal': False,
        'raw': 'TL101 Mid-Semester Viva — ' + wd + ' batches (= your regular TL101 lab day), ' + date[8:10] + ' Sep 2026 (exact time not given in the announcement)',
    }]

# Monday's and Tuesday's lab sub-groups don't get their own viva day like Wed/Thu/Fri do — the
# announcement compresses both days' two sub-batches each onto 26 Sep with four distinct times, in
# order: Monday's earlier lab slot, Monday's later slot, Tuesday's earlier slot, Tuesday's later slot.
_mon_tue_labs = []
for wd in ('Monday', 'Tuesday'):
    labs = sorted([e for e in timetable[wd] if e['subject'] == 'TL101-LAB'], key=lambda e: e['time'])
    _mon_tue_labs.extend(labs)
_viva_times = ['9.30 AM', '11.00 AM', '2.30 PM', '4.00 PM']
_viva_labels = ['Monday batch 1', 'Monday batch 2', 'Tuesday batch 1', 'Tuesday batch 2']
TL101_VIVA_OVERRIDES['2026-09-26'] = [
    {
        'time': _viva_times[i], 'category': 'Viva', 'subject': 'TL101-VIVA', 'venue': None,
        'division': [], 'group': [], 'branch': [], 'roll': _mon_tue_labs[i]['roll'], 'universal': False,
        'raw': 'TL101 Mid-Semester Viva — ' + _viva_labels[i] + ' (= your regular TL101 lab day), ' + _viva_times[i] + ', 26 Sep 2026',
    }
    for i in range(len(_mon_tue_labs))
]

# --- TL101 Lab (EP branch): the sheet extraction placed this Wednesday 4:00pm (paired with an MCB
# roll range), but EP student contributor 2026EPB1468's own shared schedule shows it Monday
# 4:00-5:50pm instead. Split out as its own entry (kept separate from the existing MCB-roll entry
# it used to share) rather than adding a contributedBy tag to that entry too, since only the EP
# portion of it is actually his data — see feedback_contributor_attribution_scope. Added here, AFTER
# the Mid-Sem TL101 viva computation above (not earlier, alongside the other WP101/PH101-TUT
# contributor fixes) because that computation hardcodes "exactly 2 lab slots each on Monday and
# Tuesday" (_viva_times has 4 entries) — adding a 3rd Monday lab before it ran corrupted that count.
for day, entries in timetable.items():
    for e in entries:
        if e['subject'] == 'TL101-LAB':
            e['roll'] = [r for r in (e.get('roll') or []) if not (r.get('type') == 'branch' and r.get('branch') == 'EP')]
timetable['Monday'].append({
    'time': '4.00 - 4.50', 'category': 'Lab', 'subject': 'TL101-LAB', 'venue': None,
    'division': [], 'group': [], 'branch': ['EP'], 'roll': [], 'universal': False,
    'contributedBy': '2026EPB1468',
    'raw': 'TL101 Lab (EP branch) — corrected to Monday per student contributor 2026EPB1468',
})

# --- CY101 Tutorial (EP branch): 2026EPB1468's own first share said Wednesday 6-6:50 PM, but his
# direct WhatsApp cross-check correction says Thursday 6-7 PM instead (a genuine 60-min slot, same
# venue SRC-005 as the CSE entry above but a different, EP-specific duration — distinguished by
# branch in classDuration() since venue alone can't tell these two apart).
timetable['Thursday'].append({
    'time': '6.00 - 6.50', 'category': 'Tutorial', 'subject': 'CY101-TUT', 'venue': 'SRC-005',
    'division': [], 'group': [], 'branch': ['EP'], 'roll': [], 'universal': False,
    'contributedBy': '2026EPB1468',
    'raw': 'CY101 Tutorial — shared by EP student contributor 2026EPB1468',
})

# --- CS100 Thursday: doesn't exist at all — first reported by CH student contributor
# 2026CHB1125 (D4 doesn't have it, verifying the live site against his own real schedule — see the
# WhatsApp thread), which briefly left D3 still matching by division. EP student contributor
# 2026EPB1468 then independently confirmed D3 doesn't have GE103 either (his own term for this
# course — "Thursday no ge103 again"; same course the app stores as CS100, see the GE103->CS100
# rename note above), and CSE contributor 2026CSB1269's own Thursday data never mentioned it
# despite listing every other Thursday slot in detail — three independent signals across both
# divisions, so the whole Thursday Auditorium entry (not just CH's D4 slice of it) is removed
# outright; Wed/Fri are untouched (multiple contributors DO confirm it there).
for day, entries in timetable.items():
    if day != 'Thursday':
        continue
    timetable[day] = [e for e in entries if not (e['subject'] == 'CS100' and e.get('venue') == 'Auditorium')]

# --- CY101 Tutorial (CH branch): what CH actually has instead of CS100 on Thursday — shared
# directly by CH student contributor 2026CHB1125 (Thursday 6-7 PM, SRC-106). Different venue from
# the CSE/EP CY101-TUT entries above (SRC-005), which is also how classDuration() tells this one's
# genuinely-60-min length apart from those two's 50-min default without affecting them.
timetable['Thursday'].append({
    'time': '6.00 - 6.50', 'category': 'Tutorial', 'subject': 'CY101-TUT', 'venue': 'SRC-106',
    'division': [], 'group': [], 'branch': ['CH'], 'roll': [], 'universal': False,
    'contributedBy': '2026CHB1125',
    'raw': 'CY101 Tutorial — shared by CH student contributor 2026CHB1125 (confirmed CS100 does NOT run Thursday for CH)',
})

# --- CY101 Lab (ME branch): the sheet extraction placed this Wednesday 9:00am (as its own
# ME-branch entry), but ME/G11 student contributor 2026MEB1647's own shared schedule shows it
# Thursday 9:00-11:50am instead.
for day, entries in timetable.items():
    for e in entries:
        if e['subject'] == 'CY101-LAB':
            e['roll'] = [r for r in (e.get('roll') or []) if not (r.get('type') == 'branch' and r.get('branch') == 'ME')]
timetable['Thursday'].append({
    'time': '9.00 - 9.50', 'category': 'Lab', 'subject': 'CY101-LAB', 'venue': None,
    'division': [], 'group': [], 'branch': ['ME'], 'roll': [], 'universal': False,
    'contributedBy': '2026MEB1647',
    'raw': 'CY101 Lab (ME branch) — corrected to Thursday per student contributor 2026MEB1647',
})

# --- CY101 Tutorial (ME branch): a THIRD separate slot (own day/venue) from the CSE (Thursday,
# SRC-005) and CH (Thursday, SRC-106) ones above — shared directly by ME/G11 student contributor
# 2026MEB1647 (Thursday 6-6:50 PM, SRC-006).
timetable['Thursday'].append({
    'time': '6.00 - 6.50', 'category': 'Tutorial', 'subject': 'CY101-TUT', 'venue': 'SRC-006',
    'division': [], 'group': [], 'branch': ['ME'], 'roll': [], 'universal': False,
    'contributedBy': '2026MEB1647',
    'raw': 'CY101 Tutorial — shared by ME student contributor 2026MEB1647',
})

# --- WP101 Lab (G11, shared by CH+ME): 2026CHB1125 already corrected the DAY to Tuesday; ME/G11
# student contributor 2026MEB1647 independently confirms Tuesday too, and additionally gives a more
# precise start time — 3:00 PM, not 2:00 PM. Adjusting the existing entry's anchor time (not
# re-adding it) since this refines rather than contradicts the earlier correction, and the entry is
# shared by both branches in G11 either way.
for day, entries in timetable.items():
    for e in entries:
        if e['subject'] == 'WP101-LAB' and e.get('group') == ['G11'] and day == 'Tuesday':
            e['time'] = '3.00 - 3.50'

# --- WP101 Lab (G10): 2026MEB1647 is a Branch Representative for BOTH G10 and G11 (ME's two
# groups), not just his own G11 — so his mention of G10's schedule is direct/authoritative, not
# hearsay from someone outside that group (unlike a random classmate's secondhand guess would be).
# The sheet extraction placed this Friday 9:00am; he shows it as Monday 3:00-5:50pm instead —
# same day-shift pattern as the G11 correction above, just a different day/group.
for day, entries in timetable.items():
    timetable[day] = [e for e in entries if not (e['subject'] == 'WP101-LAB' and e.get('group') == ['G10'])]
timetable['Monday'].append({
    'time': '3.00 - 3.50', 'category': 'PCPE', 'subject': 'WP101-LAB', 'venue': None,
    'division': [], 'group': ['G10'], 'branch': [], 'roll': [], 'universal': False,
    'contributedBy': '2026MEB1647',
    'raw': 'WP101 Lab (G10) — corrected to Monday per Branch Representative 2026MEB1647',
})

# --- WP101 Lab (G12): the sheet extraction placed this Tuesday 2:00pm, but CE/G12 contributor
# 2026CEB1162 directly cross-checked the live site against her real schedule and reported it's
# actually Thursday 9:00 AM-1:00 PM instead (a clean, unambiguous "9 to 1" — not a merged-cell
# guess like some other WP101 durations here, so it's kept precise at 240 min instead of falling
# back to the standard 120-min WP101-LAB convention; see the branch-specific case in
# classDuration()).
#
# GOTCHA found while adding MME contributor 2026MMB1686 (also academicGroup 'G12' — CE and MME
# each independently have their own, DIFFERENT "G12", the label isn't unique across branches; see
# the roster). This entry originally matched by `group: ['G12']` alone, and ttMatches() checks
# group before branch in its cascade — so it was silently also matching every MME/G12 student,
# incorrectly showing them CE's WP101 lab instead of MME's own. Re-scoped to `branch: ['CE']`
# instead (CE has exactly one academic group, so this matches the identical set of students either
# way) specifically so it stops leaking into MME once MME gets its own entry below. **How to
# apply**: never scope a group-only timetable entry by a bare group label like 'G12' without first
# checking whether more than one branch's roster uses that same label — prefer `branch` when a
# correction is really branch-specific, even if the group label happens to be unique-sounding.
for day, entries in timetable.items():
    timetable[day] = [e for e in entries if not (e['subject'] == 'WP101-LAB' and e.get('group') == ['G12'])]
timetable['Thursday'].append({
    'time': '9.00 - 9.50', 'category': 'PCDE', 'subject': 'WP101-LAB', 'venue': None,
    'division': [], 'group': [], 'branch': ['CE'], 'roll': [], 'universal': False,
    'contributedBy': '2026CEB1162',
    'raw': 'WP101 Lab (G12/CE) — corrected to Thursday 9 AM-1 PM per student contributor 2026CEB1162',
})
# --- WP101 Lab (MME): 2026MMB1686 (MME/G12's own Branch Representative) shared MME's real WP101
# lab — Thursday 10:00 AM-12:50 PM (170 min, a specific "10 to 12:50" — not a rounded guess),
# venue "G12" (the workshop bay's own room code, coincidentally the same string as the academic
# group label, per his own notes — unrelated to the group-collision issue above).
timetable['Thursday'].append({
    'time': '10.00 - 10.50', 'category': 'PCDE', 'subject': 'WP101-LAB', 'venue': 'G12',
    'division': [], 'group': [], 'branch': ['MME'], 'roll': [], 'universal': False,
    'contributedBy': '2026MMB1686',
    'raw': 'WP101 Lab (MME) — Thursday 10:00 AM-12:50 PM per Branch Representative 2026MMB1686',
})
# --- CY101 Tutorial (MME): missing entirely before this — 2026MMB1686 shared it as Thursday
# 6:00-6:50 PM (same slot several other branches' CY101 tutorials use), venue not yet known to him.
timetable['Thursday'].append({
    'time': '6.00 - 6.50', 'category': 'Tutorial', 'subject': 'CY101-TUT', 'venue': None,
    'division': [], 'group': [], 'branch': ['MME'], 'roll': [], 'universal': False,
    'contributedBy': '2026MMB1686',
    'raw': 'CY101 Tutorial — shared by MME Branch Representative 2026MMB1686',
})

# --- WP101 Lab: ICDT doesn't actually have it at all. ICDT/G9's own Branch Representative
# 2026ICB1429 shared his full weekly schedule (from an official "TIME TABLE FOR ICDT STUDENTS"
# document — ICDT is a separate 5-year integrated program with its own dedicated timetable, not
# just following the mainstream 4-year grid) and it never mentions WP101 anywhere — and directly
# contradicts the sheet's Wednesday 2:00pm slot specifically: he has his HSS session at exactly
# that time (2:00-2:50pm) instead. The sheet-extracted entry originally covered ES+ICDT together;
# ES was already split out per its own contributor, so this removes the other half. If nothing is
# left matching after ICDT's removal, the entry is dead (matches nobody) and is dropped entirely.
for day, entries in timetable.items():
    for e in entries:
        if e['subject'] == 'WP101-LAB':
            e['roll'] = [r for r in (e.get('roll') or []) if not (r.get('type') == 'branch' and r.get('branch') == 'ICDT')]
timetable = {
    day: [e for e in entries if not (
        e['subject'] == 'WP101-LAB' and not e.get('division') and not e.get('group')
        and not e.get('branch') and not e.get('roll') and not e.get('universal')
    )]
    for day, entries in timetable.items()
}

# --- CY101 Lab (ICDT): the sheet extraction bundled ICDT into one combined Tuesday 9:00am entry
# with CSE and EP, all sharing the standard 120-min WP101/CY101-LAB convention. 2026ICB1429 reports
# ICDT's own session runs 9:00-11:50 AM instead — a specific 170-min block, not a rounded guess —
# so ICDT is split out into its own branch-scoped entry (like the WP101-LAB CE/MME split above)
# rather than changing the duration for CSE/EP too, since neither of those confirmed contributors
# has ever flagged their own CY101 lab as anything but the standard 120 min.
for day, entries in timetable.items():
    for e in entries:
        if e['subject'] == 'CY101-LAB' and day == 'Tuesday':
            e['roll'] = [r for r in (e.get('roll') or []) if not (r.get('type') == 'branch' and r.get('branch') == 'ICDT')]
timetable['Tuesday'].append({
    'time': '9.00 - 9.50', 'category': 'PC-1', 'subject': 'CY101-LAB', 'venue': None,
    'division': [], 'group': [], 'branch': ['ICDT'], 'roll': [], 'universal': False,
    'contributedBy': '2026ICB1429',
    'raw': 'CY101 Lab (ICDT) — 9:00-11:50 AM per Branch Representative 2026ICB1429',
})

# --- CS100 (Auditorium) Wednesday duplicate: the sheet extraction had TWO separate 50-min Wednesday
# entries (5:00-5:50 AND 6:00-6:50) representing one longer session — that was a reasonable way to
# encode a >50min block before classDuration() knew about CS100's real 75-min length (see the
# CS100+Auditorium rule there, confirmed by 3 independent contributors). Now that the 5:00 entry
# alone correctly renders as 5:00-6:15 PM, the leftover 6:00-6:50 entry is a redundant duplicate —
# Thursday/Friday only ever had the single entry, so only Wednesday needs this cleanup.
timetable['Wednesday'] = [
    e for e in timetable['Wednesday']
    if not (e['subject'] == 'CS100' and e.get('venue') == 'Auditorium' and e['time'] == '6.00- 6.50')
]

# Date-specific classes that override/replace the regular weekday grid for one exact date — keyed
# by ISO date. When a (subject, date) pair appears here, the matching weekday-grid entry for that
# subject is suppressed on that date and this entry is used instead (see app2.js buildDays).
DATE_OVERRIDES = {
    '2026-08-14': [
        {
            'time': '6.00 - 6.50', 'category': 'Lecture', 'subject': 'TL101', 'venue': 'SENATE',
            'division': [], 'group': [], 'branch': ['AIDE', 'CSE', 'MCB', 'DA', 'EP'], 'roll': [], 'universal': False,
            'raw': 'TL101 transition-week lecture — Senate Hall (confirmed 14 Aug 2026), before the Auditorium move takes effect 21 Aug',
        },
    ],
    '2026-09-06': [
        {
            # Sunday — no regular timetable entries that day to suppress; purely additive.
            'time': '10.00 - 10.50', 'category': 'Quiz', 'subject': 'MA101-QUIZ', 'venue': None,
            'division': [], 'group': [], 'branch': [], 'roll': [], 'universal': True,
            'raw': 'MA101 Math Quiz — all students, 10:00-11:00 AM, 6 Sep 2026',
        },
    ],
    # G3's MA101 Tutorial (normally Tuesday 8:00-8:50 AM, CS1) was cancelled from that slot (see
    # the matching CANCELLATIONS entry) and given a same-day makeup, 6:00-7:00 PM — a genuine
    # 60-min block, not the usual 50 (see the MA101-TUT time-literal case in classDuration()).
    # Venue/TA not independently reconfirmed for the makeup slot — kept as G3's normal room/TA
    # since nothing suggested otherwise; correct directly if that turns out wrong.
    '2026-09-15': [
        {
            'time': '6.00 - 7.00', 'category': 'Tutorial', 'subject': 'MA101-TUT', 'venue': 'CS1',
            'division': [], 'group': ['G3'], 'branch': [], 'roll': [], 'universal': False,
            'ta': 'Sagar Mandal',
            'raw': 'MA101 Tutorial (TA: Sagar Mandal) — moved same-day from the normal 8 AM slot to 6-7 PM, 15 Sept 2026',
        },
    ],
    # G2's MA101 Tutorial (normally Tuesday 8:00-8:50 AM, EE-SH) was bodily rescheduled this one
    # week to Wednesday 16 Sept, 8:00-9:00 AM — a genuine 60-min block, not the usual 50 (see the
    # matching CANCELLATIONS entry removing it from its normal Tuesday slot, and the MA101-TUT
    # time-literal case in classDuration() for the duration).
    '2026-09-16': [
        {
            'time': '8.00 - 9.00', 'category': 'Tutorial', 'subject': 'MA101-TUT', 'venue': 'EE-SH',
            'division': [], 'group': ['G2'], 'branch': [], 'roll': [], 'universal': False,
            'ta': 'Simran Kaur',
            'raw': 'MA101 Tutorial (TA: Simran Kaur) — rescheduled from Tue 15 Sept to Wed 16 Sept, 8-9 AM',
        },
    ],
    # Mid-Semester Examination Time Table (official workbook, dated 1 Sep 2026) — exact per-course
    # exam dates/slots for this batch, cross-checked against the workbook's own per-student
    # enrollment roster ("Master Sheet New") to get the division split right (AI101/PH101 are only
    # taken by D1/D2; CY101/CS100 only by D3/D4; MA101 by all four). Division filters mirror the
    # ones already used for these subjects' regular weekday-grid entries. Purely additive — none of
    # these share a subject code with a regular-grid entry, so nothing gets suppressed.
    '2026-09-18': [
        {
            'time': '9.30 - 11.30', 'category': 'Exam', 'subject': 'CY101-MIDSEM', 'venue': None,
            'division': ['D3', 'D4'], 'group': [], 'branch': [], 'roll': [], 'universal': False,
            'raw': 'CY101 Mid-Semester Examination — 9:30-11:30 AM, 18 Sep 2026 (official datesheet)',
        },
    ],
    '2026-09-19': [
        {
            'time': '12.30 - 2.30', 'category': 'Exam', 'subject': 'PH101-MIDSEM', 'venue': None,
            'division': ['D1', 'D2'], 'group': [], 'branch': [], 'roll': [], 'universal': False,
            'raw': 'PH101 Mid-Semester Examination — 12:30-2:30 PM, 19 Sep 2026 (official datesheet)',
        },
    ],
    '2026-09-20': [
        # IK101 is not a separate compulsory course everyone also takes — it's the 5th mutually
        # exclusive option in the same HS/IKS elective pool (confirmed by hss_iks_assignment.json,
        # which assigns exactly one of HS110/111/112/113/IK101 per student: students not placed in
        # any HSS section are the ones placed in IKS instead). All 5 share this one exam slot;
        # app2.js's buildDays filters all 5 entries down to just whichever is the viewed student's
        # own assignment (same resolution as the regular weekly session).
        {
            'time': '9.30 - 11.30', 'category': 'Exam', 'subject': 'HS110-MIDSEM', 'venue': None,
            'division': [], 'group': [], 'branch': [], 'roll': [], 'universal': True,
            'raw': 'HS110 Mid-Semester Examination — 9:30-11:30 AM, 20 Sep 2026 (official datesheet)',
        },
        {
            'time': '9.30 - 11.30', 'category': 'Exam', 'subject': 'HS111-MIDSEM', 'venue': None,
            'division': [], 'group': [], 'branch': [], 'roll': [], 'universal': True,
            'raw': 'HS111 Mid-Semester Examination — 9:30-11:30 AM, 20 Sep 2026 (official datesheet)',
        },
        {
            'time': '9.30 - 11.30', 'category': 'Exam', 'subject': 'HS112-MIDSEM', 'venue': None,
            'division': [], 'group': [], 'branch': [], 'roll': [], 'universal': True,
            'raw': 'HS112 Mid-Semester Examination — 9:30-11:30 AM, 20 Sep 2026 (official datesheet)',
        },
        {
            'time': '9.30 - 11.30', 'category': 'Exam', 'subject': 'HS113-MIDSEM', 'venue': None,
            'division': [], 'group': [], 'branch': [], 'roll': [], 'universal': True,
            'raw': 'HS113 Mid-Semester Examination — 9:30-11:30 AM, 20 Sep 2026 (official datesheet)',
        },
        {
            'time': '9.30 - 11.30', 'category': 'Exam', 'subject': 'IK101-MIDSEM', 'venue': None,
            'division': [], 'group': [], 'branch': [], 'roll': [], 'universal': True,
            'raw': 'IK101 Mid-Semester Examination — 9:30-11:30 AM, 20 Sep 2026 (official datesheet)',
        },
    ],
    '2026-09-21': [
        {
            'time': '3.30 - 5.30', 'category': 'Exam', 'subject': 'MA101-MIDSEM', 'venue': None,
            'division': [], 'group': [], 'branch': [], 'roll': [], 'universal': True,
            'raw': 'MA101 Mid-Semester Examination — 3:30-5:30 PM, 21 Sep 2026 (official datesheet)',
        },
    ],
    '2026-09-22': [
        {
            'time': '9.30 - 11.30', 'category': 'Exam', 'subject': 'AI101-MIDSEM', 'venue': None,
            'division': ['D1', 'D2'], 'group': [], 'branch': [], 'roll': [], 'universal': False,
            'raw': 'AI101 Mid-Semester Examination — 9:30-11:30 AM, 22 Sep 2026 (official datesheet)',
        },
        {
            'time': '9.30 - 11.30', 'category': 'Exam', 'subject': 'CS100-MIDSEM', 'venue': None,
            'division': ['D3', 'D4'], 'group': [], 'branch': [], 'roll': [], 'universal': False,
            'raw': 'CS100 Mid-Semester Examination — 9:30-11:30 AM, 22 Sep 2026 (official datesheet)',
        },
    ],
}
# TL101 Mid-Semester Viva dates, computed above from the sheet's own TL101-LAB roll data.
DATE_OVERRIDES.update(TL101_VIVA_OVERRIDES)

# One-off single-date cancellations of an otherwise-regular class/tutorial/elective session — NOT
# a holiday (the rest of that day's schedule still runs normally) and NOT a permanent correction
# (only THIS exact date is affected; the same subject still meets on its other usual days/weeks).
# `group`/`branch` narrow which students the cancellation applies to on that date; omitting both
# cancels it for every student who'd otherwise have that session. Matched against both the regular
# weekly timetable AND DATA.electives sessions (an elective is matched by its `code`, e.g. 'HS111',
# same as a regular entry's `subject`) — see isCancelledOn() in app3.js.
CANCELLATIONS = [
    # 2026-10-23 (Fri): no regular Physics Lab for G2 and G3 today (their Project Submission & Viva was postponed
    # to 13 Nov, and the regular lab batches didn't run either — confirmed 23 Oct). Only this date.
    {'date': '2026-10-23', 'subject': 'PH101-LAB', 'group': ['G2', 'G3']},
    # 2026-09-15 (Tue): the HS111 elective's Tuesday session (1:00-1:50 PM, everyone placed in
    # HS111) is cancelled that one day, as is MA101 Tutorial for G3 (MCB, TA Sagar Mandal,
    # 8:00-8:50 AM). G2's own MA101 Tutorial went through two corrections in a row: first said
    # cancelled, then "not cancelled" (reverted), then clarified as actually RESCHEDULED — not
    # cancelled with nothing in its place, but moved bodily to Wed 16 Sept 8-9 AM (see the matching
    # DATE_OVERRIDES['2026-09-16'] entry) — so it IS absent from its normal Tuesday slot after all.
    {'date': '2026-09-15', 'subject': 'HS111'},
    {'date': '2026-09-15', 'subject': 'MA101-TUT', 'group': ['G3']},
    {'date': '2026-09-15', 'subject': 'MA101-TUT', 'group': ['G2']},
    # Tinkering Lab (TL101) coordinator announcement: no LAB sessions on 12, 15, 16, or 17 Sept
    # 2026 (ahead of Mid-Sem exams, 18-22 Sept) — every roll-range batch that day is affected,
    # hence no group/branch restriction here. The separate Friday TL101 lecture is unaffected;
    # only the lab sessions were announced as cancelled.
    {'date': '2026-09-12', 'subject': 'TL101-LAB'},
    {'date': '2026-09-15', 'subject': 'TL101-LAB'},
    {'date': '2026-09-16', 'subject': 'TL101-LAB'},
    {'date': '2026-09-17', 'subject': 'TL101-LAB'},
    # HS113 confirmed off for every remaining session before Mid-Sem week actually locks everything
    # down (2026MCB1570, Shreya Umavane) — Wed 16/Thu 17/Fri 18 Sept, its only three
    # meeting days between now and the 19-22 Sept exam window (which is already blanket-suppressed
    # regardless). contributedBy is documentary here — CANCELLATIONS entries don't render a visible
    # item, so there's no day-scoped heart-line to attach it to (unlike LS101_SESSIONS/ELECTIVES).
    {'date': '2026-09-16', 'subject': 'HS113', 'contributedBy': '2026MCB1570'},
    {'date': '2026-09-17', 'subject': 'HS113', 'contributedBy': '2026MCB1570'},
    {'date': '2026-09-18', 'subject': 'HS113', 'contributedBy': '2026MCB1570'},
    # HS111 classroom (Sruthy C Balakrishnan, posted 22 Sept): "regular classes will resume from
    # 28-09-26 (Monday)" — HS111 meets Mon/Tue/Wed 1:00-1:50pm; Mon 21/Tue 22 are already inside the
    # blanket Mid-Sem pause (18-22 Sept), so the only day this actually removes beyond that is
    # Wednesday 23 Sept (24-27 Sept aren't HS111 meeting days at all). 28 Sept itself is the stated
    # resume date, so it needs no cancellation of its own.
    {'date': '2026-09-23', 'subject': 'HS111'},
    # PH101 (Prof. Gagan Kumar's own email, 23 Sept 2026): "on the request of the students of
    # Division-1, the classes for next week i.e. on September 28, 29 and 30 are being cancelled" —
    # D1-only (D2's own PH101, same subject code and slot, is unaffected — see the isCancelledOn()
    # division check this needed, app3.js/spectate.js).
    {'date': '2026-09-28', 'subject': 'PH101', 'division': ['D1']},
    {'date': '2026-09-29', 'subject': 'PH101', 'division': ['D1']},
    {'date': '2026-09-30', 'subject': 'PH101', 'division': ['D1']},
]

def add_override(date, entry):
    DATE_OVERRIDES.setdefault(date, []).append(entry)

# --- PH101 (D1 only): one-off extra class, 24 Sept 2026, 11:00 AM-12:00 Noon, SRC-106 — same slot
# as their regular 11:00-11:50 lecture, just extended 10 min (Prof. Gagan Kumar's email, 23 Sept
# 2026, announcing both this extra class AND the 28/29/30 Sept cancellations above in the same
# message).
add_override('2026-09-24', {
    'time': '11.00 - 12.00', 'category': 'Extra Class', 'subject': 'PH101-EXTRA', 'venue': 'SRC-106',
    'division': ['D1'], 'group': [], 'branch': [], 'roll': [], 'universal': False,
    'title': 'Physics for Engineers — Extra Class',
    'raw': 'PH101 extra class, Division-1 only, 11:00 AM-12:00 Noon, SRC-106 (Prof. Gagan Kumar email, 23 Sept 2026)',
})

# --- AI101 (D1/D2): quiz 5 Oct 2026 (Prof. Puneet Kumar's Google Classroom post) — exact time not
# given in the post; best 2 of 3 quiz scores count, and there's also an unscheduled "surprise quiz"
# before the End-Sem Test with no announced date, so that one isn't addable yet.
add_override('2026-10-05', {
    'time': 'Time not specified — check the AI101 Classroom for the exact time', 'category': 'Quiz',
    'subject': 'AI101-QUIZ', 'venue': None,
    'division': ['D1', 'D2'], 'group': [], 'branch': [], 'roll': [], 'universal': False,
    'title': 'Data Science and AI Essentials with Python — Quiz',
    'raw': 'AI101 quiz, 5 Oct 2026 (best 2 of 3 quiz scores count) — Prof. Puneet Kumar, Google Classroom',
})

# --- AI101 (D1/D2): the optional Saturday practice sessions (Concept/Doubt-Clearing 10:00-11:30 at the Auditorium,
# Hands-on Lab 11:30-1:00 at the CSE Building — Dr. Rakesh Kumar Sanodiya, announced 23 Sept) were generated for every
# Saturday through mid-November. REMOVED for everyone on 23 Oct 2026: nobody knows when they'll actually run or get
# cancelled, so none are shown (one-off announced sessions are added individually instead, like the one below).
#
# --- AI101 ONLINE class, COMPULSORY: hands-on tutorial on Linear and Logistic Regression, 11:00 AM-1:00 PM on Google Meet
# because the Auditorium is unavailable. First announced for Sat 24 Oct; then (announcement relayed 23 Oct) "a change in
# class timings due to unavailability of many students — the same online class will be held on Sunday from 11am-1pm on
# the same link": read as MOVED to Sun 25 Oct (not an extra repeat), so nothing is shown on the Saturday. "All the
# students" means everyone in AI101, which runs ONLY for D1 and D2 this semester (confirmed 23 Oct) — so D1 + D2, not
# the whole batch. No venue (it isn't a room); the join link rides on the entry and shows as a button.
add_override('2026-10-25', {
    'time': '11.00 - 11.50', 'category': 'Online Class', 'subject': 'AI101-ONLINE', 'venue': None,
    'division': ['D1', 'D2'], 'group': [], 'branch': [], 'roll': [], 'universal': False,
    'title': 'AI101 — Online class (compulsory): hands-on Linear & Logistic Regression',
    'link': 'https://meet.google.com/meet/xjy-hyrb-irm', 'linkLabel': 'Join on Google Meet',
    'raw': 'Compulsory AI101 online class (D1/D2), Sun 25 Oct 2026, 11:00 AM-1:00 PM, Google Meet (moved from Sat 24 Oct) — hands-on tutorial on Linear and Logistic Regression',
})

# --- NSS (NS101): Swachhta Hi Seva (SHS) 2026 activities, 25/27/30 Sept 2026 (NSS Faculty Adviser
# email) — scoped to NS101-enrolled students only via their real entry numbers (NSS_ENROLLED),
# not a branch/division guess, same as the NSO opt-in gating this mirrors. No end time given in the
# announcement (each activity is announced as starting "at 7:00 PM"), so the time is shown as-given
# rather than guessing a duration.
_nss_roll = roll_from_entries(NSS_ENROLLED)
add_override('2026-09-25', {
    'time': '7:00 PM onwards', 'category': 'NSS', 'subject': 'NS101-QUIZ', 'venue': 'LHC 5/6 & LHC circle',
    'division': [], 'group': [], 'branch': [], 'roll': _nss_roll, 'universal': False,
    'title': 'NSS — Swachhta Hi Seva Quiz Competition',
    'raw': 'NSS Quiz Competition, 25 Sept 2026, 7:00 PM, LHC 5/6 & LHC circle (Swachhta Hi Seva 2026)',
})
add_override('2026-09-27', {
    'time': '7:00 PM onwards', 'category': 'NSS', 'subject': 'NS101-POSTER', 'venue': 'LHC 5/6 & LHC circle',
    'division': [], 'group': [], 'branch': [], 'roll': _nss_roll, 'universal': False,
    'title': 'NSS — Swachhta Hi Seva Poster Making & Photography Competition',
    'raw': 'NSS Poster Making & Photography Competition, 27 Sept 2026, 7:00 PM, LHC 5/6 & LHC circle (Swachhta Hi Seva 2026)',
})
add_override('2026-09-30', {
    'time': '7:00 PM onwards', 'category': 'NSS', 'subject': 'NS101-DEBATE', 'venue': 'LHC 5/6 & LHC circle',
    'division': [], 'group': [], 'branch': [], 'roll': _nss_roll, 'universal': False,
    'title': 'NSS — Swachhata Evam Jal Sanchay Samvad (Debate)',
    'raw': 'NSS Debate — "Swachhata Evam Jal Sanchay Samvad", 30 Sept 2026, 7:00 PM, LHC 5/6 & LHC circle (Swachhta Hi Seva 2026)',
})

# --- HS111: two whole weekly presentation sessions (normally the Wednesday 1:00-1:50pm TA slot)
# were pulled out and moved to standalone evening sessions, on students' own request (Sruthy C
# Balakrishnan, Google Classroom posts 15 & 21 Sept). Each moved session keeps its own per-team
# 8-minute slot from the shared schedule sheet linked in those posts. Individually roll-targeted
# (not a whole-class item) since these evening sessions are ONLY for the specific students who were
# originally on the 23rd/30th Sept roster — everyone else's HS111 schedule is unaffected.
_hs111_7oct_slots = [
    ('5.00 - 5.08', ['2026CSB1188', '2026CSB1170']),
    ('5.10 - 5.18', ['2026AIB1039', '2026CHB1103']),
    ('5.20 - 5.28', ['2026ICB1440', '2026ESB1491']),
    ('5.30 - 5.38', ['2026AIB1073', '2026MCB1564']),
    ('5.40 - 5.48', ['2026ICB1435', '2026MCB1542']),
    ('5.50 - 5.58', ['2026EEB1332', '2026CEB1140']),
    ('6.00 - 6.08', ['2026CSB1262', '2026MCB1539']),
    ('6.10 - 6.18', ['2026CSB1283', '2026EEB1329']),
    ('6.20 - 6.28', ['2026CSB1195']),  # 2nd presenter (Vedansh Singla) had no register number given
    ('6.30 - 6.38', ['2026AIB1092', '2026AIB1018']),
]
for _time, _entries in _hs111_7oct_slots:
    add_override('2026-10-07', {
        'time': _time, 'category': 'Presentation', 'subject': 'HS111-PRESENT', 'venue': 'SRC-003 / SRC-004, LHC',
        'division': [], 'group': [], 'branch': [], 'roll': roll_from_entries(_entries), 'universal': False,
        'title': 'HS111 Presentation (moved from 23 Sept)',
        'raw': 'HS111 presentation, rescheduled from 23 Sept to 7 Oct 2026, ' + _time.replace('.', ':') + 'pm',
    })
_hs111_14oct_slots = [
    ('5.00 - 5.08', ['2026AIB1025', '2026AIB1028']),
    ('5.10 - 5.18', ['2026AIB1026', '2026AIB1024']),
    ('5.20 - 5.28', ['2026MCB1567', '2026MCB1530']),
    ('5.30 - 5.38', ['2026MCB1549', '2026MEB1587']),
    ('5.40 - 5.48', ['2026CSB1214', '2026CSB1204']),
    ('5.50 - 5.58', ['2026CSB1252', '2026CSB1288']),
    ('6.00 - 6.08', ['2026MMB1688', '2026MMB1667']),
    ('6.10 - 6.18', ['2026CSB1186', '2026CSB1278']),
    ('6.20 - 6.28', ['2026CSB1267', '2026CSB1246']),
    ('6.30 - 6.38', ['2026EEB1355', '2026EEB1400']),
]
for _time, _entries in _hs111_14oct_slots:
    add_override('2026-10-14', {
        'time': _time, 'category': 'Presentation', 'subject': 'HS111-PRESENT', 'venue': 'SRC-003 / SRC-004, LHC',
        'division': [], 'group': [], 'branch': [], 'roll': roll_from_entries(_entries), 'universal': False,
        'title': 'HS111 Presentation (moved from 30 Sept)',
        'raw': 'HS111 presentation, rescheduled from 30 Sept to 14 Oct 2026, ' + _time.replace('.', ':') + 'pm',
    })

# --- PH101 Lab (Department of Physics "Schedule of Major Exams", UG Lab Coordinator Dr. Danveer
# Singh; PH101 is D1/D2 only) — 3 rotating 20-student exam batches per weekday-slot, then a Project
# Submission & Viva covering that whole weekday-slot's accumulated roster. Each weekday-slot (G1-G6
# in the source, renamed here to avoid clashing with this app's own "academic group" G1-G12 concept
# — these G1-G6 are PH101-lab-only weekday-slot pools, not academic groups) keeps the same
# instructor/TA-driven room-less "Physics Laboratory" venue and weekly time window across all 4
# rounds; only the roll slice and date change each round. One entry in Exam_3/Project (2025DAB1286)
# is a prior-batch straggler with no place in this roster and is dropped, not guessed at.
# REVISED 1 Oct 2026 (Physics Lab 102 email): the Students' Activity day moved 9 Oct -> 30 Oct, so the
# Friday batches (G2 morning, G3 evening) each moved up one week from Exam 2 onward (Exam 2: 16->9
# Oct, Exam 3: 23->16 Oct, Project: 30->23 Oct); Exam 1 (8 Oct) and all other groups are unchanged.
# That revision's Project sheet also showed G2's MCB slice as 1502-1522 (21 students) — an earlier
# transcription here had only MCB1502, silently dropping MCB1503-1522 from G2's project date.
PH101_LAB_ROUNDS = {
    'PH101-LABEXAM1': {
        'title': 'Physics Lab — Exam 1', 'rounds': [
            ('2026-10-12', '2.00 - 5.00', [('EE', 1369, 1388)]),
            ('2026-10-13', '2.00 - 5.00', [('AIDE', 1001, 1020)]),
            ('2026-10-01', '9.00 - 12.00', [('EE', 1309, 1328)]),
            ('2026-10-15', '2.00 - 5.00', [('DA', 1289, 1305)]),
            ('2026-10-08', '9.00 - 12.00', [('AIDE', 1061, 1080)]),
            ('2026-10-08', '2.00 - 5.00', [('MCB', 1523, 1543)]),
        ],
    },
    'PH101-LABEXAM2': {
        'title': 'Physics Lab — Exam 2', 'rounds': [
            ('2026-10-19', '2.00 - 5.00', [('EE', 1389, 1408)]),
            ('2026-10-21', '2.00 - 5.00', [('AIDE', 1021, 1040)]),
            ('2026-10-15', '9.00 - 12.00', [('EE', 1329, 1348)]),
            ('2026-10-22', '2.00 - 5.00', [('DA', 1306, 1308), ('ES', 1472, 1485)]),
            ('2026-10-09', '9.00 - 12.00', [('AIDE', 1081, 1099), ('MCB', 1502, 1502)]),
            ('2026-10-09', '2.00 - 5.00', [('MCB', 1544, 1563)]),
        ],
    },
    'PH101-LABEXAM3': {
        'title': 'Physics Lab — Exam 3', 'rounds': [
            ('2026-10-26', '2.00 - 5.00', [('EE', 1409, 1427), ('EE', 1695, 1695)]),
            ('2026-10-27', '2.00 - 5.00', [('AIDE', 1041, 1060)]),
            ('2026-10-22', '9.00 - 12.00', [('EE', 1349, 1368)]),
            ('2026-10-29', '2.00 - 5.00', [('ES', 1486, 1501)]),  # + 2025DAB1286, dropped (see above)
            ('2026-10-16', '9.00 - 12.00', [('MCB', 1503, 1522)]),
            ('2026-10-16', '2.00 - 5.00', [('MCB', 1564, 1581), ('MCB', 1696, 1697)]),
        ],
    },
    'PH101-LABPROJECT': {
        'title': 'Physics Lab — Project Submission & Viva', 'rounds': [
            ('2026-11-02', '2.00 - 5.00', [('EE', 1369, 1427), ('EE', 1695, 1695)]),
            ('2026-11-03', '2.00 - 5.00', [('AIDE', 1001, 1060)]),
            ('2026-10-29', '9.00 - 12.00', [('EE', 1309, 1368)]),
            ('2026-11-05', '2.00 - 5.00', [('DA', 1289, 1308), ('ES', 1472, 1501)]),  # + 2025DAB1286, dropped
            # G2 (AIDE 1061-1099 + MCB 1502-1522) and G3 (MCB 1523-1581, 1696-1697): postponed from Fri 23 Oct to
            # Fri 13 Nov 2026 (relayed 23 Oct), same two time slots.
            ('2026-11-13', '9.00 - 12.00', [('AIDE', 1061, 1099), ('MCB', 1502, 1522)]),
            ('2026-11-13', '2.00 - 5.00', [('MCB', 1523, 1581), ('MCB', 1696, 1697)]),
        ],
    },
}
for _subject, _spec in PH101_LAB_ROUNDS.items():
    for _date, _time, _ranges in _spec['rounds']:
        _roll = [{'type': 'range', 'branch': _br, 'lo': _lo, 'hi': _hi} for _br, _lo, _hi in _ranges]
        add_override(_date, {
            'time': _time, 'category': 'Lab Exam' if _subject != 'PH101-LABPROJECT' else 'Project',
            'subject': _subject, 'venue': 'Physics Laboratory',
            'division': [], 'group': [], 'branch': [], 'roll': _roll, 'universal': False,
            'title': _spec['title'],
            'raw': _spec['title'] + ', ' + _date + ', ' + _time + ' (Dept. of Physics, UG Lab Coordinator Dr. Danveer Singh)',
        })

# --- PH101 Mid-Sem answer-sheet viewing for G2 (AIDE + MnC), Fri 9 Oct 2026, 3:00-4:00 PM, Lab A-237
# (SMAL Lab, Dept. of Physics) — arranged by email with Anshika Rana (research scholar) after the G2
# Branch Rep polled the group; she confirmed 9 Oct, 7 Oct 2026. G2 is academic group G2 (D1 only —
# D3/D4 groups are G7-G12, so the bare group label can't collide with another branch's here).
add_override('2026-10-09', {
    'time': '3.00 - 4.00', 'category': 'Review', 'subject': 'PH101-REVIEW', 'venue': 'Lab A-237',
    'division': [], 'group': ['G2'], 'branch': [], 'roll': [], 'universal': False,
    'title': 'PH101 Mid-Sem Answer Sheets — viewing (G2, with Anshika Rana)',
    'raw': 'PH101 Mid-Sem answer sheet viewing for G2 (AIDE & MnC), Fri 9 Oct 2026, 3:00-4:00 PM, Lab A-237, SMAL Lab, Dept. of Physics',
})

# --- D1 G2's two Thursdays (relayed 7 Oct 2026 by the G2 Branch Rep from the class group): Thu 8 Oct
# gets the MA101 Tutorial at 8:00 AM (before that day's PH101 Lab Exam 1 at 9:00 AM — "PH102-LE1" in the
# source message, the user's own name for the Physics Lab — which was already encoded above), and Thu
# 15 Oct runs MA101 Tutorial 8:00, MA101 class 10:00, PH101 class 11:00 (+ Tinkering Lab, which already
# shows via the regular per-roll TL101-LAB split). Normally G2 only has these Mon-Wed, so these are
# one-off additions. Room/TA for the tutorial and the lecture venues are NOT stated in the message — G2's
# usual ones are reused (tutorial EE-SH / Simran Kaur, lectures the D1 lecture rooms); correct directly
# if they turn out different.
_g2_tut = next(e for e in timetable['Tuesday'] if e['subject'] == 'MA101-TUT' and e['group'] == ['G2'])
_d1_ma = next(e for e in timetable['Tuesday'] if e['subject'] == 'MA101' and e['division'] == ['D1'])
_d1_ph = next(e for e in timetable['Tuesday'] if e['subject'] == 'PH101' and e['division'] == ['D1'])
def _g2_extra(subject, category, time, venue, raw, ta=None):
    e = {'time': time, 'category': category, 'subject': subject, 'venue': venue,
         'division': [], 'group': ['G2'], 'branch': [], 'roll': [], 'universal': False, 'raw': raw}
    if ta: e['ta'] = ta
    return e
add_override('2026-10-08', _g2_extra('MA101-TUT', _g2_tut['category'], '8.00 - 8.50', _g2_tut['venue'],
    'MA101 Tutorial for G2 on Thu 8 Oct 2026, 8:00 AM (before PH101 Lab Exam 1 at 9:00)', ta=_g2_tut.get('ta')))
add_override('2026-10-15', _g2_extra('MA101-TUT', _g2_tut['category'], '8.00 - 8.50', _g2_tut['venue'],
    'MA101 Tutorial for G2 on Thu 15 Oct 2026, 8:00 AM', ta=_g2_tut.get('ta')))
add_override('2026-10-15', _g2_extra('MA101', _d1_ma['category'], '10.00 - 10.50', _d1_ma['venue'],
    'MA101 class for G2 on Thu 15 Oct 2026, 10:00 AM'))
add_override('2026-10-15', _g2_extra('PH101', _d1_ph['category'], '11.00 - 11.50', _d1_ph['venue'],
    'PH101 class for G2 on Thu 15 Oct 2026, 11:00 AM'))

print('confident timetable entries:', total_confident)

BRANCH_NAMES = {
    'AIDE': 'Artificial Intelligence and Data Engineering',
    'CSE': 'Computer Science and Engineering',
    'EE': 'Electrical Engineering',
    'EP': 'Engineering Physics',
    'ES': 'Engineering Science',
    'DA': 'Digital Agriculture',
    'CH': 'Chemical Engineering',
    'CE': 'Civil Engineering',
    'ME': 'Mechanical Engineering',
    'MME': 'Metallurgical and Materials Engineering',
    'MCB': 'Mathematics and Computing',
    'ICDT': 'Electrical Engineering (Integrated Circuit Design and Technology)',
}

# Verified against 'Divisions of 2026 Batch for TT' sheet (COURSES FOR 1ST SEM OF AY 2026-27 column)
# and cross-checked against IIT Ropar's official "Handbook of Information AY 2025-26".
#
# MA201/EE201/GE104 were REMOVED here on purpose: the earlier 21.07.26 consolidated workbook had
# them tagged (D1)/(D2)/(D3)/(D4), and web-verified names (MA201 Differential Equations, EE201
# Signals and Systems, GE104 Intro to Electrical Eng) genuinely exist in IIT Ropar's curriculum —
# but the institute's own later "SEE Time Table ... Semester -1st.xlsx" (Academic Section, 3 Aug
# 2026), which is an *official per-student extraction* of the same consolidated timetable, has all
# 30 of those division-tagged MA201/EE201/GE104 cells blanked out. Since that extraction is newer,
# more authoritative, and purpose-built for exactly this question, we defer to it: these three
# courses are treated as NOT part of the 2026 batch's semester 1 and excluded from parsing entirely
# (see extract_timetable.py / see_tt_dump.txt for the source cells).
COURSE_NAMES = {
    'PH101': 'Physics for Engineers',
    'AI101': 'Data Science and AI Essentials with Python',
    'CY101': 'Chemistry for Engineers',
    # Was missing entirely before this pass (regular MA101 classes fell back to showing the bare
    # "MA101" code as the title, with no colored code badge) — added while wiring up the MA101
    # mid-sem exam entry, whose display name goes through this same lookup. Official title per the
    # Master Sheet New enrollment roster.
    'MA101': 'Calculus',
    # Official registrar title (Master Sheet New, Sep 2026 Mid-Sem workbook) — see the GE103->CS100
    # rename note above; this used to be listed under 'GE103' with a slightly different title.
    'CS100': 'Introduction to Computing and Data Structures',
    'TL101': 'Tinkering Lab',
    'WP101': 'Workshop Practice',
    # Titles duplicated from ELECTIVES below (rather than looked up from there) so that one-off
    # DATE_OVERRIDES entries for these courses — e.g. the mid-sem exam entries — can resolve a
    # display name through the same courseName() lookup as every other subject code.
    'HS110': 'Speak, Think, Pitch: English Communication through Stories, Films and Ideas',
    'HS111': 'English Communication and Personality Development',
    'HS112': 'Professional Communication',
    'HS113': 'Self, Society & Technology',
    'IK101': 'Indian Knowledge Systems: Insights for Modern Science and Living',
    'NO101': 'NSO — National Sports Organisation',
    'LS101': 'Life Skills',
}

# HS/IKS electives: which section a student is in is a personal enrollment choice that cannot be
# derived from the timetable (all sections are untagged, parallel offerings at the same slot), so
# these are shown as pickable options in Settings rather than auto-matched.
# SUPERSEDED 4 Aug 2026 by the Academic Section's "Re-scheduling of HSS/IKS lectures of B.Tech
# 2026" email — all 5 electives now share one dedicated slot, 1:00-1:50 PM (carved out of what
# was previously open lunch time, not one of the regular 11 lecture periods), on the days/rooms
# below. This replaces the noon/2pm/5pm timings originally read off the 3 Aug consolidated sheet.
ELECTIVES = [
    {
        'code': 'IK101',
        'title': 'Indian Knowledge Systems: Insights for Modern Science and Living',
        'instructor': None,
        # Corrected by 2026MCB1521 (Bhaswat Das, himself in the IKS section): the real days are
        # Wed/Thu/Fri, not Mon/Tue/Wed as originally sheet-extracted — same time/venue otherwise,
        # only the days were wrong.
        'contributedBy': '2026MCB1521',
        'sessions': [
            {'day': 'Wednesday', 'time': '1.00 - 1.50', 'venue': 'SRC-004'},
            {'day': 'Thursday', 'time': '1.00 - 1.50', 'venue': 'SRC-004'},
            {'day': 'Friday', 'time': '1.00 - 1.50', 'venue': 'SRC-004'},
        ],
    },
    {
        'code': 'HS110',
        'title': 'Speak, Think, Pitch: English Communication through Stories, Films and Ideas',
        'instructor': 'Dibya Ray',
        'sessions': [
            {'day': 'Monday', 'time': '1.00 - 1.50', 'venue': 'Auditorium'},
            {'day': 'Tuesday', 'time': '1.00 - 1.50', 'venue': 'Auditorium'},
            {'day': 'Wednesday', 'time': '1.00 - 1.50', 'venue': 'Auditorium'},
        ],
    },
    {
        'code': 'HS111',
        'title': 'English Communication and Personality Development',
        'instructor': 'Aparna N.',
        'sessions': [
            {'day': 'Monday', 'time': '1.00 - 1.50', 'venue': 'SRC-005'},
            {'day': 'Tuesday', 'time': '1.00 - 1.50', 'venue': 'SRC-005'},
            # Wed is a TA session (per Aneesh's follow-up), split into two rooms by home branch —
            # branch->room counts given directly (AIB 33, MCB 15, MEB 18, ESB 7, EPB 3, CHB 5,
            # ICB 4 -> M3/SRC-003; EEB 30, CSB 37, MMB 10, CEB 8 -> M4/SRC-004). DA wasn't listed
            # in either group, so DA students fall back to seeing both rooms.
            {
                'day': 'Wednesday', 'time': '1.00 - 1.50',
                'venue': 'SRC-003 (TA Group 1) or SRC-004 (TA Group 2), LHC',
                'venueByBranch': {
                    'AIDE': 'SRC-003 (TA Group 1), LHC', 'MCB': 'SRC-003 (TA Group 1), LHC',
                    'ME': 'SRC-003 (TA Group 1), LHC', 'ES': 'SRC-003 (TA Group 1), LHC',
                    'EP': 'SRC-003 (TA Group 1), LHC', 'CH': 'SRC-003 (TA Group 1), LHC',
                    'ICDT': 'SRC-003 (TA Group 1), LHC',
                    'EE': 'SRC-004 (TA Group 2), LHC', 'CSE': 'SRC-004 (TA Group 2), LHC',
                    'MME': 'SRC-004 (TA Group 2), LHC', 'CE': 'SRC-004 (TA Group 2), LHC',
                },
            },
        ],
    },
    {
        'code': 'HS112',
        'title': 'Professional Communication',
        'instructor': None,
        'sessions': [
            {'day': 'Wednesday', 'time': '1.00 - 1.50', 'venue': 'SRC-107'},
            {'day': 'Thursday', 'time': '1.00 - 1.50', 'venue': 'SRC-107'},
            {'day': 'Friday', 'time': '1.00 - 1.50', 'venue': 'SRC-107'},
        ],
    },
    {
        'code': 'HS113',
        'title': 'Self, Society & Technology',
        'instructor': 'Amritesh',
        'sessions': [
            {'day': 'Wednesday', 'time': '1.00 - 1.50', 'venue': 'SENATE HALL'},
            {'day': 'Thursday', 'time': '1.00 - 1.50', 'venue': 'SENATE HALL'},
            {'day': 'Friday', 'time': '1.00 - 1.50', 'venue': 'SENATE HALL'},
        ],
    },
]

# Institute-wide "Academic Calendar August 2026 to September 2026 for B.Tech ... 2026 Batch" (freshers-
# specific) + "Academic Calendar January 2026 to December 2026 for UG/PG/PhD (continuing batch)" (general,
# 1st-semester-of-AY-2026-27 column) — used to extend the app's date range past the orientation period
# and to know which days are holidays, exam weeks, or run on a substituted weekday's timetable.
CALENDAR = {
    'rangeStart': '2026-07-27',
    # The day strip's own range extends well past the semester to fit personal courses (CS229,
    # CS50) that keep running after classes end — 'classesEnd' below is what actually gates the
    # regular class timetable, independent of this.
    'rangeEnd': '2027-03-31',
    'classesStart': '2026-08-03',
    'classesEnd': '2026-11-13',      # last day of official classes; regular timetable stops here
    # Cross-checked against the Institute's official gazetted-holiday notification for calendar
    # year 2026 (F.No. 13(44)/2014/IITRPR/596, dated 2 Sep 2025) — the 17-item compulsory list, not
    # the separate 34-item "restricted holidays" list (those are optional staff leave, not
    # campus-wide closures, so they don't apply to students and aren't added here). That notice
    # also corrected Aug 26: it's officially "Milad-un-Nabi / Id-e-Milad" (the Prophet's birthday),
    # not "Eid" (Eid-ul-Fitr/Eid-ul-Adha, both of which fall before this batch's term even starts) —
    # a very common colloquial mislabel, kept in the text parenthetically since that's likely how
    # the original source that fed this entry described it.
    'holidays': {
        '2026-08-06': 'Convocation — no classes',
        '2026-08-15': "Independence Day — no classes",
        '2026-08-26': 'Milad-un-Nabi / Id-e-Milad (Eid) — no classes',
        '2026-09-04': 'Janmashtami — no classes',
        '2026-09-14': 'Ganesh Chaturthi / Vinayak Chaturthi — no classes',
        '2026-10-02': "Mahatma Gandhi's Birthday — no classes",
        # Moved from 9 Oct to 30 Oct (Physics Lab 102 email, 1 Oct 2026, relaying the Academic
        # Section's change) — 9 Oct is now a normal class day again.
        '2026-10-30': 'Student Activity Day (moved from 9 Oct) — no classes',
        '2026-10-20': 'Dussehra (Vijay Dashmi) — no classes',
        '2026-11-08': 'Diwali — no classes',
        '2026-11-24': "Guru Nanak's Birthday — no classes",
        '2026-12-25': 'Christmas Day — no classes',
    },
    'noClassDays': {
        '2026-09-22': 'Mid-Semester Project Evaluation — no class day',
    },
    # date -> which weekday's timetable/electives to use instead of the date's own weekday.
    # These five Saturday swaps are confirmed in BOTH the 2026-batch-specific calendar image and
    # the fuller institute-wide TT-full.pdf — high confidence, applied unconditionally.
    'followsWeekday': {
        '2026-08-08': 'Monday',     # Saturday runs Monday's timetable
        '2026-08-22': 'Wednesday',  # Saturday runs Wednesday's timetable
        '2026-08-29': 'Thursday',   # Saturday runs Thursday's timetable
        '2026-09-05': 'Friday',     # Saturday runs Friday's timetable
        '2026-09-12': 'Friday',     # Saturday runs Friday's timetable
        # October swaps — confirmed by the Institute's own published Academic Calendar (iitrpr.ac.in,
        # "Final Academic Calendar_For website.pdf", 1st-semester-of-AY-2026-27 notes: "October 08
        # (Thursday) work as per Friday Timetable", "October 21 (Wednesday) work as per Tuesday
        # Timetable"), and independently by the 2026-batch PH101 lab sheet putting the Friday G2/G3
        # batches' Exam 1 on 08/10. That calendar predates the Students' Activity Day move (9 -> 30
        # Oct) but the Physics Lab notice says the rest of the schedule is unchanged. Previously
        # skipped (see the TT-full.pdf note below) only because no October source existed yet.
        '2026-10-08': 'Friday',     # Thursday runs Friday's timetable
        '2026-10-21': 'Tuesday',    # Wednesday runs Tuesday's timetable (day after Dussehra, 20 Oct)
    },
    # TT-full.pdf (a continuing-batch calendar) additionally claimed Aug 13 (Thu->Wed), Oct 8
    # (Thu->Fri) and Oct 21 (Wed->Tue) swaps, and a mid-sem exam start of Tue 15 Sep. The
    # batch-specific "SuperFinal ... 2026 Batch" academic calendar PDF (downloaded 15 Aug 2026,
    # explicitly named as the definitive version) both (a) confirms the exam start is Fri 18 Sep,
    # directly contradicting TT-full.pdf, and (b) lists exactly six numbered exceptions for Aug-Sep
    # with no mention of Aug 13 despite covering that date. That's since undermined TT-full.pdf's
    # credibility for this batch on both counts, so none of its four "1st semester" claims are
    # trusted anymore: Aug 13 is treated as a normal Thursday, and Oct 8/Oct 21 (outside
    # SuperFinal's Aug-Sep coverage, so neither confirmed nor denied by it) default to their normal
    # weekdays too rather than asserting an unconfirmed swap. Revisit if a SuperFinal-equivalent
    # calendar covering October surfaces.
    'ambiguousWeekday': {},
    'examWeeks': [
        # Both endpoints now confirmed by the official Mid-Semester Examination Time Table (workbook
        # dated 1 Sep 2026): this batch's own courses are examined CY101 18 Sep through AI101/CS100
        # 22 Sep — end date extended from 21 to 22 Sep accordingly (see DATE_OVERRIDES below for the
        # exact per-course dates/slots).
        {'start': '2026-09-18', 'end': '2026-09-22', 'label': 'Mid-Semester Examinations'},
        # Not confirmed by a 2026-batch-specific source (unlike the mid-sem dates) — only seen in
        # TT-full.pdf's continuing-batch calendar, which has already been wrong twice for this
        # batch. Used only as a conservative placeholder to keep CS50 sessions clear of it; verify
        # against the real End-Semester Examination notice once published.
        {'start': '2026-11-16', 'end': '2026-11-26', 'label': 'End-Semester Examinations (estimated)'},
    ],
    'examStartDisputed': {},
}

# Personal, student-specific self-study courses — not part of the official IIT Ropar curriculum.
# `weekdays` + `startDate` + `totalLectures` define the recurring pattern; the app (see app2.js's
# computePersonalCourseDates) walks forward from startDate picking dates whose weekday matches AND
# which don't appear in CALENDAR.followsWeekday (i.e. "that follow no other day timetable"), until
# totalLectures dates are collected. `students` is an explicit entry-number allowlist.
PERSONAL_COURSES = []

# Multi-session-per-week personal courses (e.g. CS50, which needs a lecture slot AND a separate
# problem-set/lab work slot, unlike CS229's single weekly lecture). `sessions` defines each weekly
# slot (weekday + time + duration); the app (see app2.js's computeWeeklyCourseWeeks) walks forward
# `totalWeeks` times, and for each week picks the next occurrence of every session's weekday in
# order (lecture before pset, etc) — if ANY session in a week would land inside a `pauseRanges`
# window (kept clear of IIT Ropar's own exams), the WHOLE week (all its sessions together) is
# pushed to start after the pause, rather than shifting sessions independently and risking two
# different weeks' sessions colliding on the same date.
#
# CS50 specifics (researched from https://cs50.harvard.edu/x/weeks/ and the course FAQ, 24 Aug
# 2026): 11 weeks of content (Scratch, C, Arrays, Algorithms, Memory, Data Structures, Python,
# SQL, HTML/CSS/JS, Flask, Final Project). CS50 itself estimates 10-20 hours/week of problem-set
# work alone (not counting lecture time) — the two weekly slots below are just anchor/checkpoint
# blocks, not the whole time commitment; expect real pset work to spill beyond them, which is
# exactly what the per-course "shift forward" button (ROLES-adjacent skip mechanism in app2.js) is
# for. The free CS50 Certificate has no restriction on being enrolled as a student elsewhere and
# requires >=70% on all psets/labs/the final project; work also explicitly carries over between
# yearly OCW cohorts (2025 work counted toward 2026), so the nominal 31 Dec 2026 deadline for this
# year's cohort is not a hard cutoff if it runs long.
# Superseded by SEQUENTIAL_COURSES below (CS50 migrated there so it shares one robust, checkbox-
# driven progress engine with CS229, instead of two different scheduling mechanisms). Left empty,
# not removed, so app2.js's dormant weeklyCourses code path stays harmless if ever reused later.
WEEKLY_COURSES = []

# Sequential-queue personal courses: an explicit, ORDERED list of content items (each tagged with
# which weekday it wants) consumed in order as matching weekdays come up — unlike weeklyCourses'
# fixed N-sessions-every-week pattern, item frequency here can vary (CS229 has 2 lectures/week but
# a pset only every ~4 lectures), which a fixed weekly template can't express. The app (see
# app2.js's computeSequentialCourseSchedule) walks forward day by day; whenever a day's weekday
# matches what the NEXT unconsumed item wants (and isn't inside a pauseRange), that item is
# assigned to that date and the queue advances — otherwise it just keeps walking.
#
# CS229 = the Kaizen roadmap (Endeavours/CS229/ROADMAP.html, the user's self-paced ML plan, replacing the original
# 20-lecture Stanford Autumn 2018 queue on 2026-10-15). build/extract_kaizen.py snapshots its ML track (U01..U16) into
# build/kaizen_ml_plan.json; the DSA track is never published and is fetched live from the Kaizen app instead. Unlike
# the weekday queue CS50 uses, a `kaizen` course is scheduled by time (app3.js, kaizenPlanner): each day, after
# any self-study time (a Settings option for every student, app3.js selfStudyBlocks), pending tasks fill the day's free time (classes, meals and the
# midnight bedtime respected) up to `dailyMin`, split across days by Kaizen's own hour estimates; an unticked task
# simply rolls forward. Ticks are the roadmap's own (shared with Kaizen through its local server and with the
# website copy at /ml through localStorage), not a prefix count.
KAIZEN_LINK_BASE = '/ml/'
def _kaizen_link(url):
    if _re.match(r'https?:', url):
        return url
    path, _, anchor = url.partition('#')
    if path.endswith('/'):
        path = path.rstrip('/') + '.zip'          # build_site.py publishes linked folders as zips
    return KAIZEN_LINK_BASE + path + ('#' + anchor if anchor else '')
CS229_ITEMS = [{
    'code': t['code'], 'title': t['title'], 'unit': t['unit'], 'hours': t['hours'],
    'link': _kaizen_link(t['links'][0][1]) if t['links'] else None,
} for t in json.load(open('build/kaizen_ml_plan.json'))]

# CS50x — migrated to the same sequential-queue engine as CS229 (see app2.js's
# computeSequentialCourseSchedule) so both share one robust, checkbox-driven progress model
# instead of two different mechanisms. 11 weeks x 2 items (Lecture+Shorts on Sunday 10am,
# Problem Set/Lab on Tuesday 8pm), URLs confirmed working (25 Aug 2026):
# https://cs50.harvard.edu/x/2026/weeks/N/ and .../psets/N/ (N = 0..10, CS50's own numbering).
CS50_TOPICS = [
    'Scratch', 'C', 'Arrays', 'Algorithms', 'Memory', 'Data Structures', 'Python',
    'SQL', 'HTML, CSS & JavaScript', 'Flask', 'Final Project',
]
CS50_ITEMS = []
for _wk, _topic in enumerate(CS50_TOPICS):
    CS50_ITEMS.append({
        'itemType': 'lecture', 'weekday': 'Sunday', 'startTime': '10:00', 'durationMin': 120,
        'title': 'CS50 Week {}: {} — Lecture + Shorts'.format(_wk, _topic),
        'link': 'https://cs50.harvard.edu/x/2026/weeks/{}/'.format(_wk),
    })
    CS50_ITEMS.append({
        'itemType': 'pset', 'weekday': 'Tuesday', 'startTime': '20:00', 'durationMin': 120,
        'title': 'CS50 Week {}: {} — Problem Set'.format(_wk, _topic),
        'link': 'https://cs50.harvard.edu/x/2026/psets/{}/'.format(_wk),
    })

SEQUENTIAL_COURSES = [
    {
        'code': 'CS229',
        'kaizen': True,
        'title': 'Kaizen — ML roadmap',
        'students': ['2026AIB1099'],
        'items': CS229_ITEMS,
        'dailyMin': 120,        # ML track per day (editable in Settings)
        'dsaDailyMin': 45,      # DSA track per day when its switch is on (Kaizen's own guide: 45-60 min)
        'pauseRanges': [{'start': '2026-11-16', 'end': '2026-11-26'}],  # End-Sem: Kaizen pauses, self-study stays
        'category': 'Personal',
    },
    {
        'code': 'CS50',
        'title': 'CS50x — Intro to Computer Science (Harvard)',
        'students': ['2026AIB1099'],
        # No fixed startDate: this course only begins once CS229 (see 'startsAfter') actually
        # finishes, wherever that ends up being — if CS229 runs long, CS50 starts later too,
        # computed dynamically in app2.js rather than hardcoded here at build time.
        'startsAfter': 'CS229',
        'startTime': '14:00',
        'items': CS50_ITEMS,
        # Paused during both exam windows — no classes (or personal coursework) run during
        # Mid-Sem either, same policy as the institute's own weekly timetable grid.
        'pauseRanges': [{'start': '2026-09-18', 'end': '2026-09-22'}, {'start': '2026-11-16', 'end': '2026-11-26'}],
        'category': 'Personal',
    },
]

# Student contribution credit is tracked PER DATA ENTRY, not per branch/division/group — a single
# student's schedule is built from many independent entries (a lab schedule here, a venue there,
# a tutorial slot elsewhere), and each could have come from a different contributor. To credit one,
# add `'contributedBy': '<entry number>'` directly to that specific entry's dict — in `timetable`
# (regular weekday grid) or `DATE_OVERRIDES` (one-off dates) — wherever it's manually added or
# corrected, exactly like the PH101_LAB / MA101_TUT / DATE_OVERRIDES entries above already are.
# "First to share gets the credit" is enforced by process, not code: only add the tag when
# integrating data for something not already covered by an earlier contributor's tagged entry —
# if a later student sends in the same/overlapping data, don't retag or duplicate it.
# The app (see app2.js's contributorsForStudent) scans every entry that actually applies to a
# given student, collects the unique contributedBy names across all of them, and shows them once
# at the top of the page — so a student can see a mix of several contributors' names if their own
# schedule happens to draw from more than one. Add the contributor's entry number to
# ROLES.contributor in index_template2.html too, so they get the badge.

# Temporary venue relocations (Academic Section notice, 11 Sep 2026 — furniture installation in the
# new Lecture Hall Complex): applied by the app to ANY item whose venue matches `from`, regardless
# of which course/entry it came from (class, HS/IKS elective, date override) — the notice affects
# rooms, not specific subjects. `validTo: None` means open-ended ("until further instructions").
VENUE_RELOCATIONS = [
    {
        'from': 'SENATE HALL', 'to': 'SRC-106', 'validFrom': '2026-09-11', 'validTo': None,
        'note': 'Furniture installation in the new Lecture Hall Complex — Academic Section notice, 11 Sep 2026.',
    },
    {
        'from': 'SRC-107', 'to': 'SENATE HALL', 'validFrom': '2026-09-12', 'validTo': '2026-09-17',
        'note': 'Temporary swap while Senate Hall furniture work continues — resumes in SRC-107 after Mid-Sem exams (Academic Section notice, 11 Sep 2026).',
    },
]

# SRC-106 didn't exist in the original venue legend (never used until the relocation above).
legend['SRC106'] = {'code': 'SRC-106', 'desc': 'S. RadhaKrishnan Complex (LHC) — First Floor classroom', 'alias': None}

# Self-study room openings (source: Academics Secretary (UG) email, 1 Sep 2026, "Opening of
# lecture and seminar halls for self study purposes") — three rooms opened for study outside their
# lecture slots, effective 7 PM on 1 Sep through 22 Sep 2026, "subject to availability" (a lecture
# running in the room takes priority even during a listed open window).
# Each range is {start, end, endsNextDay} in 24h HH:MM — endsNextDay lets an overnight window (e.g.
# EE-SH's nightly 7pm-7am) or a same-day window that runs to midnight (encoded as end:'00:00',
# endsNextDay:true, since that's the same instant as '24:00' today) cross the date boundary cleanly
# — the app expands these into real open/close timestamps to show live status.
SELF_STUDY = {
    'validFrom': '2026-09-01',
    'validFromTime': '19:00',  # the email specifies opening starts 7 PM the first day specifically
    'validTo': '2026-09-22',
    'sourceNote': "Academics Secretary (UG) email, 1 Sep 2026 — rooms open for self-study \"subject to availability\"; a scheduled lecture in the room takes priority even during a listed window.",
    'rooms': [
        {
            'code': 'EE-2', 'name': 'EE-2',
            'schedule': {
                'Monday':    [{'start':'00:00','end':'08:50'}, {'start':'11:00','end':'15:50'}, {'start':'17:00','end':'00:00','endsNextDay':True}],
                'Tuesday':   [{'start':'00:00','end':'08:50'}, {'start':'11:00','end':'13:50'}, {'start':'15:00','end':'15:50'}, {'start':'17:00','end':'00:00','endsNextDay':True}],
                'Wednesday': [{'start':'00:00','end':'08:50'}, {'start':'11:00','end':'11:50'}, {'start':'13:00','end':'00:00','endsNextDay':True}],
                'Thursday':  [{'start':'00:00','end':'10:50'}, {'start':'12:00','end':'00:00','endsNextDay':True}],
                'Friday':    [{'start':'00:00','end':'16:50'}, {'start':'19:00','end':'00:00','endsNextDay':True}],
                'Saturday':  [{'start':'00:00','end':'00:00','endsNextDay':True}],
                'Sunday':    [{'start':'00:00','end':'00:00','endsNextDay':True}],
            },
        },
        {
            'code': 'CS-2', 'name': 'CS-2',
            'schedule': {
                'Monday':    [{'start':'00:00','end':'09:50'}, {'start':'11:00','end':'11:50'}, {'start':'13:00','end':'15:50'}, {'start':'17:00','end':'00:00','endsNextDay':True}],
                'Tuesday':   [{'start':'00:00','end':'09:50'}, {'start':'11:00','end':'11:50'}, {'start':'13:00','end':'13:50'}, {'start':'15:00','end':'15:50'}, {'start':'17:00','end':'00:00','endsNextDay':True}],
                'Wednesday': [{'start':'00:00','end':'09:50'}, {'start':'11:00','end':'11:50'}, {'start':'13:00','end':'00:00','endsNextDay':True}],
                'Thursday':  [{'start':'00:00','end':'10:50'}, {'start':'12:00','end':'00:00','endsNextDay':True}],
                'Friday':    [{'start':'00:00','end':'10:50'}, {'start':'12:00','end':'00:00','endsNextDay':True}],
                'Saturday':  [{'start':'00:00','end':'00:00','endsNextDay':True}],
                'Sunday':    [{'start':'00:00','end':'00:00','endsNextDay':True}],
            },
        },
        {
            'code': 'EE-SH', 'name': 'EE Seminar Hall',
            'schedule': {
                'Monday':    [{'start':'19:00','end':'07:00','endsNextDay':True}],
                'Tuesday':   [{'start':'19:00','end':'07:00','endsNextDay':True}],
                'Wednesday': [{'start':'19:00','end':'07:00','endsNextDay':True}],
                'Thursday':  [{'start':'19:00','end':'07:00','endsNextDay':True}],
                'Friday':    [{'start':'19:00','end':'07:00','endsNextDay':True}],
                'Saturday':  [{'start':'00:00','end':'00:00','endsNextDay':True}],
                'Sunday':    [{'start':'00:00','end':'00:00','endsNextDay':True}],
            },
        },
    ],
}

# Branch-wide (or branch+group) "schedule verified" stamps — a DIFFERENT, coarser mechanism from
# `contributedBy` above: that one credits a specific data entry to whoever actually supplied it;
# this one is a blanket "a real student from your branch has checked this schedule and confirmed
# it's right" badge, shown to EVERY student in the matching branch/group regardless of which day
# they're looking at (see verifierForStudent() in app3.js — persistent per-student, not day-scoped,
# unlike the contributedBy attribution line). Every contributor who has shared data effectively
# verified their own branch/group by cross-checking it against their real schedule, so they're
# listed here too, not just first-time-pure-verifiers like 2026DAB1308. Entries with no `group` key
# cover the WHOLE branch; MCB is split since its two groups were checked by two different people at
# different times (G2 by the creator, G3 later by its own BR 2026MCB1546).
SCHEDULE_VERIFICATIONS = [
    # Verification and data-sharing are separate people here: 2026EEB1369 (Kshitiz) shared the
    # actual schedule data (PH101/MA101 tutorial venues, Life Skills timing — see contributedBy
    # tags above), but 2026EEB1330 (Avishi Sood, a G5 BR) is the one who verified the schedule.
    {'branch': 'EE', 'verifiedBy': '2026EEB1330'},
    {'branch': 'CE', 'verifiedBy': '2026CEB1162'},
    {'branch': 'CH', 'verifiedBy': '2026CHB1125'},
    {'branch': 'CSE', 'verifiedBy': '2026CSB1269'},
    {'branch': 'ES', 'verifiedBy': '2026ESB1499'},
    {'branch': 'EP', 'verifiedBy': '2026EPB1468'},
    {'branch': 'DA', 'verifiedBy': '2026DAB1308'},
    {'branch': 'AIDE', 'verifiedBy': '2026AIB1099'},
    {'branch': 'MCB', 'group': 'G2', 'verifiedBy': '2026AIB1099'},
    # G3's own Branch Representative (see BATCH_REPS below) — closes the MCB coverage gap.
    {'branch': 'MCB', 'group': 'G3', 'verifiedBy': '2026MCB1546'},
    # Whole ME branch (both G10 and G11) — 2026MEB1647 is a Branch Representative for both groups,
    # not just his own G11, so his G10 data counts as directly confirmed rather than hearsay.
    {'branch': 'ME', 'verifiedBy': '2026MEB1647'},
    # MME's first-ever contributor/verifier — its own Branch Representative.
    {'branch': 'MME', 'verifiedBy': '2026MMB1686'},
    # ICDT's first-ever contributor/verifier — its own Branch Representative. Closes the last
    # remaining branch+group combo with no verifier (see BATCH_REPS: all 17 are now covered).
    {'branch': 'ICDT', 'verifiedBy': '2026ICB1429'},
]

# Branch Representatives — a THIRD, separate role from contributedBy/scheduleVerifications above
# (not about schedule accuracy at all): each BR represents their OWN branch+group combination,
# shown to every student in that exact combo as "Your BR: <name(s)>" (see brsForStudent() /
# renderBrNote() in app3.js). Some groups have two co-BRs. Full official list, one row per
# branch+group actually offered (every real combo in the roster is covered):
BATCH_REPS = [
    {'branch': 'AIDE', 'group': 'G1', 'reps': ['2026AIB1041', '2026AIB1028']},
    {'branch': 'AIDE', 'group': 'G2', 'reps': ['2026AIB1099']},
    {'branch': 'CE', 'group': 'G12', 'reps': ['2026CEB1162']},
    {'branch': 'CH', 'group': 'G11', 'reps': ['2026CHB1125']},
    {'branch': 'CSE', 'group': 'G7', 'reps': ['2026CSB1202', '2026CSB1216']},
    {'branch': 'CSE', 'group': 'G8', 'reps': ['2026CSB1257', '2026CSB1269']},
    {'branch': 'DA', 'group': 'G4', 'reps': ['2026DAB1308']},
    {'branch': 'EE', 'group': 'G5', 'reps': ['2026EEB1317', '2026EEB1330']},
    {'branch': 'EE', 'group': 'G6', 'reps': ['2026EEB1412', '2026EEB1417']},
    {'branch': 'EP', 'group': 'G9', 'reps': ['2026EPB1468']},
    {'branch': 'ES', 'group': 'G4', 'reps': ['2026ESB1499']},
    {'branch': 'ICDT', 'group': 'G9', 'reps': ['2026ICB1429']},
    {'branch': 'MCB', 'group': 'G3', 'reps': ['2026MCB1546', '2026MCB1578']},
    {'branch': 'MCB', 'group': 'G2', 'reps': ['2026MCB1514']},
    {'branch': 'ME', 'group': 'G10', 'reps': ['2026MEB1608', '2026MEB1623']},
    {'branch': 'ME', 'group': 'G11', 'reps': ['2026MEB1647']},
    {'branch': 'MME', 'group': 'G12', 'reps': ['2026MMB1686']},
]

# Whole-institute room bookings (every batch, not just freshers) — see build/extract_institute_tt.py.
# Only spectate's venue finder reads this, to answer "is this ROOM free", so the per-student
# schedule logic everywhere else is untouched. The continuing-students' calendar differs from the
# freshers' one (classes began 23 Jul, not 3 Aug; Mid-Sem 15-21 Sep; 22 Sep no-class) — from the
# institute's own "Academic Calendar January 2026 to December 2026" (newdata/TT-full.pdf).
# Gazetted holidays are institute-wide, so those are still read from CALENDAR['holidays'].
institute_tt = json.load(open('build/institute_tt.json'))
# Every course floated this semester (all batches): title, instructor(s), enrolment — see
# build/extract_course_catalog.py. Only spectate's Courses tab reads it.
course_catalog = json.load(open('build/course_catalog.json'))
INSTITUTE_CALENDAR = {
    'classesStart': '2026-07-23',
    'classesEnd': '2026-11-13',
    'midsem': {'start': '2026-09-15', 'end': '2026-09-21'},
    'noClassDays': {
        '2026-09-22': 'Mid Semester Project Evaluation (no class day)',
        '2026-10-09': 'No class day (Student Activity)',
    },
    'followsWeekday': {'2026-08-13': 'Wednesday', '2026-10-08': 'Friday', '2026-10-21': 'Tuesday'},
}

data = {
    'meta': {'project': 'thirtyatrpr', 'batch': '2026-2030', 'generated': '2026-08-02'},
    'mess': mess,
    'branchNames': BRANCH_NAMES,
    'courseNames': COURSE_NAMES,
    'electives': ELECTIVES,
    'hs113Progress': HS113_PROGRESS,
    'calendar': CALENDAR,
    'roster': roster,
    'ismpSchedule': ismp,
    'timetable': timetable,
    'venueLegend': legend,
    'venueRelocations': VENUE_RELOCATIONS,
    'scheduleVerifications': SCHEDULE_VERIFICATIONS,
    'batchReps': BATCH_REPS,
    'dateOverrides': DATE_OVERRIDES,
    'personalCourses': PERSONAL_COURSES,
    'weeklyCourses': WEEKLY_COURSES,
    'sequentialCourses': SEQUENTIAL_COURSES,
    'selfStudy': SELF_STUDY,
    'examSeating': exam_seating,
    'cancellations': CANCELLATIONS,
    'instituteTimetable': institute_tt,
    'instituteCalendar': INSTITUTE_CALENDAR,
    'courseCatalog': course_catalog,
}

with open('build/thirty_data.json', 'w') as f:
    json.dump(data, f, separators=(',',':'))

import os
size = os.path.getsize('build/thirty_data.json')
print('JSON size:', size, 'bytes', f'({size/1024:.1f} KB)')

with open('build/thirty_data.js', 'w') as f:
    f.write('const THIRTY_DATA = ')
    json.dump(data, f, separators=(',',':'))
    f.write(';')
print('wrote build/thirty_data.js')
