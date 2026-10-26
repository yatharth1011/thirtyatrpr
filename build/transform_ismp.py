import json, re
from collections import Counter

raw = json.load(open('build/ismp_raw.json'))

MONTHS = {'january':1,'february':2,'march':3,'april':4,'may':5,'june':6,'july':7,
          'august':8,'september':9,'october':10,'november':11,'december':12}

def parse_date(s, fallback_month):
    s = s.strip()
    m = re.match(r'(\d+)(st|nd|rd|th)?\s*([A-Za-z]+)?', s)
    day = int(m.group(1))
    month = m.group(3)
    month_num = MONTHS[month.lower()] if month else fallback_month
    return f'2026-{month_num:02d}-{day:02d}', month_num

SPORT_NORMALIZE = {
    'football':'Football','tennis':'Tennis','basketball':'Basketball','cricket':'Cricket',
    'badminton':'Badminton','table tennis':'Table Tennis','volleyball':'Volleyball',
    'volleytball':'Volleyball','athletics':'Athletics','weightlifting':'Weightlifting',
    'weighlifting':'Weightlifting','hockey':'Hockey',
}

VENUE_WHITELIST = [
    r'M[1-6]', r'MESH(?:/EESH)?', r'CYSH', r'EESH',
    r'AUDI(?:TORIUM)?(?:\s+FOYER)?',
    r'LHC(?:\s+CIRCLE|\s+COMMON\s+AREA)?',
    r'SAB\s+OPEN\s+AREA',
]
VENUE_RE = re.compile(r'^(?:' + '|'.join(VENUE_WHITELIST) + r')$', re.I)

def split_title_venue(text):
    text = text.strip()
    text = re.sub(r'-{2,}', ' - ', text)      # normalize runs of dashes
    text = re.sub(r'\s{2,}', ' ', text).strip()
    m = re.match(r'^(.*\S)\s*-\s*([A-Za-z0-9 /\.\']+)$', text)
    if m and VENUE_RE.match(m.group(2).strip()):
        return m.group(1).strip(), m.group(2).strip().upper()
    return text, None

# The source sheet's "8:00 - 10:30" for Film Screening (7 Aug) has no AM/PM at all; a bare
# hour-based default would read it as morning, but this is an evening cultural event (confirmed
# by a student report) — correct it explicitly rather than guess.
TIME_OVERRIDES = {
    ('7th August', 'Film Screening'): '8:00 - 10:30 PM',
}

days = {}
order = []
last_month = 7
all_items = []
for row in raw:
    date_iso, last_month = parse_date(row['date'], last_month)
    if date_iso not in days:
        days[date_iso] = {'date': date_iso, 'day': row['day'].strip(), 'items': []}
        order.append(date_iso)
    for ev in row['events']:
        text = ev['text'].strip()
        groups = ev['groups']
        title, venue = split_title_venue(text)
        low_title = title.lower().strip()
        if low_title in SPORT_NORMALIZE:
            etype = 'sport'
            title = SPORT_NORMALIZE[low_title]
        elif len(groups) >= 12:
            etype = 'common'
        else:
            etype = 'group'
        item_time = TIME_OVERRIDES.get((row['date'].strip(), title), row['time'])
        item = {'time': item_time, 'title': title, 'venue': venue, 'groups': groups, 'type': etype}
        days[date_iso]['items'].append(item)
        all_items.append(item)

# canonicalize title casing: most frequent casing per lowercase key wins
counter = {}
for it in all_items:
    key = it['title'].lower()
    counter.setdefault(key, Counter())[it['title']] += 1
canon = {key: c.most_common(1)[0][0] for key, c in counter.items()}
for it in all_items:
    it['title'] = canon[it['title'].lower()]

out = [days[d] for d in order]
print('days:', len(out))
with open('build/ismp_schedule.json','w') as f:
    json.dump(out, f, indent=1)

for d in out:
    for it in d['items']:
        print(d['date'], it['type'], repr(it['title']), '|venue=', it['venue'])
