(function(){
'use strict';
var DATA = THIRTY_DATA;
var LS_KEY = 'thirtyatrpr_entry';
var THEME_KEY = 'thirtyatrpr_theme'; // 'a' (frosted, default) or 'b' (solid)
var HS_KEY = 'thirtyatrpr_hs_elective'; // course code, e.g. 'HS110', or '' if not chosen yet
var CLASSES_START = '2026-08-03'; // no classes are scheduled before this date

var currentTheme = localStorage.getItem(THEME_KEY) || 'a';
document.body.classList.toggle('glass', currentTheme === 'a');
var COLOR_THEME_KEY = 'thirtyatrpr_color_theme';
var currentColorTheme = localStorage.getItem(COLOR_THEME_KEY) || 'default';
if(currentColorTheme !== 'default') document.body.setAttribute('data-theme', currentColorTheme);

/* per-subject colors so classes don't all blend into one "class" yellow */
var SUBJECT_COLORS = {
  AI101:'#7aa2f7', MA101:'#e0af68', PH101:'#9ece6a', CY101:'#f7768e', CS100:'#bb9af7',
  TL101:'#7dcfff', WP101:'#ff9e64', NCC:'#a9b1d6', LIFESKILL:'#a9b1d6',
  HS110:'#73daca', HS111:'#c0caf5', HS112:'#f5a9b8', HS113:'#9d7cd8', IK101:'#ffc777'
};
var FALLBACK_COLORS = ['#7aa2f7','#e0af68','#9ece6a','#f7768e','#bb9af7','#7dcfff','#ff9e64','#73daca'];
var SUBJECT_PREFIXES = ['AI101','MA101','PH101','CY101','CS100','TL101','WP101','HS110','HS111','HS112','HS113','IK101'];
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

/* ================= time helpers ================= */
function toMin(hhmm){ var p=hhmm.split(':').map(Number); return p[0]*60+p[1]; }
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
  '2.00 - 2.50': 840, '3.00 - 3.50': 900, '4.00 - 4.50': 960,
  '5.00 - 5.50': 1020, '6.00- 6.50': 1080, '6.00 - 6.50': 1080, '7.00-7.50': 1140, '7.00 - 7.50': 1140,
  /* clock-time exam slots (Mid-Sem Examination Time Table) — distinct from the 50-min period grid above */
  '9.30 - 11.30': 570, '12.30 - 2.30': 750, '3.30 - 5.30': 930,
  /* TL101 mid-sem viva start times (26 Sep batches) — point-in-time, not ranges like the above */
  '9.30 AM': 570, '11.00 AM': 660, '2.30 PM': 870, '4.00 PM': 960
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
function courseName(subject){
  var m = subject.match(/^([A-Z]{2,4}\d{3})/);
  if(!m) return null;
  var name = DATA.courseNames[m[1]];
  if(!name) return null;
  if(/-MIDSEM/.test(subject)) return name+' — Mid-Sem Exam';
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
  return (isOwn && currentHsElective) ? currentHsElective : (student.hsElective || (isOwn ? currentHsElective : null));
}
function electiveEntriesForDay(wd, student){
  var sessionsToday = [];
  DATA.electives.forEach(function(el){
    el.sessions.filter(function(s){ return s.day === wd; }).forEach(function(s){
      var venue = (s.venueByBranch && s.venueByBranch[student.branch]) || s.venue;
      sessionsToday.push({code: el.code, title: el.title, instructor: el.instructor, venue: venue, time: s.time});
    });
  });
  if(!sessionsToday.length) return [];

  var isOwn = student.entry === state.loginEntry;
  var code = resolvedHsElective(student);

  if(code){
    return sessionsToday.filter(function(s){ return s.code === code; }).map(function(s){
      var sMin = TIME_ORDER[s.time];
      return {
        sMin: sMin !== undefined ? sMin : null,
        eMin: sMin !== undefined ? sMin+50 : null,
        t: sMin !== undefined ? (toHHMM(sMin)+' – '+toHHMM(sMin+50)) : s.time,
        title: s.code+' — '+s.title+(s.instructor?' ('+s.instructor+')':''),
        venue: s.venue,
        type: 'class',
        category: 'HS/IKS',
        color: subjectColor(s.code)
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
  if(/^PH101-LAB/.test(e.subject)) return 230;
  if(/-MIDSEM/.test(e.subject)) return 120;
  if(/-VIVA/.test(e.subject)) return 90;
  if(/-LAB/.test(e.subject)) return 120;
  if(e.subject === 'AI101' && e.venue === 'LAB') return 120;
  if(/-QUIZ/.test(e.subject)) return 60;
  return 50;
}
function buildClassItemsFromList(rawList, student){
  return (rawList||[]).filter(function(e){ return ttMatches(e, student); }).map(function(e){
    var sMin = TIME_ORDER[e.time];
    var name = courseName(e.subject);
    var dur = classDuration(e);
    return {
      sMin: sMin !== undefined ? sMin : null,
      eMin: sMin !== undefined ? sMin+dur : null,
      t: sMin !== undefined ? (toHHMM(sMin)+' – '+toHHMM(sMin+dur)) : (e.time||''),
      title: name || e.subject,
      code: name ? e.subject : null,
      venue: e.venue,
      type: 'class',
      category: e.category,
      color: subjectColor(e.subject)
    };
  });
}
function buildClassItems(classWd, student){
  return buildClassItemsFromList(DATA.timetable[classWd], student);
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
    var completedCount = Math.min(courseProgress[c.code] || 0, c.items.length);
    var result = SEQUENTIAL_COURSE_RESULTS[c.code];
    var startInfo = c.startsAfter ? ' · starts '+dateLabel(result.all.length ? result.all[0].date : c.startDate) : '';
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
  buildStrip();
  renderDay();
  if(calState.open) renderCalendar();
  renderCourseChecklist();
};
function buildDays(student){
  var cal = DATA.calendar;
  var ismpByDate = {};
  DATA.ismpSchedule.forEach(function(day){ ismpByDate[day.date] = day; });

  var out = [];
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
    var classesStarted = iso >= CLASSES_START && (!cal.classesEnd || iso <= cal.classesEnd) && !holiday && !noClass;

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
      if(!/^(HS11[0-3]|IK101)-MIDSEM/.test(e.subject)) return true;
      return hsCode && e.subject.indexOf(hsCode) === 0;
    });
    var overriddenSubjects = {};
    overrideRaw.forEach(function(e){ overriddenSubjects[e.subject] = true; });
    var classes = classesStarted ? buildClassItems(classWd, student).filter(function(c){ return !overriddenSubjects[c.code]; }) : [];
    // Not gated on classesStarted: a date override is a deliberate, manually-curated one-off (an
    // exam, a quiz) that can legitimately fall on a day otherwise marked holiday/no-class (e.g. the
    // AI101/CS100 mid-sem exam lands on a date also flagged as a no-class day for an unrelated
    // project-evaluation reason — the exam still happens).
    var dateOverrideClasses = buildClassItemsFromList(overrideRaw, student);
    var electiveEntries = classesStarted ? electiveEntriesForDay(classWd, student) : [];
    var sequentialClasses = sequentialCourseClassesForDate(iso, student);
    var all = sortBySMin(items.concat(classes).concat(dateOverrideClasses).concat(electiveEntries).concat(sequentialClasses));

    // Days where a weekday-substitution is confirmed only by one of two conflicting official
    // sources: keep the primary interpretation as the default `all` list above, but also compute
    // what the day would look like under the alternate (undisputed) weekday, so the UI can offer
    // both instead of silently trusting one source.
    var altSchedule = null;
    if(ambig && classesStarted){
      var altClasses = buildClassItems(ambig.alternate, student);
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
function mealMenuFor(mealType, iso){
  var wd = weekdayNameOf(iso);
  var menus = MESS.menus || [];
  for(var i=0;i<menus.length;i++){
    var m = menus[i];
    if(iso >= m.validFrom && iso <= m.validTo){
      return (m[mealType] && m[mealType][wd]) || null;
    }
  }
  return null;
}

/* ================= self-study room openings (live status) ================= */
// Expands a room's weekly schedule into real timestamped windows for the day before/of/after a
// given date — enough range that an overnight window (e.g. 7pm-7am) starting yesterday, or one
// starting today and running into tomorrow, is always captured regardless of what "now" is.
function expandRoomWindowsAround(room, centerISO){
  var out = [];
  for(var offset=-1; offset<=1; offset++){
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
  return out;
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
  var windows = expandRoomWindowsAround(room, nowIso);
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
function selfStudyIsActive(){
  var ss = DATA.selfStudy;
  if(!ss) return false;
  var today = todayISO();
  return today >= ss.validFrom && today <= ss.validTo;
}

function uRow(time,label,note,menuItems){
  var row = '<div class="u-row"><span class="u-time">'+time+'</span><span class="u-label">'+label+'</span>'+(note?'<span class="u-note">'+note+'</span>':'')+'</div>';
  var menu = (menuItems && menuItems.length) ? '<div class="u-menu">'+menuItems.join(' · ')+'</div>' : '';
  return row+menu;
}
function tagHtml(cls,label){ return '<span class="tag '+cls+'">'+label+'</span>'; }
function eventCard(it){
  if(it.type==='electivePick'){
    var btns = it.options.map(function(o){
      return '<button class="elective-pick-btn" onclick="window.__chooseElective(\''+o.code+'\')">'+
        '<span class="epb-code">'+o.code+'</span><span class="epb-title">'+o.title+(o.instructor?' &middot; '+o.instructor:'')+'</span></button>';
    }).join('');
    return '<div class="ev-card elective-pick"><div class="ev-time">'+(it.t||'')+'</div>'+
      '<div class="ev-title">Which one is your HS/IKS elective?</div>'+
      '<div class="elective-pick-row">'+btns+'</div></div>';
  }
  var isOwn = !state.student || state.student.entry === state.loginEntry;
  var tags = [];
  if(it.type==='class'){
    var label = it.code || (it.category==='HS/IKS'?(isOwn?'Your elective':'Their elective'):'Class');
    var cs = it.color ? ' style="--sc:'+it.color+'"' : '';
    tags.push('<span class="tag class"'+cs+'>'+label+'</span>');
    if(it.category==='Exam') tags.push(tagHtml('examtag','Mid-Sem Exam'));
    if(it.category==='Viva') tags.push(tagHtml('examtag','Mid-Sem Viva'));
  }
  if(it.type==='group') tags.push(tagHtml('group', isOwn?'Your group':'Their group'));
  if(it.type==='common') tags.push(tagHtml('common','Institute-wide'));
  if(it.type==='sport') tags.push(tagHtml('sport','Sports'));
  if(it.venue){
    var d = venueDesc(it.venue);
    tags.push(tagHtml('venue', it.venue + (d ? ' · '+d : '')));
  }
  var linksHtml = '';
  if(it.materialLink){
    linksHtml += '<div class="material-links">'+
      '<a class="material-link" href="'+it.materialLink+'" target="_blank" rel="noopener">Open material &rarr;</a>'+
      (it.materialLink2 ? ' <a class="material-link" href="'+it.materialLink2+'" target="_blank" rel="noopener">Instructions &rarr;</a>' : '')+
      '</div>';
  }
  var doneCheckbox = '';
  if(it.selfCourse && isOwn){
    doneCheckbox = '<label class="ev-done-check'+(it.done?' checked':'')+'">'+
      '<input type="checkbox"'+(it.done?' checked':'')+(it.checkDisabled?' disabled':'')+
      ' onchange="window.__toggleCourseItem(\''+it.code+'\','+it.itemIndex+')">'+
      '<span>'+(it.done?'Done':'Mark done')+'</span></label>';
  }
  return '<div class="ev-card"><div class="ev-time">'+(it.t||'Time TBA')+'</div>'+
    '<div class="ev-title">'+it.title+'</div>'+
    (tags.length?'<div class="ev-meta">'+tags.join('')+'</div>':'')+
    doneCheckbox+linksHtml+'</div>';
}
/* returns an array of {min, html} clusters (simultaneous items grouped together) */
function eventClusters(items){
  var out=[];
  var i=0;
  while(i<items.length){
    var t = items[i].t;
    var bucket=[items[i]];
    var j=i+1;
    while(j<items.length && items[j].t===t && items[j].type!=='class' && items[j].type!=='electivePick'){ bucket.push(items[j]); j++; }
    var primaryType = bucket[0].type;
    var colorStyle = (primaryType==='class' && bucket[0].color) ? ' style="--sc:'+bucket[0].color+'"' : '';
    var html = '<div class="ev-wrap '+primaryType+'"'+colorStyle+'><div class="pair-events">'+bucket.map(eventCard).join('')+'</div></div>';
    out.push({min: bucket[0].sMin===null?9999:bucket[0].sMin, html: html});
    i=j;
  }
  return out;
}
function nowRowHtml(nowMin){
  return '<div class="now-row"><div class="now-line"></div><div class="now-label">NOW &middot; '+toHHMM(nowMin)+'</div><div class="now-line"></div></div>';
}
/* walk segments (already in fixed chronological print-order) and splice in the now-marker
   right before the first segment whose min exceeds nowMin */
function renderWithNowMarker(segments, nowMin){
  var html='';
  var inserted = (nowMin===null);
  segments.forEach(function(seg){
    if(!inserted && seg.min > nowMin){ html += nowRowHtml(nowMin); inserted = true; }
    html += seg.html;
  });
  if(!inserted) html += nowRowHtml(nowMin);
  return html;
}

function bucketOf(it, lunchEndMin){
  var s = it.sMin===null ? null : it.sMin;
  if(s===null) return 'evening';
  if(s < 660) return 'morning';
  if(s < lunchEndMin) return 'midday';
  if(s < 1170) return 'afternoon';
  return 'evening';
}

function renderDay(){
  var day = state.DAYS[state.activeIdx];
  var card = document.getElementById('daycard');
  var showAlt = state.altViewOn && day.altSchedule;
  var dayItems = showAlt ? day.altSchedule.items : day.items;
  var lunch = isSunday(day.dow) ? MESS.lunchSun : MESS.lunch;
  var lunchEndMin = toMin(lunch.e);
  var dinner = (MESS.dinnerEarly && day.d <= MESS.dinnerEarlyUntil) ? MESS.dinnerEarly : MESS.dinner;

  var arriveM = toMin(settings.arrive);
  var wakeM = arriveM - settings.prep - settings.buffer;
  var nextWakeM = wakeM;

  var lastEnd = toMin(dinner.e);
  dayItems.forEach(function(it){
    if(it.eMin!==null && it.eMin>lastEnd) lastEnd = it.eMin;
  });
  var bedtimeM = lastEnd + settings.winddown;
  var sleepMins = (nextWakeM+1440) - bedtimeM;
  if(sleepMins<0) sleepMins += 1440;

  var sleepClass='good';
  if(sleepMins < settings.sleepTarget*60-60) sleepClass='low';
  else if(sleepMins < settings.sleepTarget*60) sleepClass='ok';

  var dateBadge = day.d===state.TODAY ? '<span class="today-pill">Today</span>' : '';
  var noteBadge = day.specialNote ? '<span class="note-pill">'+day.specialNote+'</span>' : '';
  var examBadge = day.examInfo ? '<span class="note-pill '+(day.examDisputeNote?'dispute':'exam')+'">'+day.examInfo+(day.examDisputeNote?' ?':'')+'</span>' : '';

  var disputeNoteHtml = '';
  if(day.examDisputeNote){
    disputeNoteHtml = '<div class="dispute-note">&#9888; Sources disagree here: '+day.examDisputeNote+'</div>';
  }
  var altToggleHtml = '';
  if(day.altSchedule){
    altToggleHtml = '<div class="dispute-note">&#9888; Sources disagree here: '+day.altSchedule.note+
      '<br>Showing <b>'+(showAlt ? day.altSchedule.label : day.altLabel)+'</b> &middot; '+
      '<button class="alt-toggle-btn" id="altToggleBtn">Show '+(showAlt ? day.altLabel : day.altSchedule.label)+' instead</button></div>';
  }

  var html = '';
  html += '<div class="daycard-head">'+
    '<div class="dayname">'+fullDow(day.dow)+dateBadge+'</div>'+
    '<div class="datestr">'+dateLabel(day.d)+', 2026</div>'+
    (noteBadge||examBadge ? '<div class="notestrip">'+noteBadge+examBadge+'</div>' : '')+
    disputeNoteHtml+altToggleHtml+
    '<div class="sleepbar '+sleepClass+'"><div class="moon">&#9789;</div>'+
    '<div class="txt">Lights out ~<b>'+toHHMM(bedtimeM)+'</b> &rarr; up <b>'+toHHMM(nextWakeM)+'</b> tomorrow</div>'+
    '<div class="hrs">'+fmtDur(sleepMins)+'</div></div></div>'+
    '<div class="timeline">';

  var morning = dayItems.filter(function(it){ return bucketOf(it,lunchEndMin)==='morning'; });
  var midday = dayItems.filter(function(it){ return bucketOf(it,lunchEndMin)==='midday'; });
  var afternoon = dayItems.filter(function(it){ return bucketOf(it,lunchEndMin)==='afternoon'; });
  var evening = dayItems.filter(function(it){ return bucketOf(it,lunchEndMin)==='evening'; });

  var segments = [];
  segments.push({min: wakeM, html: uRow(toHHMM(wakeM), 'Wake up')});
  segments.push({min: arriveM, html: uRow(toHHMM(wakeM)+'–'+toHHMM(arriveM), 'Get ready', settings.prep+'+'+settings.buffer+' min')});
  segments.push({min: toMin(MESS.breakfast.s), html: uRow(toHHMM(toMin(MESS.breakfast.s))+'–'+toHHMM(toMin(MESS.breakfast.e)), 'Breakfast · Mess', null, mealMenuFor('breakfast', day.d))});
  segments = segments.concat(eventClusters(morning));
  segments.push({min: toMin(lunch.s), html: uRow(toHHMM(toMin(lunch.s))+'–'+toHHMM(toMin(lunch.e)), isSunday(day.dow)?'Lunch (Sun timing) · Mess':'Lunch · Mess', null, mealMenuFor('lunch', day.d))});
  segments = segments.concat(eventClusters(midday));
  segments = segments.concat(eventClusters(afternoon));
  segments.push({min: toMin(dinner.s), html: uRow(toHHMM(toMin(dinner.s))+'–'+toHHMM(toMin(dinner.e)), 'Dinner · Mess', null, mealMenuFor('dinner', day.d))});
  segments = segments.concat(eventClusters(evening));
  segments.push({min: bedtimeM, html: uRow(toHHMM(bedtimeM), 'Asleep by', settings.winddown+' min wind-down')});

  var nowMin = (day.d === state.TODAY) ? nowMinutes() : null;
  html += renderWithNowMarker(segments, nowMin);

  if(!morning.length && !midday.length && !afternoon.length && !evening.length){
    html += '<div class="freeday">'+(day.specialNote || 'Nothing listed for you on this day &mdash; a genuinely free one.')+'</div>';
  }
  html += '</div>';
  card.innerHTML = html;

  if(day.altSchedule){
    document.getElementById('altToggleBtn').addEventListener('click', function(){
      state.altViewOn = !state.altViewOn;
      renderDay();
    });
  }
}

function buildStrip(){
  var strip = document.getElementById('daystrip');
  strip.innerHTML='';
  state.DAYS.forEach(function(day,i){
    var chip = document.createElement('div');
    var disputed = !!(day.altSchedule || day.examDisputeNote);
    chip.className = 'daychip'+(i===state.activeIdx?' active':'')+(day.d===state.TODAY?' today':'')+(day.items.length?' hasevent':'')+(day.specialNote?' holiday':'')+(day.examInfo?' examweek':'')+(disputed?' disputed':'');
    chip.innerHTML = '<div class="dow">'+day.dow+'</div><div class="dnum">'+Number(day.d.slice(8))+'</div><div class="dot"></div>';
    chip.addEventListener('click', function(){ state.activeIdx=i; state.altViewOn=false; buildStrip(); renderDay(); scrollActiveIntoView(); updateTodayFab(); if(calState.open) renderCalendar(); });
    strip.appendChild(chip);
  });
}
function scrollActiveIntoView(behavior){
  var strip = document.getElementById('daystrip');
  var chip = strip.children[state.activeIdx];
  if(chip) chip.scrollIntoView({behavior:behavior||'smooth', inline:'center', block:'nearest'});
}

function updateTodayFab(){
  var fab = document.getElementById('todayFab');
  var away = state.todayIdx !== -1 && state.activeIdx !== state.todayIdx;
  fab.classList.toggle('show', away);
}

function render(){
  buildStrip();
  renderDay();
  updateTodayFab();
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
      state.activeIdx = Number(cell.getAttribute('data-idx'));
      state.altViewOn = false;
      buildStrip();
      renderDay();
      scrollActiveIntoView();
      updateTodayFab();
      document.getElementById('calPanel').classList.remove('open');
      document.getElementById('calToggleBtn').setAttribute('aria-expanded','false');
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
  {panelId:'settingsPanel', btnId:'settingsBtn'},
];
function closePanels(exceptPanelId){
  ALL_PANELS.forEach(function(p){
    if(p.panelId === exceptPanelId) return;
    var panel = document.getElementById(p.panelId);
    var btn = document.getElementById(p.btnId);
    panel.classList.remove('open');
    if(btn) btn.setAttribute('aria-expanded','false');
  });
}
// A panel opens right below the sticky header, in normal document flow — its top edge doesn't
// move as it grows, so scrolling it to just under the header (rather than leaving the page
// scrolled wherever the user last was, e.g. deep in the day timeline) works without waiting for
// the open/close transition to finish.
function scrollPanelIntoView(panel){
  var header = document.querySelector('header');
  var headerH = header ? header.getBoundingClientRect().height : 0;
  var targetY = panel.getBoundingClientRect().top + window.scrollY - headerH;
  window.scrollTo({top: Math.max(targetY, 0), behavior:'smooth'});
}
function initCalendar(){
  var panel = document.getElementById('calPanel');
  var toggleBtn = document.getElementById('calToggleBtn');
  toggleBtn.addEventListener('click', function(){
    calState.open = !panel.classList.contains('open');
    closePanels(calState.open ? 'calPanel' : null);
    panel.classList.toggle('open', calState.open);
    toggleBtn.setAttribute('aria-expanded', String(calState.open));
    if(calState.open){
      if(!calState.monthIso) calState.monthIso = (state.DAYS[state.activeIdx]||state.DAYS[0]).d.slice(0,8)+'01';
      renderCalendar();
      scrollPanelIntoView(panel);
    }
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
function contributorsForStudent(student){
  var seen = {};
  var names = [];
  function scan(entry){
    if(!entry.contributedBy || seen[entry.contributedBy]) return;
    if(!ttMatches(entry, student)) return;
    seen[entry.contributedBy] = true;
    var s = DATA.roster[entry.contributedBy];
    names.push(s ? s.name.trim().split(' ')[0] : entry.contributedBy);
  }
  Object.keys(DATA.timetable).forEach(function(day){ DATA.timetable[day].forEach(scan); });
  Object.keys(DATA.dateOverrides || {}).forEach(function(iso){ DATA.dateOverrides[iso].forEach(scan); });
  return names;
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
// A big, standing banner (shown once per student-view, not per day) listing every mid-sem exam
// item already resolved for this student in state.DAYS — reusing buildDays' own division/HS-
// elective filtering rather than re-deriving it, so "only your HS/IKS exam, not all 4" stays
// correct here too. Visible for the whole mid-sem window, not just on/after the first exam, so a
// student can see their full personal schedule at a glance from day one; disappears once the
// window has fully passed.
function renderExamBanner(student){
  var banner = document.getElementById('examWeekBanner');
  var week = midsemExamWeek();
  if(!week){
    banner.style.display = 'none';
    return;
  }
  // The window isn't just the written mid-sem exam week — related assessments (e.g. TL101's
  // viva) can run a few days past it, so extend the end to cover the latest date that actually
  // carries an Exam/Viva override, rather than hardcoding a second date range here.
  var bannerEnd = week.end;
  Object.keys(DATA.dateOverrides || {}).forEach(function(iso){
    if(iso <= bannerEnd) return;
    var hasExamish = DATA.dateOverrides[iso].some(function(e){ return e.category === 'Exam' || e.category === 'Viva'; });
    if(hasExamish) bannerEnd = iso;
  });
  if(state.TODAY > bannerEnd){
    banner.style.display = 'none';
    return;
  }
  var exams = [];
  state.DAYS.forEach(function(day){
    if(day.d < week.start || day.d > bannerEnd) return;
    day.items.forEach(function(it){
      if(it.category === 'Exam' || it.category === 'Viva'){
        exams.push({date: day.d, title: it.title.replace(/ — Mid-Sem (Exam|Viva)$/,''), t: it.t});
      }
    });
  });
  if(!exams.length){
    banner.style.display = 'none';
    return;
  }
  var rows = exams.map(function(ex){
    var done = ex.date < state.TODAY;
    return '<div class="examweek-row'+(done?' done':'')+'"><span class="examweek-date">'+dateLabel(ex.date)+'</span>'+
      '<span class="examweek-title">'+ex.title+'</span>'+
      '<span class="examweek-time">'+(ex.t||'')+(done?' · done':'')+'</span></div>';
  }).join('');
  banner.style.display = 'block';
  banner.innerHTML = '<div class="examweek-head">📝 Your Mid-Semester Exam &amp; Viva Schedule</div><div class="examweek-rows">'+rows+'</div>';
}

/* ================= profile header ================= */
function renderHeader(student){
  var branchName = DATA.branchNames[student.branch] || student.branch;
  document.getElementById('eyebrow').textContent = student.division+' · Academic Group '+(student.academicGroup||'—')+(student.ismpGroup?' · ISMP Group '+student.ismpGroup:'');
  var firstName = student.name.split(' ')[0];
  firstName = firstName.charAt(0) + firstName.slice(1).toLowerCase();
  var roleBadge = '';
  if(hasRole(student.entry, 'creator')) roleBadge = ' <span class="role-pill creator"><span class="role-pill-icon">👑</span>Creator</span>';
  else if(hasRole(student.entry, 'contributor')) roleBadge = ' <span class="role-pill contributor"><span class="role-pill-icon">⭐</span>Contributor</span>';
  document.getElementById('greeting').innerHTML = 'Hi, '+firstName+roleBadge;
  document.getElementById('subline').textContent = branchName+' · '+student.entry;

  // Shown once, here, regardless of which day is active — not repeated per schedule item.
  var contributorNames = contributorsForStudent(student);
  var attribution = document.getElementById('branchAttribution');
  if(contributorNames.length){
    var namesText = contributorNames.length === 1 ? contributorNames[0] :
      (contributorNames.slice(0,-1).join(', ')+' & '+contributorNames[contributorNames.length-1]);
    attribution.style.display = 'block';
    attribution.innerHTML = '❤️ Schedule data shared by <b>'+namesText+'</b>';
  } else {
    attribution.style.display = 'none';
  }

  var mismatch = student.ismpGroup && student.academicGroup && String(student.ismpGroup) !== student.academicGroup.replace('G','');
  var banner = document.getElementById('mismatchBanner');
  if(mismatch){
    banner.style.display='flex';
    banner.innerHTML = '<span>ℹ️</span><div><b>Heads up:</b> your academic group and ISMP (orientation) group are numbered differently. Classes below use Academic Group '+student.academicGroup+'; orientation events use ISMP Group '+student.ismpGroup+'.</div>';
  } else {
    banner.style.display='none';
  }

  document.getElementById('appfoot').innerHTML =
    '<div class="foot-credit">Made with <span class="heart">&#10084;</span> by Yatharth Shrivastava</div>' +
    '<details class="foot-more"><summary>Sources &amp; disclaimer</summary>' +
    '<div class="foot-sources">Built from IIT Ropar\'s official Academic Section timetable extract, Divisions/Groups sheets, ISMP schedule, and department guidance emails (3 Aug 2026) &mdash; cross-checked against the official Handbook of Information.</div>' +
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
  render();
  syncHsElectiveField();
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
  setTimeout(function(){ scrollActiveIntoView('instant'); }, 50);
}
function bootApp(student){
  state.loginEntry = student.entry;
  state.TODAY = todayISO();
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').classList.add('show');
  viewStudent(student);
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
    el.addEventListener('change', function(){ readSettings(); renderDay(); });
  });
  document.getElementById('resetBtn').addEventListener('click', function(){
    els.arrive.value='07:45'; els.prep.value=75; els.buffer.value=10;
    els.sleepTarget.value=7.5; els.winddown.value=30;
    readSettings(); renderDay();
  });
  document.getElementById('settingsBtn').addEventListener('click', function(){
    var panel = document.getElementById('settingsPanel');
    var willOpen = !panel.classList.contains('open');
    closePanels(willOpen ? 'settingsPanel' : null);
    panel.classList.toggle('open', willOpen);
    if(willOpen) scrollPanelIntoView(panel);
  });
  document.getElementById('switchBtn').addEventListener('click', function(){
    localStorage.removeItem(LS_KEY);
    location.reload();
  });
  document.getElementById('todayFab').addEventListener('click', function(){
    if(state.todayIdx === -1) return;
    state.activeIdx = state.todayIdx;
    state.altViewOn = false;
    buildStrip();
    renderDay();
    scrollActiveIntoView();
    updateTodayFab();
    if(calState.open) renderCalendar();
  });

  var themeABtn = document.getElementById('themeABtn');
  var themeBBtn = document.getElementById('themeBBtn');
  function paintThemeButtons(){
    themeABtn.classList.toggle('active', currentTheme === 'a');
    themeBBtn.classList.toggle('active', currentTheme === 'b');
  }
  function setTheme(t){
    currentTheme = t;
    document.body.classList.toggle('glass', t === 'a');
    localStorage.setItem(THEME_KEY, t);
    paintThemeButtons();
  }
  paintThemeButtons();
  themeABtn.addEventListener('click', function(){ setTheme('a'); });
  themeBBtn.addEventListener('click', function(){ setTheme('b'); });

  var colorSwatches = Array.prototype.slice.call(document.querySelectorAll('.color-theme-swatch'));
  function paintColorSwatches(){
    colorSwatches.forEach(function(sw){
      sw.classList.toggle('active', sw.getAttribute('data-color-theme') === currentColorTheme);
    });
  }
  function setColorTheme(t){
    currentColorTheme = t;
    if(t === 'default') document.body.removeAttribute('data-theme');
    else document.body.setAttribute('data-theme', t);
    localStorage.setItem(COLOR_THEME_KEY, t);
    paintColorSwatches();
    if(state.student){
      state.DAYS = buildDays(state.student);
      renderDay();
      renderExamBanner(state.student);
      if(calState.open) renderCalendar();
    }
  }
  paintColorSwatches();
  colorSwatches.forEach(function(sw){
    sw.addEventListener('click', function(){ setColorTheme(sw.getAttribute('data-color-theme')); });
  });

  var hsSelect = document.getElementById('hsElectiveSelect');
  var optNone = document.createElement('option');
  optNone.value = ''; optNone.id = 'hsOptNone';
  hsSelect.appendChild(optNone);
  DATA.electives.forEach(function(el){
    var opt = document.createElement('option');
    opt.value = el.code;
    opt.textContent = el.code+' — '+el.title;
    hsSelect.appendChild(opt);
  });
  syncHsElectiveField();
  hsSelect.addEventListener('change', function(){ setHsElective(hsSelect.value); });
  window.__chooseElective = setHsElective;
}
// The "no manual pick" option's label depends on whether the logged-in student has an official
// assignment from the Academic Section's HSS/IKS course list — most do, some don't (see
// build/extract_hss_iks.py for the ~20 unlisted/ambiguous cases).
function syncHsElectiveField(){
  var hsSelect = document.getElementById('hsElectiveSelect');
  var loginStudent = DATA.roster[state.loginEntry];
  if(!hsSelect || !loginStudent) return;
  var optNone = document.getElementById('hsOptNone');
  optNone.textContent = loginStudent.hsElective ? 'Use official assignment ('+loginStudent.hsElective+')' : "Haven't chosen yet";
  hsSelect.value = currentHsElective;
}
function setHsElective(code){
  currentHsElective = code;
  localStorage.setItem(HS_KEY, code);
  var sel = document.getElementById('hsElectiveSelect');
  if(sel) sel.value = code;
  state.DAYS = buildDays(state.student);
  renderDay();
  renderExamBanner(state.student);
  if(calState.open) renderCalendar();
}

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
    if(willOpen){
      scrollPanelIntoView(panel);
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
  return '<span class="tag branch">'+branches.join(', ')+'</span>';
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
function renderStudyRooms(){
  var listBox = document.getElementById('studyRoomList');
  var hint = document.getElementById('studyHint');
  var ss = DATA.selfStudy;
  if(!listBox || !ss) return;
  hint.textContent = ss.sourceNote + ' Valid through ' + dateLabel(ss.validTo) + '.';
  listBox.innerHTML = ss.rooms.map(function(room){
    var status = roomStatusNow(room);
    var pill = '<span class="study-status-pill '+(status.open?'open':'closed')+'">'+(status.open?'Open':'Closed')+'</span>';
    var detail = status.changeAt ? (status.open ? 'Closes '+status.changeAt : 'Opens '+status.changeAt) : '';
    return '<div class="study-room-row">'+
      '<div><div class="study-room-name">'+room.name+'</div><div class="study-room-status">'+detail+'</div></div>'+
      pill+'</div>';
  }).join('');
}
var studyRefreshTimer = null;
function initStudyPanel(){
  var toggleBtn = document.getElementById('studyToggleBtn');
  var panel = document.getElementById('studyPanel');
  if(selfStudyIsActive()) toggleBtn.style.display = '';
  toggleBtn.addEventListener('click', function(){
    var willOpen = !panel.classList.contains('open');
    closePanels(willOpen ? 'studyPanel' : null);
    panel.classList.toggle('open', willOpen);
    toggleBtn.setAttribute('aria-expanded', String(willOpen));
    if(willOpen){
      scrollPanelIntoView(panel);
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
    if(willOpen) scrollPanelIntoView(panel);
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

initSettings();
initCalendar();
initClubs();
initStudyPanel();
initSearch();
initLogin();
(function(){
  var saved = localStorage.getItem(LS_KEY);
  if(saved && DATA.roster[saved]){
    bootApp(DATA.roster[saved]);
  }
})();

})();
