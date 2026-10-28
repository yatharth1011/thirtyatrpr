(function(){
'use strict';
var DATA = THIRTY_DATA;
var LS_KEY = 'thirtyatrpr_entry';
var THEME_KEY = 'thirtyatrpr_theme'; // 'a' (frosted, default) or 'b' (solid)
var HS_KEY = 'thirtyatrpr_hs_elective'; // course code, e.g. 'HS110', or '' if not chosen yet
var CLASSES_START = '2026-08-03'; // no classes are scheduled before this date

// Personal display-name override for your own greeting only (e.g. official records list surname
// first — "CHAUDHARI NISHTHA BHUPENDRAKUMAR" — so the naive first-token split shows "Chaudhari"
// instead of the name she actually goes by, "Nishtha"). Keyed by entry number (not a single flat
// value) so a shared/reused device switching to a different logged-in account never inherits the
// previous person's alias — see setNameAlias()/syncNameAliasField(). Deliberately local-only: it
// changes nothing about how anyone else sees this student's name (search results, contributor
// credits, BR/mentor notes all still use the real roster name).
var NAME_ALIASES_KEY = 'thirtyatrpr_name_aliases';
var currentNameAliases = {};
try { currentNameAliases = JSON.parse(localStorage.getItem(NAME_ALIASES_KEY) || '{}'); } catch(e){ currentNameAliases = {}; }

var currentTheme = 'a'; // Theme A (frosted) only — Theme B was removed from Settings on 2026-10-15
document.body.classList.toggle('glass', currentTheme === 'a');
var COLOR_THEME_KEY = 'thirtyatrpr_color_theme';
// 'github' (GitHub Dark) is the default color theme. It was rolled out to EVERYONE, existing users
// included, via a one-time switch: the first time a browser loads this version, any previously
// saved color theme is replaced by 'github' and a marker is stored, so from then on whatever the
// person picks in Settings (including switching back to their old theme) sticks.
var GITHUB_THEME_ROLLOUT_KEY = 'thirtyatrpr_theme_github_rollout';
try {
  if(!localStorage.getItem(GITHUB_THEME_ROLLOUT_KEY)){
    localStorage.setItem(COLOR_THEME_KEY, 'github');
    localStorage.setItem(GITHUB_THEME_ROLLOUT_KEY, '1');
  }
} catch(e){}
var currentColorTheme = localStorage.getItem(COLOR_THEME_KEY) || 'github';
if(currentColorTheme !== 'default') document.body.setAttribute('data-theme', currentColorTheme);

/* Per-subject colors: a real syntax-highlighting-style spread (red/orange/yellow/green/teal/cyan/
   blue/purple/pink), all held to the same saturation/lightness as the signature accent (#34C48A)
   so they read as one deliberate palette rather than a random rainbow — IK101 keeps the exact
   signature hex itself. */
var SUBJECT_COLORS = {
  AI101:'#6286da', MA101:'#dac262', PH101:'#62daaa', CY101:'#da6662', CS100:'#9662da',
  TL101:'#62b6da', WP101:'#da9a62', NCC:'#8b949e', LIFESKILL:'#8b949e', NO101:'#62dad6',
  HS110:'#da62a2', HS111:'#dac262', HS112:'#62b6da', HS113:'#9662da', IK101:'#34C48A'
};
var FALLBACK_COLORS = ['#da6662','#da9a62','#dac262','#62daaa','#62dad6','#62b6da','#6286da','#9662da','#da62a2'];
var SUBJECT_PREFIXES = ['AI101','MA101','PH101','CY101','CS100','TL101','WP101','HS110','HS111','HS112','HS113','IK101','NO101'];
function subjectColor(code){
  var up = code.toUpperCase();
  for(var i=0;i<SUBJECT_PREFIXES.length;i++){
    if(up.indexOf(SUBJECT_PREFIXES[i]) === 0) return SUBJECT_COLORS[SUBJECT_PREFIXES[i]];
  }
  if(up.indexOf('NCC') !== -1 || up.indexOf('LIFE SKILL') !== -1) return SUBJECT_COLORS.NCC;
  var h = 0;
  for(var j=0;j<up.length;j++) h = (h*31 + up.charCodeAt(j)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}
var currentHsElective = localStorage.getItem(HS_KEY) || '';
var NSO_OPTIN_KEY = 'thirtyatrpr_nso_optin'; // '' unset, 'yes', 'no'
var currentNsoOptin = localStorage.getItem(NSO_OPTIN_KEY) || '';

/* ================= time helpers ================= */
function toMin(hhmm){ var p=hhmm.split(':').map(Number); return p[0]*60+p[1]; }
// Roster names are stored ALL CAPS (source data) — title-case just the first name for display.
function titleCaseFirstName(fullName){
  var w = fullName.trim().split(' ')[0];
  return w.charAt(0) + w.slice(1).toLowerCase();
}
function titleCaseFullName(fullName){
  return fullName.trim().split(/\s+/).map(function(w){
    return w.charAt(0) + w.slice(1).toLowerCase();
  }).join(' ');
}
// ROLES is declared in a small, separately-editable <script> block near the top of index.html
// (search "ROLES") — grant a role by adding an entry number to its array there.
function hasRole(entry, role){
  return !!(window.ROLES && window.ROLES[role] && window.ROLES[role].indexOf(entry) !== -1);
}
function toHHMM(mins){
  mins = ((mins%1440)+1440)%1440;
  var h=Math.floor(mins/60), m=mins%60;
  var ap = h>=12?'PM':'AM';
  var h12 = h%12; if(h12===0) h12=12;
  return h12+':'+String(m).padStart(2,'0')+' '+ap;
}
function fmtDur(mins){
  var h=Math.floor(mins/60), m=mins%60;
  if(m===0) return h+' hr';
  return h+' hr '+m+' min';
}
function dateLabel(dstr){
  var d = new Date(dstr+'T00:00:00');
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'long'});
}
var DOW_FULL = {Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'};
function fullDow(dow){ return DOW_FULL[dow] || dow; }
var WEEKDAY_FULL_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function isoToDate(iso){ return new Date(iso+'T00:00:00'); }
function addDaysISO(iso, n){
  var d = isoToDate(iso);
  d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function weekdayNameOf(iso){ return WEEKDAY_FULL_NAMES[isoToDate(iso).getDay()]; }
function todayISO(){
  var d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function nowMinutes(){ var d = new Date(); return d.getHours()*60 + d.getMinutes(); }

/* parse messy orientation time strings into {s,e} minutes (24h) */
function defaultMeridiem(h){ if(h===12) return 'pm'; if(h>=8) return 'am'; return 'pm'; }
function to24(h,mer){ h = h%12; if(mer==='pm') h += 12; return h; }
function parseTimeRange(raw){
  if(!raw) return null;
  var m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if(!m) return null;
  var sh=+m[1], sm=+(m[2]||0), sMer=m[3]?m[3].toLowerCase():null;
  var eh=+m[4], em=+(m[5]||0), eMer=m[6]?m[6].toLowerCase():null;
  if(sMer && !eMer){
    eMer = sMer;
  } else if(!sMer && eMer){
    // don't just copy the end's meridiem onto the start — that breaks ranges that cross
    // noon with only the end AM/PM stated (e.g. "10:50 - 12:10 PM" is 10:50 AM-12:10 PM,
    // not 10:50 PM-12:10 AM). Prefer whichever start-meridiem keeps start <= end.
    var eMin = to24(eh,eMer)*60+em;
    var sameMerMin = to24(sh,eMer)*60+sm;
    if(sameMerMin <= eMin){
      sMer = eMer;
    } else {
      var other = eMer==='pm' ? 'am' : 'pm';
      var otherMin = to24(sh,other)*60+sm;
      sMer = otherMin <= eMin ? other : eMer;
    }
  } else if(!sMer && !eMer){
    sMer = defaultMeridiem(sh); eMer = defaultMeridiem(eh);
  }
  var s = to24(sh,sMer)*60+sm;
  var e = to24(eh,eMer)*60+em;
  if(e < s) e += 720; // guard against odd wraparounds
  return {s:s, e:e};
}

/* fixed period-slot minute lookup (class timetable) */
var TIME_ORDER = {
  '8.00 - 8.50': 480, '9.00 - 9.50': 540, '10.00 - 10. 50': 600, '10.00 - 10.50': 600,
  '11.00 - 11.50': 660, '12.00 - 12. 50': 720, '12.00 - 12.50': 720,
  '1.00 - 1.50': 780, // carved out of the lunch gap specifically for HS/IKS electives (4 Aug reschedule)
  '8.00 - 9.00': 480, // one-off reschedule anchor — see classDuration's MA101-TUT time-literal case
  '6.00 - 7.00': 1080, // one-off same-day makeup anchor — G3's MA101-TUT, 15 Sept 2026
  '2.00 - 2.50': 840, '3.00 - 3.50': 900, '4.00 - 4.50': 960,
  '5.00 - 5.50': 1020, '6.00- 6.50': 1080, '6.00 - 6.50': 1080, '7.00-7.50': 1140, '7.00 - 7.50': 1140,
  /* clock-time exam slots (Mid-Sem Examination Time Table) — distinct from the 50-min period grid above */
  '9.30 - 11.30': 570, '12.30 - 2.30': 750, '3.30 - 5.30': 930,
  /* End-Sem slots (3 h): morning 9:30-12:30, evening 2:30-5:30; MA101 Quiz 2 (28 Oct) 7:10-8:00 PM */
  '9.30 - 12.30': 570, '2.30 - 5.30': 870, '7.10 - 8.00': 1150,
  /* TL101 mid-sem viva start times (26 Sep batches) — point-in-time, not ranges like the above */
  '9.30 AM': 570, '11.00 AM': 660, '2.30 PM': 870, '4.00 PM': 960,
  /* PH101 (D1) one-off extra class, 24 Sept 2026 */
  '11.00 - 12.00': 660,
  /* PH101 Mid-Sem answer sheet viewing (G2), 9 Oct 2026 */
  '3.00 - 4.00': 900,
  /* PH101 Lab Exam rounds + Project Submission — the department's own fixed weekly windows */
  '2.00 - 5.00': 840, '9.00 - 12.00': 540,
  /* AI101's optional Saturday sessions */
  '10.00 - 11.30': 600, '11.30 - 13.00': 690,
  /* HS111's rescheduled evening presentation slots (7 & 14 Oct), 8 min each from 5:00-6:38 PM */
  '5.00 - 5.08': 1020, '5.10 - 5.18': 1030, '5.20 - 5.28': 1040, '5.30 - 5.38': 1050,
  '5.40 - 5.48': 1060, '5.50 - 5.58': 1070, '6.00 - 6.08': 1080, '6.10 - 6.18': 1090,
  '6.20 - 6.28': 1100, '6.30 - 6.38': 1110
};

/* ================= matching ================= */
function ttMatches(item, student){
  if(item.universal) return true;
  if(item.division && item.division.length) return item.division.indexOf(student.division) !== -1;
  if(item.group && item.group.length) return !!student.academicGroup && item.group.indexOf(student.academicGroup) !== -1;
  if(item.branch && item.branch.length) return item.branch.indexOf(student.branch) !== -1;
  if(item.roll && item.roll.length){
    var num = parseInt(student.entry.slice(-4), 10);
    return item.roll.some(function(r){
      if(r.branch !== student.branch) return false;
      if(r.type === 'range') return num >= r.lo && num <= r.hi;
      if(r.type === 'nums') return r.nums.indexOf(num) !== -1;
      if(r.type === 'branch') return true;
      return false;
    });
  }
  return false;
}
// Timetable entries can carry an effective window — validFrom / validUntil (ISO dates, inclusive): the old Life
// Skills rules end on 22 Oct and the new roster starts 23 Oct (build/merge.py). No date given = always applies.
function entryLive(e, iso){
  if(!iso) return true;
  return (!e.validFrom || iso >= e.validFrom) && (!e.validUntil || iso <= e.validUntil);
}
function ismpMatches(item, student){
  if(item.type === 'common') return true;
  if(!student.ismpGroup) return false;
  return item.groups.indexOf(student.ismpGroup) !== -1;
}

/* ================= build per-student DAYS ================= */
function venueDesc(code){
  if(!code) return '';
  var key = code.replace(/[\s\-()]/g,'').toUpperCase();
  var leg = DATA.venueLegend[key];
  return leg ? leg.desc : '';
}
// A date-scoped venue swap (see DATA.venueRelocations / build/merge.py) applies to ANY item whose
// venue exactly matches `from` on that date, regardless of which course/entry it came from — the
// notice affects a room, not a specific subject. Returns the original venue unchanged (movedFrom
// null) outside any matching window.
var VENUE_DISPLAY_NAME = {'SENATE HALL':'Senate Hall', 'SRC-107':'SRC-107'};
function relocatedVenue(venue, iso){
  var rules = DATA.venueRelocations || [];
  for(var i=0;i<rules.length;i++){
    var r = rules[i];
    if(r.from !== venue) continue;
    if(iso < r.validFrom) continue;
    if(r.validTo && iso > r.validTo) continue;
    return {venue: r.to, movedFrom: r.from};
  }
  return {venue: venue, movedFrom: null};
}
function courseName(subject){
  var m = subject.match(/^([A-Z]{2,4}\d{3})/);
  if(!m) return null;
  var name = DATA.courseNames[m[1]];
  if(!name) return null;
  if(/-MIDSEM/.test(subject)) return name+' — Mid-Sem Exam';
  if(/-ENDSEM/.test(subject)) return name+' — End-Sem Exam';
  if(/-VIVA/.test(subject)) return name+' — Mid-Sem Viva';
  if(/-TUT/.test(subject)) return name+' — Tutorial';
  return /lab/i.test(subject) ? name+' — Lab' : name;
}

/* If the student has already chosen an elective, inject their real session(s) for this weekday
   (unchanged, filtered to just the slot(s) their course actually runs). If they haven't chosen
   yet, show ONE pick-prompt for the day, at the earliest elective slot that day, listing ALL 5
   options — not just whichever happens to run at that specific time — since the point is "tell us
   which one is yours", not "what's scheduled right now". Otherwise a student whose own elective is
   at noon but who first scrolls past the 5pm IK101-only slot would never see their own option. */
// A manual pick made by the logged-in user (settings panel) overrides everything, since it's
// an explicit correction. Otherwise fall back to the official per-student assignment from the
// Academic Section's HSS/IKS course list; that source only covers the logged-in account when
// browsing your own schedule — a searched-up classmate's schedule only ever shows their own
// official assignment (there is no local pick to fall back to for someone else's device).
function resolvedHsElective(student){
  var isOwn = student.entry === state.loginEntry;
  // The official assignment always wins now (Settings no longer offers an override); only the few students
  // with none on record answer the schedule's one-time "which one is yours?" prompt, kept in currentHsElective.
  return student.hsElective || (isOwn ? currentHsElective : null);
}
function electiveEntriesForDay(wd, student, iso){
  var sessionsToday = [];
  DATA.electives.forEach(function(el){
    el.sessions.filter(function(s){ return s.day === wd; }).forEach(function(s){
      var venue = (s.venueByBranch && s.venueByBranch[student.branch]) || s.venue;
      sessionsToday.push({code: el.code, title: el.title, instructor: el.instructor, venue: venue, time: s.time, contributedBy: el.contributedBy || null});
    });
  });
  if(!sessionsToday.length) return [];

  var isOwn = student.entry === state.loginEntry;
  var code = resolvedHsElective(student);

  if(code){
    if(isCancelledOn(code, iso)) return [];
    // HS113 project progress sessions (DATA.hs113Progress, build/merge.py): from their start date each project
    // group attends only on its own day of the three slots; a student not in the group sheet keeps all three.
    var hp = DATA.hs113Progress, hpGroup = code === 'HS113' && hp && iso && iso >= hp.from && student.hs113Group;
    if(hpGroup){
      var range = hp.days[wd];
      if(!range || student.hs113Group < range[0] || student.hs113Group > range[1]) return [];
    }
    return sessionsToday.filter(function(s){ return s.code === code && !overlayHidesSubjectOn(code, iso, student, TIME_ORDER[s.time]); }).map(function(s){
      var sMin = TIME_ORDER[s.time];
      return {
        sMin: sMin !== undefined ? sMin : null,
        eMin: sMin !== undefined ? sMin+50 : null,
        t: sMin !== undefined ? (toHHMM(sMin)+' – '+toHHMM(sMin+50)) : s.time,
        title: s.code+' — '+s.title+(s.instructor?' ('+s.instructor+')':'')+
          (hpGroup ? ' · project progress session, Group '+student.hs113Group : ''),
        venue: s.venue,
        type: 'class',
        category: 'HS/IKS',
        color: subjectColor(s.code),
        contributedBy: hpGroup ? hp.contributedBy : (s.contributedBy || null)
      };
    });
  }

  if(!isOwn) return []; // no way to know a classmate's pick when they have no official assignment

  var earliest = sessionsToday.reduce(function(a,b){
    var am = TIME_ORDER[a.time]===undefined?9999:TIME_ORDER[a.time];
    var bm = TIME_ORDER[b.time]===undefined?9999:TIME_ORDER[b.time];
    return bm<am ? b : a;
  });
  var sMin = TIME_ORDER[earliest.time];
  var out = [{
    sMin: sMin !== undefined ? sMin : null,
    eMin: sMin !== undefined ? sMin+50 : null,
    t: sMin !== undefined ? (toHHMM(sMin)+' – '+toHHMM(sMin+50)) : earliest.time,
    type: 'electivePick',
    options: DATA.electives.map(function(el){ return {code: el.code, title: el.title, instructor: el.instructor}; })
  }];
  return out;
}

// NSO (NO101): per-group/per-day data (DATA.timetable / build/merge.py), shown to exactly the students on the
// Academic Section's official NO101 enrollment list — matching an NSO day/group isn't enough (plenty of matching
// students are really in NSS, or neither). Enrollment is official, so nobody is asked anything (the old opt-in
// question was removed with its Settings option on 2026-10-15); `isOwn` no longer changes anything here.
function nsoEntriesForDay(wd, student, isOwn){
  if(!student.nsoEnrolled) return [];
  var raw = (DATA.timetable[wd]||[]).filter(function(e){ return e.subject === 'NO101' && ttMatches(e, student); });
  return raw.length ? buildClassItemsFromList(raw, student) : [];
}

function examInfoFor(iso){
  var weeks = (DATA.calendar && DATA.calendar.examWeeks) || [];
  for(var i=0;i<weeks.length;i++){
    if(iso >= weeks[i].start && iso <= weeks[i].end) return weeks[i].label;
  }
  return null;
}

// The day range is driven by DATA.calendar (Jul27–Nov13, per the official academic calendar)
// rather than by the ISMP orientation sheet, which only covers the first few weeks — this lets
// the strip run the full semester. ISMP items are looked up per-date where present; the weekday
// used for the class timetable defaults to the calendar date's real weekday, except on the
// specific Saturdays/Thursdays the academic calendar says "follow X's timetable" instead.
// Lab/practical sessions run longer than the default 50-min period — durations confirmed via
// the Tinkering Lab (TL101) email, direct student cross-checks (CY101, WP101), and the Physics
// department's own PH101 lab schedule (230-min blocks, 9:00-12:50 / 2:00-5:50; the AI101 lab,
// tagged with venue "LAB" rather than a "-LAB" subject suffix, is 2 hours).
function classDuration(e){
  // PH101 Lab Exam rounds (3x20-student exams + Project Submission & Viva) run a genuine 3-hour
  // block (2:00-5:00pm or 9:00am-12:00pm) — checked before the generic PH101-LAB rule below since
  // '-LAB' would otherwise never match these ('LABEXAM'/'LABPROJECT' don't contain a bare '-LAB').
  if(/^PH101-LABEXAM/.test(e.subject) || e.subject === 'PH101-LABPROJECT') return 180;
  // PH101 (D1) one-off extra class, 24 Sept 2026, 11:00 AM-12:00 Noon — a genuine 60-min block.
  if(e.subject === 'PH101-EXTRA' || e.subject === 'PH101-REVIEW') return 60;
  // AI101's optional Saturday sessions (Concept/Doubt-Clearing, Hands-on Lab) each run 90 min.
  // AI101's compulsory online class (D1/D2), Sun 25 Oct 2026 (11:00 AM-1:00 PM, Google Meet) is a 2-hour block.
  if(e.subject === 'AI101-ONLINE') return 120;
  // HS111's rescheduled evening presentation slots — 8 minutes per team, per the shared sheet.
  if(e.subject === 'HS111-PRESENT') return 8;
  if(/^PH101-LAB/.test(e.subject)) return 230;
  if(/-MIDSEM/.test(e.subject)) return 120;
  if(/-ENDSEM/.test(e.subject)) return 180;
  if(/-VIVA/.test(e.subject)) return 90;
  // CE's WP101 lab is a genuine 4-hour block (9 AM-1 PM); MME's is a separate real 170-min block
  // (10:00 AM-12:50 PM) — both confirmed directly by a student in that branch. Keyed on branch,
  // not group: CE and MME each have their own distinct academic group both confusingly labeled
  // "G12" (see the merge.py comment on these two entries), so matching by that label alone would
  // wrongly give one branch's WP101-LAB duration to the other. Checked before the generic '-LAB'
  // rule below, which would otherwise match first and give both the standard 120-min default.
  if(e.subject === 'WP101-LAB' && e.branch && e.branch.indexOf('CE') !== -1) return 240;
  if(e.subject === 'WP101-LAB' && e.branch && e.branch.indexOf('MME') !== -1) return 170;
  // ICDT's CY101 lab runs a specific 170-min block (9:00-11:50 AM), confirmed directly by their
  // own Branch Representative — split out from the standard 120-min entry CSE/EP still share.
  if(e.subject === 'CY101-LAB' && e.branch && e.branch.indexOf('ICDT') !== -1) return 170;
  if(/-LAB/.test(e.subject)) return 120;
  if(e.subject === 'AI101' && e.venue === 'LAB') return 120;
  // CS100 (GE103, in 2026EPB1468's own terminology — same course, see the GE103->CS100 rename
  // note in build/merge.py) students confirm the LAB block runs 9 AM-12 PM (180 min, refined from
  // an earlier 120-min estimate once he directly cross-checked the live site and gave the exact
  // end time), and the Auditorium lecture runs 5:00-6:15 PM (75 min), not the default 50.
  if(e.subject === 'CS100' && e.venue === 'LAB') return 180;
  if(e.subject === 'CS100' && e.venue === 'Auditorium') return 75;
  // NSO (NO101) is a fixed 1-hour session regardless of group/day.
  if(e.subject === 'NO101') return 120;
  // CH's CY101 tutorial (SRC-106, 60 min) and EP's (SRC-005, ALSO 60 min but a different, later
  // slot than CSE's own SRC-005 entry) both run a genuine 6-7 PM hour — CSE's SRC-005 entry is a
  // separate, shorter 50-min slot and must keep the default below, so branch is what distinguishes
  // EP's from CSE's since they happen to share a venue.
  if(e.subject === 'CY101-TUT' && e.venue === 'SRC-106') return 60;
  if(e.subject === 'CY101-TUT' && e.branch && e.branch.indexOf('EP') !== -1) return 60;
  // ICDT's Life Skills session is a genuinely longer 90-min block (6:00-7:30 PM) — its own
  // Branch Rep's direct report, separate from the official Academic Section email below (which
  // doesn't clearly cover ICDT's own separate 5-year-program timetable).
  if(e.subject === 'LS101' && e.branch && e.branch.indexOf('ICDT') !== -1) return 90;
  // Everyone else's Life Skills: a real 60-min block (6:00-7:00 PM), confirmed directly by an
  // official Academic Section email — not the generic 50-min default below.
  if(e.subject === 'LS101') return 60;
  // One-off MA101 Tutorial reschedule for G2 (moved from its normal Tue 15 Sept slot to Wed 16
  // Sept, 8:00-9:00 AM — a genuine 60-min block, not the usual 50). Keyed on this exact time
  // literal, not subject+group, so it can't affect G2's regular recurring Tuesday tutorial.
  if(e.subject === 'MA101-TUT' && e.time === '8.00 - 9.00') return 60;
  if(e.subject === 'MA101-TUT' && e.time === '6.00 - 7.00') return 60;
  if(e.subject === 'MA101-QUIZ' && e.time === '7.10 - 8.00') return 50;
  if(/-QUIZ/.test(e.subject)) return 60;
  return 50;
}
// Sourik's own display convention: on the schedule of anyone in the branch he's the verifier for
// (EP), the CS100 code badge shows as "GE103" instead — the same code his own screenshot used —
// rather than the internal "CS100" everyone else's schedule shows (same actual course either way;
// see the GE103->CS100 rename note in build/merge.py). Purely a display-label swap: courseName()
// lookup, subject color, and every matching/logic path below still use the real subject 'CS100'.
function displaySubjectFor(subject, student){
  if(subject === 'CS100' && verifierForStudent(student) === '2026EPB1468') return 'GE103';
  return subject;
}
// A one-off single-date cancellation (DATA.cancellations — NOT a holiday, NOT a permanent
// correction; see build/merge.py) of a subject that would otherwise meet on `iso`. `group`/
// `division`/`branch` narrow it to whichever of the entry's own group/division/branch the
// cancellation names (checked against the ITEM's own fields, same as `group` always was — not the
// viewing student's — since a cancellation removes an item outright for anyone who'd see it);
// omitting all three cancels that subject for everyone that date. Each filter present on the
// cancellation must match (AND, not OR) — e.g. a division-only cancellation (PH101 for D1 but not
// D2, both sharing one 'PH101' subject code at the same weekly slot) leaves group/branch unchecked.
function isCancelledOn(subject, iso, group, division, branch){
  if(!iso) return false;
  return (DATA.cancellations || []).some(function(c){
    if(c.date !== iso || c.subject !== subject) return false;
    if(c.group && c.group.length){
      if(!group || !c.group.some(function(g){ return group.indexOf(g) !== -1; })) return false;
    }
    if(c.division && c.division.length){
      if(!division || !c.division.some(function(d){ return division.indexOf(d) !== -1; })) return false;
    }
    if(c.branch && c.branch.length){
      if(!branch || !c.branch.some(function(b){ return branch.indexOf(b) !== -1; })) return false;
    }
    return true;
  });
}

/* ================= live overlay (BR-authored corrections, from Firestore, see build/br.js) =====
   A live, dynamic sibling to CANCELLATIONS/DATE_OVERRIDES above — same two-mechanism idea (hide an
   existing item / show a new one), just BR-authored at runtime instead of hand-written by the
   creator at build time. DATA.liveOverlay starts empty and is filled in asynchronously by
   build/live_overlay_bridge.js's Firestore listener (see the 'thirty:overlay' listener near the
   bottom of this file) — the app already renders correctly from the static baked data before that
   ever resolves, this only ever layers corrections on top once/if it arrives.
   Deliberately NOT reusing ttMatches()'s division/group/branch/roll cascade (built for legacy
   sheet-derived data) — overlay scope is always one of exactly 3 explicit shapes and a group scope
   always carries `branch` alongside it, so it can never fall into the "bare group label collides
   across branches" bug class this app has hit repeatedly (WP101-LAB, LS101, MA101-TUT). */
DATA.liveOverlay = DATA.liveOverlay || [];
// 'entries' is /br's general-purpose scope: an explicit entry-number list compiled from whatever
// students the BR picked (a division, an HS/IKS section, an entry range, a mix) — the roster is
// static, so the list never drifts. all/branch/group stay for older docs and the common cases.
function overlayScopeMatches(scope, student){
  if(!scope) return false;
  if(scope.type === 'all') return true;
  if(scope.type === 'branch') return student.branch === scope.branch;
  if(scope.type === 'group') return student.branch === scope.branch && student.academicGroup === scope.group;
  // A BR's entries-scope always carries their own `branch` (Firestore rules only check that field,
  // they can't walk the list), so a branch-bound list can never reach another branch's students.
  if(scope.type === 'entries') return !!scope.entries && (!scope.branch || student.branch === scope.branch) && scope.entries.indexOf(student.entry) !== -1;
  return false;
}
// A recurring change can carry `from` (and optionally `until`) so "every Monday from now on" doesn't
// also rewrite past Mondays.
function overlayAppliesOnDate(temporal, iso){
  if(!temporal || !iso) return false;
  if(temporal.type === 'date') return iso === temporal.date;
  if(temporal.type === 'week') return iso >= temporal.start && iso <= temporal.end;
  if(temporal.type === 'recurring'){
    if(temporal.from && iso < temporal.from) return false;
    if(temporal.until && iso > temporal.until) return false;
    return weekdayNameOf(iso) === temporal.weekday;
  }
  return false;
}
// `hide.startMin` (set when a BR removes one specific item from a day view) narrows a hide to the
// occurrence starting at that minute — a subject that meets twice a day keeps its other slot.
// Without it, every occurrence of the subject that day is hidden (the original behavior).
function overlayHidesSubjectOn(subject, iso, student, sMin, exclude){
  return (DATA.liveOverlay || []).some(function(ov){
    if(ov === exclude || !ov.hide || ov.hide.subject !== subject) return false;
    if(ov.hide.startMin != null && sMin !== undefined && sMin !== null && ov.hide.startMin !== sMin) return false;
    return overlayScopeMatches(ov.hide.scope, student) && overlayAppliesOnDate(ov.hide.temporal, iso);
  });
}
// New items a BR added for this exact student+date — shaped like any other rendered class item, so
// they slot straight into buildDays()'s existing sort/merge, and (via contributedBy) automatically
// get the same "❤️ shared by ..." day-scoped attribution every other contributed entry gets.
function overlayShowsForDate(iso, student){
  var out = [];
  (DATA.liveOverlay || []).forEach(function(ov){
    if(!ov.show) return;
    if(!overlayScopeMatches(ov.show.scope, student)) return;
    if(!overlayAppliesOnDate(ov.show.temporal, iso)) return;
    // Another live change can remove a BR-added item too (e.g. one branch dropping something that
    // was added for the whole batch) — but a change doc's own hide never hides its own replacement.
    if(overlayHidesSubjectOn(ov.show.subject, iso, student, ov.show.startMin, ov)) return;
    var name = courseName(ov.show.subject);
    out.push({
      sMin: ov.show.startMin, eMin: ov.show.endMin,
      t: toHHMM(ov.show.startMin)+' – '+toHHMM(ov.show.endMin),
      title: name || ov.show.title || ov.show.subject,
      code: name ? (ov.show.title || ov.show.subject) : null,
      venue: ov.show.venue, type: 'class', category: ov.show.category || 'Update',
      color: subjectColor(ov.show.subject), contributedBy: ov.createdBy || null,
    });
  });
  return out;
}

// There is one physical Physics lab: while a PH101 Lab Exam / Project Submission round is running in
// it (DATA.dateOverrides, any group's), no regular PH101 lab session can overlap that window — not
// just for the examinees but for every other student whose regular lab block falls in the same slot
// that day, since the room is occupied. Keyed on actual time overlap, not group, so it also holds
// on weekday-swap days (e.g. Thu 8 Oct running Friday's timetable).
function labOccupiedByExam(e, iso){
  if(e.subject !== 'PH101-LAB' || !iso) return false;
  var sMin = TIME_ORDER[e.time];
  if(sMin === undefined) return false;
  var eMin = sMin + classDuration(e);
  return ((DATA.dateOverrides && DATA.dateOverrides[iso]) || []).some(function(x){
    if(!/^PH101-LAB(EXAM|PROJECT)/.test(x.subject)) return false;
    var xs = TIME_ORDER[x.time];
    return xs !== undefined && xs < eMin && sMin < xs + classDuration(x);
  });
}
function buildClassItemsFromList(rawList, student, iso){
  return (rawList||[]).filter(function(e){ return entryLive(e, iso) && ttMatches(e, student) && !labOccupiedByExam(e, iso) && !isCancelledOn(e.subject, iso, e.group, e.division, e.branch) && !overlayHidesSubjectOn(e.subject, iso, student, TIME_ORDER[e.time]); }).map(function(e){
    var sMin = TIME_ORDER[e.time];
    // e.title lets a DATE_OVERRIDES entry override courseName()'s auto-derived name — needed
    // whenever the same base subject code (courseName() only reads the "PH101"-shaped prefix, not
    // any '-SUFFIX') covers several distinct one-off events, e.g. PH101's 3 lab exams + project
    // submission all share the 'PH101' prefix but need different, specific titles.
    var name = e.title || courseName(e.subject);
    var dur = classDuration(e);
    var displaySubject = displaySubjectFor(e.subject, student);
    return {
      sMin: sMin !== undefined ? sMin : null,
      eMin: sMin !== undefined ? sMin+dur : null,
      t: sMin !== undefined ? (toHHMM(sMin)+' – '+toHHMM(sMin+dur)) : (e.time||''),
      title: name || displaySubject,
      code: name ? displaySubject : null,
      venue: e.venue,
      type: 'class',
      category: e.category,
      color: subjectColor(e.subject),
      contributedBy: e.contributedBy || null,
      ta: e.ta || null,
      materialLink: e.link || null, linkLabel: e.linkLabel || null     // e.g. the online class's Meet link
    };
  });
}
function buildClassItems(classWd, student, iso){
  return buildClassItemsFromList(DATA.timetable[classWd], student, iso);
}
function sortBySMin(list){
  return list.slice().sort(function(a,b){
    var av = a.sMin===null?9999:a.sMin, bv = b.sMin===null?9999:b.sMin;
    return av-bv;
  });
}
// Per-course progress: `courseProgress[code]` = how many items from the START of that course's
// queue are marked done (a plain count, not a set — completion is always a clean prefix, items
// 0..count-1 done, count..N-1 not; this by construction rules out "gaps", which is what makes the
// tick/untick rules below safe without extra conflict-checking). Persisted so it survives reload.
var COURSE_PROGRESS_KEY = 'thirtyatrpr_course_progress';
function loadCourseProgress(){
  try { return JSON.parse(localStorage.getItem(COURSE_PROGRESS_KEY) || '{}'); } catch(e){ return {}; }
}
function saveCourseProgress(p){ localStorage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(p)); }
var courseProgress = loadCourseProgress();

// Sequential-queue personal courses (see DATA.sequentialCourses / build/merge.py) — an explicit
// ORDERED content list where each item declares which weekday it wants, consumed in order as
// matching weekdays come up. Progress is a plain count (courseProgress[code]) of how many items
// from the front are done — items 0..count-1 done, count..N-1 not; that's a clean prefix by
// construction, no gaps possible.
//
// The schedule is computed in 3 phases:
//  1. Replay completed items at their natural walk-computed dates (a historical record).
//  2. If that walk has fallen behind today (i.e. the next pending item's natural slot is already
//     past), jump the cursor forward to today — never backward, so being ahead of schedule is a
//     no-op here.
//  3. Assign the remaining pending items from that (possibly caught-up) point onward.
// This means an overdue-and-unticked item automatically keeps riding the front of available time
// as today advances, with no manual "shift forward" click needed — and ticking it (at whatever
// date it's currently showing) simply raises courseProgress, which makes the whole thing
// recompute with no more catch-up needed — no separately-stored "duplicate" to clean up, since
// nothing here is stored per-date, it's all derived fresh from courseProgress + today.
//
// `startsAfter: '<code>'` (used by CS50) means this course has no fixed startDate of its own — it
// starts the day after whichever course it names actually finishes IN THE CURRENT schedule state,
// so if that course is behind, this one starts later too. Courses must be processed in dependency
// order (build/merge.py lists them that way) since each depends on the previous one's result.
function itemStartTime(course, item){ return item.startTime || course.startTime; }
function computeSequentialCourseSchedule(course, priorResults){
  var cal = DATA.calendar;
  var items = course.items;
  var n = items.length;
  var completedCount = Math.min(courseProgress[course.code] || 0, n);
  var startDate = course.startDate;
  if(!startDate && course.startsAfter){
    var dep = priorResults[course.startsAfter];
    startDate = dep ? addDaysISO(dep.lastDate, 1) : cal.rangeStart;
  }
  var today = todayISO();
  var all = [];
  var iso = startDate;
  var queueIndex = 0;
  function slotOk(d){
    var inPause = (course.pauseRanges||[]).some(function(p){ return d >= p.start && d <= p.end; });
    var isHoliday = (cal.holidays && cal.holidays[d]) || (cal.noClassDays && cal.noClassDays[d]);
    return !inPause && !isHoliday;
  }
  while(queueIndex < completedCount && iso <= cal.rangeEnd){
    if(slotOk(iso) && items[queueIndex].weekday === weekdayNameOf(iso)){
      all.push({date: iso, item: items[queueIndex], itemIndex: queueIndex, done: true});
      queueIndex++;
    }
    iso = addDaysISO(iso, 1);
  }
  if(iso < today) iso = today;
  while(queueIndex < n && iso <= cal.rangeEnd){
    if(slotOk(iso) && items[queueIndex].weekday === weekdayNameOf(iso)){
      all.push({date: iso, item: items[queueIndex], itemIndex: queueIndex, done: false});
      queueIndex++;
    }
    iso = addDaysISO(iso, 1);
  }
  return {
    all: all,
    lastDate: all.length ? all[all.length-1].date : startDate,
    completedCount: completedCount,
    total: n
  };
}

var SEQUENTIAL_COURSE_RESULTS = {};
var SEQUENTIAL_COURSE_BY_DATE = {};
function recomputeCourseSchedules(){
  SEQUENTIAL_COURSE_RESULTS = {};
  SEQUENTIAL_COURSE_BY_DATE = {};
  (DATA.sequentialCourses||[]).forEach(function(course){
    // Kaizen is planned by time inside buildDays (kzPlanner); a course queued after it (CS50) waits
    // until the roadmap is done, which is beyond this calendar.
    if(course.kaizen) return;
    if(course.startsAfter && (DATA.sequentialCourses||[]).some(function(k){ return k.kaizen && k.code === course.startsAfter; })) return;
    var result = computeSequentialCourseSchedule(course, SEQUENTIAL_COURSE_RESULTS);
    SEQUENTIAL_COURSE_RESULTS[course.code] = result;
    var map = {};
    result.all.forEach(function(a){ map[a.date] = a; });
    SEQUENTIAL_COURSE_BY_DATE[course.code] = map;
  });
}
recomputeCourseSchedules();

function sequentialCourseClassesForDate(iso, student){
  var out = [];
  (DATA.sequentialCourses||[]).forEach(function(course){
    if(course.students.indexOf(student.entry) === -1) return;
    var hit = SEQUENTIAL_COURSE_BY_DATE[course.code] && SEQUENTIAL_COURSE_BY_DATE[course.code][iso];
    if(!hit) return;
    var item = hit.item;
    var sMin = toMin(itemStartTime(course, item));
    var dur = item.durationMin || 90;
    var completedCount = courseProgress[course.code] || 0;
    var checkDisabled = hit.done && hit.itemIndex !== completedCount - 1;
    out.push({
      sMin: sMin, eMin: sMin+dur,
      t: toHHMM(sMin)+' – '+toHHMM(sMin+dur),
      title: course.title+' — '+item.title,
      code: course.code, venue: null,
      type: 'class', category: course.category, color: subjectColor(course.code),
      selfCourse: true, done: hit.done, itemIndex: hit.itemIndex, checkDisabled: checkDisabled,
      materialLink: item.link, materialLink2: item.instructionsLink
    });
  });
  return out;
}

// Settings-panel checklist: one per self-course, listing every item with a checkbox. Ticking an
// unchecked item (any of them, not just the very next one) marks it AND everything before it
// done — useful for catching up in one go. Unticking is only possible on the single boundary
// checkbox (the last completed item); every earlier completed checkbox is rendered disabled, so
// there is no way to even attempt an invalid "gap" untick in the first place.
function allSelfCoursesFor(student){
  var list = [];
  (DATA.sequentialCourses||[]).forEach(function(c){ if(c.students.indexOf(student.entry)!==-1) list.push(c); });
  return list;
}
function renderCourseChecklist(){
  var box = document.getElementById('courseSkipControls');
  var field = document.getElementById('courseSkipField');
  if(!box || !field || !state.student) return;
  var courses = allSelfCoursesFor(state.student);
  if(!courses.length){ field.style.display = 'none'; return; }
  field.style.display = '';
  box.innerHTML = courses.map(function(c){
    if(c.kaizen) return kzChecklistHtml(c);
    var completedCount = Math.min(courseProgress[c.code] || 0, c.items.length);
    var result = SEQUENTIAL_COURSE_RESULTS[c.code];
    var startInfo = !result ? ' · starts after the Kaizen roadmap' :
      c.startsAfter ? ' · starts '+dateLabel(result.all.length ? result.all[0].date : c.startDate) : '';
    var rows = c.items.map(function(item, i){
      var checked = i < completedCount;
      var isBoundary = checked && i === completedCount - 1;
      var disabled = checked && !isBoundary;
      return '<label class="check-item'+(checked?' checked':'')+'">'+
        '<input type="checkbox"'+(checked?' checked':'')+(disabled?' disabled':'')+
        ' onchange="window.__toggleCourseItem(\''+c.code+'\','+i+')">'+
        '<span>'+item.title+'</span></label>';
    }).join('');
    return '<details class="course-checklist">'+
      '<summary>'+c.title+'<span class="checklist-progress">'+completedCount+'/'+c.items.length+startInfo+'</span></summary>'+
      '<div class="checklist-items">'+rows+'</div></details>';
  }).join('');
}
function kzEsc(t){ return String(t).replace(/[&<>"]/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); }
function kzChecklistHtml(c){
  var dsaOn = kzDsaOn();
  var tracks = [{ name: 'ML', items: c.items }].concat(dsaOn && KZ.dsa.length ? [{ name: 'DSA', items: KZ.dsa }] : []);
  var all = tracks.reduce(function(a, t){ return a.concat(t.items); }, []);
  var done = all.filter(function(it){ return kzDone(it.code); }).length;
  var dailyMin = KZ.prefs.dailyMin != null ? KZ.prefs.dailyMin : c.dailyMin;
  var dsaMin = KZ.prefs.dsaDailyMin != null ? KZ.prefs.dsaDailyMin : c.dsaDailyMin;
  var status = (KZ.online ? 'synced with the Kaizen app' : 'Kaizen app not reachable from here')+
    (window.__kzCloudStatus === 'on' ? ' &middot; private cloud copy on (phone + PC)' : ' &middot; sign in from the Kaizen card to sync phone and PC');
  var controls = '<div class="checklist-items">'+
    '<label class="check-item">ML minutes / day <input type="number" min="0" step="15" value="'+dailyMin+'" style="width:5em" onchange="window.__setKaizenPref(\'dailyMin\', this.value)"></label>'+
    '<label class="check-item"><input type="checkbox"'+(dsaOn?' checked':'')+' onchange="window.__setKaizenPref(\'dsa\', this.checked)"> DSA track</label>'+
    (dsaOn ? '<label class="check-item">DSA minutes / day <input type="number" min="0" step="15" value="'+dsaMin+'" style="width:5em" onchange="window.__setKaizenPref(\'dsaDailyMin\', this.value)"></label>' : '')+
    '<div class="check-item">'+status+'</div></div>';
  var units = [], byUnit = {};
  all.forEach(function(it){ if(!byUnit[it.unit]){ byUnit[it.unit] = []; units.push(it.unit); } byUnit[it.unit].push(it); });
  var unitHtml = units.map(function(u){
    var list = byUnit[u], n = list.filter(function(it){ return kzDone(it.code); }).length;
    return '<details class="course-checklist"><summary>'+kzEsc(u)+'<span class="checklist-progress">'+n+'/'+list.length+'</span></summary>'+
      '<div class="checklist-items">'+list.map(function(it){
        var on = kzDone(it.code);
        return '<label class="check-item'+(on?' checked':'')+'"><input type="checkbox"'+(on?' checked':'')+
          ' onchange="window.__toggleKaizen(\''+it.code+'\')"><span>'+it.code+' &middot; '+kzEsc(it.title)+'</span></label>';
      }).join('')+'</div></details>';
  }).join('');
  return '<details class="course-checklist"><summary>'+kzEsc(c.title)+'<span class="checklist-progress">'+done+'/'+all.length+'</span></summary>'+
    controls+unitHtml+'</details>';
}
window.__toggleCourseItem = function(code, index){
  var completedCount = courseProgress[code] || 0;
  if(index < completedCount){
    if(index === completedCount - 1) courseProgress[code] = index; // boundary untick only
    else { renderCourseChecklist(); return; } // guard; UI already disables this case
  } else {
    courseProgress[code] = index + 1; // tick this and everything before it
  }
  saveCourseProgress(courseProgress);
  recomputeCourseSchedules();
  state.DAYS = buildDays(state.student);
  renderTodayPanel();
  renderHeatmapPanel();
  if(calState.open) renderCalendar();
  renderCourseChecklist();
};

/* ================= Kaizen (CS229 = the user's self-paced ML roadmap, see build/merge.py) =================
   Not a weekday queue: each day, only after that day's self-study blocks are over (Settings, selfStudyBlocks), the next unticked tasks
   fill the day's free time — classes, meals and a midnight bedtime (minus the wind-down setting) are kept clear —
   up to `dailyMin` (ML) plus `dsaDailyMin` (DSA, while its switch is on), split across days by Kaizen's own hour
   estimates. Nothing is dated, so an unticked task just rolls forward to the next free time; a ticked one shows on
   the day it was ticked.
   One set of ticks, three places: KZ.store ({code: {v, t}}, newest change wins) is cached here, mirrored into
   'ml-roadmap-ticks-v4' (the same origin's website copy of the roadmap at /ml reads that), and exchanged with the
   Kaizen app's server on this Mac (127.0.0.1:8830/api/ticks), which also serves the DSA track — never published,
   so DSA tasks only exist here while Kaizen is reachable. Only ever runs for a logged-in member of the course. */
var KZ_API = 'http://127.0.0.1:8830/api/';
var KZ_STORE_KEY = 'thirtyatrpr_kaizen_store', KZ_PREFS_KEY = 'thirtyatrpr_kaizen_prefs';
var KZ_WEB_KEY = 'ml-roadmap-ticks-v4', KZ_DSA_OFF_KEY = 'ml-roadmap-dsa-off';
function kzLoad(k, dflt){ try { return JSON.parse(localStorage.getItem(k) || 'null') || dflt; } catch(e){ return dflt; } }
var KZ_DSA_CACHE_KEY = 'thirtyatrpr_kaizen_dsa';
var KZ = { store: kzLoad(KZ_STORE_KEY, {}), prefs: kzLoad(KZ_PREFS_KEY, {}), dsa: kzLoad(KZ_DSA_CACHE_KEY, []), online: false, started: false,
  mobile: typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') };
function kzHash(str){ var h = 0; for(var i = 0; i < str.length; i++){ h = (h * 31 + str.charCodeAt(i)) | 0; } return String(h); }
// The private cloud copy (build/kaizen_bridge.js): only entries newer than what it holds go up.
function kzCloudReady(){ return window.__kzCloudStatus === 'on' && window.__kzCloudData && typeof window.__kzCloudWrite === 'function'; }
function kzCloudPushTicks(){
  if(!kzCloudReady()) return;
  var cloud = window.__kzCloudData.ticks || {}, up = {}, n = 0;
  Object.keys(KZ.store).forEach(function(c){ if(!cloud[c] || KZ.store[c].t > cloud[c].t){ up[c] = KZ.store[c]; n++; } });
  if(n) window.__kzCloudWrite({ ticks: up });
}
function kzCloudPushDsa(){
  if(!kzCloudReady() || !KZ.online || !KZ.dsa.length) return;
  var h = kzHash(JSON.stringify(KZ.dsa));
  if(window.__kzCloudData.dsaHash !== h) window.__kzCloudWrite({ dsa: KZ.dsa, dsaHash: h });
}
function kzCourse(){ return (DATA.sequentialCourses||[]).filter(function(c){ return c.kaizen; })[0] || null; }
function kzDsaOn(){ try { return localStorage.getItem(KZ_DSA_OFF_KEY) !== '1'; } catch(e){ return true; } }
function kzDone(code){ return !!(KZ.store[code] && KZ.store[code].v); }
function kzSave(){
  try { localStorage.setItem(KZ_STORE_KEY, JSON.stringify(KZ.store)); } catch(e){}
  kzCloudPushTicks();
  // Mirror ML ticks into the website roadmap's own key (keeping its migration flags).
  var web = kzLoad(KZ_WEB_KEY, {});
  Object.keys(KZ.store).forEach(function(c){ if(c.charAt(0) === 'U') web[c] = KZ.store[c].v; });
  try { localStorage.setItem(KZ_WEB_KEY, JSON.stringify(web)); } catch(e){}
}
// Ticks made on the website copy (/ml) since we last looked: they appear in its key but not in our store.
function kzAbsorbWebTicks(){
  var web = kzLoad(KZ_WEB_KEY, {}), changes = {}, now = Date.now();
  Object.keys(web).forEach(function(c){
    if(c.indexOf('__') === 0 || !/^U\d\d-/.test(c)) return;
    if(!!web[c] !== kzDone(c)) changes[c] = { v: !!web[c], t: KZ.store[c] ? now : 1 };
  });
  return changes;
}
function kzApply(remote){
  var changed = false;
  Object.keys(remote || {}).forEach(function(c){
    var r = remote[c], l = KZ.store[c];
    if(!l || r.t > l.t || (r.t === l.t && r.v !== l.v)){ KZ.store[c] = { v: !!r.v, t: r.t }; changed = true; }
  });
  return changed;
}
function kzRefresh(){
  kzSave();
  if(!state.student) return;
  state.DAYS = buildDays(state.student);
  renderTodayPanel();
  renderHeatmapPanel();
  if(calState.open) renderCalendar();
  renderCourseChecklist();
  kzWidget();
}
function kzFetch(path, opts){
  return fetch(KZ_API + path, Object.assign({ cache: 'no-store' }, opts || {})).then(function(r){
    if(!r.ok) throw new Error(r.status); return r.json();
  });
}
function kzPush(changes){
  if(!Object.keys(changes).length) return Promise.resolve();
  return kzFetch('ticks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) })
    .then(function(store){ KZ.online = true; if(kzApply(store)) kzRefresh(); })
    .catch(function(){ KZ.online = false; });
}
function kzSync(){
  var local = kzAbsorbWebTicks();
  if(kzApply(local)) kzRefresh();
  return kzFetch('ticks').then(function(remote){
    var wasOnline = KZ.online;
    KZ.online = true;
    if(!wasOnline) setTimeout(kzRefresh, 0);
    // Ours the server lacks or holds older go up; then the server's newer ones come down.
    var up = {};
    Object.keys(KZ.store).forEach(function(c){ if(!remote[c] || KZ.store[c].t > remote[c].t) up[c] = KZ.store[c]; });
    var changed = kzApply(remote);
    // Re-read the DSA plan from the app once per page load (it may have changed since the cached copy).
    var dsaWanted = kzDsaOn() && !KZ.dsaFresh;
    KZ.dsaFresh = true;
    return Promise.all([kzPush(up), dsaWanted ? kzFetch('plan').then(function(plan){
      var dsa = [];
      plan.forEach(function(part){ part[1].forEach(function(u){
        if(!/^D\d\d /.test(u[0])) return;
        u[2].forEach(function(t){ dsa.push({ code: t[0], title: t[1], unit: u[0], hours: t[4] || 1,
          link: t[2][0] && /^https?:/.test(t[2][0][1]) ? t[2][0][1] : null,
          roadmapLink: 'http://127.0.0.1:8830/ROADMAP.html#' + t[0] }); });
      }); });
      KZ.dsa = dsa; changed = true;
      try { localStorage.setItem(KZ_DSA_CACHE_KEY, JSON.stringify(dsa)); } catch(e){}
      kzCloudPushDsa();
    }) : null]).then(function(){ if(changed) kzRefresh(); });
  }).catch(function(){ if(KZ.online){ KZ.online = false; renderCourseChecklist(); kzWidget(); } });
}
function kzStart(){
  var c = kzCourse();
  if(KZ.started || !c || c.students.indexOf(state.loginEntry) === -1 || typeof fetch !== 'function') return;
  KZ.started = true;
  // The Kaizen app only ever runs on the Mac: a phone never probes 127.0.0.1 (Chrome would keep asking
  // for local-network access) and relies on the private cloud copy instead (kaizen_bridge.js).
  if(KZ.mobile) return;
  kzSync();
  setInterval(kzSync, 30000);
  window.addEventListener('focus', kzSync);
}
document.addEventListener('thirty:kaizen', function(){
  var data = window.__kzCloudData || {}, changed = kzApply(data.ticks || {});
  // The cloud's DSA plan stands in whenever the Kaizen app can't be reached (the phone, always).
  if(data.dsa && data.dsa.length && !KZ.online && data.dsaHash !== kzHash(JSON.stringify(KZ.dsa))){
    KZ.dsa = data.dsa; changed = true;
    try { localStorage.setItem(KZ_DSA_CACHE_KEY, JSON.stringify(KZ.dsa)); } catch(e){}
  }
  if(changed) kzRefresh(); else { kzCloudPushTicks(); kzWidget(); }
  kzCloudPushDsa();
});
document.addEventListener('thirty:kaizen-status', function(){ kzWidget(); });
// The public kaizen users list arrived/changed: greetings, squad names, the schedule (own kaizen on/off) follow.
document.addEventListener('thirty:kaizen-users', function(){
  if(!state.student) return;
  kpStart();
  renderHeader(state.student);
  state.DAYS = buildDays(state.student);
  render();
  kzWidget();
  ssSettingsUI();
  var gp = document.getElementById('groupsPanel');
  if(gp && gp.classList.contains('open')) renderGroupsPanel();
});
window.__toggleKaizen = function(code){
  KZ.store[code] = { v: !kzDone(code), t: Date.now() };
  kzRefresh();
  var ch = {}; ch[code] = KZ.store[code];
  kzPush(ch);
};
window.__setKaizenPref = function(key, val){
  if(key === 'dsa'){ try { localStorage.setItem(KZ_DSA_OFF_KEY, val ? '0' : '1'); } catch(e){} if(val) kzSync(); }
  else { KZ.prefs[key] = Math.max(0, Number(val) || 0); try { localStorage.setItem(KZ_PREFS_KEY, JSON.stringify(KZ.prefs)); } catch(e){} }
  kzRefresh();
};
function kzWidget(){
  var el = document.getElementById('kaizenPanel'), c = kzCourse();
  if(!el) return;
  var stripEl = document.getElementById('kaizenStrip');
  if(stripEl) stripEl.style.display = 'none';
  // The Kaizen card is everyone's (when self-study is switched on in Settings), same name and look; only the
  // Kaizen roadmap's own student also gets the roadmap sections and the sync chips.
  var own = state.student && state.student.entry === state.loginEntry;
  var mine = own && c && c.students.indexOf(state.loginEntry) !== -1;
  var today = todayISO(), ssp = ssPrefs(), goal = ssp.min;
  // Self-study off: the card pitches the feature instead (until "hide"); hidden + off = no card for non-members.
  var promoHidden = false;
  try { promoHidden = localStorage.getItem('thirtyatrpr_kaizen_promo_hidden') === '1'; } catch(e){}
  var promo = !ssp.on && !promoHidden;
  var strip = document.getElementById('kaizenStrip');
  if(strip) strip.style.display = own && promo ? '' : 'none';
  if(!own || (!mine && !ssp.on && !promo)){ el.style.display = 'none'; return; }
  if(promo && window.__kzPreload) window.__kzPreload();
  if(el.style.display === 'none' && kzWidget.shown){ el.classList.remove('kz-appear'); void el.offsetWidth; el.classList.add('kz-appear'); }
  kzWidget.shown = true;
  el.style.display = 'block';
  if(!mine) c = { items: [], dailyMin: 0 };
  var ml = c.items, dsaOn = kzDsaOn() && KZ.dsa.length;
  function stats(items){
    var done = 0, leftMin = 0, next = null;
    items.forEach(function(it){
      if(kzDone(it.code)) done++;
      else { leftMin += Math.round((it.hours || 1) * 60); if(!next) next = it; }
    });
    return { done: done, total: items.length, leftMin: leftMin, next: next };
  }
  var m = stats(ml), d = (mine && dsaOn) ? stats(KZ.dsa) : null;
  var dayRow = (state.DAYS || []).filter(function(x){ return x.d === today; })[0];
  var todayPlan = { ML: 0, DSA: 0 };
  ((dayRow && dayRow.items) || []).forEach(function(it){ if(it.kaizenTrack && !it.done && it.sMin != null) todayPlan[it.kaizenTrack] += it.eMin - it.sMin; });
  var dailyMin = KZ.prefs.dailyMin != null ? KZ.prefs.dailyMin : c.dailyMin;
  var eta = dailyMin > 0 && m.leftMin ? addDaysISO(today, Math.ceil(m.leftMin / dailyMin)) : null;
  function hm(min){ var h = Math.floor(min / 60), r = min % 60; return h ? h + ' h' + (r ? ' ' + r + ' m' : '') : r + ' m'; }
  function bar(done, total, cls){ return '<div class="kz-bar'+(cls?' '+cls:'')+'"><span style="width:'+(total ? Math.min(100, Math.round(100*done/total)) : 0)+'%"></span></div>'; }
  function nextHtml(n){
    if(!n) return '<div class="kz-next">Track complete.</div>';
    var href = n.link || kzRoadmapHref(n.code) || '#';
    return '<div class="kz-next"><span class="kz-code kz-grad">'+n.code+'</span><a href="'+href+'" target="_blank" rel="noopener">'+kzEsc(n.title)+'</a></div>'+
      '<div class="kz-meta">'+kzEsc(n.unit)+' &middot; ~'+hm(Math.round((n.hours||1)*60))+'</div>';
  }
  // Every block cancelled or missed today, where it went, and what was lost for good — kept in plain sight.
  function griefHtml(){
    var recs = ssMissed()[today] || [];
    if(!recs.length) return '';
    function recFor(t){ return recs.filter(function(r){ return ssRecCovers(r, t); })[0]; }
    // Follow each chain from its original block to where it finally landed, summing what fell off on the way.
    var seen = [];                                       // each record counted once, even if two chains share it
    function follow(r, acc){
      if(seen.indexOf(r) !== -1) return acc;
      seen.push(r);
      acc.short += r.short || 0;
      r.to.forEach(function(t){ var next = recFor(t); if(next){ if(seen.indexOf(next) === -1) acc.hops++; follow(next, acc); } else acc.to.push(t); });
      return acc;
    }
    var roots = recs.filter(function(r){ return !recs.some(function(o){ return o !== r && o.to.some(function(t){ return ssRecCovers(r, t); }); }); });
    var lost = 0;
    var rows = roots.map(function(r){
      var a = follow(r, { short: 0, to: [], hops: 0 });
      lost += a.short;
      var when = toHHMM(r.from[0])+'–'+toHHMM(r.from[1]);
      var went = a.to.length ? 'now at '+a.to.map(function(t){ return toHHMM(t[0]); }).join(', ') : '';
      return '<div class="kz-grief-row'+(a.short ? ' lost' : '')+'"><span>✗ '+when+' '+(r.kind || 'missed')+(a.hops ? ' ×'+(a.hops + 1) : '')+
        (went ? ' &rarr; '+went : '')+(a.short ? (went ? ', ' : ' &mdash; ')+hm(a.short)+' lost' : '')+'</span>'+
        '<a class="kz-undo" href="#" onclick="window.__ssUnmiss(\''+today+'\','+r.from[0]+','+r.from[1]+'); return false;">↺ undo</a></div>';
    });
    return '<div class="kz-grief">'+rows.join('')+
    (lost ? '<div class="kz-grief-sum">'+hm(lost)+' of self-study gone today. it isn\'t coming back.</div>' : '')+'</div>';
  }
  // Self-study: nothing to log — today's planned blocks (Settings), filled in by the clock as they pass.
  var ssBlocks = ((dayRow && dayRow.items) || []).filter(function(it){ return it.code === 'SELF-STUDY' && !it.missed; });
  var nowM = nowMinutes(), ssPlanned = 0, ssPassed = 0, ssNext = null;
  ssBlocks.forEach(function(b){
    ssPlanned += b.eMin - b.sMin;
    ssPassed += Math.max(0, Math.min(nowM, b.eMin) - b.sMin);
    if(!ssNext && b.eMin > nowM) ssNext = b;
  });
  el.innerHTML =
    (!mine ? '<div class="kz-head">kaizen'+
      // Same day on every device: this one isn't signed in to the user's private copy yet (kaizen_bridge.js).
      (ssp.on && (window.__kzPrivStatus === 'signed-out' || window.__kzPrivStatus === 'wrong-account') ?
        '<button class="kz-btn" style="margin-left:auto;padding:1px 8px;font-size:9.5px" onclick="window.__kpLink()" title="Sign in with your @iitrpr.ac.in Google account so this device shows the same day as your others">'+
          (window.__kzPrivStatus === 'wrong-account' ? 'wrong account — sign in' : 'sign in to sync')+'</button>' : '')+
      '</div>'+(ssp.on ? '<div class="kz-note" style="display:none"></div>' : '') :
    '<div class="kz-head">kaizen'+
      (KZ.mobile ? '' : '<span class="kz-sync'+(KZ.online?' on':'')+'" title="Kaizen app on the Mac">'+(KZ.online ? 'mac ✓' : 'mac off')+'</span>')+
      (window.__kzCloudStatus === 'on' ? '<span class="kz-sync on" style="margin-left:0" title="Private cloud copy — phone and PC">cloud ✓</span>' :
        '<button class="kz-btn" style="margin-left:0;padding:1px 8px;font-size:9.5px" onclick="window.__kzCloudSignIn && window.__kzCloudSignIn()" title="Sign in with your @iitrpr.ac.in Google account to sync Kaizen (DSA included) between phone and PC">'+
          (window.__kzCloudStatus === 'wrong-account' ? 'wrong account — sign in' : 'sign in to sync')+'</button>')+
      (!mine ? '' : '<a href="http://127.0.0.1:8840/" target="_blank" rel="noopener" class="kz-sync on" style="margin-left:0;text-decoration:none;color:inherit;font-weight:700;" title="TDX Reality Engine (Local / Cloud)">tdx ⚡</a>')+
    '</div>')+
    (promo ? '<div class="kz-sec kz-promo">'+
      '<div class="kz-promo-tag">new &middot; self-study</div>'+
      '<div class="kz-promo-title">2 hours a day.<br>on autopilot.</div>'+
      '<div class="kz-promo-sub">kaizen slots revision into the gaps between your classes &mdash; and rescues every block you skip.</div>'+
      '<div class="kz-chips"><span class="kz-chip c1">fits free time</span><span class="kz-chip c2">skips mess</span><span class="kz-chip c3">sleep-safe</span></div>'+
      '<div class="kz-promo-row"><button class="kz-cta" onclick="window.__kzPromo(\'on\')">✦ switch it on</button>'+
        '<a class="kz-promo-hide" href="#" onclick="window.__kzPromo(\'hide\'); return false;">not now</a></div>'+
      '<div class="kz-meta">links your IIT Ropar Google account</div><div class="kz-note" style="display:none"></div>'+
    '</div>' : '')+
    (!ssp.on ? '' : '<div class="kz-sec">'+
      '<div class="kz-label"><b>self-study</b><span class="kz-num">'+hm(ssPassed)+' / '+hm(ssPlanned)+'</span></div>'+
      bar(ssPassed, ssPlanned, 'ss')+
      '<div class="kz-meta">'+(!ssBlocks.length ? 'no self-study today' :
        ssBlocks.map(function(b){ return b.t; }).join(' &middot; ')+
        (ssNext ? (ssNext.sMin <= nowM ? ' &middot; on now' : ' &middot; next at '+toHHMM(ssNext.sMin)) : ' &middot; done for today'))+
        (ssPlanned < goal && ssBlocks.length ? ' &middot; only '+hm(ssPlanned)+' of '+hm(goal)+' fits today' : '')+'</div>'+
      griefHtml()+
    '</div>')+
    (!mine ? '' : '<div class="kz-sec">'+
      '<div class="kz-label"><b>ML roadmap</b><span class="kz-num">'+m.done+' / '+m.total+'</span></div>'+
      bar(m.done, m.total)+nextHtml(m.next)+
      '<div class="kz-meta">'+(todayPlan.ML ? hm(todayPlan.ML)+' planned today' : 'nothing more planned today')+
        ' &middot; '+Math.round(m.leftMin/60)+' h left'+(eta ? ' &middot; at '+hm(dailyMin)+'/day ≈ '+dateLabel(eta)+(eta.slice(0,4) !== today.slice(0,4) ? ' '+eta.slice(0,4) : '') : '')+'</div>'+
    '</div>')+
    (d ? '<div class="kz-sec">'+
      '<div class="kz-label"><b>DSA track</b><span class="kz-num">'+d.done+' / '+d.total+'</span></div>'+
      bar(d.done, d.total)+nextHtml(d.next)+
      '<div class="kz-meta">'+(todayPlan.DSA ? hm(todayPlan.DSA)+' planned today' : 'nothing more planned today')+'</div>'+
    '</div>' : '')+
    (!mine ? '' : '<div class="kz-sec kz-tdx" id="kzTdxSec">'+
      '<div class="kz-label"><b>⚡ TDX Reality Engine</b><span class="kz-num" id="kzTdxSyncStatus">sprint active</span></div>'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;gap:8px;">'+
        '<span style="font-size:11.5px;color:var(--ink-soft);">Endsem Sprint &middot; MA101, PH101 & AI101 linked</span>'+
        '<a href="http://127.0.0.1:8840/" target="_blank" rel="noopener" class="kz-btn" style="padding:3px 10px;font-size:10px;font-weight:700;text-decoration:none;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;border:none;border-radius:6px;white-space:nowrap;">Launch TDX ⚡</a>'+
      '</div>'+
      '<div class="kz-meta" style="margin-top:5px;">Daily adaptive target active &middot; auto-reschedules missed backlog</div>'+
    '</div>');
  if(mine) {
    try {
      fetch('http://127.0.0.1:8840/api/status', { mode: 'cors', cache: 'no-store' })
        .then(function(r){ return r.json(); })
        .then(function(res){
          var st = document.getElementById('kzTdxSyncStatus');
          if(st && res.resources){
            var tot = res.resources.reduce(function(a, b){ return a + (b.total_qs||0); }, 0);
            var dn = res.resources.reduce(function(a, b){ return a + (b.done_qs||0); }, 0);
            st.textContent = dn + ' / ' + tot + ' Qs';
          }
        }).catch(function(){});
    } catch(e){}
  }
}
window.__kzStrip = function(){
  // Land the card just below the (tall, sticky) phone header rather than centred underneath it.
  var el = document.getElementById('kaizenPanel'), head = document.querySelector('header');
  if(!el) return;
  var offset = (head ? head.getBoundingClientRect().height : 0) + 12;
  window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - offset, behavior: 'smooth' });
};
// Turning Kaizen on/off links the student's Google account and records it online (kaizen_bridge.js __kzLink);
// the roadmap's own students skip that. `apply` runs only once the record is written; on failure the switch goes
// back and a short note says why.
function kzSetOn(want, apply){
  var c = kzCourse(), member = !!(c && c.students.indexOf(state.loginEntry) !== -1);
  if(member){ apply(); return; }
  var sws = document.querySelectorAll('#kaizenSwitch, .kz-cta');
  kzNote('');
  if(typeof window.__kzLink !== 'function'){ kzNote('Kaizen needs your IIT Ropar Google account — couldn\'t reach sign-in, try again.'); ssSettingsUI(); return; }
  sws.forEach(function(el){ el.classList.add('busy'); });
  window.__kzLink(state.loginEntry, want).then(function(){
    var u = window.__kaizenUsers = window.__kaizenUsers || {};
    u[state.loginEntry] = { on: want };                      // the listener confirms it a moment later
    sws.forEach(function(el){ el.classList.remove('busy'); });
    apply();
    kpStart();
    if(state.student) renderHeader(state.student);           // the greeting turns kaizen-style right away
  }).catch(function(err){
    sws.forEach(function(el){ el.classList.remove('busy'); });
    var code = (err && err.message) || '';
    kzNote(code === 'wrong-account' ? 'That Google account isn\'t ' + state.loginEntry.toLowerCase() + '@iitrpr.ac.in — sign in with your own.'
      : code === 'cancelled' ? 'Kaizen needs your IIT Ropar Google account linked.'
      : 'Couldn\'t link your Google account right now — try again.');
    ssSettingsUI();
  });
}
function kzNote(msg){
  document.querySelectorAll('.kz-note').forEach(function(el){ el.textContent = msg; el.style.display = msg ? '' : 'none'; });
}
window.__kzPromo = function(action){
  if(action === 'on') kzSetOn(true, function(){ ssSetPrefs({ on: true, min: 120 }); });
  else { try { localStorage.setItem('thirtyatrpr_kaizen_promo_hidden', '1'); } catch(e){} kzWidget(); }
};
setInterval(kzWidget, 60000);   // keeps the self-study bar moving with the clock
// "In roadmap" opens the Kaizen app itself when it's reachable (the Mac): with Chrome's "Open supported links"
// on for the installed Kaizen app, the link lands in its window (manifest launch_handler: navigate-existing
// reuses the open one). Elsewhere ML tasks fall back to the website copy at /ml; DSA has no public copy.
function kzRoadmapHref(code){
  if(KZ.online) return 'http://127.0.0.1:8830/ROADMAP.html#' + code;
  return code.charAt(0) === 'U' ? '/ml/#' + code : null;
}
function kzLocalISO(ms){ var d = new Date(ms); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
// Free [s, e) minute ranges of a day, given what is already on it.
// Each meal keeps MEAL_MIN clear: 30 min to eat + 15 min to wind down after. It goes in the first gap of that
// length inside the mess's serving hours that the real schedule leaves open (so a class running into lunch
// pushes lunch later instead of eating it), or the longest gap there if none is long enough. Placed from the
// real schedule only — never from self-study/Kaizen blocks — so every planning pass agrees on it.
var MEAL_MIN = 30 + 15;
function mealSlots(iso, fixed){
  var sun = isSunday(weekdayNameOf(iso).slice(0,3));
  var meals = [(sun ? MESS.breakfastSun : MESS.breakfast) || MESS.breakfast, (sun ? MESS.lunchSun : MESS.lunch) || MESS.lunch,
    (MESS.dinnerEarly && iso <= MESS.dinnerEarlyUntil) ? MESS.dinnerEarly : MESS.dinner];
  var out = [], names = ['Breakfast', 'Lunch', 'Dinner'];
  meals.forEach(function(m, k){
    if(!m || !m.s || !m.e) return;
    var ws = toMin(m.s), we = toMin(m.e), gaps = [], cur = ws;
    fixed.filter(function(b){ return b[1] > ws && b[0] < we; }).sort(function(a, b){ return a[0] - b[0]; }).forEach(function(b){
      if(b[0] > cur) gaps.push([cur, b[0]]); cur = Math.max(cur, b[1]);
    });
    if(cur < we) gaps.push([cur, we]);
    var fit = gaps.filter(function(g){ return g[1] - g[0] >= MEAL_MIN; })[0];
    var slot = fit ? [fit[0], fit[0] + MEAL_MIN] :
      gaps.length ? gaps.sort(function(a, b){ return (b[1]-b[0]) - (a[1]-a[0]); })[0].slice() : null;
    if(slot){ slot.meal = names[k]; out.push(slot); }
  });
  return out;
}
function kzFreeRanges(iso, busyItems, fromMin){
  var endMin = 24*60 - (settings.winddown || 30);          // asleep by midnight
  var busy = [], fixed = [];
  busyItems.forEach(function(it){
    if(it.sMin == null || it.eMin == null || it.code === 'MESS' || it.missed) return;
    var b = [it.sMin - 10, it.eMin + 10];
    busy.push(b);
    if(!it.kaizenCode && it.code !== 'SELF-STUDY') fixed.push(b);
  });
  busy = busy.concat(mealSlots(iso, fixed));
  busy.push([0, Math.max(fromMin, 8*60)]);
  busy.sort(function(a, b){ return a[0] - b[0]; });
  var out = [], cur = 0;
  busy.forEach(function(b){ if(b[0] > cur) out.push([cur, Math.min(b[0], endMin)]); cur = Math.max(cur, b[1]); });
  if(cur < endMin) out.push([cur, endMin]);
  return out.filter(function(r){ return r[1] - r[0] >= 25; });
}
function kzPlanner(student){
  var c = kzCourse();
  if(!c || c.students.indexOf(student.entry) === -1 || student.entry !== state.loginEntry) return null;
  var dailyMin = KZ.prefs.dailyMin != null ? KZ.prefs.dailyMin : c.dailyMin;
  var dsaMin = KZ.prefs.dsaDailyMin != null ? KZ.prefs.dsaDailyMin : c.dsaDailyMin;
  var queues = [{ track: 'ML', items: c.items, budget: dailyMin }];
  if(kzDsaOn() && KZ.dsa.length) queues.push({ track: 'DSA', items: KZ.dsa, budget: dsaMin });
  queues.forEach(function(q){ q.i = 0; q.left = null; });
  var doneByDate = {};
  queues.forEach(function(q){ q.items.forEach(function(it){
    if(!kzDone(it.code)) return;
    var d = KZ.store[it.code].t > 1 ? kzLocalISO(KZ.store[it.code].t) : null;
    if(d) (doneByDate[d] = doneByDate[d] || []).push({ q: q, it: it });
  }); });
  function itemFor(q, it, s, e, part, done){
    return {
      sMin: s, eMin: e, t: s == null ? 'done' : (toHHMM(s)+' – '+toHHMM(e)),
      title: kzEsc(it.title) + (part ? ' · part '+part : ''), code: it.code, venue: null,
      type: 'class', category: c.category, color: subjectColor(q.track === 'ML' ? c.code : 'DSA'),
      selfCourse: true, kaizenCode: it.code, done: done,
      materialLink: it.link, kaizenTrack: q.track
    };
  }
  return function(iso, busyItems){
    var out = [];
    (doneByDate[iso] || []).forEach(function(d){ out.push(itemFor(d.q, d.it, null, null, 0, true)); });
    var today = state.TODAY || todayISO();
    if(iso < today) return out;
    // Self-study comes first: no Kaizen work is placed before the day's last self-study block has ended.
    var ssEnd = 0;
    busyItems.forEach(function(it){ if(it.code === 'SELF-STUDY' && it.eMin != null && it.eMin > ssEnd) ssEnd = it.eMin; });
    var free = kzFreeRanges(iso, busyItems, Math.max(iso === today ? nowMinutes() + 5 : 0, ssEnd));
    function take(mins, cb){                                 // carve up to `mins` from the earliest free time
      while(mins > 0 && free.length){
        var r = free[0], use = Math.min(mins, r[1] - r[0]);
        cb(r[0], r[0] + use); mins -= use; r[0] += use;
        if(r[1] - r[0] < 25) free.shift();
      }
    }
    var paused = (c.pauseRanges||[]).some(function(p){ return iso >= p.start && iso <= p.end; });
    if(paused) return out;
    queues.forEach(function(q){
      var budget = q.budget;
      while(budget > 0 && free.length){
        while(q.i < q.items.length && kzDone(q.items[q.i].code)){ q.i++; q.left = null; }
        if(q.i >= q.items.length) break;
        var it = q.items[q.i], total = Math.round((it.hours || 1) * 60);
        if(q.left == null){ q.left = total; q.part = 0; }
        var chunk = Math.min(q.left, budget), used = 0;
        take(chunk, function(s, e){
          q.part++; used += e - s;
          out.push(itemFor(q, it, s, e, (q.part > 1 || total > e - s) ? q.part : 0, false));
        });
        if(!used) break;
        budget -= used; q.left -= used;
        if(q.left <= 0){ q.i++; q.left = null; }
      }
    });
    return out;
  };
}
// Self-study time (Settings, any student, own schedule only): blocks of free time each day to revise, do
// assignments and tutorials, placed at fixed times from the start of the day (they never drift or roll over),
// through End-Sem. Off by default, except for the Kaizen roadmap's own student, whose plan was built around 2 h.
var SS_PREFS_KEY = 'thirtyatrpr_selfstudy_prefs';
var SELF_STUDY_UNTIL = '2026-11-26';   // last day of End-Sem
function ssPrefs(){
  var p = kzLoad(SS_PREFS_KEY, null) || {};
  var c = kzCourse(), member = !!(c && state.loginEntry && c.students.indexOf(state.loginEntry) !== -1);
  // Kaizen on/off: for everyone but the roadmap's own students the online record (/kaizenUsers, which needs a
  // linked Google account) is the truth once it has loaded; this device's last choice only bridges the moment before.
  var online = typeof window !== 'undefined' ? window.__kaizenUsers : null;
  var on = member ? (p.on != null ? !!p.on : true)
    : (online ? !!(online[state.loginEntry] && online[state.loginEntry].on) : !!p.on);
  return { on: on, min: p.min > 0 ? p.min : 120, from: p.from === 'evening' ? 'evening' : 'morning' };
}
function ssSetPrefs(patch){
  var before = kzLoad(SS_PREFS_KEY, null) || {}, p = Object.assign(ssPrefs(), patch);
  try { localStorage.setItem(SS_PREFS_KEY, JSON.stringify(p)); } catch(e){}
  kpTouch(Object.keys(patch || {}).filter(function(k){ return KP_FIELDS.indexOf(k) !== -1 && before[k] !== p[k]; }));
  ssSettingsUI();
  if(!state.student) return;
  state.DAYS = buildDays(state.student);
  renderTodayPanel();
  renderHeatmapPanel();
  if(calState.open) renderCalendar();
  kzWidget();
}
function ssSettingsUI(){
  var p = ssPrefs();
  var ks = document.getElementById('kaizenSwitch'), ms = document.getElementById('messSwitch');
  var more = document.getElementById('kaizenMore'), mins = document.getElementById('selfStudyMins');
  var from = document.getElementById('selfStudyFrom');
  if(ks){ ks.classList.toggle('on', p.on); ks.setAttribute('aria-checked', String(p.on)); }
  if(ms){ var mOn = messItemsOn(); ms.classList.toggle('on', mOn); ms.setAttribute('aria-checked', String(mOn)); }
  if(more) more.classList.toggle('open', p.on);
  if(mins) mins.value = p.min;
  if(from) from.querySelectorAll('[data-from]').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-from') === p.from); });
  segThumb(from);
}
// Slide a .seg-slide control's pill under its active button (measured, so options can differ in width).
function segThumb(seg){
  var thumb = seg && seg.querySelector('.seg-thumb'), act = seg && seg.querySelector('button.active');
  if(!thumb || !act || !act.offsetWidth) return;
  thumb.style.width = act.offsetWidth + 'px';
  thumb.style.transform = 'translateX(' + act.offsetLeft + 'px)';
}
// Mess on schedule (Settings, any student, own schedule only): the same meal slots the planner keeps clear.
var MESS_ITEMS_KEY = 'thirtyatrpr_mess_items';
function messItemsOn(){ try { return localStorage.getItem(MESS_ITEMS_KEY) === 'on'; } catch(e){ return false; } }
function messItems(iso, items){
  if(!messItemsOn()) return [];
  var fixed = [];
  items.forEach(function(it){ if(it.sMin != null && it.eMin != null) fixed.push([it.sMin - 10, it.eMin + 10]); });
  return mealSlots(iso, fixed).map(function(r){
    var short = r[1] - r[0] < MEAL_MIN;
    return { sMin: r[0], eMin: r[1], t: toHHMM(r[0])+' – '+toHHMM(r[1]), code: 'MESS', venue: null, type: 'class',
      title: r.meal + (short ? ' — only '+(r[1]-r[0])+' min free in mess hours' : ' — eat, then 15 min to wind down'),
      category: 'Mess', color: '#8b949e' };
  });
}
// "Missed it": a missed block's minutes are re-placed once, at click time, in the rest of that same day's free
// time and stored as {from: [s, e], to: [[s, e]...], short: minutes that didn't fit} per date — never moved to
// another day, and never re-flowed afterwards (so the new slot doesn't drift with the clock).
var SS_MISSED_KEY = 'thirtyatrpr_selfstudy_missed';
function ssMissed(){ return kzLoad(SS_MISSED_KEY, {}); }
function ssSaveMissed(m){
  var cutoff = addDaysISO(todayISO(), -14);
  Object.keys(m).forEach(function(d){ if(d < cutoff || !m[d].length) delete m[d]; });
  try { localStorage.setItem(SS_MISSED_KEY, JSON.stringify(m)); } catch(e){}
}
function selfStudyBlocks(iso, busyItems){
  var p = ssPrefs();
  if(!p.on || iso < CLASSES_START || iso > SELF_STUDY_UNTIL) return [];
  var free = kzFreeRanges(iso, busyItems, 0), left = p.min, blocks = [];
  if(p.from === 'evening'){
    // Evening first: free time from 5 PM onwards, in order; if that can't hold it all, the rest goes into the
    // latest free time before 5 PM (working backwards), so it stays as close to the evening as it can.
    var EVE = 17 * 60, eve = [], early = [];
    free.forEach(function(r){
      if(r[0] >= EVE) eve.push(r.slice());
      else if(r[1] <= EVE) early.push(r.slice());
      else { early.push([r[0], EVE]); eve.push([EVE, r[1]]); }
    });
    eve.forEach(function(r){ if(left <= 0 || r[1] - r[0] < 25) return; var use = Math.min(left, r[1] - r[0]); blocks.push({ s: r[0], e: r[0] + use }); left -= use; });
    early.reverse().forEach(function(r){ if(left <= 0 || r[1] - r[0] < 25) return; var use = Math.min(left, r[1] - r[0]); blocks.push({ s: r[1] - use, e: r[1] }); left -= use; });
  } else {
    while(left > 0 && free.length){
      var r = free.shift(), use = Math.min(left, r[1] - r[0]);
      blocks.push({ s: r[0], e: r[0] + use });
      left -= use;
    }
  }
  var recs = ssMissed()[iso] || [];
  recs.forEach(function(rec){ rec.to.forEach(function(t){ blocks.push({ s: t[0], e: t[1], resched: true, short: rec.short || 0 }); }); });
  // Cancelled/missed blocks leave the schedule entirely (the kaizen card's grief list keeps them, with undo);
  // only wherever their time ended up stays on it.
  var live = blocks.filter(function(b){ return !b.resched ? !recs.some(function(r){ return ssRecCovers(r, [b.s, b.e]); })
    : !recs.some(function(r){ return ssSame(r.from, [b.s, b.e]) || (r.parts || []).some(function(x){ return ssSame(x, [b.s, b.e]); }); }); });
  // Every piece must still fit today's real day: a move saved earlier can't sit on a meal or class added since.
  // Trim each piece to the current free time (classes, meals, bedtime kept clear); slivers under 10 min go.
  var freeNow = kzFreeRanges(iso, busyItems, 0), clipped = [];
  live.forEach(function(b){
    freeNow.forEach(function(r){
      var s0 = Math.max(b.s, r[0]), e0 = Math.min(b.e, r[1]);
      if(e0 - s0 >= 10) clipped.push({ s: s0, e: e0, resched: b.resched, short: b.short });
    });
  });
  live = clipped;
  // Blocks 10 min or less apart (the planner's buffer, slivers left by reschedules) are one sitting: merge
  // them, closed up — starting at the first, lasting their combined minutes (which still fits, since the whole
  // original span was free). `parts` remembers the pieces, so cancel / missed / undo act on all of them.
  live.sort(function(a, b){ return a.s - b.s; });
  var merged = [];
  live.forEach(function(b){
    var last = merged[merged.length - 1];
    if(last && b.s - last.end <= 10){
      last.dur += b.e - b.s; last.end = b.e; last.parts.push([b.s, b.e]);
      last.resched = last.resched || b.resched; last.short = Math.max(last.short, b.short || 0);
    } else merged.push({ s: b.s, end: b.e, dur: b.e - b.s, parts: [[b.s, b.e]], resched: !!b.resched, short: b.short || 0 });
  });
  // Never more self-study than the day's goal (a stale move can't double it up): trim from the latest block back.
  var total = merged.reduce(function(a, b){ return a + b.dur; }, 0), over = total - p.min;
  for(var k = merged.length - 1; k >= 0 && over > 0; k--){
    var cut = Math.min(over, merged[k].dur);
    merged[k].dur -= cut; over -= cut;
  }
  merged = merged.filter(function(b){ return b.dur >= 10; });
  return merged.map(function(b){
    var e = b.s + b.dur;
    return { sMin: b.s, eMin: e, t: toHHMM(b.s)+' – '+toHHMM(e), iso: iso, missed: false, rescheduled: b.resched, parts: b.parts,
      title: 'revise, assignments, tutorials' + (b.resched ? ' — rescheduled' + (b.short ? ' (' + b.short + ' min didn\'t fit today)' : '') : ''),
      code: 'SELF-STUDY', venue: null, type: 'class', category: 'Personal', color: '#8b949e' };
  });
}
// A record covers a block if it was made for exactly that block, or for a merged block containing it.
function ssSame(a, b){ return a[0] === b[0] && a[1] === b[1]; }
// Matching is by overlap, not exact times: the day's blocks get re-planned whenever anything changes (mess rows,
// BR edits...), and a block that shifted a few minutes must still count as the one that was cancelled/missed —
// exact matching let it come back next to its moved copy (doubled self-study, overlapping meals).
function ssOverlap(a, b){ return a[0] < b[1] && b[0] < a[1]; }
function ssRecCovers(rec, blk){
  return ssOverlap(rec.from, blk) || (rec.parts || []).some(function(p){ return ssOverlap(p, blk); });
}
// kind 'missed' (a block already under way): re-place from now. kind 'cancelled' (a block still ahead): push it
// at least an hour later (and past its own end) — cancel the new slot and it moves on again, until nothing fits
// before bedtime and the rest (`short`) is lost for the day.
function ssReplace(iso, s, e, kind){
  var day = (state.DAYS || []).filter(function(d){ return d.d === iso; })[0];
  if(!day) return;
  var item = day.items.filter(function(it){ return it.code === 'SELF-STUDY' && it.sMin === s && it.eMin === e; })[0];
  // Everything but Kaizen (which re-flows around whatever this decides) and the block itself.
  var fixed = day.items.filter(function(it){ return !it.kaizenCode && it !== item; });
  var from = kind === 'cancelled' ? Math.max(nowMinutes() + 5, e, s + 60) : nowMinutes() + 5;
  var free = kzFreeRanges(iso, fixed, from), need = e - s, to = [];
  while(need > 0 && free.length){
    var r = free.shift(), use = Math.min(need, r[1] - r[0]);
    to.push([r[0], r[0] + use]); need -= use;
  }
  var m = ssMissed();
  (m[iso] = m[iso] || []).push({ from: [s, e], parts: (item && item.parts) || [[s, e]], to: to, short: need, kind: kind });
  ssSaveMissed(m);
  kpTouchMoves(iso);
  ssSetPrefs({});
}
window.__ssMissed = function(iso, s, e){ ssReplace(iso, s, e, 'missed'); };
window.__ssCancel = function(iso, s, e){ ssReplace(iso, s, e, 'cancelled'); };
window.__ssUnmiss = function(iso, s, e){
  var m = ssMissed(), recs = m[iso] || [];
  function drop(blk){                                   // a re-cancelled rescheduled block goes with it
    recs.filter(function(r){ return ssRecCovers(r, blk); }).forEach(function(rec){
      recs = recs.filter(function(r){ return r !== rec; });
      rec.to.forEach(drop);
    });
  }
  drop([s, e]);
  m[iso] = recs;
  ssSaveMissed(m);
  kpTouchMoves(iso);
  ssSetPrefs({});
};
// ---- One Kaizen user's day, the same on every device (kaizen_bridge.js, /kaizenPrivate/{entry}) ----------------
// Settings that shape the day — self-study on/minutes/morning-or-evening, mess on schedule, the extras switch —
// and the "missed it"/"cancel" moves are mirrored into the user's private doc, each field (and each date's moves)
// as {v, t}: newest change wins, like KZ.store's ticks. localStorage stays the offline cache; the change times
// live beside it in KP_META_KEY, tagged with the entry they belong to (another student logging in on this device
// never pushes the last one's settings into their own doc).
var KP_META_KEY = 'thirtyatrpr_kaizen_sync', KP_FIELDS = ['on', 'min', 'from', 'mess', 'extras'];
function kpMeta(){
  var m = kzLoad(KP_META_KEY, null);
  if(m && m.entry === state.loginEntry) return m;
  return { entry: state.loginEntry, t: {}, moves: {}, seed: !m };   // seed: nothing synced on this device yet
}
function kpSaveMeta(m){ try { localStorage.setItem(KP_META_KEY, JSON.stringify(m)); } catch(e){} }
function kpGet(f){
  if(f === 'mess' || f === 'extras'){ try { return localStorage.getItem(f === 'mess' ? MESS_ITEMS_KEY : EXTRAS_KEY); } catch(e){ return null; } }
  var p = kzLoad(SS_PREFS_KEY, null) || {};
  return p[f] == null ? null : p[f];
}
function kpSet(f, v){
  if(f === 'mess' || f === 'extras'){ try { localStorage.setItem(f === 'mess' ? MESS_ITEMS_KEY : EXTRAS_KEY, v); } catch(e){} return; }
  var p = kzLoad(SS_PREFS_KEY, null) || {};
  p[f] = v;
  try { localStorage.setItem(SS_PREFS_KEY, JSON.stringify(p)); } catch(e){}
}
function kpReady(){ return window.__kzPrivStatus === 'on' && !!window.__kzPrivData && typeof window.__kzPrivWrite === 'function'; }
function kpStart(){
  if(state.loginEntry && typeof window.__kzPrivStart === 'function' && ssPrefs().on) window.__kzPrivStart(state.loginEntry);
}
function kpTouch(fields){
  if(!fields.length || !state.loginEntry) return;
  var m = kpMeta(), now = Date.now();
  fields.forEach(function(f){ m.t[f] = now; });
  kpSaveMeta(m);
  kpPush();
}
function kpTouchMoves(iso){
  if(!state.loginEntry) return;
  var m = kpMeta();
  m.moves[iso] = Date.now();
  kpSaveMeta(m);
  kpPush();
}
var kpValid = { on: function(v){ return typeof v === 'boolean'; }, min: function(v){ return typeof v === 'number' && v > 0 && v <= 1440; },
  from: function(v){ return v === 'morning' || v === 'evening'; }, mess: function(v){ return v === 'on' || v === 'off'; },
  extras: function(v){ return v === '0' || v === '1'; } };
// Whatever this device changed more recently than the doc goes up; dates past the 14-day window come out.
function kpPush(){
  if(!kpReady()) return;
  var remote = window.__kzPrivData, m = kpMeta(), up = {}, n = 0, cutoff = addDaysISO(todayISO(), -14);
  KP_FIELDS.forEach(function(f){
    var v = kpGet(f), lt = m.t[f] || 0, rt = (remote[f] && remote[f].t) || 0;
    if(lt === 0 && m.seed && !remote[f] && v != null) lt = m.t[f] = 1;   // first sync: this device's old choices seed the doc
    if(lt > rt && v != null && kpValid[f](v)){ up[f] = { v: v, t: lt }; n++; }
  });
  var missed = ssMissed(), rm = remote.moves || {}, mv = {};
  if(m.seed) Object.keys(missed).forEach(function(d){ if(!rm[d] && !m.moves[d]) m.moves[d] = 1; });
  Object.keys(m.moves).forEach(function(d){
    if(d < cutoff){ delete m.moves[d]; return; }
    if(m.moves[d] > ((rm[d] && rm[d].t) || 0)){ mv[d] = { v: JSON.stringify(missed[d] || []), t: m.moves[d] }; n++; }
  });
  if(Object.keys(mv).length) up.moves = mv;
  var drop = Object.keys(rm).filter(function(d){ return d < cutoff; });
  delete m.seed;
  kpSaveMeta(m);
  if(n || drop.length) window.__kzPrivWrite(up, drop);
}
// The doc changed (another device, or our own write coming back): take whatever is newer than ours.
function kpApply(){
  var remote = window.__kzPrivData;
  if(!remote) return false;
  var m = kpMeta(), changed = false;
  KP_FIELDS.forEach(function(f){
    var r = remote[f];
    if(r && r.t > (m.t[f] || 0) && kpValid[f](r.v)){
      m.t[f] = r.t;
      if(kpGet(f) !== r.v){ kpSet(f, r.v); changed = true; }
    }
  });
  var rm = remote.moves || {}, missed = null;
  Object.keys(rm).forEach(function(d){
    var r = rm[d];
    if(!r || !(r.t > (m.moves[d] || 0))) return;
    var v; try { v = JSON.parse(r.v); } catch(e){ return; }
    if(!Array.isArray(v)) return;
    m.moves[d] = r.t;
    missed = missed || ssMissed();
    if(JSON.stringify(missed[d] || []) !== JSON.stringify(v)){ missed[d] = v; changed = true; }
  });
  if(missed) ssSaveMissed(missed);
  kpSaveMeta(m);
  return changed;
}
document.addEventListener('thirty:kaizen-private', function(){
  if(kpApply() && state.student){
    state.DAYS = buildDays(state.student);
    render();
    if(calState.open) renderCalendar();
  }
  kpPush();
  kzWidget();
  ssSettingsUI();
});
window.__kpLink = function(){
  if(typeof window.__kzLink !== 'function') return;
  window.__kzLink(state.loginEntry, true).then(function(){ kpStart(); kzWidget(); })
    .catch(function(err){ kzNote((err && err.message) === 'wrong-account' ? 'That Google account isn\'t ' + state.loginEntry.toLowerCase() + '@iitrpr.ac.in — sign in with your own.' : 'Couldn\'t link your Google account right now — try again.'); });
};
function buildDays(student){
  var cal = DATA.calendar;
  var ismpByDate = {};
  DATA.ismpSchedule.forEach(function(day){ ismpByDate[day.date] = day; });

  var out = [];
  var kaizenFor = kzPlanner(student);
  var iso = cal.rangeStart;
  while(iso <= cal.rangeEnd){
    var ismpDay = ismpByDate[iso];
    var items = [];
    if(ismpDay){
      var lastMin = null;
      ismpDay.items.forEach(function(it){
        if(!ismpMatches(it, student)) return;
        var range = parseTimeRange(it.time);
        if(!range && lastMin !== null) range = lastMin;
        if(range) lastMin = range;
        items.push({
          sMin: range ? range.s : null,
          eMin: range ? range.e : null,
          t: range ? (toHHMM(range.s)+' – '+toHHMM(range.e)) : (it.time||''),
          title: it.title,
          venue: it.venue,
          type: it.type // group | common | sport
        });
      });
    }

    var wdFull = ismpDay ? ismpDay.day : weekdayNameOf(iso);
    var holiday = (cal.holidays && cal.holidays[iso]) || null;
    var noClass = (cal.noClassDays && cal.noClassDays[iso]) || null;
    var examLabel = examInfoFor(iso);
    var examDisputeNote = (cal.examStartDisputed && cal.examStartDisputed[iso]) || null;
    var ambig = cal.ambiguousWeekday && cal.ambiguousWeekday[iso];
    var classWd = (cal.followsWeekday && cal.followsWeekday[iso]) || (ambig && ambig.primary) || wdFull;
    // No regular classes run during the Mid-Sem Examinations week — EXCEPT 17 and 18 Sept, which
    // are explicitly excepted (instruction, 2026-09-15: "17 and 18 sept regular schedule followed
    // by those whose no exam"): on those two dates only, suppression is per-student (does THIS
    // student have a Mid-Sem exam TODAY), not blanket. 17 Sept has no exam for anyone anyway
    // (CY101 doesn't start until the 18th) so this only actually changes behavior for 18th's D1/D2
    // students — CY101 is D3/D4-only, so D1/D2 get their normal Friday schedule while D3/D4 get
    // just the exam. The rest of the exam week (19-22 Sept) keeps the original blanket
    // no-regular-classes behavior — that wasn't part of this instruction, and 19 Sept (a Saturday,
    // PH101 D1/D2-only) would mix weekend-pattern scheduling with exam logic in a way that hasn't
    // been confirmed, so it's deliberately left alone rather than generalized without being asked.
    var midsemWeek = midsemExamWeek();
    var inMidsemWindow = !!(midsemWeek && iso >= midsemWeek.start && iso <= midsemWeek.end);
    var midsemSuppressToday;
    if(inMidsemWindow && PARTIAL_EXAM_WEEK_DATES[iso]){
      midsemSuppressToday = ((DATA.dateOverrides && DATA.dateOverrides[iso]) || []).some(function(e){
        return /-MIDSEM$/.test(e.subject) && ttMatches(e, student);
      });
    } else {
      midsemSuppressToday = inMidsemWindow;
    }
    var classesStarted = iso >= CLASSES_START && (!cal.classesEnd || iso <= cal.classesEnd) && !holiday && !noClass && !midsemSuppressToday;

    // A date override for a given subject suppresses that subject's regular weekday-grid entry
    // on that exact date and substitutes the override instead — e.g. TL101's one-off Senate Hall
    // lecture on 14 Aug 2026 replaces (not duplicates) the regular Friday/Auditorium slot that day.
    var overrideRaw = (DATA.dateOverrides && DATA.dateOverrides[iso]) || [];
    // An HS/IKS elective mid-sem exam entry only applies to whichever option is actually the
    // student's own (or a classmate's official assignment) — IK101 is not a separate compulsory
    // exam everyone also sits, it's the 5th mutually exclusive option in the same pool (students
    // not placed in any HSS section are the ones placed in IKS instead). The other 4 options' exam
    // entries, present in the raw data since all 5 share one exam slot, are filtered out here
    // rather than shown as unrelated clutter. Unlike the regular weekly session, an unresolved pick
    // just means no exam item shows (no "which one is yours" prompt — not worth it for one entry).
    var hsCode = resolvedHsElective(student);
    overrideRaw = overrideRaw.filter(function(e){
      if(!/^(HS11[0-3]|IK101)-(MID|END)SEM/.test(e.subject)) return true;
      return hsCode && e.subject.indexOf(hsCode) === 0;
    });
    // A BR's live change can replace a date override too (e.g. G2's one-off Thu 15 Oct MA101-TUT
    // moved from EE-SH to S107 in /br) — buildClassItemsFromList below is called without `iso`, so
    // its own overlay-hide check can't match a date and the old item used to stay as a duplicate.
    overrideRaw = overrideRaw.filter(function(e){ return !overlayHidesSubjectOn(e.subject, iso, student, TIME_ORDER[e.time]); });
    // Only suppress the regular-grid item for students the override ACTUALLY applies to (ttMatches)
    // — not for every student sharing the subject code. Found as a real bug while adding G3's
    // same-day MA101-TUT makeup on 15 Sept 2026: since 15 Sept is also G1/G4/G5/G6's normal
    // Tuesday MA101-TUT slot, a subject-code-only suppression wrongly hid THEIR tutorials too, even
    // though the override entry is group-scoped to G3 alone. This never surfaced before because
    // every prior date override either applied to everyone (exams, universal quizzes) or landed on
    // a weekday with no other group's regular session in that same subject that day.
    var overriddenSubjects = {};
    overrideRaw.forEach(function(e){ if(ttMatches(e, student)) overriddenSubjects[e.subject] = true; });
    var isOwn = student.entry === state.loginEntry;
    // NO101 (NSO) is pulled out of the regular class list and handled separately via
    // nsoEntriesForDay below — display is gated on a personal opt-in choice, not just on whether
    // the timetable entry matches this student.
    var classes = classesStarted ? buildClassItems(classWd, student, iso).filter(function(c){ return !overriddenSubjects[c.code] && c.code !== 'NO101'; }) : [];
    // Not gated on classesStarted: a date override is a deliberate, manually-curated one-off (an
    // exam, a quiz) that can legitimately fall on a day otherwise marked holiday/no-class (e.g. the
    // AI101/CS100 mid-sem exam lands on a date also flagged as a no-class day for an unrelated
    // project-evaluation reason — the exam still happens).
    var dateOverrideClasses = buildClassItemsFromList(overrideRaw, student);
    // Mid-Sem seating (DATA.examSeating, from the Academic Section's official seating-plan
    // workbook) is per-student, not per-entry like a regular venue — so it's attached here rather
    // than baked into the DATE_OVERRIDES entry itself. Not every exam date has seating data (the
    // source workbook only had 4 of the 5 Mid-Sem exam dates finalized at merge time), so this is a
    // no-op — not a placeholder — wherever a lookup misses.
    dateOverrideClasses.forEach(function(it){
      if(it.category !== 'Exam' && it.category !== 'Quiz') return;
      var seat = DATA.examSeating && DATA.examSeating[iso] && DATA.examSeating[iso][student.entry];
      if(seat){
        it.venue = seat.room + (seat.seat ? ' · Seat ' + seat.seat : '');
        // Most exam seating comes from the Academic Section's own workbook (no named student
        // contributor); a few dates' seating was only filled in because a specific student shared
        // the sheet (e.g. 2026MEB1641 for 18 Sept CY101) — that's on the individual seat record,
        // not the DATE_OVERRIDES entry itself, since it's precise to which date's data they gave us.
        if(seat.contributedBy) it.contributedBy = seat.contributedBy;
      }
    });
    var electiveEntries = classesStarted ? electiveEntriesForDay(classWd, student, iso) : [];
    var nsoEntries = classesStarted ? nsoEntriesForDay(classWd, student, isOwn) : [];
    var sequentialClasses = sequentialCourseClassesForDate(iso, student);
    // BR-added items are regular-schedule-shaped additions, not creator-curated one-off exam
    // overrides (those live in DATA.dateOverrides and are deliberately exempt from classesStarted,
    // see dateOverrideClasses above) — so the Mid-Sem "no regular classes" rule takes priority over
    // them too, gated by this same classesStarted flag (which already encodes the 17/18 Sept
    // per-student exam exemption — see PARTIAL_EXAM_WEEK_DATES).
    var overlayShows = classesStarted ? overlayShowsForDate(iso, student) : [];
    var all = sortBySMin(items.concat(classes).concat(dateOverrideClasses).concat(electiveEntries).concat(nsoEntries).concat(sequentialClasses).concat(overlayShows));
    // Self-study (if switched on) then Kaizen: both only take whatever free time the day still has.
    if(student.entry === state.loginEntry){
      all = sortBySMin(all.concat(messItems(iso, all)));
      all = sortBySMin(all.concat(selfStudyBlocks(iso, all)));
    }
    if(kaizenFor) all = sortBySMin(all.concat(kaizenFor(iso, all)));
    // A date-scoped venue relocation (see DATA.venueRelocations) can apply to any item above
    // regardless of source — rewrite venues in place before this day is handed off to the UI.
    all.forEach(function(it){
      if(!it.venue) return;
      var reloc = relocatedVenue(it.venue, iso);
      it.venue = reloc.venue;
      if(reloc.movedFrom) it.venueMovedFrom = reloc.movedFrom;
    });

    // Days where a weekday-substitution is confirmed only by one of two conflicting official
    // sources: keep the primary interpretation as the default `all` list above, but also compute
    // what the day would look like under the alternate (undisputed) weekday, so the UI can offer
    // both instead of silently trusting one source.
    var altSchedule = null;
    if(ambig && classesStarted){
      var altClasses = buildClassItems(ambig.alternate, student, iso);
      var altElectives = electiveEntriesForDay(ambig.alternate, student);
      altSchedule = {
        label: ambig.alternate+' timetable',
        note: ambig.note,
        items: sortBySMin(items.concat(altClasses).concat(altElectives))
      };
    }

    out.push({
      d: iso,
      dow: wdFull.slice(0,3),
      full: wdFull,
      items: all,
      specialNote: holiday || noClass,
      examInfo: examLabel,
      examDisputeNote: examDisputeNote,
      altSchedule: altSchedule,
      altLabel: ambig ? (ambig.primary+' timetable') : null
    });
    iso = addDaysISO(iso, 1);
  }
  return out;
}

/* ================= settings state ================= */
var els = {};
var settings = { arrive:'07:45', prep:75, buffer:10, sleepTarget:7.5, winddown:30 };
function readSettings(){
  settings.arrive = els.arrive.value || '07:45';
  settings.prep = Number(els.prep.value)||75;
  settings.buffer = Number(els.buffer.value)||10;
  settings.sleepTarget = Number(els.sleepTarget.value)||7.5;
  settings.winddown = Number(els.winddown.value)||30;
}

/* ================= mess ================= */
var MESS = DATA.mess;

/* ================= division/branch <-> ISMP group mappings (derived from roster) ================= */
var DIVISION_GROUPS = {};   // division -> [ismpGroup,...]
var DIVISION_BY_GROUP = {}; // ismpGroup -> division
var BRANCHES_BY_GROUP = {}; // ismpGroup -> [branch,...]
var ALL_BRANCH_CODES = Object.keys(DATA.branchNames);
Object.keys(DATA.roster).forEach(function(entry){
  var s = DATA.roster[entry];
  if(!s.division || !s.ismpGroup) return;
  if(!DIVISION_GROUPS[s.division]) DIVISION_GROUPS[s.division] = [];
  if(DIVISION_GROUPS[s.division].indexOf(s.ismpGroup) === -1) DIVISION_GROUPS[s.division].push(s.ismpGroup);
  DIVISION_BY_GROUP[s.ismpGroup] = s.division;
  if(!BRANCHES_BY_GROUP[s.ismpGroup]) BRANCHES_BY_GROUP[s.ismpGroup] = [];
  if(BRANCHES_BY_GROUP[s.ismpGroup].indexOf(s.branch) === -1) BRANCHES_BY_GROUP[s.ismpGroup].push(s.branch);
});
Object.keys(DIVISION_GROUPS).forEach(function(d){ DIVISION_GROUPS[d].sort(function(a,b){return a-b;}); });

// One flat, pre-enriched list of every ISMP schedule item — each tagged with the exact divisions
// and branches its attending groups belong to, so a session can be found and understood (who's
// actually there) from a single search box instead of drilling through separate club/group modes.
var ALL_ISMP_SESSIONS = (function(){
  var out = [];
  DATA.ismpSchedule.forEach(function(day){
    day.items.forEach(function(it){
      var groups = it.groups || [];
      var branchSet = {}, divSet = {};
      groups.forEach(function(g){
        (BRANCHES_BY_GROUP[g]||[]).forEach(function(b){ branchSet[b]=true; });
        if(DIVISION_BY_GROUP[g]) divSet[DIVISION_BY_GROUP[g]]=true;
      });
      out.push({
        date: day.date, time: it.time, title: it.title, venue: it.venue, type: it.type,
        groups: groups.slice().sort(function(a,b){return a-b;}),
        branches: Object.keys(branchSet).sort(),
        divisions: Object.keys(divSet).sort()
      });
    });
  });
  out.sort(function(a,b){ return (a.date+(a.time||'')) < (b.date+(b.time||'')) ? -1 : 1; });
  return out;
})();

/* ================= render ================= */
var state = { student:null, loginEntry:null, DAYS:[], activeIdx:0, TODAY:null, altViewOn:false };

function isSunday(dow){ return dow==='Sun'; }
// Looks up that meal's items for a date from whichever MESS.menus entry covers it (a monthly
// rotating menu, keyed by full weekday name) — returns null outside any covered range.
function messMenuEntryFor(iso){
  var menus = MESS.menus || [];
  for(var i=0;i<menus.length;i++){
    if(iso >= menus[i].validFrom && iso <= menus[i].validTo) return menus[i];
  }
  return null;
}
function mealMenuFor(mealType, iso){
  var m = messMenuEntryFor(iso);
  return (m && m[mealType] && m[mealType][weekdayNameOf(iso)]) || null;
}

/* ================= self-study room openings (live status) ================= */
// Expands a room's weekly schedule into real timestamped windows, from the day before `centerISO`
// through `daysAhead` days after it (default 1 day ahead — just enough that an overnight window,
// e.g. 7pm-7am, starting yesterday or running into tomorrow is always captured regardless of what
// "now" is). The full-agenda view below passes a much larger daysAhead to get a week-plus of
// upcoming open/close events instead of just "now"'s status.
function expandRoomWindows(room, centerISO, daysAhead){
  daysAhead = daysAhead || 1;
  var out = [];
  for(var offset=-1; offset<=daysAhead; offset++){
    var d = addDaysISO(centerISO, offset);
    var wd = weekdayNameOf(d);
    (room.schedule[wd]||[]).forEach(function(r){
      var startTs = new Date(d+'T'+r.start+':00').getTime();
      var endDay = r.endsNextDay ? addDaysISO(d,1) : d;
      var endTs = new Date(endDay+'T'+r.end+':00').getTime();
      // The very first day of validity only takes effect from validFromTime onward (the source
      // email says "starting 7 PM tonight") — clip or drop any earlier portion of that day only.
      var ss = DATA.selfStudy;
      if(ss.validFromTime && d === ss.validFrom){
        var clipTs = new Date(d+'T'+ss.validFromTime+':00').getTime();
        if(endTs <= clipTs) return;
        if(startTs < clipTs) startTs = clipTs;
      }
      out.push({start: startTs, end: endTs});
    });
  }
  out.sort(function(a,b){ return a.start-b.start; });
  // An overnight session is stored as two separate weekday entries (e.g. "17:00-00:00" today
  // immediately followed by "00:00-08:50" tomorrow) since the schedule is keyed per weekday —
  // without merging, the status right before midnight reports "closes 12:00 AM" even though the
  // room stays open straight through, only "discovering" the real closing time once the date
  // rolls over into the next entry. Merge any windows that touch or overlap into one continuous
  // window so the reported close time is correct the whole time, not just after midnight.
  var merged = [];
  out.forEach(function(w){
    var last = merged[merged.length-1];
    if(last && w.start <= last.end) last.end = Math.max(last.end, w.end);
    else merged.push({start: w.start, end: w.end});
  });
  return merged;
}
function fmtRoomTime(ts, nowDate){
  var d = new Date(ts);
  var sameDay = d.toDateString() === nowDate.toDateString();
  var tomorrow = new Date(nowDate.getTime()+86400000);
  var isTomorrow = d.toDateString() === tomorrow.toDateString();
  var timeStr = d.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});
  if(sameDay) return timeStr;
  if(isTomorrow) return 'tomorrow '+timeStr;
  return dateLabel(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))+', '+timeStr;
}
function roomStatusNow(room){
  var now = new Date();
  var nowIso = todayISO();
  var windows = expandRoomWindows(room, nowIso);
  var nowTs = now.getTime();
  for(var i=0;i<windows.length;i++){
    if(nowTs >= windows[i].start && nowTs < windows[i].end){
      return {open: true, changeAt: fmtRoomTime(windows[i].end, now)};
    }
  }
  for(var j=0;j<windows.length;j++){
    if(windows[j].start > nowTs){
      return {open: false, changeAt: fmtRoomTime(windows[j].start, now)};
    }
  }
  return {open: false, changeAt: null};
}
// Clips a room's open windows to one specific calendar day, in minutes-since-midnight (0-1440) —
// the building block for the visual availability timeline below. Pulling from expandRoomWindows'
// day-before/day-of/day-after range means an overnight window that started yesterday correctly
// shows as open from 00:00, and one that runs past midnight is correctly cut off at 24:00 here
// (it reappears as its own segment starting at 00:00 on the NEXT day's call).
function dayWindowSegments(room, iso){
  var dayStart = new Date(iso+'T00:00:00').getTime();
  var dayEnd = new Date(addDaysISO(iso,1)+'T00:00:00').getTime();
  var windows = expandRoomWindows(room, iso, 1);
  var segs = [];
  windows.forEach(function(w){
    var s = Math.max(w.start, dayStart);
    var e = Math.min(w.end, dayEnd);
    if(e > s) segs.push({startMin: Math.round((s-dayStart)/60000), endMin: Math.round((e-dayStart)/60000)});
  });
  return segs;
}
function formatDaySegments(segments){
  if(!segments.length) return 'Closed all day';
  return segments.map(function(s){ return toHHMM(s.startMin)+'–'+toHHMM(s.endMin); }).join(', ');
}
// Renders one day's open windows as a horizontal availability bar (same visual language as the
// semester heatmap elsewhere in the app — filled blocks over a track — just laid out across a
// single 24-hour day instead of a whole term). `showNow` adds a live position marker for "now".
function timelineBarHtml(segments, opts){
  opts = opts || {};
  var blocks = segments.map(function(s){
    var leftPct = (s.startMin/1440)*100;
    var widthPct = Math.max(((s.endMin-s.startMin)/1440)*100, 0.6);
    return '<div class="room-open-block" style="left:'+leftPct.toFixed(2)+'%; width:'+widthPct.toFixed(2)+'%;"></div>';
  }).join('');
  var nowMarker = '';
  if(opts.showNow){
    var pct = (nowMinutes()/1440)*100;
    nowMarker = '<div class="room-now-marker" style="left:'+pct.toFixed(2)+'%"></div>';
  }
  return '<div class="room-timeline'+(opts.mini?' mini':'')+'">'+blocks+nowMarker+'</div>';
}
function selfStudyIsActive(){
  var ss = DATA.selfStudy;
  if(!ss) return false;
  var today = todayISO();
  return today >= ss.validFrom && today <= ss.validTo;
}

function tagHtml(cls,label){ return '<span class="tag '+cls+'">'+label+'</span>'; }

/* Dashboard rebuild: one flat checklist row per item instead of a card on a dotted timeline rail.
   Real done/pending state for personal-course items (ticked via the real checkbox, still wired to
   window.__toggleCourseItem exactly as before); everything else gets a time-based pseudo-done
   state (its end time has already passed "now") — only meaningful when viewing today. */
function checkRow(it, nowMin){
  if(it.type==='electivePick'){
    var pbtns = it.options.map(function(o){
      return '<button class="elective-pick-btn" onclick="window.__chooseElective(\''+o.code+'\')">'+
        '<span class="epb-code">'+o.code+'</span><span class="epb-title">'+o.title+(o.instructor?' &middot; '+o.instructor:'')+'</span></button>';
    }).join('');
    return '<div class="check-row check-row-block"><span class="check-box pending">[?]</span>'+
      '<span class="check-label">Which one is your HS/IKS elective?'+
      '<div class="elective-pick-row">'+pbtns+'</div></span></div>';
  }
  if(it.type==='nsoPick'){
    return '<div class="check-row check-row-block"><span class="check-box pending">[?]</span>'+
      '<span class="check-label">Have you opted for NSO?'+
      '<div class="elective-pick-row">'+
        '<button class="elective-pick-btn" onclick="window.__setNsoOptin(\'yes\')">'+
          '<span class="epb-code">Yes</span><span class="epb-title">Show my NSO schedule</span></button>'+
        '<button class="elective-pick-btn" onclick="window.__setNsoOptin(\'no\')">'+
          '<span class="epb-code">No</span><span class="epb-title">I haven\'t opted in</span></button>'+
      '</div></span></div>';
  }
  var isOwn = !state.student || state.student.entry === state.loginEntry;
  var codeLabel = '';
  if(it.type==='class'){
    var label = it.code || (it.category==='HS/IKS'?(isOwn?'Your elective':'Their elective'):'Class');
    var cs = it.color ? ' style="color:'+it.color+'"' : '';
    var plainTag = it.code === 'SELF-STUDY';   // kaizen's own, but colourless (MESS is a plain Settings feature)
    if((it.kaizenCode || plainTag) && it.color) cs = ' style="--tag:'+it.color+'"';
    codeLabel = '<span class="check-code'+(it.kaizenCode ? ' kz-tag' : plainTag ? ' kz-tag plain' : '')+'"'+cs+'>'+label+'</span> ';
  }
  var subTags = [];
  if(it.type==='group') subTags.push(isOwn?'Your group':'Their group');
  if(it.type==='common') subTags.push('Institute-wide');
  if(it.type==='sport') subTags.push('Sports');
  if(it.category==='Exam') subTags.push(/ — End-Sem Exam$/.test(it.title) ? 'End-Sem Exam' : 'Mid-Sem Exam');
  if(it.category==='Viva') subTags.push('Mid-Sem Viva');
  if(it.ta) subTags.push('TA: '+it.ta);
  var venueHtml = '';
  if(it.venue){
    var vd = venueDesc(it.venue);
    // The description half is hidden on phone widths (CSS) — narrow screens show just the venue
    // code (e.g. "EE-SH"), full width shows "EE-SH · Seminar Hall, ...". The "moved from" note (a
    // live venue relocation — see relocatedVenue) stays visible on phone too, unlike the
    // description, since it explains an unexpected room change rather than just naming the room.
    var movedHtml = it.venueMovedFrom ? '<span class="venue-moved">moved from '+(VENUE_DISPLAY_NAME[it.venueMovedFrom]||it.venueMovedFrom)+'</span>' : '';
    venueHtml = '<span class="check-venue"><span class="venue-code">'+it.venue+'</span>'+
      (vd ? '<span class="venue-desc"> &middot; '+vd+'</span>' : '')+movedHtml+'</span>';
  }
  var metaHtml = subTags.length ? '<span class="check-meta"> &middot; '+subTags.join(' &middot; ')+'</span>' : '';

  var linksHtml = '';
  if(it.kaizenCode){
    var roadmap = kzRoadmapHref(it.kaizenCode);
    linksHtml = '<div class="material-links">'+
      (it.materialLink ? '<a class="material-link" href="'+it.materialLink+'" target="_blank" rel="noopener">Open material &rarr;</a> ' : '')+
      (roadmap ? '<a class="material-link" href="'+roadmap+'" target="_blank" rel="noopener">In roadmap &rarr;</a>' : '')+
      '</div>';
  } else if(it.materialLink){
    linksHtml = '<div class="material-links">'+
      '<a class="material-link" href="'+it.materialLink+'" target="_blank" rel="noopener">'+escapeHtml(it.linkLabel || 'Open material')+' &rarr;</a>'+
      (it.materialLink2 ? ' <a class="material-link" href="'+it.materialLink2+'" target="_blank" rel="noopener">Instructions &rarr;</a>' : '')+
      '</div>';
  }

  // Personal courses (CS229/CS50) NEVER get the time-based pseudo-tick below, regardless of
  // isOwn — their checked state is always the real, manually-ticked progress, full stop. isOwn
  // only decides whether that state is shown as an interactive checkbox or a plain read-only box.
  var boxHtml, rowDone = false;
  if(it.selfCourse){
    rowDone = !!it.done;
    if(isOwn){
      boxHtml = '<label class="check-box-real'+(rowDone?' checked':'')+'">'+
        '<input type="checkbox"'+(rowDone?' checked':'')+(it.checkDisabled?' disabled':'')+
        ' onchange="'+(it.kaizenCode ? 'window.__toggleKaizen(\''+it.kaizenCode+'\')' : 'window.__toggleCourseItem(\''+it.code+'\','+it.itemIndex+')')+'"></label>';
    } else {
      boxHtml = '<span class="check-box'+(rowDone?'':' pending')+'">'+(rowDone?'[x]':'[ ]')+'</span>';
    }
  } else if(it.missed){
    boxHtml = '<span class="check-box missed">[-]</span>';
  } else {
    rowDone = (nowMin!==null && it.eMin!==null && it.eMin<=nowMin);
    boxHtml = '<span class="check-box'+(rowDone?'':' pending')+'">'+(rowDone?'[x]':'[ ]')+'</span>';
  }
  // Self-study, today only: a started block can be reported missed (re-placed later today), or undone.
  if(it.code === 'SELF-STUDY' && it.iso && nowMin !== null && isOwn){
    var args = '\''+it.iso+'\','+it.sMin+','+it.eMin;
    if(it.sMin <= nowMin) linksHtml = '<div class="material-links"><a class="material-link warn" href="#" onclick="window.__ssMissed('+args+'); return false;">missed it &middot; fit in later</a></div>';
    else linksHtml = '<div class="material-links"><a class="material-link warn" href="#" onclick="window.__ssCancel('+args+'); return false;">cancel &middot; push later</a></div>';
  }

  // Grouped into two units — [box+label] and [venue+time] — so that when a row has to wrap on a
  // narrow screen, the whole trailing group drops to its own line rather than separating the
  // checkbox from its label (which used to leave the box stranded alone on the first line).
  // Extras (mess / self-study / kaizen) are tagged so the extras switch can animate them in and out.
  var extra = isExtraItem(it) ? ' is-extra' : '';
  var xKind = isExtraItem(it) ? (it.code === 'MESS' ? 'mess' : 'kz') : '';
  if(extra) linksHtml = linksHtml.replace('class="material-links"', 'class="material-links is-extra"');
  return '<div class="check-row'+(rowDone?' done':'')+extra+'"'+(xKind ? ' data-x="'+xKind+'"' : '')+' data-k="'+encodeURIComponent((it.title||'')+'|'+it.sMin)+'">'+
    '<div class="check-main">'+boxHtml+'<span class="check-label">'+codeLabel+it.title+metaHtml+'</span></div>'+
    '<div class="check-side">'+venueHtml+'<span class="check-time">'+(it.t||'Time TBA')+'</span></div>'+
    '</div>'+linksHtml;
}

// Live BR Tools edits arrive a moment after first paint (live_overlay_bridge.js). The today panel never shows
// the timetable without them — it could be wrong. Until they land it shows a pip-style progress bar. If they
// fail, or 12 s pass with no reply, this device's last received copy (OVERLAY_CACHE_KEY, if under 24 h old) is
// used and labelled; with no such copy the panel says so and offers a retry, while the listener keeps trying
// in the background and the schedule appears the moment the edits arrive. A page without the live bridge (or a
// test sandbox) never waits.
// "Extras" = what this app adds on top of the timetable for you: mess rows, self-study and personal-course
// tasks (Kaizen, CS50). Squads never shows them; on your own day a switch beside the date hides/shows them.
// While something animates, scrollbars stay hidden (sliding rows / growing sections would flash one in for a
// moment); scrolling itself still works. Called at the start of every animation below.
function quietScroll(ms){
  if(typeof document === 'undefined' || !document.documentElement || !document.documentElement.classList) return;
  document.documentElement.classList.add('anim-run');
  clearTimeout(quietScroll.t);
  quietScroll.t = setTimeout(function(){ document.documentElement.classList.remove('anim-run'); }, ms || 700);
}
function isExtraItem(it){ return it.code === 'MESS' || it.code === 'SELF-STUDY' || !!it.selfCourse; }
var EXTRAS_KEY = 'thirtyatrpr_show_extras';
function extrasShown(){ try { return localStorage.getItem(EXTRAS_KEY) !== '0'; } catch(e){ return true; } }
// The switch flips in place first (knob slides + squishes, glow fades), then: turning off, the extras slip out
// sideways and fold away before the day re-renders; turning on, the day re-renders and they pop in one after
// another with a little overshoot and a kaizen-coloured flash.
window.__toggleExtras = function(){
  var turningOn = !extrasShown();
  try { localStorage.setItem(EXTRAS_KEY, turningOn ? '1' : '0'); } catch(e){}
  kpTouch(['extras']);
  var body = document.getElementById('todayPanelBody');
  var sw = body && body.querySelector('.kz-switch');
  var plain = !!(sw && sw.classList.contains('plain'));    // mess-only switch: a simple fade, no kaizen flourish
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(sw){ sw.classList.toggle('on', turningOn); if(!plain) sw.classList.add('flip'); }
  if(still || !body){ renderTodayPanel(); return; }
  quietScroll(900);
  var before = extrasSnapshot();
  function rerender(){
    renderTodayPanel();
    var b = document.getElementById('todayPanelBody');
    b.classList.remove('day-in-next', 'day-in-prev');
    extrasFlip(before);
    if(turningOn) b.querySelectorAll('.is-extra').forEach(function(el, i){
      if(!plain) el.style.animationDelay = (i * 45) + 'ms';
      el.classList.add(plain ? 'extra-in-plain' : 'extra-in');
    });
  }
  if(!turningOn){
    body.querySelectorAll('.is-extra').forEach(function(el, i){
      if(!plain) el.style.animationDelay = (i * 25) + 'ms';
      el.classList.add(plain ? 'extra-out-plain' : 'extra-out');
    });
    setTimeout(rerender, plain ? 160 : 230);
  } else setTimeout(rerender, plain ? 60 : 120);
};
// Animated change to the day's schedule (Settings switches, self-study minutes / morning-evening): rows that are
// going away (`leaving(rowEl)`) slip out first, then `mutate()` applies the change (it re-renders), surviving rows
// glide to their new spots (extrasFlip), and rows that weren't there before pop in — kaizen-style, or a plain fade.
function scheduleTransition(mutate, opts){
  opts = opts || {};
  var body = document.getElementById('todayPanelBody');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(still || !body || !body.querySelector('.check-row')){ mutate(); return; }
  quietScroll(900);
  var before = extrasSnapshot();
  var outCls = opts.plain ? 'extra-out-plain' : 'extra-out', inCls = opts.plain ? 'extra-in-plain' : 'extra-in';
  var leaving = opts.leaving ? Array.prototype.filter.call(body.querySelectorAll('.check-row'), opts.leaving) : [];
  leaving.forEach(function(r, i){
    [r, r.nextElementSibling && r.nextElementSibling.classList.contains('material-links') ? r.nextElementSibling : null].forEach(function(el){
      if(!el) return;
      if(!opts.plain) el.style.animationDelay = (i * 25) + 'ms';
      el.classList.add(outCls);
    });
  });
  function go(){
    mutate();
    var b = document.getElementById('todayPanelBody');
    b.classList.remove('day-in-next', 'day-in-prev');
    extrasFlip(before);
    var n = 0;
    b.querySelectorAll('.check-row[data-k]').forEach(function(r){
      if(before.rows[r.getAttribute('data-k')] != null) return;
      var links = r.nextElementSibling && r.nextElementSibling.classList.contains('material-links') ? r.nextElementSibling : null;
      [r, links].forEach(function(el){ if(!el) return; if(!opts.plain) el.style.animationDelay = (n * 45) + 'ms'; el.classList.add(inCls); });
      n++;
    });
  }
  if(leaving.length) setTimeout(go, opts.plain ? 160 : 230); else go();
}
// FLIP for the extras switch: remember where the panel's rows and progress bar were, re-render, then glide every
// surviving row from its old spot to its new one, grow/shrink the panel's height (so the cards below move
// smoothly instead of jumping), and slide the progress bar from its old width.
function extrasSnapshot(){
  var panel = document.getElementById('todayPanel'), body = document.getElementById('todayPanelBody');
  var top = panel.getBoundingClientRect().top, rows = {};
  body.querySelectorAll('.check-row[data-k]').forEach(function(r){ rows[r.getAttribute('data-k')] = r.getBoundingClientRect().top - top; });
  var fill = body.querySelector('.bar-fill');
  return { h: panel.offsetHeight, rows: rows, bar: fill ? fill.style.width : null, pct: (body.querySelector('.bar-pct') || {}).textContent };
}
function extrasFlip(before){
  var panel = document.getElementById('todayPanel'), body = document.getElementById('todayPanelBody');
  var top = panel.getBoundingClientRect().top, ease = 'cubic-bezier(.2,.8,.3,1)';
  body.querySelectorAll('.check-row[data-k]').forEach(function(r){
    var was = before.rows[r.getAttribute('data-k')];
    if(was == null || r.classList.contains('is-extra')) return;
    var dy = was - (r.getBoundingClientRect().top - top);
    if(!dy) return;
    var links = r.nextElementSibling && r.nextElementSibling.classList.contains('material-links') ? r.nextElementSibling : null;
    [r, links].forEach(function(el){
      if(!el) return;
      el.style.transition = 'none'; el.style.transform = 'translateY(' + dy + 'px)';
      void el.offsetWidth;
      el.style.transition = 'transform .32s ' + ease; el.style.transform = '';
      setTimeout(function(){ el.style.transition = ''; }, 360);
    });
  });
  var h = panel.offsetHeight;
  if(h !== before.h){
    panel.style.height = before.h + 'px'; panel.style.overflow = 'hidden';
    void panel.offsetWidth;
    panel.style.transition = 'height .32s ' + ease; panel.style.height = h + 'px';
    setTimeout(function(){ panel.style.height = ''; panel.style.overflow = ''; panel.style.transition = ''; }, 360);
  }
  var fill = body.querySelector('.bar-fill');
  if(fill && before.bar && fill.style.width !== before.bar){
    var to = fill.style.width;
    fill.style.transition = 'none'; fill.style.width = before.bar;
    void fill.offsetWidth;
    fill.style.transition = 'width .45s ' + ease; fill.style.width = to;
    setTimeout(function(){ fill.style.transition = ''; }, 500);
  }
}
var OVERLAY_CACHE_KEY = 'thirtyatrpr_overlay_cache';
var OVERLAY_SYNC = { ready: !window.__liveOverlayExpected, pct: 0, timer: null, cachedAt: null, failed: null };
function overlayBootLine(html){ var line = document.getElementById('bootOverlay'); if(line) line.innerHTML = html; }
function overlayShow(reveal){
  clearInterval(OVERLAY_SYNC.timer); OVERLAY_SYNC.timer = null;
  if(!state.student) return;
  state.DAYS = buildDays(state.student); render();
}
// The schedule's first appearance (after the loading bar, or straight away when the BR edits beat it): rows rise
// in one after another and the progress bar fills from zero. Once per page load — see renderTodayPanel.
function scheduleReveal(body){
  if(!body || !body.querySelectorAll || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  window.__scheduleRevealedAt = Math.round(performance.now());   // (when the reveal ran — handy for checking it)
  quietScroll(1200);
  body.querySelectorAll('.check-row, .material-links, .stat-row, .bar-wrap, .bar-caption, .panel-note').forEach(function(el, i){
    el.style.animationDelay = Math.min(i * 35, 600) + 'ms';
    el.classList.add('row-in');
  });
  var fill = body.querySelector('.bar-fill');
  if(fill){
    var to = fill.style.width;
    fill.style.transition = 'none'; fill.style.width = '0%';
    void fill.offsetWidth;
    fill.style.transition = 'width .7s cubic-bezier(.2,.8,.3,1) .15s'; fill.style.width = to;
    setTimeout(function(){ fill.style.transition = ''; }, 900);
  }
}
function overlayArrived(){
  var wasReady = OVERLAY_SYNC.ready;
  OVERLAY_SYNC.ready = true; OVERLAY_SYNC.failed = null; OVERLAY_SYNC.cachedAt = null; OVERLAY_SYNC.pct = 100;
  overlayBootLine('<br><span class="ok">[ok]</span> br edits loaded');
  var body = document.getElementById('todayPanelBody');
  if(!wasReady && body && body.querySelector('.sync-loader')){ body.innerHTML = syncLoaderHtml(); setTimeout(overlayShow, 180); }
  else overlayShow();
}
function overlayUnavailable(why){
  if(OVERLAY_SYNC.ready) return;
  var c = kzLoad(OVERLAY_CACHE_KEY, null);
  if(c && c.docs && c.t && Date.now() - c.t < 864e5){
    DATA.liveOverlay = c.docs;
    OVERLAY_SYNC.ready = true; OVERLAY_SYNC.cachedAt = c.t;
    var d = new Date(c.t);
    overlayBootLine('<br><span class="warn">[!!]</span> br edits offline ('+why+') &mdash; saved copy from '+
      (kzLocalISO(c.t) === todayISO() ? '' : dateLabel(kzLocalISO(c.t))+' ')+toHHMM(d.getHours()*60 + d.getMinutes()));
    overlayShow();
    return;
  }
  OVERLAY_SYNC.failed = why;
  overlayBootLine('<br><span class="warn">[!!]</span> br edits offline ('+why+') &mdash; still trying');
  renderTodayPanel();
}
if(!OVERLAY_SYNC.ready) setTimeout(function(){ overlayUnavailable('no reply in 12 s'); }, 12000);
document.addEventListener('thirty:overlay-failed', function(ev){ overlayUnavailable((ev && ev.detail) || 'error'); });
// pip-style bar: '━' filled (magenta, green once done) with a '╸' head over a dim '━' track, then % and eta.
// The bar stretches to its box: a long run of '━' clipped to the track's width, the fill clipped to pct% of it
// (right-anchored, so the '╸' head sits at the fill's edge).
var PIP_RUN = new Array(301).join('━');
function syncLoaderHtml(){
  if(OVERLAY_SYNC.failed){
    return '<div class="sync-loader"><div class="cmd">./thirty --sync br-edits</div>'+
      '<div class="sync-err">✗ couldn\'t reach your branch reps\' live edits ('+OVERLAY_SYNC.failed+')</div>'+
      '<div class="sub">not showing the timetable without them &mdash; it could be wrong. still trying in the background <span class="cursor"></span></div>'+
      '<button class="material-link sync-retry" onclick="location.reload()">↻ retry</button></div>';
  }
  var pct = OVERLAY_SYNC.pct, done = pct >= 100;
  var eta = done ? '0:00:00' : '0:00:0' + Math.max(1, Math.round((100 - pct) / 30));
  return '<div class="sync-loader"><div class="cmd">./thirty --sync br-edits</div>'+
    '<div class="pip"><span class="pip-bar"><span class="pip-rest">'+PIP_RUN+'</span>'+
      '<span class="pip-fill'+(done?' done':'')+'" style="width:'+pct.toFixed(1)+'%">'+(done ? '' : '╸')+PIP_RUN+'</span></span>'+
      '<span class="pip-pct">'+Math.round(pct)+'%</span><span class="pip-eta">eta '+eta+'</span></div>'+
    '<div class="sub">fetching live corrections from your branch reps <span class="cursor"></span></div></div>';
}
function renderTodayPanel(){
  if(!OVERLAY_SYNC.ready){
    var body = document.getElementById('todayPanelBody');
    if(body) body.innerHTML = syncLoaderHtml();
    if(!OVERLAY_SYNC.timer && !OVERLAY_SYNC.failed) OVERLAY_SYNC.timer = setInterval(function(){
      OVERLAY_SYNC.pct += (92 - OVERLAY_SYNC.pct) * 0.09;     // eases toward 92% until the data actually lands
      var b = document.getElementById('todayPanelBody');
      if(b && !OVERLAY_SYNC.ready && !OVERLAY_SYNC.failed) b.innerHTML = syncLoaderHtml();
    }, 90);
    if(OVERLAY_SYNC.failed){ clearInterval(OVERLAY_SYNC.timer); OVERLAY_SYNC.timer = null; }
    return;
  }
  var day = state.DAYS[state.activeIdx];
  var showAlt = state.altViewOn && day.altSchedule;
  var dayItems = showAlt ? day.altSchedule.items : day.items;
  renderContributorAttribution(dayItems);
  var lunch = isSunday(day.dow) ? MESS.lunchSun : MESS.lunch;
  var dinner = (MESS.dinnerEarly && day.d <= MESS.dinnerEarlyUntil) ? MESS.dinnerEarly : MESS.dinner;

  var arriveM = toMin(settings.arrive);
  var wakeM = arriveM - settings.prep - settings.buffer;
  var lastEnd = toMin(dinner.e);
  dayItems.forEach(function(it){ if(it.eMin!==null && it.eMin>lastEnd) lastEnd = it.eMin; });
  var bedtimeM = lastEnd + settings.winddown;
  var sleepMins = (wakeM+1440) - bedtimeM;
  if(sleepMins<0) sleepMins += 1440;
  var sleepClass='good';
  if(sleepMins < settings.sleepTarget*60-60) sleepClass='low';
  else if(sleepMins < settings.sleepTarget*60) sleepClass='ok';

  var isToday = day.d === state.TODAY;
  var nowMin = isToday ? nowMinutes() : null;

  // The extras switch (own schedule only): sleep above is still worked out from the full day.
  // Shown while kaizen is on (self-study on, or the Kaizen roadmap's own student) — in kaizen colours with the fun
  // animation — or, with kaizen off, while mess rows are on: then a plain switch with a simple fade, just for mess.
  // With neither there's no switch, and nothing is hidden.
  var own = !state.student || state.student.entry === state.loginEntry;
  var kzc = kzCourse();
  var kzOn = own && (ssPrefs().on || !!(kzc && kzc.students.indexOf(state.loginEntry) !== -1));
  var plainSwitch = !kzOn && own && messItemsOn();
  var hasSwitch = kzOn || plainSwitch;
  var showExtras = !hasSwitch || extrasShown();
  if(!showExtras) dayItems = dayItems.filter(function(it){ return !isExtraItem(it); });
  var trackable = dayItems.filter(function(it){ return it.type!=='electivePick'; });
  var doneCount = trackable.filter(function(it){
    return it.selfCourse ? it.done : (nowMin!==null && it.eMin!==null && it.eMin<=nowMin);
  }).length;
  var pct = trackable.length ? Math.round(100*doneCount/trackable.length) : 0;

  var noteLines = [];
  if(day.specialNote) noteLines.push('<div class="panel-note warn">! '+day.specialNote+'</div>');
  if(day.examInfo) noteLines.push('<div class="panel-note'+(day.examDisputeNote?' warn':' exam')+'">&middot; '+day.examInfo+(day.examDisputeNote?' ?':'')+'</div>');
  if(day.examDisputeNote) noteLines.push('<div class="panel-note warn">&#9888; Sources disagree here: '+day.examDisputeNote+'</div>');
  if(day.altSchedule){
    noteLines.push('<div class="panel-note warn">&#9888; Sources disagree here: '+day.altSchedule.note+
      ' &mdash; showing <b>'+(showAlt ? day.altSchedule.label : day.altLabel)+'</b> &middot; '+
      '<button class="alt-toggle-btn" id="altToggleBtn">Show '+(showAlt ? day.altLabel : day.altSchedule.label)+' instead</button></div>');
  }

  // Desktop keeps the day-nav in its very original spot, beside the "$ today — date" text (there's
  // plenty of row width there on a wide screen, so the weekday-name-length wobble never mattered).
  // Phone puts it on the sleep-stat line instead — the "$ today" line's length swings too much
  // between e.g. "monday" and "wednesday" for the nav to sit there without visibly shifting while
  // speed-tapping the arrow.
  var isDesktopNav = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 601px)').matches;
  var daynavHtml = '<div class="daynav">'+
      '<button id="dayPrevBtn" aria-label="Previous day">&larr;</button>'+
      (isToday?'':'<button id="dayTodayBtn">today</button>')+
      '<button id="dayNextBtn" aria-label="Next day">&rarr;</button>'+
    '</div>';

  var html = '';
  html += '<div class="panel-head'+(hasSwitch ? ' with-switch' : '')+'">'+
    '<div class="panel-head-line"><span class="prompt">$</span> '+(isToday?'today':fullDow(day.dow).toLowerCase())+' &mdash; '+
      '<button class="date-open-cal" id="dayDateBtn" title="Open month view">'+dateLabel(day.d).toLowerCase()+', 2026</button>'+
      '</div>'+
      (hasSwitch ? '<button class="kz-switch'+(plainSwitch?' plain':'')+(showExtras?' on':'')+'" role="switch" aria-checked="'+showExtras+'"'+
        ' aria-label="'+(plainSwitch?'Show mess items':'Show mess and kaizen items')+'" title="'+(showExtras?'Hide':'Show')+(plainSwitch?' mess items':' mess &amp; kaizen items')+'" onclick="window.__toggleExtras()"><i></i></button>' : '')+
    (isDesktopNav ? daynavHtml : '')+
    '</div>';

  if(noteLines.length) html += noteLines.join('');

  html += '<div class="stat-row">'+
    '<div class="stat"><span class="flame">&#9670;</span> sleep <b>'+fmtDur(sleepMins)+'</b> <span class="stat-sub">(lights out ~'+toHHMM(bedtimeM)+' &rarr; up '+toHHMM(wakeM)+')</span></div>'+
    (isDesktopNav ? '' : daynavHtml)+
    '</div>';

  if(isToday && trackable.length){
    html += '<div class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div>'+
      '<div class="bar-pct">'+doneCount+' / '+trackable.length+' done</div></div>'+
      '<div class="bar-caption">// today\'s schedule &mdash; items before "now" auto-marked done</div>';
  }

  var rows = sortBySMin(dayItems).map(function(it){ return checkRow(it, nowMin); }).join('');
  if(!rows) rows = '<div class="check-row"><span class="check-label" style="color:var(--ink-soft)">'+(day.specialNote || 'Nothing listed for you on this day &mdash; a genuinely free one.')+'</span></div>';
  html += '<div class="checklist">'+rows+'</div>';

  var panelBody = document.getElementById('todayPanelBody');
  panelBody.innerHTML = html;
  if(!renderTodayPanel.revealed){ renderTodayPanel.revealed = true; try { scheduleReveal(panelBody); } catch(e){} }
  // Switching days slides the new one in (from the right going forward, from the left going back) — quick, and
  // only when the day actually changed, never on the panel's own refreshes (live BR edits, ticks, the clock).
  var prevDay = renderTodayPanel.lastDay;
  renderTodayPanel.lastDay = day.d;
  if(prevDay && prevDay !== day.d){
    quietScroll(400);
    panelBody.classList.remove('day-in-next', 'day-in-prev');
    void panelBody.offsetWidth;                          // restart the animation if days change in quick succession
    panelBody.classList.add(day.d > prevDay ? 'day-in-next' : 'day-in-prev');
  }

  document.getElementById('dayPrevBtn').addEventListener('click', function(){ stepDay(-1); });
  document.getElementById('dayNextBtn').addEventListener('click', function(){ stepDay(1); });
  document.getElementById('dayDateBtn').addEventListener('click', openMonthView);
  var tb = document.getElementById('dayTodayBtn');
  if(tb) tb.addEventListener('click', jumpToToday);
  var altBtn = document.getElementById('altToggleBtn');
  if(altBtn) altBtn.addEventListener('click', function(){ state.altViewOn = !state.altViewOn; renderTodayPanel(); });
}
function stepDay(delta){
  var ni = state.activeIdx + delta;
  if(ni<0 || ni>=state.DAYS.length) return;
  state.activeIdx = ni;
  state.altViewOn = false;
  renderTodayPanel();
  renderMessPanel();
  if(calState.open) renderCalendar();
}
function jumpToToday(){
  if(state.todayIdx === -1) return;
  state.activeIdx = state.todayIdx;
  state.altViewOn = false;
  renderTodayPanel();
  renderMessPanel();
  if(calState.open) renderCalendar();
}
function jumpToIdx(idx){
  state.activeIdx = idx;
  state.altViewOn = false;
  renderTodayPanel();
  renderMessPanel();
}

/* Separate mess panel (breakfast/lunch/dinner for the day being viewed) — kept out of the main
   checklist entirely, its own "$ mess" panel instead. */
function renderMessPanel(){
  var day = state.DAYS[state.activeIdx];
  var breakfast = (isSunday(day.dow) && MESS.breakfastSun) ? MESS.breakfastSun : MESS.breakfast;
  var lunch = isSunday(day.dow) ? MESS.lunchSun : MESS.lunch;
  var dinner = (MESS.dinnerEarly && day.d <= MESS.dinnerEarlyUntil) ? MESS.dinnerEarly : MESS.dinner;
  var meals = [
    {label: (isSunday(day.dow) && MESS.breakfastSun)?'Breakfast (Sun timing)':'Breakfast', time: toHHMM(toMin(breakfast.s))+' – '+toHHMM(toMin(breakfast.e)), items: mealMenuFor('breakfast', day.d)},
    {label: isSunday(day.dow)?'Lunch (Sun timing)':'Lunch', time: toHHMM(toMin(lunch.s))+' – '+toHHMM(toMin(lunch.e)), items: mealMenuFor('lunch', day.d)},
    {label:'Dinner', time: toHHMM(toMin(dinner.s))+' – '+toHHMM(toMin(dinner.e)), items: mealMenuFor('dinner', day.d)}
  ];
  var rows = meals.map(function(m){
    var hasMenu = m.items && m.items.length;
    return '<div class="check-row'+(hasMenu?'':' check-row-compact')+'">'+
      '<div class="check-main"><span class="check-box mess-dot">&#8942;</span>'+
      '<span class="check-label">'+m.label+(hasMenu?'<div class="check-venue mess-items">'+m.items.join(' &middot; ')+'</div>':'')+'</span></div>'+
      '<div class="check-side"><span class="check-time">'+m.time+'</span></div></div>';
  }).join('');
  // A carried-forward (not officially published) month's menu gets a visible disclaimer.
  var menuEntry = messMenuEntryFor(day.d);
  var disclaimer = (menuEntry && menuEntry.assumed && menuEntry.note) ? '<div class="mess-disclaimer">&#9888; '+menuEntry.note+'</div>' : '';
  document.getElementById('messPanelBody').innerHTML = disclaimer + '<div class="checklist">'+rows+'</div>';
  // No menu data for ANY meal today (outside every MESS.menus validFrom/validTo range) — the panel
  // is only showing timings, so its heading shouldn't claim to be a "menu".
  var anyMenuToday = meals.some(function(m){ return m.items && m.items.length; });
  var head = document.getElementById('messPanelHead');
  if(head) head.innerHTML = '<span class="prompt">$</span> mess '+(anyMenuToday?'menu':'timings');
}

/* GitHub-style contribution heatmap of real per-day schedule density for the whole classes
   period — replaces the old month-by-month calendar toggle as the "see everything" overview;
   clicking a cell jumps the today-panel to that date. */
function renderHeatmapPanel(){
  var grid = document.getElementById('heatGrid');
  if(!grid) return;
  grid.innerHTML = '';
  var cal = DATA.calendar;
  var endIso = cal.classesEnd || state.DAYS[state.DAYS.length-1].d;
  var days = state.DAYS.filter(function(d){ return d.d >= cal.classesStart && d.d <= endIso; });
  if(!days.length) return;
  var firstDow = new Date(days[0].d+'T00:00:00').getDay();
  var padded = [];
  for(var i=0;i<firstDow;i++) padded.push(null);
  days.forEach(function(d){ padded.push(d); });
  var weeks = Math.ceil(padded.length/7);
  for(var w=0; w<weeks; w++){
    var col = document.createElement('div');
    col.className = 'heat-col';
    for(var d2=0; d2<7; d2++){
      var day = padded[w*7+d2];
      var cellEl = document.createElement('div');
      if(!day){
        cellEl.className = 'heat-cell';
        cellEl.style.opacity = '0';
      } else if(day.specialNote){
        cellEl.className = 'heat-cell hh';
        cellEl.title = day.d+' — '+day.specialNote;
      } else {
        var mins = dayBusyMinutes(day, 'academic');
        cellEl.className = 'heat-cell h'+heatLevel(mins);
        cellEl.title = day.d;
        (function(idx){
          cellEl.addEventListener('click', function(){ jumpToIdx(idx); });
        })(state.DAYS.indexOf(day));
      }
      col.appendChild(cellEl);
    }
    grid.appendChild(col);
  }
}

// The horizontal day-strip and floating "today" FAB are gone in this layout — day switching now
// lives in the today-panel's own prev/next/today controls (renderTodayPanel) plus clicking a cell
// in the semester heatmap (renderHeatmapPanel).
function render(){
  renderTodayPanel();
  renderMessPanel();
  renderHeatmapPanel();
}

/* ================= month calendar ================= */
var calState = { open:false, scope:'academic', monthIso:null };

function mergeIntervalMinutes(ranges){
  if(!ranges.length) return 0;
  ranges.sort(function(a,b){ return a[0]-b[0]; });
  var total=0, curS=ranges[0][0], curE=ranges[0][1];
  for(var i=1;i<ranges.length;i++){
    var r=ranges[i];
    if(r[0] <= curE){ if(r[1]>curE) curE=r[1]; }
    else { total += curE-curS; curS=r[0]; curE=r[1]; }
  }
  total += curE-curS;
  return total;
}
function dayBusyMinutes(day, scope){
  var ranges = [];
  day.items.forEach(function(it){
    if(it.sMin===null || it.eMin===null) return;
    if(scope==='academic' && it.type!=='class' && it.type!=='electivePick') return;
    ranges.push([it.sMin, it.eMin]);
  });
  return mergeIntervalMinutes(ranges);
}
function heatLevel(mins){
  if(mins<=0) return 0;
  if(mins<=90) return 1;
  if(mins<=210) return 2;
  if(mins<=360) return 3;
  return 4;
}
function monthLabel(iso){
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var d = isoToDate(iso);
  return months[d.getMonth()]+' '+d.getFullYear();
}
function shiftMonth(iso, delta){
  var d = isoToDate(iso);
  var y = d.getFullYear(), m = d.getMonth()+delta;
  return new Date(y, m, 1).getFullYear()+'-'+String(new Date(y,m,1).getMonth()+1).padStart(2,'0')+'-01';
}
function renderCalendar(){
  if(!state.DAYS.length) return;
  document.getElementById('calMonthLabel').textContent = monthLabel(calState.monthIso);
  var daysByIso = {};
  state.DAYS.forEach(function(d,i){ daysByIso[d.d] = {day:d, idx:i}; });

  var monthStart = isoToDate(calState.monthIso);
  var y = monthStart.getFullYear(), m = monthStart.getMonth();
  var firstDow = monthStart.getDay(); // 0=Sun
  var daysInMonth = new Date(y, m+1, 0).getDate();

  var grid = document.getElementById('calGrid');
  var html = '';
  for(var i=0;i<firstDow;i++) html += '<div class="cal-cell empty"></div>';
  for(var dnum=1; dnum<=daysInMonth; dnum++){
    var iso = y+'-'+String(m+1).padStart(2,'0')+'-'+String(dnum).padStart(2,'0');
    var entry = daysByIso[iso];
    if(!entry){
      html += '<div class="cal-cell disabled">'+dnum+'</div>';
      continue;
    }
    var day = entry.day;
    var mins = dayBusyMinutes(day, calState.scope);
    var level = heatLevel(mins);
    var cls = 'cal-cell heat-'+level;
    if(iso === state.TODAY) cls += ' today';
    if(entry.idx === state.activeIdx) cls += ' selected';
    var disputed = day.altSchedule || day.examDisputeNote;
    var mark = disputed ? '<span class="cal-mark dispute"></span>' : (day.specialNote || day.examInfo) ? '<span class="cal-mark"></span>' : '';
    html += '<div class="'+cls+'" data-idx="'+entry.idx+'">'+dnum+mark+'</div>';
  }
  grid.innerHTML = html;
  Array.prototype.forEach.call(grid.querySelectorAll('.cal-cell[data-idx]'), function(cell){
    cell.addEventListener('click', function(){
      jumpToIdx(Number(cell.getAttribute('data-idx')));
      document.getElementById('calPanel').classList.remove('open');
      document.getElementById('calToggleBtn').setAttribute('aria-expanded','false');
      updateBackdrop();
    });
  });
}
// Panels (month calendar, clubs & groups, search, settings) are mutually exclusive collapsibles —
// opening one tucks the others away so the header doesn't get cluttered on a small screen.
var ALL_PANELS = [
  {panelId:'calPanel', btnId:'calToggleBtn'},
  {panelId:'clubsPanel', btnId:'clubsToggleBtn'},
  {panelId:'studyPanel', btnId:'studyToggleBtn'},
  {panelId:'searchPanel', btnId:'searchBtn'},
  {panelId:'groupsPanel', btnId:'groupsToggleBtn'},
  {panelId:'settingsPanel', btnId:'settingsBtn'},
  {panelId:'contributorPanel', btnId:null}, // no toggle button — opened programmatically, see openContributorCard
];
function closePanels(exceptPanelId){
  ALL_PANELS.forEach(function(p){
    if(p.panelId === exceptPanelId) return;
    var panel = document.getElementById(p.panelId);
    var btn = document.getElementById(p.btnId);
    panel.classList.remove('open');
    if(btn) btn.setAttribute('aria-expanded','false');
  });
  updateBackdrop();
}
// Blurs/dims the rest of the page behind whichever floating glass panel is open (a real modal
// backdrop, not just the panel itself being frosted) — shown whenever any panel in ALL_PANELS is
// open, hidden the moment none are. Clicking it dismisses whatever's open, like a native sheet.
function updateBackdrop(){
  var backdrop = document.getElementById('panelBackdrop');
  if(!backdrop) return;
  var anyOpen = ALL_PANELS.some(function(p){
    var panel = document.getElementById(p.panelId);
    return panel && panel.classList.contains('open');
  });
  backdrop.classList.toggle('show', anyOpen);
}
function initPanelBackdrop(){
  var backdrop = document.getElementById('panelBackdrop');
  if(!backdrop) return;
  backdrop.addEventListener('click', function(){
    closePanels(null);
  });
}
// Shared by the Month toggle button and clicking the date in the today-panel's header — both
// just need "make sure the month view is open and showing the right month."
function openMonthView(){
  var panel = document.getElementById('calPanel');
  var toggleBtn = document.getElementById('calToggleBtn');
  calState.open = true;
  closePanels('calPanel');
  panel.classList.add('open');
  toggleBtn.setAttribute('aria-expanded', 'true');
  calState.monthIso = (state.DAYS[state.activeIdx]||state.DAYS[0]).d.slice(0,8)+'01';
  renderCalendar();
  updateBackdrop();
}
function initCalendar(){
  var panel = document.getElementById('calPanel');
  var toggleBtn = document.getElementById('calToggleBtn');
  toggleBtn.addEventListener('click', function(){
    var willOpen = !panel.classList.contains('open');
    if(willOpen){ openMonthView(); return; }
    calState.open = false;
    panel.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    updateBackdrop();
  });
  document.getElementById('calPrevBtn').addEventListener('click', function(){
    calState.monthIso = shiftMonth(calState.monthIso, -1);
    renderCalendar();
  });
  document.getElementById('calNextBtn').addEventListener('click', function(){
    calState.monthIso = shiftMonth(calState.monthIso, 1);
    renderCalendar();
  });
}

// Scans every timetable/date-override entry that actually applies to this student and collects
// the unique contributedBy names across all of them — a student's schedule can be a mix of
// several different contributors' data (one for a lab slot, another for a venue fix, etc.), so
// credit isn't scoped to a whole branch/division, just to whichever specific entries a
// contributor's data produced and that this student happens to match.
// Scoped to the SPECIFIC day currently on screen, not the student's whole week — a contributor is
// credited only when something they actually contributed is part of TODAY's (or whichever day is
// active) real, resolved schedule. This deliberately excludes an unanswered 'nsoPick' prompt (no
// contributedBy field on that item) — asking "have you opted in?" isn't showing anyone's data yet.
function contributorsForItems(items){
  var seen = {};
  var out = [];
  items.forEach(function(it){
    if(!it.contributedBy || seen[it.contributedBy]) return;
    seen[it.contributedBy] = true;
    var s = DATA.roster[it.contributedBy];
    out.push({entry: it.contributedBy, name: s ? titleCaseFirstName(s.name) : it.contributedBy});
  });
  return out;
}
function renderContributorAttribution(items){
  var attribution = document.getElementById('branchAttribution');
  var contributors = contributorsForItems(items);
  if(contributors.length){
    var nameLinks = contributors.map(function(c){
      return '<button class="contributor-name-link" data-contributor-entry="'+c.entry+'">'+c.name+'</button>';
    });
    var namesText = nameLinks.length === 1 ? nameLinks[0] :
      (nameLinks.slice(0,-1).join(', ')+' & '+nameLinks[nameLinks.length-1]);
    attribution.style.display = 'block';
    attribution.innerHTML = '❤️ Some of this day\'s schedule shared by <b>'+namesText+'</b>';
  } else {
    attribution.style.display = 'none';
  }
}

// A DIFFERENT, coarser mechanism from contributorsForItems above: a branch-wide (or branch+group)
// "a real student has checked this schedule" stamp, persistent for the whole student view rather
// than scoped to whichever day is on screen — see DATA.scheduleVerifications / build/merge.py.
// First matching record wins; a record with no `group` covers every group in that branch.
function verifierForStudent(student){
  var recs = DATA.scheduleVerifications || [];
  for(var i=0;i<recs.length;i++){
    var r = recs[i];
    if(r.branch !== student.branch) continue;
    if(r.group && r.group !== student.academicGroup) continue;
    return r.verifiedBy;
  }
  return null;
}
function renderVerifiedBadge(student){
  var badge = document.getElementById('verifiedBadge');
  if(!badge) return;
  var verifierEntry = verifierForStudent(student);
  if(!verifierEntry){
    badge.style.display = 'none';
    return;
  }
  var vs = DATA.roster[verifierEntry];
  var vName = vs ? titleCaseFirstName(vs.name) : verifierEntry;
  badge.style.display = 'flex';
  badge.innerHTML = '<span class="verified-badge-icon">&#10003;</span>'+
    '<span class="verified-badge-text">Schedule verified by <button class="contributor-name-link" data-contributor-entry="'+verifierEntry+'">'+vName+'</button></span>';
}

// A THIRD, separate role from the two above — Branch Representatives, one (or two co-BRs) per
// exact branch+group combination, unrelated to schedule accuracy at all (see DATA.batchReps /
// build/merge.py). Persistent per-student like the verified badge, not day-scoped.
function brsForStudent(student){
  var recs = DATA.batchReps || [];
  for(var i=0;i<recs.length;i++){
    var r = recs[i];
    if(r.branch === student.branch && r.group === student.academicGroup){
      return r.reps.map(function(entry){
        var s = DATA.roster[entry];
        return {entry: entry, name: s ? titleCaseFirstName(s.name) : entry};
      });
    }
  }
  return [];
}
function renderBrNote(student){
  var el = document.getElementById('brNote');
  if(!el) return;
  var brs = brsForStudent(student);
  if(!brs.length){
    el.style.display = 'none';
    return;
  }
  var nameLinks = brs.map(function(b){
    return '<button class="contributor-name-link" data-contributor-entry="'+b.entry+'">'+b.name+'</button>';
  });
  var namesText = nameLinks.length === 1 ? nameLinks[0] :
    (nameLinks.slice(0,-1).join(', ')+' & '+nameLinks[nameLinks.length-1]);
  el.style.display = 'block';
  el.innerHTML = 'Your BR: '+namesText;
}

/* Clicking a contributor's name (in the header badge or the "shared by" credit line) opens a small
   card with their identity — same Liquid Glass floating-panel treatment as the other panels (rises
   from the bottom on phone, docks near the sidebar on desktop), since `.calpanel` already gives us
   that responsive placement for free. */
// The card can now open for THREE different reasons (a data contributor, a schedule verifier, a
// Branch Representative — someone can be any combination of the three), so both the heading and
// the closing note are built dynamically from whichever actually apply, instead of always saying
// "Contributor" regardless of why the card was opened.
function personRolesFor(entry){
  var isCreator = hasRole(entry, 'creator');
  var isContributor = hasRole(entry, 'contributor');
  var verifiedRecs = (DATA.scheduleVerifications || []).filter(function(r){ return r.verifiedBy === entry; });
  var brRecs = (DATA.batchReps || []).filter(function(r){ return (r.reps || []).indexOf(entry) !== -1; });
  return {isCreator: isCreator, isContributor: isContributor, verifiedRecs: verifiedRecs, brRecs: brRecs};
}
// Roles rank, highest wins (only one badge/heading is ever shown): Creator > Contributor > Branch
// Rep > plain Student. Verifying a schedule counts as contributing to it, so a pure verifier ranks
// as a Contributor too, not a separate lower tier — explicit user call ("all who verified are
// contributors too"), not just a Creator/BR omission bug.
function personCardHeading(roles){
  if(roles.isCreator) return '👑 Creator';
  if(roles.isContributor || roles.verifiedRecs.length) return '⭐ Contributor';
  if(roles.brRecs.length) return 'Branch Rep';
  return 'Student';
}
function openContributorCard(entry){
  var s = DATA.roster[entry];
  var panel = document.getElementById('contributorPanel');
  var body = document.getElementById('contributorCardBody');
  if(!s || !panel || !body) return;
  var branchName = DATA.branchNames[s.branch] || s.branch;
  var roles = personRolesFor(entry);
  var displayName = CONTRIBUTOR_NAME_OVERRIDE[entry] || s.name.trim();
  var summary = contributionSummaryFor(entry);
  body.innerHTML = '<h3>'+personCardHeading(roles)+'</h3>'+
    '<div class="contributor-card-name">'+displayName+
      ' <button class="card-view-btn" data-view-entry="'+entry+'" title="View their schedule" aria-label="View '+displayName+'\'s schedule">&#128064;</button>'+
    '</div>'+
    (summary ? '<div class="contributor-card-contrib">'+summary+'</div>' : '')+
    '<div class="contributor-card-row"><span>Entry number</span><b>'+s.entry+'</b></div>'+
    '<div class="contributor-card-row"><span>Branch</span><b>'+branchName+'</b></div>'+
    '<div class="contributor-card-row"><span>Group / Division</span><b>'+(s.academicGroup?('Group '+s.academicGroup+' &middot; '):'')+s.division+'</b></div>';
  closePanels('contributorPanel');
  panel.classList.add('open');
  updateBackdrop();
}
// Mentors are 2025-batch seniors — not in DATA.roster at all (a different batch entirely), so
// unlike openContributorCard there's no roster record to look up; name/entry come straight from
// the viewed student's own `mentor`/`mentorEntry` fields instead (see renderMentorNote below).
// Mentors aren't in DATA.roster (2025 batch, a different roster entirely), but their branch is
// still readable straight off their own entry number's letter code — same convention as
// build/merge.py's BRANCH_MAP, just enough of it replicated here to label a mentor's branch
// without needing that whole roster.
var ENTRY_BRANCH_CODE_MAP = {
  AI:'AIDE', AIB:'AIDE', AIDE:'AIDE', CS:'CSE', CSB:'CSE', CSE:'CSE',
  EE:'EE', EEB:'EE', EP:'EP', EPB:'EP', ES:'ES', ESB:'ES',
  DA:'DA', DAB:'DA', CH:'CH', CHB:'CH', CE:'CE', CEB:'CE',
  ME:'ME', MEB:'ME', MM:'MME', MMB:'MME', MME:'MME',
  MC:'MCB', MCB:'MCB', MNC:'MCB', ICDT:'ICDT', ICB:'ICDT',
};
function branchNameFromEntry(entry){
  var m = /^\d{4}([A-Z]+)\d+$/.exec(entry);
  if(!m) return null;
  var code = ENTRY_BRANCH_CODE_MAP[m[1]];
  if(!code) return null;
  return DATA.branchNames[code] || code;
}
function openMentorCard(name, entry){
  var panel = document.getElementById('contributorPanel');
  var body = document.getElementById('contributorCardBody');
  if(!panel || !body) return;
  var branchName = branchNameFromEntry(entry);
  body.innerHTML = '<h3>Mentor</h3>'+
    '<div class="contributor-card-name">'+name+'</div>'+
    '<div class="contributor-card-row"><span>Entry number</span><b>'+entry+'</b></div>'+
    (branchName ? '<div class="contributor-card-row"><span>Branch</span><b>'+branchName+'</b></div>' : '');
  closePanels('contributorPanel');
  panel.classList.add('open');
  updateBackdrop();
}
function renderMentorNote(student){
  var el = document.getElementById('mentorNote');
  if(!el) return;
  if(!student.mentor || !student.mentorEntry){
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.innerHTML = 'Your Mentor: <button class="contributor-name-link" data-mentor-entry="'+student.mentorEntry+'" data-mentor-name="'+student.mentor.trim()+'">'+titleCaseFirstName(student.mentor)+'</button>';
}
// Delegated (not bound at init) since the elements that trigger this — the header's role-pill and
// the "shared by" credit line — are rebuilt via innerHTML on every renderHeader call, so any
// listener attached directly to them would be lost on the very next render.
function initContributorCard(){
  document.addEventListener('click', function(e){
    var mentorTrigger = e.target.closest && e.target.closest('[data-mentor-entry]');
    if(mentorTrigger){
      openMentorCard(mentorTrigger.getAttribute('data-mentor-name'), mentorTrigger.getAttribute('data-mentor-entry'));
      return;
    }
    // The eyes button inside a person card — same "view their real schedule" action as the
    // header's classmate search, just reached from a card instead. Checked before the plain
    // data-contributor-entry trigger below so tapping the eyes icon doesn't just re-open the same
    // card it's already sitting inside.
    var viewTrigger = e.target.closest && e.target.closest('[data-view-entry]');
    if(viewTrigger){
      var viewed = DATA.roster[viewTrigger.getAttribute('data-view-entry')];
      if(viewed){ viewStudent(viewed); closePanels(null); }
      return;
    }
    var trigger = e.target.closest && e.target.closest('[data-contributor-entry]');
    if(trigger) openContributorCard(trigger.getAttribute('data-contributor-entry'));
  });
}

/* ================= exam week banner ================= */
// The "Mid-Semester Examinations" entry in DATA.calendar.examWeeks, found by label rather than by
// array position so this keeps working if other exam windows (e.g. End-Sem) are added around it.
function midsemExamWeek(){
  var weeks = (DATA.calendar && DATA.calendar.examWeeks) || [];
  for(var i=0;i<weeks.length;i++){
    if(/mid-sem/i.test(weeks[i].label)) return weeks[i];
  }
  return null;
}
// See buildDays()'s use of this: 17/18 Sept are the only Mid-Sem-week dates where suppression is
// per-student (has-an-exam-today) rather than blanket — an explicit, date-scoped exception, not a
// general rule for the whole exam week (see the comment at the call site for why 19-22 stay as-is).
var PARTIAL_EXAM_WEEK_DATES = { '2026-09-17': 1, '2026-09-18': 1 };
// A big, standing banner (shown once per student-view, not per day) listing every mid-sem exam
// item already resolved for this student in state.DAYS — reusing buildDays' own division/HS-
// elective filtering rather than re-deriving it, so "only your HS/IKS exam, not all 4" stays
// correct here too. Visible for the whole mid-sem window, not just on/after the first exam, so a
// student can see their full personal schedule at a glance from day one; disappears once the
// window has fully passed.
function endsemExamWeek(){
  var weeks = (DATA.calendar && DATA.calendar.examWeeks) || [];
  for(var i=0;i<weeks.length;i++){
    if(/end-sem/i.test(weeks[i].label)) return weeks[i];
  }
  return null;
}
// The latest Exam/Viva date inside or just past an exam window (TL101's viva runs a few days past
// the written mid-sem week), so the banner covers every related assessment without a second range.
// Capped at the start of the next window, so mid-sem never swallows the end-sem dates.
function examWindowEnd(week){
  var end = week.end, nextStart = '9999-12-31';
  ((DATA.calendar && DATA.calendar.examWeeks) || []).forEach(function(w){
    if(w.start > week.end && w.start < nextStart) nextStart = w.start;
  });
  Object.keys(DATA.dateOverrides || {}).forEach(function(iso){
    if(iso <= end || iso >= nextStart) return;
    var hasExamish = DATA.dateOverrides[iso].some(function(e){ return e.category === 'Exam' || e.category === 'Viva'; });
    if(hasExamish) end = iso;
  });
  return end;
}
// One window's banner block: the expanded list while it is current/upcoming, or — once every
// exam/viva date in it has passed — a collapsed <details> "memory" (same pattern as the footer's
// Contributors list) so a student can still look back at their own schedule (e.g. a seat number)
// without it competing with today's real schedule. Returns null when the window has no exam items.
function examWindowBlock(student, week, title, stripRe){
  var windowEnd = examWindowEnd(week);
  var exams = [];
  state.DAYS.forEach(function(day){
    if(day.d < week.start || day.d > windowEnd) return;
    day.items.forEach(function(it){
      if(it.category === 'Exam' || it.category === 'Viva'){
        exams.push({date: day.d, title: it.title.replace(stripRe,''), t: it.t});
      }
    });
  });
  if(!exams.length) return null;
  var rows = exams.map(function(ex){
    var done = ex.date < state.TODAY;
    var seat = DATA.examSeating && DATA.examSeating[ex.date] && DATA.examSeating[ex.date][student.entry];
    var seatHtml = seat ? '<span class="examweek-seat">'+seat.room+(seat.seat?' &middot; Seat '+seat.seat:'')+'</span>' : '';
    return '<div class="examweek-row'+(done?' done':'')+'"><span class="examweek-date">'+dateLabel(ex.date)+'</span>'+
      '<span class="examweek-title">'+ex.title+'</span>'+
      '<span class="examweek-time">'+(ex.t||'')+(done?' · done':'')+'</span>'+seatHtml+'</div>';
  }).join('');
  var past = state.TODAY > windowEnd;
  return {past: past, html: past
    ? '<details class="examweek-collapsed"><summary>'+title+' <span class="examweek-collapsed-tag">past</span></summary><div class="examweek-rows">'+rows+'</div></details>'
    : '<div class="examweek-head">'+title+'</div><div class="examweek-rows">'+rows+'</div>'};
}
// Time-limited notices (DATA.notices, from merge.py NOTICES): shown until their `until` instant, then gone.
// A notice with `seatDate` also shows the viewer's own hall + seat for that date.
function renderNotices(student){
  var box = document.getElementById('noticeBanner');
  if(!box) return;
  var now = Date.now();
  var live = (DATA.notices || []).filter(function(n){ return new Date(n.until).getTime() > now; });
  if(!live.length){ box.style.display = 'none'; box.innerHTML = ''; return; }
  box.innerHTML = live.map(function(n){
    var seat = n.seatDate && student && DATA.examSeating && DATA.examSeating[n.seatDate] && DATA.examSeating[n.seatDate][student.entry];
    var seatLine;
    if(!seat) seatLine = 'The official sheet has no hall or seat for you — please ask the Academic Section.';
    else if(seat.room === 'Venue TBC') seatLine = 'The official sheet does not name your hall' + (seat.seat ? ' (it gives seat ' + seat.seat + ')' : '') + ' — please confirm it with the Academic Section or your BR before 7:10 PM.';
    else seatLine = 'Your venue: ' + seat.room + (seat.seat ? ' · Seat ' + seat.seat : ' · no seat number in the official sheet');
    var seatHtml = n.seatDate ? '<div class="notice-seat">' + seatLine + '</div>' : '';
    return '<div class="notice-title">' + n.title + '</div><div class="notice-text">' + n.text + '</div>' + seatHtml;
  }).join('<hr style="border:0;height:10px">');
  box.style.display = 'block';
}
if(typeof setInterval === 'function') setInterval(function(){ if(state && state.student) renderNotices(state.student); }, 60000);
function renderExamBanner(student){
  var banner = document.getElementById('examWeekBanner');
  var blocks = [];
  var mid = midsemExamWeek(), end = endsemExamWeek();
  if(mid) blocks.push(examWindowBlock(student, mid, 'mid-sem exams &amp; viva', / — Mid-Sem (Exam|Viva)$/));
  if(end) blocks.push(examWindowBlock(student, end, 'end-sem exams', / — End-Sem Exam$/));
  blocks = blocks.filter(Boolean);
  if(!blocks.length){
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'block';
  // Current/upcoming windows first, finished ones folded underneath.
  banner.innerHTML = blocks.filter(function(b){ return !b.past; }).concat(blocks.filter(function(b){ return b.past; }))
    .map(function(b){ return b.html; }).join('');
}

// Site-wide contributor roster for the footer's collapsible list — everyone who ranks as a
// Contributor per personCardHeading's ranking (ROLES.contributor entries, plus pure verifiers,
// since verifying now counts as contributing), minus the creator (already credited in the
// "Made with ❤️" line above this list, not listed again below it). Built from DATA/ROLES directly
// rather than hardcoded, so it stays correct as more contributors/verifiers are added.
// The roster's stored branch code ('MCB') is really just the segment IIT Ropar's own entry-number
// scheme uses (e.g. 2026MCB1546) — students' actual short-form name for the branch is "MnC", not
// "MCB". Only relevant for a short-code DISPLAY like the footer pills below; DATA.roster/branch
// mapping itself must keep 'MCB' unchanged everywhere else (merge.py's BRANCH_MAP depends on it
// matching the entry-number prefix).
var BRANCH_SHORT_DISPLAY = {'MCB': 'MnC', 'ME': 'MECH'};
function displayBranchCode(code){
  return BRANCH_SHORT_DISPLAY[code] || code;
}
// A contributor's footer tag is normally their branch code — right for branch/group-specific data
// (a lab day, a venue fix). But some contributions are about a course that cuts across branches
// (an HS/IKS elective's shared day/time), where showing the contributor's own branch would be
// misleading about what they actually fixed — see [[feedback_contributor_attribution_scope]].
// This overrides the tag for exactly those cases, keyed by entry number.
var CONTRIBUTOR_TAG_OVERRIDE = {'2026MCB1521': 'IKS', '2026MCB1570': 'HS113'};
// A shorter display name for the contributor credit specifically — the official roster record
// (used for search, mentor/BR lookups, personal identity) stays untouched; this only changes how
// the name is SHOWN in a contributor context (footer list, person card), same "display-only,
// never touch the roster" principle as the personal name-alias Settings feature.
var CONTRIBUTOR_NAME_OVERRIDE = {'2026MCB1570': 'Shreya Umavane'};
// A compact, one-line "what did they actually do" summary shown in the contributor card — the full
// story lives as a code comment next to each entry in ROLES.contributor (index_template_dashboard.html),
// this is just that same fact condensed to one line for display. Keyed by entry number; an entry
// with no summary here (a Branch Rep who hasn't personally shared/verified anything, say) just gets
// no line at all — see contributionSummaryFor's scheduleVerifications fallback for the "verified,
// didn't share data" case (e.g. 2026EEB1330), which isn't listed here since it has its own line.
var CONTRIBUTOR_SUMMARY = {
  '2026EEB1369': 'Shared G5/G6 tutorial venues & Life Skills timing',
  '2026CEB1162': 'Corrected the MME/CE/CH CY101 lab day',
  '2026CHB1125': 'Corrected the G11 WP101 lab day & Life Skills timing',
  '2026CSB1269': "Shared the CSE batch's CY101 tutorial slot",
  '2026ESB1499': 'Shared the G4 PH101 tutorial venue & corrected the ES WP101 lab day',
  '2026EPB1468': 'Corrected the EP TL101 lab day & shared the EP CY101 tutorial + Life Skills timing',
  '2026MEB1647': 'Corrected the ME CY101 lab day, shared the ME CY101 tutorial & refined the G11 WP101 lab time',
  '2026MMB1686': 'Fixed a CE/MME group mixup on the WP101 lab & shared the MME CY101 tutorial',
  '2026ICB1429': "Shared ICDT's distinct timetable — CY101 lab length, Life Skills session, corrected WP101 lab",
  '2026MCB1521': "Corrected the IK101 (IKS) elective's days to Wed/Thu/Fri",
  '2026MCB1570': 'Confirmed HS113 is off for every session before Mid-Sem week',
  '2026MEB1641': 'Shared the seating sheet that filled in the 18 Sept CY101 exam seat/venue',
};
// Falls back to a "verified the schedule" line built straight from DATA.scheduleVerifications for
// anyone who verified but never personally shared data (not in CONTRIBUTOR_SUMMARY above) — e.g.
// 2026EEB1330, who confirmed the EE branch schedule someone else (Kshitiz) had shared.
function contributionSummaryFor(entry){
  if(CONTRIBUTOR_SUMMARY[entry]) return CONTRIBUTOR_SUMMARY[entry];
  var recs = (DATA.scheduleVerifications || []).filter(function(r){ return r.verifiedBy === entry; });
  if(!recs.length) return null;
  var parts = recs.map(function(r){
    var branchName = DATA.branchNames[r.branch] || r.branch;
    return 'Verified the ' + branchName + (r.group ? ' ' + r.group : '') + ' schedule';
  });
  return parts.join('; ');
}
function contributorsRoster(){
  var entries = (window.ROLES && window.ROLES.contributor) ? window.ROLES.contributor.slice() : [];
  (DATA.scheduleVerifications || []).forEach(function(r){
    if(entries.indexOf(r.verifiedBy) === -1) entries.push(r.verifiedBy);
  });
  var people = entries.filter(function(entry){ return !hasRole(entry, 'creator'); }).map(function(entry){
    var s = DATA.roster[entry];
    return s ? {entry: entry, name: CONTRIBUTOR_NAME_OVERRIDE[entry] || titleCaseFullName(s.name), branch: CONTRIBUTOR_TAG_OVERRIDE[entry] || displayBranchCode(s.branch)} : null;
  }).filter(Boolean);
  people.sort(function(a,b){ return a.name.localeCompare(b.name); });
  return people;
}
// One row per line, same text styling as the "Made with ❤ by ..." credit line above it — just
// reordered as <branch code> <small red heart> <name>. Only the name itself is a link (same
// contributor-name-link + data-contributor-entry pattern as everywhere else in the app); the
// branch code and heart are plain, non-interactive text.
function contributorsListHTML(){
  return contributorsRoster().map(function(p){
    return '<div class="contributor-row">'+
      '<span class="contributor-row-branch">'+p.branch+'</span>'+
      '<span class="contributor-row-heart">&#10084;</span>'+
      '<button class="contributor-name-link" data-contributor-entry="'+p.entry+'">'+p.name+'</button>'+
      '</div>';
  }).join('');
}

/* ================= profile header ================= */
// Kaizen users (known everywhere: the Kaizen roadmap's own students; on this device also whoever's logged in with
// kaizen switched on — that switch lives on their device, so it can't be seen from anyone else's) are greeted
// Japanese-style in kaizen colours, and their names show in kaizen colours in Squads.
function isKaizenUser(entry){
  var c = kzCourse();
  if(c && c.students.indexOf(entry) !== -1) return true;
  var online = window.__kaizenUsers;
  if(online && online[entry]) return !!online[entry].on;
  return entry === state.loginEntry && ssPrefs().on;
}
// Japanese-style greetings, mostly study pep talk: Ganbatte/Ganbarou (do your best / let's), Faito (fight!),
// Ikuzo (let's go), Yosh (alright!), Benkyō shiyō (let's study), Shūchū (focus), Mada mada (not done yet — keep
// going), Kaizen da (it's kaizen time), plus everyday Konnichiwa / Yōkoso / Okaeri / Yoroshiku.
var KZ_GREETINGS = ['Konnichiwa', 'Yōkoso', 'Okaeri', 'Yoroshiku', 'Ganbatte', 'Ganbarou', 'Faito', 'Ikuzo', 'Yosh',
  'Benkyō shiyō', 'Shūchū', 'Mada mada', 'Kaizen da'];
// anime-style honorifics (senpai most often)
var KZ_HONORIFICS = ['senpai', 'senpai', 'senpai', 'kun', 'sama'];
var kzHonorPick = {};
function kzHonorific(entry){
  return kzHonorPick[entry] || (kzHonorPick[entry] = KZ_HONORIFICS[Math.floor(Math.random() * KZ_HONORIFICS.length)]);
}
var kzGreetPick = {};                                      // one pick per person per page load (no flicker on re-render)
function kzGreeting(entry){
  if(kzGreetPick[entry]) return kzGreetPick[entry];
  var h = new Date().getHours(), pool = KZ_GREETINGS.slice();
  if(h >= 4 && h < 11) pool.push('Ohayō', 'Ohayō');
  if(h >= 17 || h < 4) pool.push('Konbanwa', 'Konbanwa', 'Otsukare');
  return (kzGreetPick[entry] = pool[Math.floor(Math.random() * pool.length)]);
}
// Keep the greeting on one line: shrink its text (not the badge) until it fits the header's width.
function fitGreeting(){
  var h1 = document.getElementById('greeting'), line = h1 && h1.querySelector('.greet-text');
  if(!line || !h1.clientWidth) return;
  line.style.fontSize = '';
  var fs = parseFloat(getComputedStyle(line).fontSize) || 27;
  while(line.scrollWidth > h1.clientWidth && fs > 13){ fs -= 1; line.style.fontSize = fs + 'px'; }
}
if(typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', function(){ fitGreeting(); });
function kzNameHtml(entry, text){
  return isKaizenUser(entry) ? '<span class="kz-name">' + escapeHtml(text) + '</span>' : escapeHtml(text);
}
function renderHeader(student){
  var branchName = DATA.branchNames[student.branch] || student.branch;
  document.getElementById('eyebrow').textContent = student.division+' · Academic Group '+(student.academicGroup||'—')+(student.ismpGroup?' · ISMP Group '+student.ismpGroup:'');
  var ownAlias = (student.entry === state.loginEntry) ? currentNameAliases[student.entry] : null;
  var firstName = ownAlias || titleCaseFirstName(student.name);
  var roleBadge = '';
  var headerRoles = personRolesFor(student.entry);
  if(headerRoles.isCreator) roleBadge = ' <span class="role-pill creator"><span class="role-pill-icon">👑</span>Creator</span>';
  else if(headerRoles.isContributor || headerRoles.verifiedRecs.length) roleBadge = ' <span class="role-pill contributor" data-contributor-entry="'+student.entry+'" title="Tap to see contributor info"><span class="role-pill-icon">⭐</span>Contributor</span>';
  var greetHtml = isKaizenUser(student.entry)
    ? '<span class="greet-text kz-greet">' + kzGreeting(student.entry) + ', ' + escapeHtml(firstName) + '-' + kzHonorific(student.entry) + '</span>'
    : '<span class="greet-text">Hi, ' + escapeHtml(firstName) + '</span>';
  document.getElementById('greeting').innerHTML = greetHtml + roleBadge;
  fitGreeting();
  document.getElementById('subline').textContent = branchName+' · '+student.entry;
  // Only for the person actually logged in (never while just viewing a classmate's schedule via
  // search), and only if THEY are a Branch Rep or the creator — reuses the same role data /br's own
  // permission check is built on (DATA.batchReps + the hardcoded creator entry), so this button
  // only ever appears for someone who'd actually get past /br's own sign-in gate.
  var brBtn = document.getElementById('brToolsBtn');
  if(brBtn){
    var isMe = student.entry === state.loginEntry;
    brBtn.style.display = (isMe && (headerRoles.isCreator || headerRoles.brRecs.length)) ? 'flex' : 'none';
  }
  renderVerifiedBadge(student);
  renderBrNote(student);
  renderMentorNote(student);

  // The day-scoped "shared by" attribution keeps its own separate logic untouched (see
  // renderContributorAttribution, called from renderTodayPanel on every day change) — not computed
  // here, since "viewing this student" and "which day they're currently looking at" are different
  // things. renderVerifiedBadge above is the persistent, student-level counterpart to it.

  var mismatch = student.ismpGroup && student.academicGroup && String(student.ismpGroup) !== student.academicGroup.replace('G','');
  var banner = document.getElementById('mismatchBanner');
  if(mismatch){
    banner.style.display='flex';
    banner.innerHTML = '<span>ℹ️</span><div><b>Heads up:</b> your academic group and ISMP (orientation) group are numbered differently. Classes below use Academic Group '+student.academicGroup+'; orientation events use ISMP Group '+student.ismpGroup+'.</div>';
  } else {
    banner.style.display='none';
  }

  var contributorCount = contributorsRoster().length;
  var creatorEntry = (window.ROLES && window.ROLES.creator && window.ROLES.creator[0]) || '';
  document.getElementById('appfoot').innerHTML =
    '<div class="foot-credit">Made with <span class="heart">&#10084;</span> by '+
    '<button class="contributor-name-link" data-contributor-entry="'+creatorEntry+'">Yatharth Shrivastava</button></div>' +
    '<details class="foot-contributors"><summary>&#11088; Contributors <span class="foot-contributors-count">'+contributorCount+'</span><span class="foot-contributors-chevron">&#8250;</span></summary>' +
    '<div class="foot-contributors-list">'+contributorsListHTML()+'</div>' +
    '</details>' +
    '<details class="foot-more"><summary>Sources &amp; disclaimer</summary>' +
    '<div class="foot-sources">Built from IIT Ropar\'s official Academic Section timetable extract, Divisions/Groups sheets, the (now-concluded) ISMP orientation schedule, department guidance emails, the Mid-Semester Examination datesheet, the NSO schedule, and the self-study room hours notice (Aug&ndash;Sep 2026) &mdash; cross-checked against the official Handbook of Information. Corrected and verified in places by real students across AIDE, CE, CH, CSE, DA, EE, EP, ES, ME and MCB, who checked it against their own actual timetables.</div>' +
    '<div class="foot-disclaimer">Unofficial, independent student project &mdash; not affiliated with or endorsed by IIT Ropar. Details can change or contain errors; always confirm against official notices. No liability accepted for any missed classes/events or other harm from using this site.</div>' +
    '</details>';
}

/* ================= boot ================= */
// Switches which student's schedule is currently displayed — used both for the logged-in
// account (bootApp) and for browsing a classmate's schedule via search (viewStudent alone,
// leaving state.loginEntry untouched so settings/HS-elective edits still apply to the real user).
function viewStudent(student){
  state.student = student;
  state.DAYS = buildDays(student);
  var idx = state.DAYS.findIndex(function(d){ return d.d===state.TODAY; });
  state.todayIdx = idx; // -1 if today falls outside the printed range
  if(idx<0){
    idx = state.TODAY < state.DAYS[0].d ? 0 : state.DAYS.length-1;
  }
  state.activeIdx = idx;
  state.altViewOn = false;

  renderHeader(student);
  renderExamBanner(student);
  renderNotices(student);
  kzWidget();
  render();
  syncHsElectiveField();
  syncNameAliasField();
  renderCourseChecklist();
  calState.monthIso = state.DAYS[state.activeIdx].d.slice(0,8)+'01';
  if(calState.open) renderCalendar();

  var banner = document.getElementById('viewBanner');
  if(student.entry !== state.loginEntry){
    banner.style.display = 'flex';
    document.getElementById('viewBannerText').innerHTML = 'Viewing <b>'+student.name+'</b>&rsquo;s schedule';
  } else {
    banner.style.display = 'none';
  }
}
function bootApp(student){
  state.loginEntry = student.entry;
  state.TODAY = todayISO();
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').classList.add('show');
  viewStudent(student);
  renderBootMess();
  ssSettingsUI();
  kzStart();
  kpStart();
}
// Boot-log line "[ok] mess menu loaded" — only when today actually has a mess menu entry with at
// least one meal (the carried-over "assumed" month counts: the panel shows it, with its own caveat).
function renderBootMess(){
  var el = document.getElementById('bootMess');
  if(!el) return;
  var today = todayISO();
  var has = ['breakfast', 'lunch', 'dinner'].some(function(m){ return !!mealMenuFor(m, today); });
  el.style.display = has ? '' : 'none';
}

/* ================= settings wiring ================= */
function initSettings(){
  els = {
    arrive: document.getElementById('arriveTime'),
    prep: document.getElementById('prepMins'),
    buffer: document.getElementById('bufferMins'),
    sleepTarget: document.getElementById('sleepTarget'),
    winddown: document.getElementById('winddownMins'),
  };
  [els.arrive, els.prep, els.buffer, els.sleepTarget, els.winddown].forEach(function(el){
    el.addEventListener('change', function(){ readSettings(); renderTodayPanel(); });
  });
  var nameAliasInput = document.getElementById('nameAliasInput');
  if(nameAliasInput){
    nameAliasInput.addEventListener('input', function(){ setNameAlias(nameAliasInput.value); });
  }
  document.getElementById('resetBtn').addEventListener('click', function(){
    els.arrive.value='07:45'; els.prep.value=75; els.buffer.value=10;
    els.sleepTarget.value=7.5; els.winddown.value=30;
    readSettings(); renderTodayPanel();
  });
  document.getElementById('settingsBtn').addEventListener('click', function(){
    if(window.__kzPreload) window.__kzPreload();             // so a Kaizen sign-in popup can open straight from a tap
    setTimeout(function(){ segThumb(document.getElementById('selfStudyFrom')); }, 60);   // measured once it's visible
    var panel = document.getElementById('settingsPanel');
    var willOpen = !panel.classList.contains('open');
    closePanels(willOpen ? 'settingsPanel' : null);
    panel.classList.toggle('open', willOpen);
    updateBackdrop();
  });
  document.getElementById('switchBtn').addEventListener('click', function(){
    localStorage.removeItem(LS_KEY);
    location.reload();
  });

  // Colour theme: one slider over the five themes' colours, snapping to each.
  var THEME_ORDER = ['github', 'default', 'forest', 'sunset', 'midnight'];
  var THEME_NAMES = { github: 'Graphite', 'default': 'Signature', forest: 'Forest', sunset: 'Sunset', midnight: 'Midnight' };
  var themeRange = document.getElementById('colorThemeRange'), themeName = document.getElementById('colorThemeName');
  var themeKnob = document.getElementById('colorThemeKnob');
  // the knob sits inside the track: 4px in from each end, at stop i of 0..4
  function placeKnob(i, pop){
    if(!themeKnob) return;
    themeKnob.style.left = 'calc(4px + (100% - 26px) * ' + (i / 4) + ')';
    if(pop){ themeKnob.classList.remove('pop'); void themeKnob.offsetWidth; themeKnob.classList.add('pop'); }
  }
  function setColorTheme(t){
    currentColorTheme = t;
    if(t === 'default') document.body.removeAttribute('data-theme');
    else document.body.setAttribute('data-theme', t);
    localStorage.setItem(COLOR_THEME_KEY, t);
    if(themeName) themeName.textContent = THEME_NAMES[t] || t;
    if(state.student){
      state.DAYS = buildDays(state.student);
      renderTodayPanel();
      renderHeatmapPanel();
      renderExamBanner(state.student);
      renderNotices(state.student);
      if(calState.open) renderCalendar();
    }
  }
  if(themeRange){
    themeRange.value = Math.max(0, THEME_ORDER.indexOf(currentColorTheme));
    placeKnob(Number(themeRange.value), false);
    if(themeName) themeName.textContent = THEME_NAMES[currentColorTheme] || currentColorTheme;
    // the whole page crossfades into the new colours (View Transitions where supported; otherwise a brief
    // colour transition on everything)
    themeRange.addEventListener('input', function(){
      var t = THEME_ORDER[Number(themeRange.value)];
      if(t === currentColorTheme) return;
      placeKnob(Number(themeRange.value), true);
      quietScroll(600);
      // a light tick per theme (Android; iOS has no web haptics) — only after a real tap, which browsers require
      if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(12); } catch(e){}
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Colours ease into the new theme (CSS transitions, not a page snapshot) — so the knob keeps gliding
      // instead of being cross-faded along with everything else.
      if(!still){ document.documentElement.classList.add('theme-fading'); clearTimeout(themeRange.fadeT);
        themeRange.fadeT = setTimeout(function(){ document.documentElement.classList.remove('theme-fading'); }, 450); }
      setColorTheme(t);
    });
  }
  window.__chooseElective = setHsElective;   // the schedule's one-time prompt, for students with no official elective
  // Folds animate closed as well as open.
  document.querySelectorAll('.set-fold > summary').forEach(function(sum){
    sum.addEventListener('click', function(e){
      var fold = sum.parentNode, body = fold.querySelector('.set-fold-body');
      quietScroll(400);
      if(!fold.open || !body || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      e.preventDefault();
      quietScroll(400);
      body.classList.add('closing');
      setTimeout(function(){ body.classList.remove('closing'); fold.open = false; }, 180);
    });
  });

  // On/off settings are switches (the same switch as the day's extras toggle: plain for mess, kaizen-coloured
  // for Kaizen); Kaizen's own settings slide out beneath it while it's on.
  var messSwitch = document.getElementById('messSwitch');
  if(messSwitch) messSwitch.addEventListener('click', function(){
    var turningOff = messItemsOn();
    messSwitch.classList.toggle('on', !turningOff);            // the knob slides right away
    scheduleTransition(function(){
      try { localStorage.setItem(MESS_ITEMS_KEY, turningOff ? 'off' : 'on'); } catch(e){}
      kpTouch(['mess']);
      ssSetPrefs({});
    }, { plain: true, leaving: turningOff ? function(r){ return r.getAttribute('data-x') === 'mess'; } : null });
  });
  var kaizenSwitch = document.getElementById('kaizenSwitch'), ssMins = document.getElementById('selfStudyMins');
  if(kaizenSwitch){
    ssSettingsUI();
    kaizenSwitch.addEventListener('click', function(){
      if(kaizenSwitch.classList.contains('busy')) return;
      var turningOff = ssPrefs().on;
      kaizenSwitch.classList.toggle('on', !turningOff);         // the knob moves right away; reverted if linking fails
      kzSetOn(!turningOff, function(){
        quietScroll(900);
        document.getElementById('kaizenMore').classList.toggle('open', !turningOff);
        scheduleTransition(function(){ ssSetPrefs({ on: !turningOff }); },
          { leaving: turningOff ? function(r){ return r.getAttribute('data-k') && /SELF-STUDY/.test(r.textContent) && r.getAttribute('data-x') === 'kz'; } : null });
      });
    });
    ssMins.addEventListener('change', function(){
      scheduleTransition(function(){ ssSetPrefs({ min: Math.max(15, Math.min(480, Number(ssMins.value) || 120)) }); });
    });
    document.getElementById('selfStudyFrom').addEventListener('click', function(e){
      var b = e.target.closest('[data-from]'); if(!b) return;
      document.querySelectorAll('#selfStudyFrom [data-from]').forEach(function(x){ x.classList.toggle('active', x === b); });
      segThumb(document.getElementById('selfStudyFrom'));
      scheduleTransition(function(){ ssSetPrefs({ from: b.getAttribute('data-from') }); });
    });
  }
}
// Keeps the settings input in sync with whichever account is actually logged in right now — matters
// when switching entry numbers on a shared/reused device, so the field never shows a stale alias
// left over from a previous login.
function syncNameAliasField(){
  var input = document.getElementById('nameAliasInput');
  if(!input) return;
  input.value = currentNameAliases[state.loginEntry] || '';
}
function setNameAlias(value){
  var trimmed = value.trim();
  if(trimmed) currentNameAliases[state.loginEntry] = trimmed;
  else delete currentNameAliases[state.loginEntry];
  localStorage.setItem(NAME_ALIASES_KEY, JSON.stringify(currentNameAliases));
  if(state.student) renderHeader(state.student);
}
// The "no manual pick" option's label depends on whether the logged-in student has an official
// assignment from the Academic Section's HSS/IKS course list — most do, some don't (see
// build/extract_hss_iks.py for the ~20 unlisted/ambiguous cases).
function syncHsElectiveField(){
  var hsSelect = document.getElementById('hsElectiveSelect');
  var loginStudent = DATA.roster[state.loginEntry];
  if(!hsSelect || !loginStudent) return;
  var optNone = document.getElementById('hsOptNone');
  if(!optNone) return;
  optNone.textContent = loginStudent.hsElective ? 'Use official assignment ('+loginStudent.hsElective+')' : "Haven't chosen yet";
  hsSelect.value = currentHsElective;
}
function setHsElective(code){
  currentHsElective = code;
  localStorage.setItem(HS_KEY, code);
  var sel = document.getElementById('hsElectiveSelect');
  if(sel) sel.value = code;
  state.DAYS = buildDays(state.student);
  renderTodayPanel();
  renderHeatmapPanel();
  renderExamBanner(state.student);
  renderNotices(state.student);
  if(calState.open) renderCalendar();
}
function setNsoOptin(choice){
  currentNsoOptin = choice;
  localStorage.setItem(NSO_OPTIN_KEY, choice);
  var sel = document.getElementById('nsoOptinSelect');
  if(sel) sel.value = choice;
  state.DAYS = buildDays(state.student);
  renderTodayPanel();
  renderHeatmapPanel();
}
window.__setNsoOptin = setNsoOptin;

/* ================= classmate search ================= */
function studentTagsHtml(s){
  var branchName = DATA.branchNames[s.branch] || s.branch;
  return '<span class="tag branch">'+branchName+'</span>' +
    '<span class="tag division">'+s.division+'</span>' +
    (s.academicGroup ? '<span class="tag acadgroup">Group '+s.academicGroup+'</span>' : '');
}
function searchRoster(q){
  q = q.trim().toLowerCase();
  if(!q) return [];
  var results = [];
  Object.keys(DATA.roster).forEach(function(entry){
    var s = DATA.roster[entry];
    var nameLc = s.name.toLowerCase();
    var idx = nameLc.indexOf(q);
    if(idx === -1 && entry.toLowerCase().indexOf(q) === -1) return;
    results.push({s:s, rank: idx===-1?100:idx});
  });
  results.sort(function(a,b){ return (a.rank-b.rank) || a.s.name.localeCompare(b.s.name); });
  return results.slice(0,30).map(function(r){ return r.s; });
}
function renderSearchResults(list){
  var box = document.getElementById('searchResults');
  if(!list.length){
    box.innerHTML = '<div class="search-empty">'+(document.getElementById('searchInput').value.trim() ? 'No matches.' : 'Start typing a name…')+'</div>';
    return;
  }
  box.innerHTML = list.map(function(s){
    return '<div class="search-result-row" data-entry="'+s.entry+'">' +
      '<div class="search-result-name">'+s.name.trim()+'</div>' +
      '<div class="search-result-entry">'+s.entry+'</div>' +
      '<div class="search-result-tags">'+studentTagsHtml(s)+'</div>' +
    '</div>';
  }).join('');
  Array.prototype.forEach.call(box.querySelectorAll('.search-result-row'), function(row){
    row.addEventListener('click', function(){
      var s = DATA.roster[row.getAttribute('data-entry')];
      viewStudent(s);
      closePanels(null);
      document.getElementById('searchInput').value = '';
      renderSearchResults([]);
    });
  });
}
function initSearch(){
  var btn = document.getElementById('searchBtn');
  var panel = document.getElementById('searchPanel');
  var input = document.getElementById('searchInput');
  btn.addEventListener('click', function(){
    var willOpen = !panel.classList.contains('open');
    closePanels(willOpen ? 'searchPanel' : null);
    panel.classList.toggle('open', willOpen);
    updateBackdrop();
    if(willOpen){
      setTimeout(function(){ input.focus(); }, 60);
    }
  });
  input.addEventListener('input', function(){ renderSearchResults(searchRoster(input.value)); });
  renderSearchResults([]);
  document.getElementById('viewBannerBack').addEventListener('click', function(){
    viewStudent(DATA.roster[state.loginEntry]);
  });
}

/* ================= ISMP clubs & groups browser ================= */
// One search box (matching club/sport/event title, venue, branch name/code, "G3", or "D1") plus a
// type chip row, over ALL_ISMP_SESSIONS. Every result row shows its groups AND the branches those
// groups belong to — "which group / which branch will be there" was the whole point — but only
// when that's not simply everyone, to keep whole-batch rows uncluttered. Defaults to today onward
// so you land near your own date instead of scrolling up from orientation week.
function typeTagHtml(type){
  if(type==='sport') return '<span class="tag sport">Sports</span>';
  if(type==='common') return '<span class="tag common">Whole batch</span>';
  return '<span class="tag group">Club</span>';
}
function groupsTagHtml(groups){
  if(!groups.length || groups.length === 12) return '';
  return '<span class="tag acadgroup">G'+groups.join(', G')+'</span>';
}
function branchesTagHtml(branches){
  if(!branches.length || branches.length === ALL_BRANCH_CODES.length) return '';
  return '<span class="tag branch">'+branches.map(displayBranchCode).join(', ')+'</span>';
}
function filterIsmpSessions(query, typeFilter, includePast){
  query = query.trim().toLowerCase();
  var groupMatch = query.match(/^g?(\d{1,2})$/);
  var today = todayISO();
  return ALL_ISMP_SESSIONS.filter(function(it){
    if(!includePast && it.date < today) return false;
    if(typeFilter && it.type !== typeFilter) return false;
    if(!query) return true;
    if(it.title.toLowerCase().indexOf(query) !== -1) return true;
    if(it.venue && it.venue.toLowerCase().indexOf(query) !== -1) return true;
    if(it.divisions.indexOf(query.toUpperCase()) !== -1) return true;
    if(groupMatch && it.groups.indexOf(Number(groupMatch[1])) !== -1) return true;
    return it.branches.some(function(b){
      return b.toLowerCase().indexOf(query) !== -1 || (DATA.branchNames[b]||'').toLowerCase().indexOf(query) !== -1;
    });
  });
}
function renderIsmpSessions(sessions, includePast){
  var box = document.getElementById('clubUnifiedSessions');
  var today = todayISO();
  var countLabel = sessions.length + (sessions.length===1 ? ' session' : ' sessions') + (includePast ? '' : ' from today');
  document.getElementById('clubResultCount').textContent = countLabel;
  if(!sessions.length){ box.innerHTML = '<div class="search-empty">No sessions match.</div>'; return; }
  box.innerHTML = sessions.map(function(it){
    var isToday = it.date === today;
    return '<div class="club-session-row'+(isToday?' is-today':'')+'">' +
      '<div class="club-session-top"><span class="club-session-title">'+it.title+'</span><span class="club-session-date'+(isToday?' is-today':'')+'">'+(isToday?'Today':dateLabel(it.date))+'</span></div>' +
      '<div class="club-session-meta">'+typeTagHtml(it.type)+'<span class="club-session-time">'+(it.time||'')+'</span>'+(it.venue?'<span class="tag venue">'+it.venue+'</span>':'')+'</div>' +
      '<div class="club-session-meta">'+groupsTagHtml(it.groups)+branchesTagHtml(it.branches)+'</div>' +
    '</div>';
  }).join('');
}
// Which room's full agenda is expanded, if any (-1 = none) — a module-level index rather than a
// per-render local, so it survives the 60s auto-refresh (studyRefreshTimer) re-rendering this list
// out from under an open detail view.
// Which room's week-ahead grid is expanded, if any (-1 = none) — a module-level index rather than
// a per-render local, so it survives the 60s auto-refresh (studyRefreshTimer) re-rendering this
// list out from under an open one.
var expandedRoomIdx = -1;
// Redesigned as a live availability TIMELINE per room (a 24-hour bar of open/closed blocks, same
// filled-block visual language as the semester heatmap elsewhere in the app) instead of a flat
// scrolling list of "Opens X / Closes Y" text rows — reads at a glance instead of requiring the
// exact next transition to be parsed out of a sentence. Each room is its own card with room to
// breathe; the 7-day week-ahead grid stays tucked behind a toggle so the default view stays compact.
function renderStudyRooms(){
  var listBox = document.getElementById('studyRoomList');
  var hint = document.getElementById('studyHint');
  var ss = DATA.selfStudy;
  if(!listBox || !ss) return;
  var today = todayISO();
  hint.textContent = 'Live availability — valid till ' + dateLabel(ss.validTo) + '.';
  listBox.innerHTML = ss.rooms.map(function(room, idx){
    var status = roomStatusNow(room);
    var pill = '<span class="study-status-pill '+(status.open?'open':'closed')+'">'+(status.open?'Open':'Closed')+'</span>';
    var nextLabel = status.changeAt ? (status.open ? 'Closes '+status.changeAt : 'Opens '+status.changeAt) : '';
    var todaySegs = dayWindowSegments(room, today);
    var isOpen = expandedRoomIdx === idx;
    var weekRows = [];
    for(var i=0;i<7;i++){
      var d = addDaysISO(today, i);
      var segs = dayWindowSegments(room, d);
      var label = i===0 ? 'Today' : (i===1 ? 'Tomorrow' : weekdayNameOf(d));
      weekRows.push('<div class="study-week-row">'+
        '<div class="study-week-head"><span class="study-week-day">'+label+'</span><span class="study-week-date">'+dateLabel(d)+'</span></div>'+
        timelineBarHtml(segs, {mini:true, showNow: i===0})+
        '<div class="study-week-times">'+formatDaySegments(segs)+'</div>'+
      '</div>');
    }
    return '<div class="study-room-card'+(isOpen?' expanded':'')+'" data-room-idx="'+idx+'">'+
      '<div class="study-room-top">'+
        '<div class="study-room-id"><span class="study-room-name">'+room.name+'</span>'+pill+'</div>'+
        '<div class="study-room-next">'+nextLabel+'</div>'+
      '</div>'+
      timelineBarHtml(todaySegs, {showNow:true})+
      '<div class="room-timeline-ticks"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></div>'+
      '<div class="study-week-toggle">'+
        '<span>'+(isOpen?'Hide':'View')+' week ahead</span><span class="study-week-arrow">&#9656;</span>'+
      '</div>'+
      '<div class="study-week-grid'+(isOpen?' open':'')+'">'+weekRows.join('')+'</div>'+
    '</div>';
  }).join('');
  // The whole card toggles the week-ahead grid — not just the small label at the bottom — so
  // there's no need to hunt for a tiny tap target.
  Array.prototype.forEach.call(listBox.querySelectorAll('.study-room-card'), function(card){
    card.addEventListener('click', function(){
      var idx = Number(card.getAttribute('data-room-idx'));
      expandedRoomIdx = (expandedRoomIdx === idx) ? -1 : idx;
      renderStudyRooms();
    });
  });
}
// Ambient live-status summary shown right on the "Study rooms" toggle itself (e.g. "2 open now")
// so the button is useful without being clicked, instead of a plain unlabeled dropdown trigger.
function renderStudyAmbient(){
  var el = document.getElementById('studyAmbient');
  var ss = DATA.selfStudy;
  if(!el) return;
  if(!ss || !selfStudyIsActive()){ el.textContent = ''; return; }
  var openCount = 0, nextOpen = null;
  ss.rooms.forEach(function(room){
    var status = roomStatusNow(room);
    if(status.open) openCount++;
    else if(status.changeAt && nextOpen === null) nextOpen = status.changeAt;
  });
  el.textContent = openCount > 0 ? ('· '+openCount+' open now') : (nextOpen ? ('· opens '+nextOpen) : '');
}
var studyAmbientTimer = null;
var studyRefreshTimer = null;
function initStudyPanel(){
  var toggleBtn = document.getElementById('studyToggleBtn');
  var panel = document.getElementById('studyPanel');
  if(selfStudyIsActive()){
    toggleBtn.style.display = '';
    renderStudyAmbient();
    studyAmbientTimer = setInterval(renderStudyAmbient, 60000);
  }
  toggleBtn.addEventListener('click', function(){
    var willOpen = !panel.classList.contains('open');
    closePanels(willOpen ? 'studyPanel' : null);
    panel.classList.toggle('open', willOpen);
    toggleBtn.setAttribute('aria-expanded', String(willOpen));
    updateBackdrop();
    if(willOpen){
      renderStudyRooms();
      if(studyRefreshTimer) clearInterval(studyRefreshTimer);
      studyRefreshTimer = setInterval(renderStudyRooms, 60000); // keep "closes/opens at" live
    } else if(studyRefreshTimer){
      clearInterval(studyRefreshTimer);
      studyRefreshTimer = null;
    }
  });
}
function initClubs(){
  var toggleBtn = document.getElementById('clubsToggleBtn');
  var panel = document.getElementById('clubsPanel');
  toggleBtn.addEventListener('click', function(){
    var willOpen = !panel.classList.contains('open');
    closePanels(willOpen ? 'clubsPanel' : null);
    panel.classList.toggle('open', willOpen);
    toggleBtn.setAttribute('aria-expanded', String(willOpen));
    updateBackdrop();
  });

  var searchInput = document.getElementById('clubSearchInput');
  var typeChips = Array.prototype.slice.call(document.querySelectorAll('#clubTypeChips .chip-filter'));
  var pastToggle = document.getElementById('clubPastToggle');
  var activeType = '';
  var includePast = false;

  function refresh(){
    renderIsmpSessions(filterIsmpSessions(searchInput.value, activeType, includePast), includePast);
  }
  searchInput.addEventListener('input', refresh);
  typeChips.forEach(function(chip){
    chip.addEventListener('click', function(){
      typeChips.forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      activeType = chip.getAttribute('data-type');
      refresh();
    });
  });
  pastToggle.addEventListener('click', function(){
    includePast = !includePast;
    pastToggle.textContent = includePast ? 'Hide past sessions' : 'Show past sessions';
    refresh();
  });
  refresh();
}

/* ================= login ================= */
function normalizeEntry(v){ return (v||'').trim().toUpperCase().replace(/\s+/g,''); }
function initLogin(){
  var entryInput = document.getElementById('entryInput');
  var loginBtn = document.getElementById('loginBtn');
  var loginErr = document.getElementById('loginErr');
  function tryLogin(raw){
    var entry = normalizeEntry(raw);
    var student = DATA.roster[entry];
    if(!student){
      loginErr.textContent = 'Entry number not found. Double-check and try again (e.g. 2026AIB1001).';
      return;
    }
    localStorage.setItem(LS_KEY, entry);
    bootApp(student);
  }
  loginBtn.addEventListener('click', function(){ tryLogin(entryInput.value); });
  entryInput.addEventListener('keydown', function(e){ if(e.key==='Enter') tryLogin(entryInput.value); });
  entryInput.addEventListener('input', function(){ loginErr.textContent=''; });
}


/* ================= Groups (saved only in this browser) ================= */
// Personal friend groups, stored in localStorage only — nothing leaves the device. Opening a group
// shows every member's schedule for one day merged into a single time-ordered list: a time heading,
// then one line per distinct activity at that time ("who — what — where"), with members doing the
// exact same thing collapsed onto one line instead of repeated, and whoever has nothing on at that
// moment listed as free. On top, the windows where the whole group is free together.
var GROUPS_KEY = 'thirtyatrpr_groups';
var groupsState = { activeId: null, iso: null, creating: false };
var groupDaysCache = {};
function loadGroups(){
  try { var g = JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'); return Array.isArray(g) ? g : []; }
  catch(e){ return []; }
}
function saveGroups(groups){
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)); } catch(e){}
}
function activeGroup(){
  var groups = loadGroups();
  for(var i=0;i<groups.length;i++) if(groups[i].id === groupsState.activeId) return groups[i];
  return null;
}
function groupMemberDay(entry, iso){
  var s = DATA.roster[entry];
  if(!s) return null;
  if(!groupDaysCache[entry]) groupDaysCache[entry] = buildDays(s);
  var days = groupDaysCache[entry];
  for(var i=0;i<days.length;i++) if(days[i].d === iso) return days[i];
  return null;
}
// First names, disambiguated with a last-name initial only where two members share one.
function groupShortNames(members){
  var names = {}, counts = {};
  members.forEach(function(e){
    var s = DATA.roster[e];
    names[e] = s ? titleCaseFirstName(s.name) : e;
    counts[names[e]] = (counts[names[e]]||0) + 1;
  });
  members.forEach(function(e){
    // A one-letter roster name (some records really are just "A") says nothing on its own.
    if(names[e].length < 2){ names[e] += ' (' + e.slice(-4) + ')'; return; }
    if(counts[names[e]] < 2 || !DATA.roster[e]) return;
    var parts = DATA.roster[e].name.trim().split(/\s+/);
    names[e] += ' ' + (parts.length > 1 ? parts[parts.length-1].charAt(0).toUpperCase() + '.' : e.slice(-4));
  });
  return names;
}
function groupTimeline(members, iso){
  var slots = {}, untimed = {}, busy = {}, notes = {};
  members.forEach(function(entry){
    busy[entry] = [];
    var day = groupMemberDay(entry, iso);
    if(!day) return;
    if(day.specialNote) notes[day.specialNote] = true;
    day.items.forEach(function(it){
      if(it.type === 'electivePick' || it.type === 'nsoPick') return;
      if(isExtraItem(it)) return;                          // squads compare real timetables only
      var key = it.title + '|' + (it.venue||'') + '|' + (it.eMin==null ? '' : it.eMin);
      if(it.sMin == null){
        var u = untimed[key] || (untimed[key] = {title: it.title, venue: it.venue, t: it.t, who: []});
        u.who.push(entry);
        return;
      }
      var end = it.eMin == null ? it.sMin + 50 : it.eMin;
      busy[entry].push([it.sMin, end]);
      var slot = slots[it.sMin] || (slots[it.sMin] = {});
      var row = slot[key] || (slot[key] = {title: it.title, venue: it.venue, eMin: end, color: it.color, who: []});
      if(row.who.indexOf(entry) === -1) row.who.push(entry);
    });
  });
  var starts = Object.keys(slots).map(Number).sort(function(a,b){ return a-b; });
  var timeline = starts.map(function(sMin){
    var rows = Object.keys(slots[sMin]).map(function(k){ return slots[sMin][k]; });
    rows.sort(function(a,b){ return b.who.length - a.who.length || a.eMin - b.eMin; });
    var free = members.filter(function(e){
      return !busy[e].some(function(iv){ return iv[0] <= sMin && sMin < iv[1]; });
    });
    return {sMin: sMin, rows: rows, free: free};
  });
  return {timeline: timeline, untimed: Object.keys(untimed).map(function(k){ return untimed[k]; }),
    together: groupFreeWindows(members, busy, 8*60, 21*60, 30), notes: Object.keys(notes)};
}
// Gaps of at least minLen minutes between dayStart and dayEnd where no member is busy.
function groupFreeWindows(members, busy, dayStart, dayEnd, minLen){
  var all = [];
  members.forEach(function(e){ all = all.concat(busy[e] || []); });
  all.sort(function(a,b){ return a[0]-b[0]; });
  var out = [], cursor = dayStart;
  all.forEach(function(iv){
    if(iv[1] <= cursor) return;
    if(iv[0] > cursor && Math.min(iv[0], dayEnd) - cursor >= minLen) out.push([cursor, Math.min(iv[0], dayEnd)]);
    cursor = Math.max(cursor, iv[1]);
  });
  if(dayEnd - cursor >= minLen) out.push([cursor, dayEnd]);
  return out;
}
function renderGroupsPanel(){
  var groups = loadGroups();
  if(groupsState.activeId && !activeGroup()) groupsState.activeId = null;
  if(!groupsState.activeId && groups.length && !groupsState.creating) groupsState.activeId = groups[0].id;
  var chips = groups.map(function(g){
    return '<button class="chip-filter'+(g.id===groupsState.activeId && !groupsState.creating?' active':'')+'" data-grp-action="select" data-id="'+g.id+'">'+escapeHtml(g.name)+' <span class="grp-count">'+g.members.length+'</span></button>';
  }).join('') + '<button class="chip-filter'+(groupsState.creating?' active':'')+'" data-grp-action="new">+ New squad</button>';
  document.getElementById('grpChips').innerHTML = chips;
  document.getElementById('grpNewForm').style.display = groupsState.creating ? 'flex' : 'none';
  var g = groupsState.creating ? null : activeGroup();
  document.getElementById('grpManage').style.display = g ? 'block' : 'none';
  var view = document.getElementById('grpView');
  if(!g){
    view.innerHTML = groupsState.creating ? '' : '<div class="search-empty">Make a squad of friends to see everyone\'s timetable for a day together, arranged by time. Squads are saved only on this device.</div>';
    return;
  }
  var names = groupShortNames(g.members);
  document.getElementById('grpMembers').innerHTML = g.members.map(function(e){
    return '<span class="grp-member">'+kzNameHtml(e, names[e])+'<button data-grp-action="remove" data-entry="'+e+'" aria-label="Remove '+escapeHtml(names[e])+'">&times;</button></span>';
  }).join('') + '<button class="grp-delete" data-grp-action="delete">Delete squad</button>';
  if(!groupsState.iso) groupsState.iso = (state.DAYS[state.activeIdx] || state.DAYS[0]).d;
  var iso = groupsState.iso;
  var head = '<div class="grp-daynav"><button class="cal-nav" data-grp-action="prev" aria-label="Previous day">&#8249;</button>'+
    '<span class="grp-date">'+fullDow(isoToDate(iso).toDateString().slice(0,3))+', '+dateLabel(iso)+(iso===todayISO()?' · today':'')+' <span class="mp-caret">&#9662;</span></span>'+
    '<button class="cal-nav" data-grp-action="next" aria-label="Next day">&#8250;</button></div>';
  if(!g.members.length){ view.innerHTML = head + '<div class="search-empty">Add people above to see the squad\'s day.</div>'; grpAttachPicker(view); return; }
  var tl = groupTimeline(g.members, iso);
  var html = head;
  tl.notes.forEach(function(n){ html += '<div class="grp-note">'+escapeHtml(n)+'</div>'; });
  html += '<div class="grp-together"><span class="grp-together-label">Everyone free</span> ' +
    (tl.together.length ? tl.together.map(function(w){ return toHHMM(w[0])+' – '+toHHMM(w[1]); }).join(' &middot; ') : 'no common gap of 30+ min (8 AM – 9 PM)') + '</div>';
  if(!tl.timeline.length && !tl.untimed.length) html += '<div class="search-empty">Nobody has anything scheduled.</div>';
  tl.timeline.forEach(function(slot){
    html += '<div class="grp-slot"><div class="grp-slot-time">'+toHHMM(slot.sMin)+'</div>';
    slot.rows.forEach(function(r){
      html += '<div class="grp-row"><span class="grp-who">'+r.who.map(function(e){ return kzNameHtml(e, names[e]); }).join(', ')+'</span>'+
        '<span class="grp-what"'+(r.color?' style="color:'+r.color+'"':'')+'>'+escapeHtml(r.title)+'</span>'+
        (r.venue?'<span class="grp-where">@ '+escapeHtml(r.venue)+'</span>':'')+
        '<span class="grp-till">till '+toHHMM(r.eMin)+'</span></div>';
    });
    if(slot.free.length && slot.free.length < g.members.length){
      html += '<div class="grp-free">free: '+slot.free.map(function(e){ return kzNameHtml(e, names[e]); }).join(', ')+'</div>';
    }
    html += '</div>';
  });
  if(tl.untimed.length){
    html += '<div class="grp-slot"><div class="grp-slot-time">time not fixed</div>';
    tl.untimed.forEach(function(r){
      html += '<div class="grp-row"><span class="grp-who">'+r.who.map(function(e){ return kzNameHtml(e, names[e]); }).join(', ')+'</span>'+
        '<span class="grp-what">'+escapeHtml(r.title)+'</span>'+(r.venue?'<span class="grp-where">@ '+escapeHtml(r.venue)+'</span>':'')+
        (r.t?'<span class="grp-till">'+escapeHtml(r.t)+'</span>':'')+'</div>';
    });
    html += '</div>';
  }
  view.innerHTML = html;
  grpAttachPicker(view);
  // Day switches slide like the main day panel (same squad only — picking another squad just appears).
  var prev = renderGroupsPanel.last;
  renderGroupsPanel.last = { id: g.id, iso: iso };
  if(prev && prev.id === g.id && prev.iso !== iso && window.MonthPick){ quietScroll(400); window.MonthPick.slide(view, prev.iso, iso); }
}
// Tap the squad's date for the month picker (build/monthpick.js) — re-attached after each render.
function grpAttachPicker(view){
  var anchor = view.querySelector('.grp-date'), nav = view.querySelector('.grp-daynav');
  if(!anchor || !nav || !window.MonthPick) return;
  window.MonthPick.attach({ anchor: anchor, after: nav, getIso: function(){ return groupsState.iso; },
    onPick: function(iso){ groupsState.iso = iso; renderGroupsPanel(); } });
}
function escapeHtml(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function renderGroupAddResults(){
  var input = document.getElementById('grpAddInput');
  var box = document.getElementById('grpAddResults');
  var g = activeGroup();
  if(!g || !input.value.trim()){ box.innerHTML = ''; return; }
  var list = searchRoster(input.value).filter(function(s){ return g.members.indexOf(s.entry) === -1; }).slice(0, 6);
  box.innerHTML = list.length ? list.map(function(s){
    return '<button class="grp-add-row" data-grp-action="add" data-entry="'+s.entry+'"><span>'+escapeHtml(titleCaseFullName(s.name))+'</span><span class="search-result-entry">'+s.entry+'</span></button>';
  }).join('') : '<div class="search-empty">No matches.</div>';
}
function createGroup(name){
  name = (name || '').trim();
  if(!name) return;
  var groups = loadGroups();
  var g = {id: 'g' + Date.now().toString(36), name: name.slice(0, 30), members: state.loginEntry ? [state.loginEntry] : []};
  groups.push(g);
  saveGroups(groups);
  groupsState.activeId = g.id;
  groupsState.creating = false;
}
function updateActiveGroup(fn){
  var groups = loadGroups();
  for(var i=0;i<groups.length;i++) if(groups[i].id === groupsState.activeId){ fn(groups, i); break; }
  saveGroups(groups);
}
function initGroups(){
  var btn = document.getElementById('groupsToggleBtn');
  var panel = document.getElementById('groupsPanel');
  if(!btn || !panel) return;
  btn.addEventListener('click', function(){
    var willOpen = !panel.classList.contains('open');
    closePanels(willOpen ? 'groupsPanel' : null);
    panel.classList.toggle('open', willOpen);
    btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    updateBackdrop();
    if(willOpen){
      groupDaysCache = {};
      groupsState.iso = (state.DAYS[state.activeIdx] || state.DAYS[0]).d;
      renderGroupsPanel();
    }
  });
  panel.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('[data-grp-action]');
    if(!t) return;
    var action = t.getAttribute('data-grp-action');
    if(action === 'select'){ groupsState.activeId = t.getAttribute('data-id'); groupsState.creating = false; }
    else if(action === 'new'){ groupsState.creating = true; setTimeout(function(){ document.getElementById('grpNewName').focus(); }, 30); }
    else if(action === 'create'){ createGroup(document.getElementById('grpNewName').value); document.getElementById('grpNewName').value = ''; }
    else if(action === 'remove'){ var rm = t.getAttribute('data-entry'); updateActiveGroup(function(gs, i){ gs[i].members = gs[i].members.filter(function(x){ return x !== rm; }); }); }
    else if(action === 'add'){ var ad = t.getAttribute('data-entry'); updateActiveGroup(function(gs, i){ if(gs[i].members.indexOf(ad) === -1) gs[i].members.push(ad); }); document.getElementById('grpAddInput').value = ''; renderGroupAddResults(); }
    else if(action === 'delete'){
      var g = activeGroup();
      if(g && (!window.confirm || window.confirm('Delete the squad "' + g.name + '"?'))){
        saveGroups(loadGroups().filter(function(x){ return x.id !== g.id; }));
        groupsState.activeId = null;
      }
    }
    else if(action === 'prev' || action === 'next'){
      var next = addDaysISO(groupsState.iso, action === 'prev' ? -1 : 1);
      var first = state.DAYS[0].d, last = state.DAYS[state.DAYS.length-1].d;
      if(next >= first && next <= last) groupsState.iso = next;
    }
    renderGroupsPanel();
  });
  document.getElementById('grpNewName').addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ createGroup(this.value); this.value = ''; renderGroupsPanel(); }
  });
  document.getElementById('grpAddInput').addEventListener('input', renderGroupAddResults);
}

initSettings();
initCalendar();
initClubs();
initStudyPanel();
// Slim shortcut bar for phone/tablet (see .mini-bar in the template): appears once the header has scrolled away.
(function(){
  var bar = document.getElementById('miniBar'), head = document.querySelector('header');
  if(!bar || !head) return;
  Array.prototype.forEach.call(bar.querySelectorAll('button[data-for]'), function(b){
    b.addEventListener('click', function(){
      var src = document.getElementById(b.getAttribute('data-for'));
      if(src) src.click();
    });
  });
  function sync(){
    var studyBtn = document.getElementById('studyToggleBtn');
    document.getElementById('miniStudy').style.display = studyBtn && studyBtn.style.display !== 'none' ? '' : 'none';
    var amb = document.getElementById('studyAmbient');
    document.getElementById('miniStudyAmbient').textContent = amb ? amb.textContent : '';
    bar.classList.toggle('show', window.scrollY > head.offsetHeight - 8);
  }
  window.addEventListener('scroll', sync, {passive: true});
  window.addEventListener('resize', sync);
  setInterval(sync, 2000);
  sync();
})();
initSearch();
initGroups();
initPanelBackdrop();
initContributorCard();
initLogin();
// Fed by build/live_overlay_bridge.js's <script type="module"> Firestore listener (a separate
// scope entirely — see that file's header comment for why). Re-renders whatever's currently on
// screen so a BR's live correction shows up within seconds, no reload needed.
// The same edits usually arrive twice (the REST fast path, then the live listener's first snapshot): when nothing
// actually changed, skip the re-render — it would cut the schedule's entrance animation short for no reason.
var OVERLAY_SIG = null;
function overlaySig(docs){
  function canon(v){
    if(Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if(v && typeof v === 'object') return '{' + Object.keys(v).filter(function(k){ return k !== 'createdAt' && k !== 'updatedAt'; })
      .sort().map(function(k){ return k + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v);
  }
  return canon((docs || []).slice().sort(function(a, b){ return a.id < b.id ? -1 : 1; }));
}
document.addEventListener('thirty:overlay', function(){
  var docs = window.__liveOverlay || [], sig = overlaySig(docs);
  try { localStorage.setItem(OVERLAY_CACHE_KEY, JSON.stringify({ t: Date.now(), docs: docs })); } catch(e){}
  if(OVERLAY_SYNC.ready && sig === OVERLAY_SIG) return;
  OVERLAY_SIG = sig;
  DATA.liveOverlay = docs;
  groupDaysCache = {};
  overlayArrived();
});
// The page's REST fast path (see the <head>): used only if it beats the SDK listener.
if(window.__overlayFast && window.__overlayFast.then) window.__overlayFast.then(function(docs){
  if(!docs || window.__liveOverlaySdk) return;
  window.__liveOverlay = docs;
  document.dispatchEvent(new CustomEvent('thirty:overlay'));
});
(function(){
  var saved = localStorage.getItem(LS_KEY);
  if(saved && DATA.roster[saved]){
    bootApp(DATA.roster[saved]);
  }
})();
// Re-render the today-panel if resizing crosses the desktop/phone breakpoint (e.g. rotating a
// tablet, or resizing a desktop browser window) — otherwise the day-nav would stay wherever it
// was placed at the last render until the next day-change.
(function(){
  if(typeof window === 'undefined' || !window.matchMedia) return;
  var mq = window.matchMedia('(min-width: 601px)');
  var last = mq.matches;
  window.addEventListener('resize', function(){
    if(mq.matches !== last){
      last = mq.matches;
      if(state.student) renderTodayPanel();
    }
  });
})();

})();

// App is up: take the boot splash (see #bootLoader in the template) away.
if(window.__bootDone) window.__bootDone();
