/* Shared schedule engine for the two sub-pages, /spectate and /br (spliced into both by
   build/splice.py). NOT used by the main dashboard (app3.js), which keeps its own copy of these
   rules on purpose so nothing here can break a real student's dashboard.

   Why one shared engine instead of the old per-page duplicates: /br used to preview a scope by
   looping over the raw weekday grid only, so everything layered on top of it by hand — date
   overrides, cancellations, venue relocations, HS/IKS assignments, NSO enrollment, exam-day
   suppression, other BRs' live changes — was invisible there. studentDay() below mirrors app3.js's
   buildDays() for one student and one date, so both pages now see exactly what that student sees.
   If buildDays()/ttMatches()/classDuration()/TIME_ORDER change in app3.js, mirror them here.

   Exposes a single global, ENGINE. */
var ENGINE = (function(){
'use strict';
var DATA = THIRTY_DATA;
DATA.liveOverlay = DATA.liveOverlay || [];

/* ================= dates & times ================= */
var WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function isoToDate(iso){ return new Date(iso+'T00:00:00'); }
function dateToISO(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function addDaysISO(iso, n){ var d = isoToDate(iso); d.setDate(d.getDate()+n); return dateToISO(d); }
function weekdayNameOf(iso){ return WEEKDAYS[isoToDate(iso).getDay()]; }
function todayISO(){ return dateToISO(new Date()); }
function nowMinutes(){ var d = new Date(); return d.getHours()*60 + d.getMinutes(); }
function dateLabel(iso){ return isoToDate(iso).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'}); }
function toHHMM(mins){
  mins = ((mins%1440)+1440)%1440;
  var h = Math.floor(mins/60), m = mins%60;
  var h12 = h%12; if(h12 === 0) h12 = 12;
  return h12+':'+String(m).padStart(2,'0')+' '+(h >= 12 ? 'PM' : 'AM');
}
function weekRange(iso){
  var d = isoToDate(iso);
  var mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7));
  var sun = new Date(mon); sun.setDate(mon.getDate()+6);
  return { start: dateToISO(mon), end: dateToISO(sun) };
}
function titleCase(full){
  return String(full || '').trim().split(/\s+/).map(function(w){ return w.charAt(0)+w.slice(1).toLowerCase(); }).join(' ');
}
function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}

/* ================= mirrored from app3.js ================= */
var CLASSES_START = '2026-08-03';
var TIME_ORDER = {
  '8.00 - 8.50': 480, '9.00 - 9.50': 540, '10.00 - 10. 50': 600, '10.00 - 10.50': 600,
  '11.00 - 11.50': 660, '12.00 - 12. 50': 720, '12.00 - 12.50': 720,
  '1.00 - 1.50': 780, '8.00 - 9.00': 480, '6.00 - 7.00': 1080,
  '2.00 - 2.50': 840, '3.00 - 3.50': 900, '4.00 - 4.50': 960,
  '5.00 - 5.50': 1020, '6.00- 6.50': 1080, '6.00 - 6.50': 1080, '7.00-7.50': 1140, '7.00 - 7.50': 1140,
  '9.30 - 11.30': 570, '12.30 - 2.30': 750, '3.30 - 5.30': 930,
  '9.30 - 12.30': 570, '2.30 - 5.30': 870, '7.10 - 8.00': 1150,
  '9.30 AM': 570, '11.00 AM': 660, '2.30 PM': 870, '4.00 PM': 960,
  '11.00 - 12.00': 660, '3.00 - 4.00': 900,
  '2.00 - 5.00': 840, '9.00 - 12.00': 540,
  '10.00 - 11.30': 600, '11.30 - 13.00': 690,
  '5.00 - 5.08': 1020, '5.10 - 5.18': 1030, '5.20 - 5.28': 1040, '5.30 - 5.38': 1050,
  '5.40 - 5.48': 1060, '5.50 - 5.58': 1070, '6.00 - 6.08': 1080, '6.10 - 6.18': 1090,
  '6.20 - 6.28': 1100, '6.30 - 6.38': 1110
};
// Effective window of a timetable entry (validFrom / validUntil, inclusive ISO dates) — mirrors app3.js entryLive().
function entryLive(e, iso){
  if(!iso) return true;
  return (!e.validFrom || iso >= e.validFrom) && (!e.validUntil || iso <= e.validUntil);
}
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
function ismpMatches(item, student){
  if(item.type === 'common') return true;
  if(!student.ismpGroup) return false;
  return item.groups.indexOf(student.ismpGroup) !== -1;
}
function classDuration(e){
  if(/^PH101-LABEXAM/.test(e.subject) || e.subject === 'PH101-LABPROJECT') return 180;
  if(e.subject === 'PH101-EXTRA' || e.subject === 'PH101-REVIEW') return 60;
  // AI101's compulsory online class (D1/D2), Sun 25 Oct 2026 (11:00 AM-1:00 PM, Google Meet) is a 2-hour block.
  if(e.subject === 'AI101-ONLINE') return 120;
  if(e.subject === 'HS111-PRESENT') return 8;
  if(/^PH101-LAB/.test(e.subject)) return 230;
  if(/-MIDSEM/.test(e.subject)) return 120;
  if(/-ENDSEM/.test(e.subject)) return 180;
  if(/-VIVA/.test(e.subject)) return 90;
  if(e.subject === 'WP101-LAB' && e.branch && e.branch.indexOf('CE') !== -1) return 240;
  if(e.subject === 'WP101-LAB' && e.branch && e.branch.indexOf('MME') !== -1) return 170;
  if(e.subject === 'CY101-LAB' && e.branch && e.branch.indexOf('ICDT') !== -1) return 170;
  if(/-LAB/.test(e.subject)) return 120;
  if(e.subject === 'AI101' && e.venue === 'LAB') return 120;
  if(e.subject === 'CS100' && e.venue === 'LAB') return 180;
  if(e.subject === 'CS100' && e.venue === 'Auditorium') return 75;
  if(e.subject === 'NO101') return 120;
  if(e.subject === 'CY101-TUT' && e.venue === 'SRC-106') return 60;
  if(e.subject === 'CY101-TUT' && e.branch && e.branch.indexOf('EP') !== -1) return 60;
  if(e.subject === 'LS101' && e.branch && e.branch.indexOf('ICDT') !== -1) return 90;
  if(e.subject === 'LS101') return 60;
  if(e.subject === 'MA101-TUT' && e.time === '8.00 - 9.00') return 60;
  if(e.subject === 'MA101-TUT' && e.time === '6.00 - 7.00') return 60;
  if(e.subject === 'MA101-QUIZ' && e.time === '7.10 - 8.00') return 50;
  if(/-QUIZ/.test(e.subject)) return 60;
  return 50;
}
function courseName(subject){
  var m = String(subject || '').match(/^([A-Z]{2,4}\d{3})/);
  if(!m) return null;
  var name = DATA.courseNames[m[1]];
  if(!name) return null;
  if(/-MIDSEM/.test(subject)) return name+' — Mid-Sem Exam';
  if(/-ENDSEM/.test(subject)) return name+' — End-Sem Exam';
  if(/-VIVA/.test(subject)) return name+' — Mid-Sem Viva';
  if(/-TUT/.test(subject)) return name+' — Tutorial';
  return /lab/i.test(subject) ? name+' — Lab' : name;
}
var SUBJECT_COLORS = {
  AI101:'#6286da', MA101:'#dac262', PH101:'#62daaa', CY101:'#da6662', CS100:'#9662da',
  TL101:'#62b6da', WP101:'#da9a62', NCC:'#8b949e', LIFESKILL:'#8b949e', NO101:'#62dad6',
  HS110:'#da62a2', HS111:'#dac262', HS112:'#62b6da', HS113:'#9662da', IK101:'#34C48A'
};
var FALLBACK_COLORS = ['#da6662','#da9a62','#dac262','#62daaa','#62dad6','#62b6da','#6286da','#9662da','#da62a2'];
function subjectColor(code){
  var up = String(code || '').toUpperCase();
  for(var k in SUBJECT_COLORS){ if(up.indexOf(k) === 0) return SUBJECT_COLORS[k]; }
  var h = 0;
  for(var j=0;j<up.length;j++) h = (h*31 + up.charCodeAt(j)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}
function relocatedVenue(venue, iso){
  var rules = DATA.venueRelocations || [];
  for(var i=0;i<rules.length;i++){
    var r = rules[i];
    if(r.from !== venue || iso < r.validFrom || (r.validTo && iso > r.validTo)) continue;
    return { venue: r.to, movedFrom: r.from };
  }
  return { venue: venue, movedFrom: null };
}
function isCancelledOn(subject, iso, group, division, branch){
  if(!iso) return false;
  return (DATA.cancellations || []).some(function(c){
    if(c.date !== iso || c.subject !== subject) return false;
    if(c.group && c.group.length && (!group || !c.group.some(function(g){ return group.indexOf(g) !== -1; }))) return false;
    if(c.division && c.division.length && (!division || !c.division.some(function(d){ return division.indexOf(d) !== -1; }))) return false;
    if(c.branch && c.branch.length && (!branch || !c.branch.some(function(b){ return branch.indexOf(b) !== -1; }))) return false;
    return true;
  });
}
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
function midsemExamWeek(){
  var weeks = (DATA.calendar && DATA.calendar.examWeeks) || [];
  for(var i=0;i<weeks.length;i++) if(/mid-sem/i.test(weeks[i].label)) return weeks[i];
  return null;
}
function examInfoFor(iso){
  var weeks = (DATA.calendar && DATA.calendar.examWeeks) || [];
  for(var i=0;i<weeks.length;i++) if(iso >= weeks[i].start && iso <= weeks[i].end) return weeks[i].label;
  return null;
}
var PARTIAL_EXAM_WEEK_DATES = { '2026-09-17': 1, '2026-09-18': 1 };

/* ================= live overlay (mirrors app3.js) ================= */
function overlayScopeMatches(scope, student){
  if(!scope) return false;
  if(scope.type === 'all') return true;
  if(scope.type === 'branch') return student.branch === scope.branch;
  if(scope.type === 'group') return student.branch === scope.branch && student.academicGroup === scope.group;
  if(scope.type === 'entries') return !!scope.entries && (!scope.branch || student.branch === scope.branch) && scope.entries.indexOf(student.entry) !== -1;
  return false;
}
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
// Returns the hiding doc (not just true/false) so /br can show "removed by X — restore".
// `exclude` skips one doc — a change doc's own hide never hides its own replacement.
function overlayHideFor(subject, iso, student, sMin, exclude){
  var list = DATA.liveOverlay || [];
  for(var i=0;i<list.length;i++){
    var ov = list[i];
    if(ov === exclude || !ov.hide || ov.hide.subject !== subject) continue;
    if(ov.hide.startMin != null && sMin != null && ov.hide.startMin !== sMin) continue;
    if(overlayScopeMatches(ov.hide.scope, student) && overlayAppliesOnDate(ov.hide.temporal, iso)) return ov;
  }
  return null;
}
function setOverlay(list){ DATA.liveOverlay = list || []; dayCache = {}; occCache = {}; overlayVersion++; }
var overlayVersion = 0;

/* ================= one student's day ================= */
// Item shape (shared by both pages): { uid, subject, title, code, sMin, eMin, venue, venueMovedFrom,
// category, color, source: 'timetable'|'override'|'elective'|'overlay'|'ismp', overlayId?,
// contributedBy?, hiddenBy? }. `subject` is the raw code a hide targets; ISMP items have none.
function itemFromEntry(e, iso, source, student){
  var sMin = TIME_ORDER[e.time];
  var dur = classDuration(e);
  var name = e.title || courseName(e.subject);
  var it = {
    subject: e.subject, title: name || e.subject, code: name ? e.subject : null,
    sMin: sMin !== undefined ? sMin : null, eMin: sMin !== undefined ? sMin + dur : null,
    venue: e.venue || null, category: e.category || null, color: subjectColor(e.subject),
    source: source, contributedBy: e.contributedBy || null, link: e.link || null
  };
  if(source === 'override' && (it.category === 'Exam' || it.category === 'Quiz') && student){
    var seat = DATA.examSeating && DATA.examSeating[iso] && DATA.examSeating[iso][student.entry];
    if(seat){
      it.baseVenue = it.venue;
      it.venue = seat.room + (seat.seat ? ' · Seat ' + seat.seat : '');
      it.seatRoom = seat.room; it.seat = seat.seat || null;
    }
  }
  return it;
}
var dayCache = {};
function dayContext(iso){
  var cal = DATA.calendar;
  var holiday = (cal.holidays && cal.holidays[iso]) || null;
  var noClass = (cal.noClassDays && cal.noClassDays[iso]) || null;
  var ambig = cal.ambiguousWeekday && cal.ambiguousWeekday[iso];
  var classWd = (cal.followsWeekday && cal.followsWeekday[iso]) || (ambig && ambig.primary) || weekdayNameOf(iso);
  var mw = midsemExamWeek();
  var inMidsem = !!(mw && iso >= mw.start && iso <= mw.end);
  return {
    holiday: holiday, noClass: noClass, classWd: classWd, inMidsem: inMidsem,
    partialExamDay: inMidsem && !!PARTIAL_EXAM_WEEK_DATES[iso],
    baseClasses: iso >= CLASSES_START && (!cal.classesEnd || iso <= cal.classesEnd) && !holiday && !noClass,
    note: holiday || noClass || null,
    examLabel: examInfoFor(iso),
    followsNote: (cal.followsWeekday && cal.followsWeekday[iso]) ? ('runs ' + cal.followsWeekday[iso] + '’s timetable') : null
  };
}
// opts.withHidden: also return items a live overlay hid, flagged with hiddenBy (the hiding doc),
// so /br can show what was removed and offer to restore it.
function studentDay(student, iso, opts){
  opts = opts || {};
  var key = student.entry + '|' + iso + '|' + (opts.withHidden ? 1 : 0);
  if(dayCache[key]) return dayCache[key];
  var ctx = dayContext(iso);
  var midsemSuppress;
  if(ctx.partialExamDay){
    midsemSuppress = ((DATA.dateOverrides && DATA.dateOverrides[iso]) || []).some(function(e){ return /-MIDSEM$/.test(e.subject) && ttMatches(e, student); });
  } else midsemSuppress = ctx.inMidsem;
  var classesStarted = ctx.baseClasses && !midsemSuppress;
  var hsCode = student.hsElective || null;
  var items = [], hidden = [];

  function keep(it, sMinForHide){
    if(it.subject){
      var h = overlayHideFor(it.subject, iso, student, sMinForHide === undefined ? it.sMin : sMinForHide);
      if(h){ if(opts.withHidden){ it.hiddenBy = h; hidden.push(it); } return; }
    }
    items.push(it);
  }

  // ISMP orientation (long over, kept so early-August dates still render truthfully)
  (DATA.ismpSchedule || []).forEach(function(day){
    if(day.date !== iso) return;
    day.items.forEach(function(it){
      if(!ismpMatches(it, student)) return;
      items.push({ subject: null, title: it.title, code: null, sMin: null, eMin: null, venue: it.venue || null,
        category: 'ISMP', color: '#8b949e', source: 'ismp', rawTime: it.time || '' });
    });
  });

  var overrideRaw = ((DATA.dateOverrides && DATA.dateOverrides[iso]) || []).filter(function(e){
    if(!/^(HS11[0-3]|IK101)-(MID|END)SEM/.test(e.subject)) return true;
    return hsCode && e.subject.indexOf(hsCode) === 0;
  });
  var overridden = {};
  overrideRaw.forEach(function(e){ if(ttMatches(e, student)) overridden[e.subject] = true; });

  if(classesStarted){
    (DATA.timetable[ctx.classWd] || []).forEach(function(e){
      if(!entryLive(e, iso) || !ttMatches(e, student) || overridden[e.subject]) return;
      if(e.subject === 'NO101' && !student.nsoEnrolled) return;
      if(labOccupiedByExam(e, iso) || isCancelledOn(e.subject, iso, e.group, e.division, e.branch)) return;
      keep(itemFromEntry(e, iso, 'timetable', student));
    });
    // HS113 project progress sessions: each project group attends only its own day (mirrors app3.js
    // electiveEntriesForDay — keep the two in step).
    var hp = DATA.hs113Progress, hpGroup = hsCode === 'HS113' && hp && iso >= hp.from && student.hs113Group;
    var hpRange = hpGroup ? hp.days[ctx.classWd] : null;
    var hpSkip = hpGroup && (!hpRange || student.hs113Group < hpRange[0] || student.hs113Group > hpRange[1]);
    if(hsCode && !hpSkip && !isCancelledOn(hsCode, iso)){
      (DATA.electives || []).forEach(function(el){
        if(el.code !== hsCode) return;
        el.sessions.forEach(function(s){
          if(s.day !== ctx.classWd) return;
          var sMin = TIME_ORDER[s.time];
          keep({ subject: el.code, title: el.code + ' — ' + el.title + (hpGroup ? ' · progress session, Group ' + student.hs113Group : ''), code: el.code,
            sMin: sMin !== undefined ? sMin : null, eMin: sMin !== undefined ? sMin + 50 : null,
            venue: (s.venueByBranch && s.venueByBranch[student.branch]) || s.venue || null,
            category: 'HS/IKS', color: subjectColor(el.code), source: 'elective', contributedBy: hpGroup ? hp.contributedBy : (el.contributedBy || null) });
        });
      });
    }
  }
  overrideRaw.forEach(function(e){
    if(!ttMatches(e, student) || labOccupiedByExam(e, iso) || isCancelledOn(e.subject, iso, e.group, e.division, e.branch)) return;
    keep(itemFromEntry(e, iso, 'override', student));
  });
  if(classesStarted){
    (DATA.liveOverlay || []).forEach(function(ov){
      if(!ov.show || !overlayScopeMatches(ov.show.scope, student) || !overlayAppliesOnDate(ov.show.temporal, iso)) return;
      var name = courseName(ov.show.subject);
      var it = { subject: ov.show.subject, title: name || ov.show.title || ov.show.subject, code: name ? (ov.show.title || ov.show.subject) : null,
        sMin: ov.show.startMin, eMin: ov.show.endMin, venue: ov.show.venue || null, category: ov.show.category || 'Update',
        color: subjectColor(ov.show.subject), source: 'overlay', overlayId: ov.id, overlay: ov, contributedBy: ov.createdBy || null };
      // Another live change can remove a BR-added item too (e.g. one branch dropping an item that
      // was added for the whole batch) — same rule as app3.js's overlayShowsForDate().
      var h = overlayHideFor(ov.show.subject, iso, student, ov.show.startMin, ov);
      if(h){ if(opts.withHidden){ it.hiddenBy = h; hidden.push(it); } return; }
      items.push(it);
    });
  }
  items.concat(hidden).forEach(function(it){
    if(it.venue){
      var r = relocatedVenue(it.venue, iso);
      it.venue = r.venue;
      if(r.movedFrom) it.venueMovedFrom = r.movedFrom;
    }
    it.uid = [it.source, it.subject || it.title, it.sMin, it.eMin, (it.seatRoom ? (it.baseVenue || '') : (it.venue || '')), it.overlayId || ''].join('|');
  });
  function bySMin(a, b){ return (a.sMin == null ? 9999 : a.sMin) - (b.sMin == null ? 9999 : b.sMin); }
  items.sort(bySMin); hidden.sort(bySMin);
  var out = { iso: iso, classWd: ctx.classWd, note: ctx.note, examLabel: ctx.examLabel, followsNote: ctx.followsNote,
    noRegularClasses: !classesStarted, items: items, hidden: hidden };
  dayCache[key] = out;
  return out;
}
function busyIntervals(student, iso){
  return studentDay(student, iso).items.filter(function(it){ return it.sMin != null; }).map(function(it){
    return { s: it.sMin, e: it.eMin == null ? it.sMin + 50 : it.eMin };
  });
}
function overlaps(intervals, ws, we){
  for(var i=0;i<intervals.length;i++) if(Math.max(intervals[i].s, ws) < Math.min(intervals[i].e, we)) return true;
  return false;
}

/* ================= cohorts =================
   Every set of students is a plain array of roster indices (sorted) plus a Uint8Array membership
   mask for O(1) lookups — 698 students, so this stays fast enough to recompute on every click. */
var ROSTER = Object.keys(DATA.roster).sort().map(function(e){ return DATA.roster[e]; });
var N = ROSTER.length;
var INDEX = {};
ROSTER.forEach(function(s, i){ INDEX[s.entry] = i; });
function maskOf(idxs){ var m = new Uint8Array(N); idxs.forEach(function(i){ m[i] = 1; }); return m; }
function idxsWhere(fn){ var out = []; for(var i=0;i<N;i++) if(fn(ROSTER[i])) out.push(i); return out; }
function idxsOfMask(m){ var out = []; for(var i=0;i<N;i++) if(m[i]) out.push(i); return out; }
function sameSet(a, b){ if(a.length !== b.length) return false; for(var i=0;i<a.length;i++) if(a[i] !== b[i]) return false; return true; }
function intersect(a, mask){ return a.filter(function(i){ return mask[i]; }); }

var BRANCH_NAMES = DATA.branchNames || {};
// The roster's internal branch key for Mathematics & Computing is 'MCB' (the segment inside entry numbers like
// 2026MCB1546, also what live BR edits are stored under); students call it MnC, so every on-screen branch label
// goes through bshort(). Entry-number ranges ("MCB1502–1522") keep MCB.
function bshort(b){ return b === 'MCB' ? 'MnC' : b; }
function bshortKey(k){ return String(k).replace(/^MCB(?=·|$)/, 'MnC'); }
var ENTRY_CODE = {}; // branch -> the 3-letter code inside its entry numbers (AIB, CSB, MCB, ...)
ROSTER.forEach(function(s){ if(!ENTRY_CODE[s.branch]) ENTRY_CODE[s.branch] = s.entry.slice(4, 7); });

// Structural units, coarse to fine. A group label shared by two branches (G2 = AIDE+MCB, G12 =
// CE+MME, ...) also gets a branch-qualified unit per branch ("MCB·G2") — the "one layer deeper"
// name used whenever only part of that group is meant.
var UNITS = [];
var UNIT_BY_ID = {};
function addUnit(u){ u.idxs = u.idxs.slice().sort(function(a,b){ return a-b; }); u.mask = maskOf(u.idxs); u.size = u.idxs.length; UNITS.push(u); UNIT_BY_ID[u.id] = u; return u; }
(function buildUnits(){
  addUnit({ id: 'all', level: 'all', label: 'Everyone', sub: 'the whole 2026 batch', idxs: idxsWhere(function(){ return true; }), rank: 0 });
  var divs = {}, branches = {}, groups = {}, bgroups = {};
  ROSTER.forEach(function(s, i){
    (divs[s.division] = divs[s.division] || []).push(i);
    (branches[s.branch] = branches[s.branch] || []).push(i);
    (groups[s.academicGroup] = groups[s.academicGroup] || []).push(i);
    (bgroups[s.branch+'·'+s.academicGroup] = bgroups[s.branch+'·'+s.academicGroup] || []).push(i);
  });
  function branchesIn(idxs){ var b = {}; idxs.forEach(function(i){ b[ROSTER[i].branch] = 1; }); return Object.keys(b).sort(); }
  Object.keys(divs).sort().forEach(function(d){
    addUnit({ id: 'div:'+d, level: 'division', label: d, sub: branchesIn(divs[d]).map(bshort).join(' · '), idxs: divs[d], rank: 1 });
  });
  Object.keys(groups).sort(function(a, b){ return parseInt(a.slice(1)) - parseInt(b.slice(1)); }).forEach(function(g){
    var bs = branchesIn(groups[g]);
    addUnit({ id: 'grp:'+g, level: 'group', label: g, sub: bs.map(bshort).join(' + '), idxs: groups[g], rank: 2, shared: bs.length > 1 });
  });
  Object.keys(branches).sort().forEach(function(b){
    addUnit({ id: 'br:'+b, level: 'branch', label: bshort(b), sub: BRANCH_NAMES[b] || b, idxs: branches[b], rank: 3, branch: b });
  });
  Object.keys(bgroups).sort().forEach(function(k){
    var p = k.split('·');
    if(UNIT_BY_ID['grp:'+p[1]].shared){
      addUnit({ id: 'bg:'+k, level: 'bgroup', label: bshortKey(k), sub: (BRANCH_NAMES[p[0]] || p[0]) + ', group ' + p[1], idxs: bgroups[k], rank: 4, branch: p[0], group: p[1] });
    }
  });
})();

// Contiguous runs inside each branch's own entry list ("CSB1239–1273"), so gaps in the official
// numbering don't split a run that the timetable itself treats as one block.
var BRANCH_ORDER = {};
ROSTER.forEach(function(s, i){ (BRANCH_ORDER[s.branch] = BRANCH_ORDER[s.branch] || []).push(i); });
var POS_IN_BRANCH = {};
Object.keys(BRANCH_ORDER).forEach(function(b){ BRANCH_ORDER[b].forEach(function(i, p){ POS_IN_BRANCH[i] = p; }); });
// With `withinMask`, contiguity is judged among the students in scope only — so "the NSO students
// of CSB1230–1238" is still one run even though non-NSO entry numbers sit between them.
function rangeLabels(idxs, withinMask){
  var byBranch = {};
  idxs.forEach(function(i){ (byBranch[ROSTER[i].branch] = byBranch[ROSTER[i].branch] || []).push(i); });
  var out = [];
  Object.keys(byBranch).sort().forEach(function(b){
    var order = BRANCH_ORDER[b].filter(function(i){ return !withinMask || withinMask[i]; });
    var pos = {};
    order.forEach(function(i, p){ pos[i] = p; });
    var list = byBranch[b].slice().sort(function(x, y){ return pos[x] - pos[y]; });
    var runs = [], cur = [list[0]];
    for(var k=1;k<list.length;k++){
      if(pos[list[k]] === pos[cur[cur.length-1]] + 1) cur.push(list[k]);
      else { runs.push(cur); cur = [list[k]]; }
    }
    runs.push(cur);
    var code = ENTRY_CODE[b];
    if(runs.length > 4){ out.push(list.length + ' of ' + bshort(b)); return; }
    runs.forEach(function(r){
      var a = ROSTER[r[0]].entry.slice(-4), z = ROSTER[r[r.length-1]].entry.slice(-4);
      out.push(code + a + (r.length > 1 ? '–' + z : ''));
    });
  });
  return out;
}
// "Kinds": the activity-defined populations — HS/IKS sections, NSO, NSS, Life Skills, the lab
// batches, ... For each, every distinct population that the timetable actually uses (the finest
// ranging used by that activity), so picking "TL101 lab" offers exactly its real batches.
var KINDS = [];
(function buildKinds(){
  function kind(id, label, sub, idxs, family){
    if(!idxs.length) return;
    var u = { id: 'kind:'+id, level: 'kind', label: label, sub: sub, idxs: idxs, rank: 5, family: family };
    addUnit(u); KINDS.push(u);
  }
  (DATA.electives || []).forEach(function(el){
    kind(el.code, el.code, el.title, idxsWhere(function(s){ return s.hsElective === el.code; }), el.code === 'IK101' ? 'IKS' : 'HSS');
  });
  kind('NSO', 'NSO', 'enrolled in NO101', idxsWhere(function(s){ return s.nsoEnrolled; }), 'NSO');
  kind('NSS', 'NSS', 'enrolled in NS101', idxsWhere(function(s){ return s.nssEnrolled; }), 'NSS');
  var FAMILY = { 'LS101': 'Life Skills', 'NO101': 'NSO', 'TL101-LAB': 'TL101 lab', 'WP101-LAB': 'WP101 lab', 'PH101-LAB': 'PH101 lab',
    'CY101-LAB': 'CY101 lab', 'CY101-TUT': 'CY101 tutorial', 'MA101-TUT': 'MA101 tutorial', 'PH101-TUT': 'PH101 tutorial' };
  var seen = {};
  Object.keys(DATA.timetable).forEach(function(wd){
    DATA.timetable[wd].forEach(function(e){
      var fam = FAMILY[e.subject];
      if(!fam || e.validUntil) return;               // superseded rules (validUntil) are history, not a current cohort
      var idxs = idxsWhere(function(s){ return ttMatches(e, s) && (e.subject !== 'NO101' || s.nsoEnrolled); });
      var sig = e.subject + '|' + idxs.join(',');
      if(seen[sig] || !idxs.length) return;
      seen[sig] = true;
      kind(e.subject + ':' + Object.keys(seen).length, fam, wd.slice(0,3) + ' ' + toHHMM(TIME_ORDER[e.time] || 0), idxs, fam);
    });
  });
  // Each kind's label gets its population appended once units exist (describe needs them).
  KINDS.forEach(function(k){
    if(k.family === 'HSS' || k.family === 'IKS' || k.id === 'kind:NSO' || k.id === 'kind:NSS') return;
    k.label = k.family + ' · ' + describeStructural(k.idxs, null, true).join(' + ');
  });
})();

// The finest partition the timetable itself uses: students grouped by exactly which recurring
// timetable entries apply to them (TL101 lab batches, CY101 lab roll ranges, ...). HS/IKS sections
// and NSO/NSS enrollment are deliberately left out — they're picked as kinds and combined with
// "narrow", otherwise every atom would shatter into dozens of 1-4 student fragments.
var ATOMS = (function(){
  var sigs = {};
  var entries = [];
  Object.keys(DATA.timetable).forEach(function(wd){ DATA.timetable[wd].forEach(function(e){ if(!e.validUntil) entries.push(e); }); });
  ROSTER.forEach(function(s, i){
    var sig = entries.map(function(e){ return e.subject !== 'NO101' && ttMatches(e, s) ? '1' : '0'; }).join('');
    (sigs[sig] = sigs[sig] || []).push(i);
  });
  return Object.keys(sigs).map(function(sig, n){
    var idxs = sigs[sig];
    var s0 = ROSTER[idxs[0]];
    return { id: 'atom:'+n, level: 'atom', idxs: idxs, mask: maskOf(idxs), size: idxs.length,
      branch: s0.branch, group: s0.academicGroup, division: s0.division };
  }).sort(function(a, b){ return a.idxs[0] - b.idxs[0]; });
})();
ATOMS.forEach(function(a){
  a.label = describeStructural(a.idxs, null, true).join(' + ');
  UNIT_BY_ID[a.id] = a;
});

// Names a set of students the way a person would: whole divisions first, then whole groups, whole
// branches, branch-qualified groups (only when the bare group label would be ambiguous), and only
// what's left as entry-number ranges. `within` (optional idxs) makes it relative to a selection —
// "D3" then means "the D3 part of what you picked", so a cohort view never has to spell out ranges
// just because the cohort itself isn't a whole unit.
function describeStructural(idxs, within, skipAll){
  if(!idxs.length) return ['nobody'];
  var withinMask = within ? maskOf(within) : null;
  var setMask = maskOf(idxs);
  var remaining = maskOf(idxs);
  var labels = [];
  var cands = UNITS.filter(function(u){ return u.level !== 'kind' && !(skipAll && u.level === 'all'); }).map(function(u){
    return { u: u, part: withinMask ? intersect(u.idxs, withinMask) : u.idxs };
  }).filter(function(c){ return c.part.length; });
  cands.sort(function(a, b){ return (b.part.length - a.part.length) || (a.u.rank - b.u.rank); });
  // Prefer a group label over an identical branch (G3 == all of MCB's G3 students, etc.) and a
  // bare group over its own branch-qualified twin when they're the same set.
  var picked = [];
  cands.forEach(function(c){
    if(!c.part.every(function(i){ return setMask[i] && remaining[i]; })) return;
    picked.push(c.u);
    c.part.forEach(function(i){ remaining[i] = 0; });
  });
  // Biggest-first decides WHICH units; reading order (D1 before D2, G1 before G3) decides display.
  picked.sort(function(a, b){ return UNITS.indexOf(a) - UNITS.indexOf(b); });
  picked.forEach(function(u){ labels.push(u.label); });
  var left = idxsOfMask(remaining);
  if(left.length) labels = labels.concat(rangeLabels(left, withinMask));
  return labels;
}
// Token cost of a description: plain unit names are cheap, entry ranges cost more, "N of X" most —
// so "NSO: G12 + G5" beats a run of eight entry ranges for the same students.
function labelCost(labels){
  return labels.reduce(function(sum, l){ return sum + (/\bof\b/.test(l) ? 4 : /\d{4}/.test(l) ? 2 : 1); }, 0);
}
function isEnrollmentKind(K){ return K.family === 'HSS' || K.family === 'IKS' || K.id === 'kind:NSO' || K.id === 'kind:NSS'; }
function describe(idxs, within, noComplement){
  if(within && sameSet(idxs, within)) return ['everyone selected'];
  var best = describeStructural(idxs, within);
  var bestCost = labelCost(best);
  if(bestCost <= 1) return best;
  var withinMask = within ? maskOf(within) : null;
  var setMask = maskOf(idxs);
  // Activity-defined populations (an HS section, NSO enrollees, a lab batch): exact match first,
  // then "KIND: structural description inside that kind" when the set lies within one.
  // Only the enrollment kinds (HS/IKS sections, NSO, NSS) name things here: the activity kinds
  // (lab batches, Life Skills slots) are for PICKING — as a label they'd just repeat the row's
  // own title, or name a free line after a lab those students aren't even in right then.
  var named = KINDS.filter(isEnrollmentKind);
  for(var k=0;k<named.length;k++){
    var K = named[k];
    if(!idxs.every(function(i){ return K.mask[i]; })) continue;
    var Kw = withinMask ? intersect(K.idxs, withinMask) : K.idxs;
    if(sameSet(Kw, idxs)) return [K.label];
    var inner = describeStructural(idxs, Kw);
    var cost = labelCost(inner) + 0.5;
    if(cost < bestCost){ best = [K.label + ': ' + inner.join(' + ')]; bestCost = cost; }
  }
  // A union of whole kinds ("HS110 + HS111") — the HS/IKS sections partition everyone, so a slot
  // shared by two sections is named by them, not by the entry ranges they happen to cover.
  var covered = new Uint8Array(N), union = [];
  named.forEach(function(K){
    var Kw = withinMask ? intersect(K.idxs, withinMask) : K.idxs;
    if(!Kw.length || !Kw.every(function(i){ return setMask[i] && !covered[i]; })) return;
    union.push(K.label);
    Kw.forEach(function(i){ covered[i] = 1; });
  });
  if(union.length > 1 && union.length < bestCost && idxs.every(function(i){ return covered[i]; })){ best = union; bestCost = union.length; }
  // "All except …" when the students NOT in the set are the easier ones to name.
  if(within && !noComplement && idxs.length > within.length / 2){
    var comp = within.filter(function(i){ return !setMask[i]; });
    var dc = describe(comp, within, true);
    if(labelCost(dc) + 1 < bestCost){ best = ['all except ' + dc.join(' + ')]; bestCost = labelCost(dc) + 1; }
  }
  return best;
}

/* ================= selection (picker model) =================
   A selection is an ordered list of operations on units — add (∪), narrow (∩), remove (−) — so it
   can express "D1 + D2", "CSE ∩ HS110", "AIDE − G2" and is trivially undoable. */
function evalSelection(ops, universeIdxs){
  var uni = universeIdxs ? maskOf(universeIdxs) : null;
  var m = new Uint8Array(N);
  ops.forEach(function(op){
    var u = UNIT_BY_ID[op.id];
    if(!u) return;
    if(op.op === 'add') u.idxs.forEach(function(i){ m[i] = 1; });
    else if(op.op === 'narrow'){ var keepM = u.mask; for(var i=0;i<N;i++) if(!keepM[i]) m[i] = 0; }
    else if(op.op === 'remove') u.idxs.forEach(function(i){ m[i] = 0; });
  });
  if(uni) for(var j=0;j<N;j++) if(!uni[j]) m[j] = 0;
  return idxsOfMask(m);
}
// Units that strictly contain the selection (to widen) and units/atoms strictly inside it (to
// narrow) — the "supersets / subsets" navigation.
function supersetsOf(idxs, universeIdxs){
  if(!idxs.length) return [];
  var uni = universeIdxs ? maskOf(universeIdxs) : null;
  return UNITS.filter(function(u){
    var part = uni ? intersect(u.idxs, uni) : u.idxs;
    return part.length > idxs.length && idxs.every(function(i){ return u.mask[i]; });
  }).sort(function(a, b){
    var pa = uni ? intersect(a.idxs, uni).length : a.size, pb = uni ? intersect(b.idxs, uni).length : b.size;
    // Same students inside the universe? Prefer the unit that IS exactly that (CSE over "Everyone"
    // for a CSE BR), then the coarser name.
    return (pa - pb) || ((a.size - pa) - (b.size - pb)) || ((a.rank || 0) - (b.rank || 0));
  });
}
function subsetsOf(idxs, universeIdxs){
  if(idxs.length < 2) return [];
  var m = maskOf(idxs);
  var uni = universeIdxs ? maskOf(universeIdxs) : null;
  var units = UNITS.filter(function(u){
    var part = uni ? intersect(u.idxs, uni) : u.idxs;
    return part.length && part.length < idxs.length && part.every(function(i){ return m[i]; }) && u.level !== 'kind';
  });
  var atoms = ATOMS.filter(function(a){ return a.size < idxs.length && a.idxs.every(function(i){ return m[i]; }); });
  return units.concat(atoms).sort(function(a, b){ return b.size - a.size; });
}
function atomsIn(idxs){
  var m = maskOf(idxs);
  return ATOMS.filter(function(a){ return a.idxs.some(function(i){ return m[i]; }); });
}

/* ================= cohort day (Groups-panel philosophy) =================
   One line per distinct activity at each start time — "who · what · @where · till" — where "who"
   is the selection's own students doing exactly that, named by describe(). Plus who's free at
   each of those moments, and the windows where the whole selection is free together. */
// Exam/quiz seats are per student: a row shows the shared room, and keeps the seats in row.seats
// ([{i, seat}]) for the collapsible, searchable list (seatListHtml) instead of one row per seat.
function noteSeat(row, i, it){
  if(!it.seatRoom) return;
  (row.seats = row.seats || []).push({ i: i, seat: it.seat, room: it.seatRoom });
}
function finishSeats(rows){
  rows.forEach(function(r){
    if(!r.seats) return;
    if(r.who.length < 2) return;
    // Students of one exam can sit in several rooms: the row names them (or just counts them when there are many),
    // and every entry in the seat list carries its own room.
    var rooms = [];
    r.seats.forEach(function(x){ if(x.room && rooms.indexOf(x.room) === -1) rooms.push(x.room); });
    r.item = Object.assign({}, r.item, { venue: rooms.length > 3 ? rooms.length + ' venues' : rooms.join(', '), seat: null });
  });
}
var seatUid = 0;
// Collapsed by default; the box filters the list by name, entry number or seat.
function seatListHtml(r, esc){
  if(!r.seats || r.who.length < 2) return '';
  var id = 'seatlist' + (++seatUid);
  var counts = {}, order = [];
  r.seats.forEach(function(x){ if(!x.room) return; if(!counts[x.room]){ counts[x.room] = 0; order.push(x.room); } counts[x.room]++; });
  var roomChips = order.length > 1 ? '<div class="seat-rooms">' + order.map(function(rm){ return '<button type="button" class="seat-chip" data-q="' + esc(rm) + '">' + esc(rm) + ' <i>' + counts[rm] + '</i></button>'; }).join('') + '</div>' : '';
  var rows = r.seats.slice().sort(function(a, b){ return ROSTER[a.i].entry < ROSTER[b.i].entry ? -1 : 1; }).map(function(x){
    var s = ROSTER[x.i];
    return '<div class="seat-row"><span class="seat-who">' + esc(titleCase(s.name)) + '</span><span class="seat-entry">' + esc(s.entry) + '</span><span class="seat-room">' + esc(x.room || '') + '</span><b class="seat-no">' + esc(x.seat || '—') + '</b></div>';
  }).join('');
  return '<details class="seat-list" id="' + id + '"><summary>Venue &amp; seat · ' + r.seats.length + (r.seats.length < r.who.length ? ' of ' + r.who.length : '') + ' students</summary>' +
    roomChips + '<input class="seat-search" type="search" placeholder="Search name, entry no., venue or seat" autocomplete="off">' +
    '<div class="seat-rows">' + rows + '</div><div class="seat-none" style="display:none">No match</div></details>';
}
if(typeof document !== 'undefined' && document.addEventListener){
  document.addEventListener('click', function(ev){
    var c = ev.target && ev.target.closest && ev.target.closest('.seat-chip');
    if(!c) return;
    var inp = c.closest('.seat-list').querySelector('.seat-search');
    inp.value = inp.value === c.getAttribute('data-q') ? '' : c.getAttribute('data-q');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.addEventListener('input', function(ev){
    var t = ev.target;
    if(!t || !t.classList || !t.classList.contains('seat-search')) return;
    var q = t.value.trim().toLowerCase(), box = t.parentNode, shown = 0;
    Array.prototype.forEach.call(box.querySelectorAll('.seat-row'), function(row){
      var ok = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
      row.style.display = ok ? '' : 'none';
      if(ok) shown++;
    });
    var none = box.querySelector('.seat-none');
    if(none) none.style.display = shown ? 'none' : '';
  });
}
function cohortDay(idxs, iso, opts){
  opts = opts || {};
  var slots = {}, untimed = {}, busy = [], hiddenRows = {};
  var notes = {};
  idxs.forEach(function(i){
    var s = ROSTER[i];
    var day = studentDay(s, iso, { withHidden: !!opts.withHidden });
    if(day.note) notes[day.note] = 1;
    if(day.followsNote) notes[day.followsNote] = 1;
    var mine = [];
    day.items.forEach(function(it){
      var k = it.uid;
      if(it.sMin == null){
        var u = untimed[k] || (untimed[k] = { item: it, who: [] });
        u.who.push(i);
        noteSeat(u, i, it);
        return;
      }
      mine.push([it.sMin, it.eMin == null ? it.sMin + 50 : it.eMin]);
      var slot = slots[it.sMin] || (slots[it.sMin] = {});
      var row = slot[k] || (slot[k] = { item: it, who: [] });
      row.who.push(i);
      noteSeat(row, i, it);
    });
    busy.push(mine);
    (day.hidden || []).forEach(function(it){
      var k = it.uid + '|' + it.hiddenBy.id;
      var row = hiddenRows[k] || (hiddenRows[k] = { item: it, who: [] });
      row.who.push(i);
    });
  });
  var starts = Object.keys(slots).map(Number).sort(function(a, b){ return a - b; });
  var timeline = starts.map(function(sMin){
    var rows = Object.keys(slots[sMin]).map(function(k){ return slots[sMin][k]; });
    rows.sort(function(a, b){ return b.who.length - a.who.length || (a.item.eMin || 0) - (b.item.eMin || 0); });
    rows.forEach(function(r){ r.label = describe(r.who, idxs); });
    finishSeats(rows);
    var free = [];
    idxs.forEach(function(i, p){ if(!busy[p].some(function(iv){ return iv[0] <= sMin && sMin < iv[1]; })) free.push(i); });
    return { sMin: sMin, rows: rows, free: free, freeLabel: free.length ? describe(free, idxs) : null };
  });
  var untimedRows = Object.keys(untimed).map(function(k){ var r = untimed[k]; r.label = describe(r.who, idxs); return r; });
  finishSeats(untimedRows);
  var hidden = Object.keys(hiddenRows).map(function(k){ var r = hiddenRows[k]; r.label = describe(r.who, idxs); return r; })
    .sort(function(a, b){ return (a.item.sMin || 0) - (b.item.sMin || 0); });
  return { iso: iso, timeline: timeline, untimed: untimedRows, hidden: hidden, notes: Object.keys(notes),
    together: freeWindows(busy, 8*60, 21*60, 30), busy: busy, size: idxs.length };
}
function freeWindows(busyLists, dayStart, dayEnd, minLen){
  var all = [];
  busyLists.forEach(function(l){ all = all.concat(l); });
  all.sort(function(a, b){ return a[0] - b[0]; });
  var out = [], cursor = dayStart;
  all.forEach(function(iv){
    if(iv[1] <= cursor) return;
    if(iv[0] > cursor && Math.min(iv[0], dayEnd) - cursor >= minLen) out.push([cursor, Math.min(iv[0], dayEnd)]);
    cursor = Math.max(cursor, iv[1]);
  });
  if(dayEnd - cursor >= minLen) out.push([cursor, dayEnd]);
  return out;
}
// Whether every student in idxs has the same day (so the view is literally one student's view).
function isHomogeneousDay(idxs, iso){
  if(idxs.length < 2) return true;
  var sig = null;
  for(var k=0;k<idxs.length;k++){
    var d = studentDay(ROSTER[idxs[k]], iso, { withHidden: true });
    var s = d.items.map(function(it){ return it.uid; }).join('#') + '||' + d.hidden.map(function(it){ return it.uid + it.hiddenBy.id; }).join('#');
    if(sig === null) sig = s; else if(s !== sig) return false;
  }
  return true;
}

/* ================= contacts ================= */
function contactsFor(idxs){
  var m = maskOf(idxs);
  var pairs = {};
  idxs.forEach(function(i){ pairs[ROSTER[i].branch+'/'+ROSTER[i].academicGroup] = 1; });
  var branches = {};
  idxs.forEach(function(i){ branches[ROSTER[i].branch] = 1; });
  var brs = [];
  (DATA.batchReps || []).forEach(function(r){
    if(pairs[r.branch+'/'+r.group]) brs.push({ branch: r.branch, group: r.group, reps: r.reps.map(function(e){ return { entry: e, name: DATA.roster[e] ? titleCase(DATA.roster[e].name) : e }; }) });
  });
  // Who checked this cohort's schedule against reality (DATA.scheduleVerifications).
  var verifiers = [];
  (DATA.scheduleVerifications || []).forEach(function(v){
    if(!(v.group ? pairs[v.branch+'/'+v.group] : branches[v.branch])) return;
    verifiers.push({ branch: v.branch, group: v.group || null, entry: v.verifiedBy, name: DATA.roster[v.verifiedBy] ? titleCase(DATA.roster[v.verifiedBy].name) : v.verifiedBy });
  });
  return { brs: brs, verifiers: verifiers };
}

/* ================= finding a time ================= */
var HOUR_START = 7, HOUR_END = 22;
// Slides a `durationMin` window across each date at `stepMin` steps, scoring by the share of
// `students` free for the WHOLE window (an organiser needs the full slot, not most of it).
function findSlots(students, isoList, durationMin, dayStartMin, dayEndMin, stepMin){
  var results = [];
  isoList.forEach(function(iso){
    var per = students.map(function(s){ return busyIntervals(s, iso); });
    for(var ws = dayStartMin; ws + durationMin <= dayEndMin; ws += stepMin){
      var we = ws + durationMin, blocked = 0;
      for(var i=0;i<per.length;i++) if(overlaps(per[i], ws, we)) blocked++;
      var free = students.length - blocked;
      results.push({ iso: iso, ws: ws, we: we, free: free, total: students.length, pct: students.length ? free / students.length : 0 });
    }
  });
  results.sort(function(a, b){ return (b.pct - a.pct) || (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : a.ws - b.ws); });
  return results;
}
// Keeps only the best candidate per overlapping window, so the top N are genuinely different times.
// `perDay` (optional) caps picks per date, so one wide-open day (a Sunday) can't fill the list.
function diversifySlots(sorted, maxResults, perDay){
  var out = [], days = {};
  for(var i=0; i<sorted.length && out.length < maxResults; i++){
    var c = sorted[i];
    if(perDay && (days[c.iso] || 0) >= perDay) continue;
    if(out.some(function(p){ return p.iso === c.iso && Math.max(p.ws, c.ws) < Math.min(p.we, c.we); })) continue;
    out.push(c);
    days[c.iso] = (days[c.iso] || 0) + 1;
  }
  return out;
}

/* ================= rooms =================
   "Is this ROOM free" needs every booking on campus, not just one cohort's: freshers' items from
   the same rules as studentDay() (a fresher booking occupies its room if at least one of its
   students actually has it that day — so per-student hides/exam days are exact, not guessed), plus
   every other batch's courses from the institute-wide grid (DATA.instituteTimetable). */
var VENUE_ALIAS = { 'SENATE': 'SENATEHALL', 'AUDI': 'AUDITORIUM', 'SCR107': 'SRC107' };
function venueKey(raw){
  var k = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '');
  return VENUE_ALIAS[k] || k;
}
// Not bookable single rooms: 'LAB' is a generic placeholder, 'G12' a data artifact (see merge.py),
// 'L/P' the institute sheet's "lab/practical" marker, exam seating strings are per-student seats.
function venueUsable(raw){
  var k = venueKey(raw);
  if(!k || k === 'LAB' || k === 'G12' || k === 'L/P' || /SEAT/.test(k)) return false;
  return true;
}
// A venue string can name several real rooms ("SRC-003 (TA Group 1) or SRC-004 (TA Group 2), LHC",
// "SRC-003 / SRC-004, LHC") — book each room it names. Strings that name no standard room code
// ("CSE Building", "Lab A-237", "B004, Har Gobind Khorana Block…") are kept whole as their own room.
var ROOM_CODE_RE = /\b(SRC|SCR|EE|CS|CY|ME|S)-?(\d{1,3}|SH)\b/gi;
function venueParts(raw){
  if(!raw) return [];
  var found = String(raw).match(ROOM_CODE_RE);
  if(!found || found.length < 2) return [raw];
  var seen = {}, out = [];
  found.forEach(function(f){ var k = venueKey(f); if(!seen[k]){ seen[k] = 1; out.push(f.toUpperCase().replace(/^([A-Z]+)-?/, '$1-')); } });
  return out;
}
var VENUE_NAMES = {};
var ALL_VENUES = (function(){
  var counts = {};
  function note(full){
    venueParts(full).forEach(function(raw){
      if(!raw || !venueUsable(raw)) return;
      var k = venueKey(raw);
      (counts[k] = counts[k] || {})[raw] = (counts[k][raw] || 0) + 1;
    });
  }
  Object.keys(DATA.timetable).forEach(function(wd){ DATA.timetable[wd].forEach(function(e){ note(e.venue); }); });
  Object.keys(DATA.dateOverrides || {}).forEach(function(iso){ DATA.dateOverrides[iso].forEach(function(e){ note(e.venue); }); });
  (DATA.electives || []).forEach(function(el){ el.sessions.forEach(function(s){ note(s.venue); }); });
  (DATA.venueRelocations || []).forEach(function(r){ note(r.to); });
  Object.keys(DATA.instituteTimetable || {}).forEach(function(wd){ DATA.instituteTimetable[wd].forEach(function(b){ note(b.venue); }); });
  return Object.keys(counts).map(function(k){
    var forms = counts[k];
    // Most-used spelling wins, but a hyphenated room code ("EE-3") beats its bare twin ("EE3").
    var best = Object.keys(forms).sort(function(a, b){ return (/-\d/.test(b) - /-\d/.test(a)) || (forms[b] - forms[a]); })[0];
    VENUE_NAMES[k] = best;
    var leg = DATA.venueLegend && DATA.venueLegend[k.replace(/[()]/g, '')];
    return { key: k, name: best, desc: leg ? leg.desc : '' };
  }).sort(function(a, b){ return a.name.localeCompare(b.name, 'en', { numeric: true }); });
})();
function venueNameFor(raw){ return VENUE_NAMES[venueKey(raw)] || raw; }

var POP_CACHE = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
function populationOf(e){
  if(POP_CACHE && POP_CACHE.has(e)) return POP_CACHE.get(e);
  var idxs = idxsWhere(function(s){ return ttMatches(e, s) && (e.subject !== 'NO101' || s.nsoEnrolled); });
  if(POP_CACHE) POP_CACHE.set(e, idxs);
  return idxs;
}
function instituteClassesOn(iso){
  var ic = DATA.instituteCalendar;
  if(!ic) return null;
  if(iso < ic.classesStart || iso > ic.classesEnd) return null;
  if(DATA.calendar.holidays && DATA.calendar.holidays[iso]) return null;
  if(ic.noClassDays && ic.noClassDays[iso]) return null;
  if(ic.midsem && iso >= ic.midsem.start && iso <= ic.midsem.end) return null;
  return (ic.followsWeekday && ic.followsWeekday[iso]) || weekdayNameOf(iso);
}
var occCache = {};
// { venueKey: [{s, e, title, code, who, batch:'2026'|'other', source}] } for one date.
function venueOccupancy(iso){
  if(occCache[iso]) return occCache[iso];
  var out = {};
  function push(full, b){
    venueParts(full).forEach(function(raw){
      if(!raw || !venueUsable(raw)) return;
      var k = venueKey(raw);
      (out[k] = out[k] || []).push(b);
    });
  }
  var ctx = dayContext(iso);
  // Fresher bookings: walk every candidate source entry once, keep it if any of its students
  // really has it today (that student's studentDay() already applied every override rule).
  var cand = [];
  if(ctx.baseClasses) (DATA.timetable[ctx.classWd] || []).forEach(function(e){ if(entryLive(e, iso)) cand.push({ e: e, src: 'timetable' }); });
  ((DATA.dateOverrides && DATA.dateOverrides[iso]) || []).forEach(function(e){ cand.push({ e: e, src: 'override' }); });
  cand.forEach(function(c){
    var e = c.e;
    var sMin = TIME_ORDER[e.time];
    if(sMin === undefined || !e.venue) return;
    var present = populationOf(e).filter(function(i){
      return studentDay(ROSTER[i], iso).items.some(function(it){ return it.subject === e.subject && it.sMin === sMin && it.source === c.src; });
    });
    if(!present.length) return;
    var reloc = relocatedVenue(e.venue, iso);
    push(reloc.venue, { s: sMin, e: sMin + classDuration(e), code: e.subject, title: e.title || courseName(e.subject) || e.subject,
      who: describe(present).join(' + '), batch: '2026', source: c.src, movedFrom: reloc.movedFrom });
  });
  if(ctx.baseClasses){
    (DATA.electives || []).forEach(function(el){
      var takers = idxsWhere(function(s){ return s.hsElective === el.code; });
      el.sessions.forEach(function(sess){
        if(sess.day !== ctx.classWd) return;
        var sMin = TIME_ORDER[sess.time];
        if(sMin === undefined) return;
        var present = takers.filter(function(i){
          return studentDay(ROSTER[i], iso).items.some(function(it){ return it.subject === el.code && it.sMin === sMin; });
        });
        if(!present.length) return;
        var venues = {};
        present.forEach(function(i){ var s = ROSTER[i]; venues[(sess.venueByBranch && sess.venueByBranch[s.branch]) || sess.venue] = 1; });
        Object.keys(venues).forEach(function(v){
          var reloc = relocatedVenue(v, iso);
          push(reloc.venue, { s: sMin, e: sMin + 50, code: el.code, title: el.code + ' — ' + el.title, who: el.code + ' section', batch: '2026', source: 'elective', movedFrom: reloc.movedFrom });
        });
      });
    });
    (DATA.liveOverlay || []).forEach(function(ov){
      if(!ov.show || !ov.show.venue || !overlayAppliesOnDate(ov.show.temporal, iso)) return;
      var present = idxsWhere(function(s){
        return overlayScopeMatches(ov.show.scope, s) && studentDay(s, iso).items.some(function(it){ return it.overlay === ov; });
      });
      if(!present.length) return;
      push(ov.show.venue, { s: ov.show.startMin, e: ov.show.endMin, code: ov.show.subject, title: ov.show.title || ov.show.subject,
        who: describe(present).join(' + '), batch: '2026', source: 'overlay' });
    });
  }
  var wd = instituteClassesOn(iso);
  if(wd){
    ((DATA.instituteTimetable && DATA.instituteTimetable[wd]) || []).forEach(function(b){
      var name = courseName(b.code);
      push(b.venue, { s: b.s, e: b.e, code: b.code, title: name || b.code, who: 'other batches', batch: 'other', source: 'institute' });
    });
  }
  Object.keys(out).forEach(function(k){ out[k].sort(function(a, b){ return a.s - b.s || a.e - b.e; }); });
  occCache[iso] = out;
  return out;
}
// Merged busy blocks for one venue on one date — [ {s, e, bookings:[...]} ].
function venueBlocks(key, iso){
  var list = venueOccupancy(iso)[key] || [];
  var blocks = [];
  list.forEach(function(b){
    var last = blocks[blocks.length-1];
    if(last && b.s <= last.e){ last.e = Math.max(last.e, b.e); last.bookings.push(b); }
    else blocks.push({ s: b.s, e: b.e, bookings: [b] });
  });
  return blocks;
}
// Status of one venue at minute `t` of `iso`: free (until when, next booking) or busy (by whom,
// until when the room becomes free again).
function venueStatus(key, iso, t, dayEnd){
  dayEnd = dayEnd || 22*60;
  var blocks = venueBlocks(key, iso);
  for(var i=0;i<blocks.length;i++){
    var b = blocks[i];
    if(b.s <= t && t < b.e){
      var now = b.bookings.filter(function(x){ return x.s <= t && t < x.e; });
      return { free: false, until: b.e, current: now, next: blocks[i+1] || null, blocks: blocks };
    }
    if(b.s > t) return { free: true, until: b.s, next: b, freeMins: b.s - t, blocks: blocks };
  }
  return { free: true, until: null, next: null, freeMins: Math.max(0, dayEnd - t), blocks: blocks };
}

/* ================= courses =================
   Every course on campus: freshers' from the curated timetable/electives/overrides (who takes it is
   exact, per student), every other batch's from the institute grid, plus title/instructor/enrolment
   from the Academic Section's course-floating sheet (DATA.courseCatalog). */
function baseCode(subject){ var m = String(subject || '').toUpperCase().match(/^([A-Z]{1,4}\d{2,3}[A-Z]?)/); return m ? m[1] : null; }
function prettyTitle(t){
  if(!t) return t;
  // The floating sheet shouts some titles ("CALCULUS"); title-case only those that are all caps.
  return t === t.toUpperCase() ? t.toLowerCase().replace(/\b([a-z])/g, function(c){ return c.toUpperCase(); }) : t;
}
var COURSES = (function(){
  var map = {};
  function get(code){
    if(!map[code]){
      // The floating sheet sometimes suffixes a section letter ("BM101A" for the grid's "BM101").
      var cat = (DATA.courseCatalog || {})[code] || (DATA.courseCatalog || {})[code + 'A'] || {};
      var el = (DATA.electives || []).filter(function(e){ return e.code === code; })[0];
      map[code] = { code: code, title: (DATA.courseNames && DATA.courseNames[code]) || (el && el.title) || prettyTitle(cat.title) || null,
        instructor: cat.instructor || (el && el.instructor) || null, students: cat.students || null, floated: cat.floated !== false,
        remark: cat.remark || null, fresher: false, other: false, entries: [], takers: null };
    }
    return map[code];
  }
  Object.keys(DATA.timetable).forEach(function(wd){ DATA.timetable[wd].forEach(function(e){ if(e.validUntil) return; var c = baseCode(e.subject); if(c){ var r = get(c); r.fresher = true; r.entries.push({ wd: wd, e: e }); } }); });
  Object.keys(DATA.dateOverrides || {}).forEach(function(iso){ DATA.dateOverrides[iso].forEach(function(e){ var c = baseCode(e.subject); if(c) get(c).fresher = true; }); });
  (DATA.electives || []).forEach(function(el){ get(el.code).fresher = true; });
  Object.keys(DATA.instituteTimetable || {}).forEach(function(wd){
    DATA.instituteTimetable[wd].forEach(function(b){ b.code.split('/').forEach(function(c){ if(baseCode(c)) get(baseCode(c)).other = true; }); });
  });
  Object.keys(DATA.courseCatalog || {}).forEach(function(c){
    if(DATA.courseCatalog[c].floated === false) return;
    if(/[A-Z]$/.test(c) && map[c.slice(0, -1)]) return; // already listed under its grid code
    get(c);
  });
  return Object.keys(map).sort().map(function(k){ return map[k]; });
})();
var COURSE_BY_CODE = {};
COURSES.forEach(function(c){ COURSE_BY_CODE[c.code] = c; });
// Freshers who take a course at all (any of its regular entries, or it's their HS/IKS section).
function courseTakers(code){
  var c = COURSE_BY_CODE[code];
  if(!c) return [];
  if(c.takers) return c.takers;
  var m = new Uint8Array(N);
  c.entries.forEach(function(x){ populationOf(x.e).forEach(function(i){ m[i] = 1; }); });
  ROSTER.forEach(function(s, i){ if(s.hsElective === code) m[i] = 1; });
  c.takers = idxsOfMask(m);
  return c.takers;
}
// What actually happens for a course on one date: freshers' sessions straight from every taker's
// own studentDay() (so overrides, cancellations, room moves and live BR changes all count), plus
// other batches' bookings from the institute grid.
function courseSessions(code, iso){
  var c = COURSE_BY_CODE[code];
  if(!c) return [];
  var out = {};
  if(c.fresher){
    var cand = courseTakers(code).slice();
    // One-off date overrides can reach students who don't normally take it (e.g. a makeup exam).
    ((DATA.dateOverrides && DATA.dateOverrides[iso]) || []).forEach(function(e){ if(baseCode(e.subject) === code) populationOf(e).forEach(function(i){ cand.push(i); }); });
    var seen = {};
    cand.forEach(function(i){
      if(seen[i]) return; seen[i] = 1;
      studentDay(ROSTER[i], iso).items.forEach(function(it){
        if(baseCode(it.subject) !== code || it.sMin == null) return;
        var venue = it.seatRoom ? venueNameFor(it.seatRoom) : (it.venue ? venueNameFor(it.venue) : '');
        var k = it.subject + '|' + it.sMin + '|' + it.eMin + '|' + venue;
        var r = out[k] || (out[k] = { s: it.sMin, e: it.eMin, venue: venue || null, title: it.title, subject: it.subject, source: it.source,
          movedFrom: it.venueMovedFrom || null, who: [], batch: '2026', note: it.overlay && it.overlay.note || null });
        r.who.push(i);
      });
    });
  }
  var list = Object.keys(out).map(function(k){ var r = out[k]; r.label = describe(r.who.sort(function(a, b){ return a - b; })).join(' + '); return r; });
  var wd = c.other ? instituteClassesOn(iso) : null;
  if(wd){
    var merged = {};
    ((DATA.instituteTimetable && DATA.instituteTimetable[wd]) || []).forEach(function(b){
      if(b.code.split('/').map(baseCode).indexOf(code) === -1) return;
      var k = b.s + '|' + b.e;
      var r = merged[k] || (merged[k] = { s: b.s, e: b.e, venues: [], title: c.title || code, subject: b.code, source: 'institute', batch: 'other', label: b.code.indexOf('/') !== -1 ? 'with ' + b.code : 'other batches' });
      if(r.venues.indexOf(b.venue) === -1) r.venues.push(b.venue);
    });
    Object.keys(merged).forEach(function(k){ var r = merged[k]; r.venue = r.venues.join(', '); list.push(r); });
  }
  return list.sort(function(a, b){ return a.s - b.s || (a.e || 0) - (b.e || 0); });
}
// The typical week (no date overrides): one row per weekday+time, rooms merged.
function courseWeekPattern(code){
  var c = COURSE_BY_CODE[code];
  if(!c) return [];
  var rows = {};
  var today = todayISO();
  // Rooms as of today (a standing relocation like Senate Hall -> SRC-106 already applied).
  function add(wd, s, venue, kind){
    var k = wd + '|' + s + '|' + (kind || '');
    var r = rows[k] || (rows[k] = { wd: wd, s: s, venues: [], kind: kind || '' });
    venueParts(venue ? relocatedVenue(venue, today).venue : venue).forEach(function(v){ if(v && venueUsable(v) && r.venues.indexOf(venueNameFor(v)) === -1) r.venues.push(venueNameFor(v)); });
  }
  c.entries.forEach(function(x){
    var s = TIME_ORDER[x.e.time];
    if(s !== undefined) add(x.wd, s, x.e.venue, /-LAB/.test(x.e.subject) ? 'lab' : /-TUT/.test(x.e.subject) ? 'tutorial' : '');
  });
  (DATA.electives || []).forEach(function(el){ if(el.code === code) el.sessions.forEach(function(ss){ var s = TIME_ORDER[ss.time]; if(s !== undefined) add(ss.day, s, ss.venue); }); });
  Object.keys(DATA.instituteTimetable || {}).forEach(function(wd){
    DATA.instituteTimetable[wd].forEach(function(b){ if(b.code.split('/').map(baseCode).indexOf(code) !== -1) add(wd, b.s, b.venue); });
  });
  var order = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
  return Object.keys(rows).map(function(k){ return rows[k]; }).sort(function(a, b){ return (order[a.wd] - order[b.wd]) || (a.s - b.s); });
}
// The next session at or after (iso, minute), looking up to `days` ahead.
function nextCourseSession(code, iso, nowMin, days){
  for(var d=0; d<(days || 14); d++){
    var day = addDaysISO(iso, d);
    var list = courseSessions(code, day).filter(function(r){ return d > 0 || (r.e || r.s + 50) > nowMin; });
    if(list.length) return { iso: day, session: list[0], ongoing: d === 0 && list[0].s <= nowMin };
  }
  return null;
}

/* ================= meals ================= */
function mealWindows(iso){
  var mess = DATA.mess || {};
  var sun = weekdayNameOf(iso) === 'Sunday';
  var keys = sun ? ['breakfastSun', 'lunchSun', 'dinner'] : ['breakfast', 'lunch', 'dinner'];
  var labels = ['breakfast', 'lunch', 'dinner'];
  var out = [];
  keys.forEach(function(k, i){
    var w = mess[k];
    if(!w) return;
    var s = w.s.split(':'), e = w.e.split(':');
    out.push({ s: +s[0]*60 + +s[1], e: +e[0]*60 + +e[1], label: labels[i] });
  });
  return out;
}

function mealTagForHour(iso, hour){
  var t = hour*60, w = mealWindows(iso);
  for(var i=0;i<w.length;i++) if(Math.max(w[i].s, t) < Math.min(w[i].e, t+60)) return w[i].label;
  return null;
}
function freeVenuesAt(iso, ws, we){
  var occ = venueOccupancy(iso);
  return ALL_VENUES.filter(function(v){ return !overlaps(occ[v.key] || [], ws, we); });
}
function busyVenuesAt(iso, ws, we){
  var occ = venueOccupancy(iso), out = [];
  ALL_VENUES.forEach(function(v){
    var hits = (occ[v.key] || []).filter(function(b){ return Math.max(b.s, ws) < Math.min(b.e, we); });
    if(hits.length) out.push({ venue: v, occupants: hits });
  });
  return out;
}
// Total booked minutes per room over a date range (overlapping bookings counted once).
function venueLoadLeaderboard(isoList){
  var totals = {};
  isoList.forEach(function(iso){
    Object.keys(venueOccupancy(iso)).forEach(function(k){
      venueBlocks(k, iso).forEach(function(b){ totals[k] = (totals[k] || 0) + (b.e - b.s); });
    });
  });
  return Object.keys(totals).map(function(k){ return { venue: { key: k, name: venueNameFor(k) }, minutes: totals[k] }; })
    .sort(function(a, b){ return b.minutes - a.minutes; });
}

/* ================= themes (shared with the main dashboard via localStorage) ================= */
var THEME_KEY = 'thirtyatrpr_theme', COLOR_THEME_KEY = 'thirtyatrpr_color_theme';
var COLOR_THEMES = [
  { id: 'github', label: 'Graphite' }, { id: 'default', label: 'Signature' }, { id: 'forest', label: 'Forest' },
  { id: 'sunset', label: 'Sunset' }, { id: 'midnight', label: 'Midnight' }
];
function readPref(k, dflt){ try { return localStorage.getItem(k) || dflt; } catch(e){ return dflt; } }
function writePref(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
function applyTheme(){
  if(typeof document === 'undefined' || !document.body) return;
  var color = readPref(COLOR_THEME_KEY, 'github');
  var glass = true;   // Theme A only — Theme B was removed (2026-10-15), same as the main dashboard
  if(color === 'default') document.body.removeAttribute('data-theme'); else document.body.setAttribute('data-theme', color);
  document.body.classList.toggle('glass', glass);
}
// A compact theme switcher (colour swatches) — the same colour setting the main
// dashboard's Settings panel writes, so a choice made in either place carries over.
function mountThemeSwitcher(el){
  if(!el) return;
  function paint(){
    var color = readPref(COLOR_THEME_KEY, 'github');
    el.innerHTML = COLOR_THEMES.map(function(t){
      return '<button class="theme-dot theme-dot-'+t.id+(t.id === color ? ' active' : '')+'" data-color="'+t.id+'" title="'+t.label+' colours" aria-label="'+t.label+' colours"></button>';
    }).join('');
  }
  el.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('button');
    if(!b) return;
    if(b.hasAttribute('data-color')) writePref(COLOR_THEME_KEY, b.getAttribute('data-color'));
    applyTheme(); paint();
  });
  paint();
}
function timelineBar(blocks, opts){
  opts = opts || {};
  var from = opts.from || 8*60, to = opts.to || 21*60, span = to - from;
  var html = blocks.map(function(b){
    var s = Math.max(b.s, from), e = Math.min(b.e, to);
    if(e <= s) return '';
    var cls = opts.blockClass ? opts.blockClass(b) : '';
    return '<div class="tl-block '+cls+'" style="left:'+((s-from)/span*100).toFixed(2)+'%;width:'+Math.max((e-s)/span*100, 0.8).toFixed(2)+'%"></div>';
  }).join('');
  var marker = '';
  if(opts.at != null && opts.at >= from && opts.at <= to){
    marker = '<div class="tl-now" style="left:'+((opts.at-from)/span*100).toFixed(2)+'%"></div>';
  }
  return '<div class="tl'+(opts.mini ? ' mini' : '')+'">'+html+marker+'</div>';
}

return {
  DATA: DATA, ROSTER: ROSTER, INDEX: INDEX, N: N, UNITS: UNITS, UNIT_BY_ID: UNIT_BY_ID, KINDS: KINDS, ATOMS: ATOMS,
  BRANCH_NAMES: BRANCH_NAMES, bshort: bshort, seatListHtml: seatListHtml, ALL_VENUES: ALL_VENUES, TIME_ORDER: TIME_ORDER,
  isoToDate: isoToDate, addDaysISO: addDaysISO, weekdayNameOf: weekdayNameOf, todayISO: todayISO, nowMinutes: nowMinutes,
  dateLabel: dateLabel, toHHMM: toHHMM, weekRange: weekRange, titleCase: titleCase, escapeHtml: escapeHtml, WEEKDAYS: WEEKDAYS,
  courseName: courseName, subjectColor: subjectColor, classDuration: classDuration, ttMatches: ttMatches,
  setOverlay: setOverlay, overlayScopeMatches: overlayScopeMatches, overlayAppliesOnDate: overlayAppliesOnDate,
  studentDay: studentDay, busyIntervals: busyIntervals, overlaps: overlaps, dayContext: dayContext,
  maskOf: maskOf, sameSet: sameSet, intersect: intersect, describe: describe, describeStructural: describeStructural,
  evalSelection: evalSelection, supersetsOf: supersetsOf, subsetsOf: subsetsOf, atomsIn: atomsIn,
  cohortDay: cohortDay, freeWindows: freeWindows, isHomogeneousDay: isHomogeneousDay, contactsFor: contactsFor,
  venueKey: venueKey, venueNameFor: venueNameFor, venueOccupancy: venueOccupancy, venueBlocks: venueBlocks, venueStatus: venueStatus,
  mealWindows: mealWindows, mealTagForHour: mealTagForHour, freeVenuesAt: freeVenuesAt, busyVenuesAt: busyVenuesAt,
  venueLoadLeaderboard: venueLoadLeaderboard, COURSES: COURSES, COURSE_BY_CODE: COURSE_BY_CODE, courseTakers: courseTakers,
  courseSessions: courseSessions, courseWeekPattern: courseWeekPattern, nextCourseSession: nextCourseSession, baseCode: baseCode,
  findSlots: findSlots, diversifySlots: diversifySlots,
  HOUR_START: HOUR_START, HOUR_END: HOUR_END, applyTheme: applyTheme, mountThemeSwitcher: mountThemeSwitcher, timelineBar: timelineBar,
  overlayVersion: function(){ return overlayVersion; }
};
})();
