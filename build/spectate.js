/* /spectate — no login. Three views over the shared engine (build/engine.js):
   - Day: any cohort's day the way the dashboard's Squads panel shows friends — per start time, one
     line per distinct activity, "who · what · @where · till", where "who" is named by division,
     then group, then branch-qualified group, and entry ranges only when nothing coarser fits.
   - Find a time: the busy heat-strip, best slots, fully-free days for the same cohort.
   - Rooms: every room on campus (all batches), study-rooms style — free/busy now, until when,
     who's next, the day's timeline; search a room to see its whole schedule. */
(function(){
'use strict';
var E = ENGINE;
var esc = E.escapeHtml;
E.applyTheme();

var state = {
  tab: 'day',
  iso: E.todayISO(),
  sel: { idxs: [], ops: [], label: '' },
  durationMin: 60, days: 14, require100: false, heatSel: null, lastSlots: null,
  room: { live: true, iso: E.todayISO(), t: null, q: '', filter: 'free', open: null, sort: 'free-long' },
  course: { q: '', filter: 'all', open: null, limit: 40 }
};
var picker;

/* ================= tabs ================= */
function setTab(tab, fromUser){
  var changed = state.tab !== tab;
  state.tab = tab;
  Array.prototype.forEach.call(document.querySelectorAll('#tabs .tab'), function(b){ b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
  document.getElementById('cohortLayout').hidden = tab === 'rooms' || tab === 'courses';
  document.getElementById('view-day').hidden = tab !== 'day';
  document.getElementById('view-time').hidden = tab !== 'time';
  document.getElementById('view-courses').hidden = tab !== 'courses';
  document.getElementById('view-rooms').hidden = tab !== 'rooms';
  try { history.replaceState(null, '', '#' + tab); } catch(e){}
  renderActive();
  if(fromUser && changed){
    // On a phone the picker sits above the view: fold it to one line so the new view shows right
    // under it (no page scrolling — the folded picker is enough to make the switch visible).
    var phone = window.matchMedia && window.matchMedia('(max-width:880px)').matches;
    if(phone && state.sel.idxs.length) setWhoCollapsed(true);
    var view = document.getElementById('view-' + tab);
    if(view){ view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
  }
}
function setWhoCollapsed(on){
  document.getElementById('whoPanel').classList.toggle('collapsed', on);
  document.getElementById('whoToggle').textContent = on ? 'Change' : 'Done';
}
function renderWhoSummary(){
  var idxs = state.sel.idxs;
  document.getElementById('whoSummary').innerHTML = idxs.length
    ? '<b>' + esc(state.sel.label) + '</b> · ' + idxs.length + ' student' + (idxs.length === 1 ? '' : 's')
    : 'nobody picked yet';
}
function renderActive(){
  if(state.tab === 'day') renderDay();
  else if(state.tab === 'time') renderTime();
  else if(state.tab === 'courses') renderCourses();
  else renderRooms();
}

/* ================= Day ================= */
function renderDay(){
  var iso = state.iso;
  document.getElementById('dayDate').innerHTML = esc(E.dateLabel(iso)) + (iso === E.todayISO() ? ' <span class="muted">· today</span>' : '') + ' <span class="mp-caret">&#9662;</span>';
  var box = document.getElementById('dayView');
  MonthPick.slide(box, renderDay.lastIso, iso); renderDay.lastIso = iso;
  var idxs = state.sel.idxs;
  if(!idxs.length){
    box.innerHTML = '<div class="empty-hint">Pick students in “who” — a division, a group, an HS section, a lab batch — and their whole day appears here, laid out like the dashboard’s Squads panel.</div>';
    return;
  }
  var d = E.cohortDay(idxs, iso);
  var html = '<div class="cohort-head"><b>' + esc(state.sel.label) + '</b> · ' + idxs.length + ' student' + (idxs.length === 1 ? '' : 's') + '</div>';
  var c = E.contactsFor(idxs);
  if(c.brs.length && c.brs.length <= 8){
    html += '<div class="contacts">BRs: ' + c.brs.map(function(b){ return E.bshort(b.branch) + '/' + b.group + ' <b>' + esc(b.reps.map(function(r){ return r.name; }).join(', ')) + '</b>'; }).join(' · ') +
      (c.verifiers.length && c.verifiers.length <= 6 ? '<br>schedule checked by ' + c.verifiers.map(function(v){ return '<b>' + esc(v.name) + '</b> (' + E.bshort(v.branch) + (v.group ? '/' + v.group : '') + ')'; }).join(', ') : '') + '</div>';
  }
  d.notes.forEach(function(n){ html += '<div class="day-note">' + esc(n) + '</div>'; });
  html += '<div class="together"><b>' + (idxs.length === 1 ? 'Free' : 'Everyone free') + '</b> ' +
    (d.together.length ? d.together.map(function(w){ return E.toHHMM(w[0]) + ' – ' + E.toHHMM(w[1]); }).join(' · ') : 'no common gap of 30+ min between 8 AM and 9 PM') + '</div>';
  if(!d.timeline.length && !d.untimed.length) html += '<div class="empty-hint">Nothing scheduled.</div>';
  d.timeline.forEach(function(slot){
    html += '<div class="slot"><div class="slot-time">' + E.toHHMM(slot.sMin) + '</div><div class="slot-rows">';
    slot.rows.forEach(function(r){ html += rowHtml(r, idxs.length > 1); });
    if(slot.free.length && slot.free.length < idxs.length){
      html += '<div class="free-line">free: ' + esc(slot.freeLabel.join(' + ')) + ' <span>(' + slot.free.length + ')</span></div>';
    }
    html += '</div></div>';
  });
  if(d.untimed.length){
    html += '<div class="slot"><div class="slot-time">time tbc</div><div class="slot-rows">';
    d.untimed.forEach(function(r){ html += rowHtml(r, idxs.length > 1); });
    html += '</div></div>';
  }
  box.innerHTML = html;
}
// A line everyone in the selection shares just says "all" (quietly) — the who-label is there to
// point out the lines that DIFFER between the students picked.
// A room name may wrap between words, never inside one ("SRC-005" stays whole; the browser would
// otherwise break it at the hyphen), and the "@" stays glued to the room.
function venueHtml(v){
  return '@\u00a0' + esc(v).split(' ').map(function(w){ return '<span class="nw">' + w + '</span>'; }).join(' ');
}
function whoHtml(label){
  var t = label.join(' + ');
  return t === 'everyone selected' ? '<span class="row-who all">all</span>' : '<span class="row-who">' + esc(t) + '</span>';
}
function rowHtml(r, showWho){
  var it = r.item;
  return '<div class="row"><div class="row-main">' +
    (showWho ? whoHtml(r.label) : '') +
    '<span class="row-what" style="color:' + it.color + '">' + esc(it.title) + '</span>' +
    (it.code && it.code !== it.title ? '<span class="row-code">' + esc(it.code) + '</span>' : '') +
    (it.source === 'overlay' ? '<span class="row-badge live">live update</span>' : '') +
    (it.venue ? '<span class="row-where link" data-room="' + esc(it.venue) + '">' + venueHtml(it.venue) + '</span>' : '') +
    (it.eMin != null ? '<span class="row-till">till ' + E.toHHMM(it.eMin) + '</span>' : (it.rawTime ? '<span class="row-till">' + esc(it.rawTime) + '</span>' : '')) +
    (it.venueMovedFrom ? '<span class="row-moved">moved from ' + esc(it.venueMovedFrom) + '</span>' : '') +
    E.seatListHtml(r, esc) + '</div></div>';
}

/* ================= Find a time ================= */
var HOUR_START = E.HOUR_START, HOUR_END = E.HOUR_END;
function isoRange(){
  var out = [];
  for(var i=0;i<state.days;i++) out.push(E.addDaysISO(E.todayISO(), i));
  return out;
}
function mealAt(iso, h){ return E.mealTagForHour(iso, h); }
function busyCount(students, iso, ws, we){
  var n = 0;
  students.forEach(function(s){ if(E.overlaps(E.busyIntervals(s, iso), ws, we)) n++; });
  return n;
}
function renderTime(){
  var idxs = state.sel.idxs;
  var strip = document.getElementById('heatStrip'), axis = document.getElementById('heatAxis');
  if(!idxs.length){
    strip.innerHTML = '<div class="empty-hint">Pick students in “who” to light this up.</div>';
    axis.innerHTML = ''; document.getElementById('heatDetail').innerHTML = '';
    document.getElementById('slotResults').innerHTML = ''; document.getElementById('bestDays').innerHTML = '';
    return;
  }
  var students = idxs.map(function(i){ return E.ROSTER[i]; });
  var isoList = isoRange();
  var labels = [];
  for(var h=HOUR_START; h<HOUR_END; h++) labels.push('<span class="heat-axis-cell">' + (h > 12 ? h - 12 : h) + '</span>');
  axis.innerHTML = '<div class="heat-row"><span class="heat-row-label"></span><span class="heat-row-cells">' + labels.join('') + '</span></div>';
  strip.innerHTML = isoList.map(function(iso){
    var cells = [];
    for(var h=HOUR_START; h<HOUR_END; h++){
      var pct = students.length ? busyCount(students, iso, h*60, h*60+60) / students.length : 0;
      var lvl = pct === 0 ? 0 : pct < 0.25 ? 1 : pct < 0.5 ? 2 : pct < 0.75 ? 3 : 4;
      var meal = mealAt(iso, h);
      var sel = state.heatSel && state.heatSel.iso === iso && state.heatSel.hour === h;
      cells.push('<span class="heat-cell h' + lvl + (meal ? ' meal' : '') + (sel ? ' sel' : '') + '" data-iso="' + iso + '" data-hour="' + h + '" title="' +
        E.dateLabel(iso) + ' ' + E.toHHMM(h*60) + ' · ' + Math.round(pct*100) + '% busy' + (meal ? ' · ' + meal : '') + '"></span>');
    }
    return '<div class="heat-row"><span class="heat-row-label">' + E.dateLabel(iso) + '</span><span class="heat-row-cells">' + cells.join('') + '</span></div>';
  }).join('');
  renderHeatDetail(students);
  renderSlots(students, isoList);
  renderBestDays(students, isoList);
}
function renderHeatDetail(students){
  var el = document.getElementById('heatDetail');
  if(!state.heatSel){ el.innerHTML = ''; return; }
  var iso = state.heatSel.iso, ws = state.heatSel.hour*60, we = ws + 60;
  var busy = busyCount(students, iso, ws, we), free = students.length - busy;
  var pct = students.length ? Math.round(free/students.length*100) : 0;
  var freeRooms = E.ALL_VENUES.filter(function(v){ var st = E.venueStatus(v.key, iso, ws); return st.free && (st.until == null || st.until >= we); });
  el.innerHTML = '<b>' + esc(E.dateLabel(iso)) + ', ' + E.toHHMM(ws) + ' – ' + E.toHHMM(we) + '</b><br>' +
    '<span class="pct pct-' + (pct >= 90 ? 'hi' : pct >= 60 ? 'mid' : 'lo') + '" style="margin-left:0">' + free + '/' + students.length + ' free · ' + pct + '%</span> ' +
    (mealAt(iso, state.heatSel.hour) ? '<span class="muted">· ' + mealAt(iso, state.heatSel.hour) + ' hour</span>' : '') + '<br>' +
    freeRooms.length + ' rooms free the whole hour: ' + freeRooms.slice(0, 8).map(function(v){ return '<span class="row-where link" style="margin-left:0;margin-right:8px;white-space:normal" data-room-at="' + esc(v.name) + '">' + esc(v.name) + '</span>'; }).join(' ') +
    (freeRooms.length > 8 ? '<a href="#rooms" class="muted" data-rooms-at="1">+' + (freeRooms.length - 8) + ' more →</a>' : '');
}
function renderSlots(students, isoList){
  var el = document.getElementById('slotResults');
  // 8 AM – 9 PM, and among equally-free slots prefer ones that don't eat into a mess meal.
  var results = E.findSlots(students, isoList, state.durationMin, 8*60, 21*60, 15);
  var mealHit = function(r){ return E.mealWindows(r.iso).some(function(w){ return Math.max(w.s, r.ws) < Math.min(w.e, r.we); }) ? 1 : 0; };
  results.forEach(function(r){ r.meal = mealHit(r); });
  results.sort(function(a, b){ return (b.pct - a.pct) || (a.meal - b.meal) || (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : a.ws - b.ws); });
  if(state.require100) results = results.filter(function(r){ return r.free === r.total; });
  var out = E.diversifySlots(results, 10, 2);
  state.lastSlots = out;
  if(!out.length){ el.innerHTML = '<div class="empty-hint">No slot found — try a shorter duration or a longer look-ahead.</div>'; return; }
  el.innerHTML = out.map(function(s){
    var pct = Math.round(s.pct*100);
    return '<div class="slot-row"><span class="slot-date">' + E.dateLabel(s.iso) + '</span><span class="time-label">' + E.toHHMM(s.ws) + ' – ' + E.toHHMM(s.we) + '</span>' +
      '<span class="pct pct-' + (pct >= 90 ? 'hi' : pct >= 60 ? 'mid' : 'lo') + '">' + s.free + '/' + s.total + ' · ' + pct + '%</span></div>';
  }).join('');
}
function renderBestDays(students, isoList){
  var el = document.getElementById('bestDays');
  var cal = E.DATA.calendar;
  var days = isoList.filter(function(iso){ return !students.some(function(s){ return E.busyIntervals(s, iso).length; }); });
  if(!days.length){ el.innerHTML = '<div class="empty-hint">No fully free day for this selection in range.</div>'; return; }
  el.innerHTML = days.map(function(iso){
    var label = (cal.holidays && cal.holidays[iso]) || (cal.noClassDays && cal.noClassDays[iso]) || 'nothing scheduled';
    return '<div class="slot-row"><span class="slot-date">' + E.dateLabel(iso) + '</span><span class="muted">' + esc(label) + '</span></div>';
  }).join('');
}

/* ================= Rooms ================= */
function roomTime(){
  if(state.room.live){ state.room.iso = E.todayISO(); state.room.t = E.nowMinutes(); }
  return { iso: state.room.iso, t: state.room.t };
}
function syncRoomInputs(){
  var at = roomTime();
  document.getElementById('roomDate').value = at.iso;
  var sel = document.getElementById('roomTime');
  var rounded = Math.floor(at.t / 30) * 30;
  if(!sel.querySelector('option[value="' + rounded + '"]')) rounded = 480;
  sel.value = String(state.room.live ? rounded : at.t);
  document.getElementById('roomNowBtn').classList.toggle('btn-primary', state.room.live);
}
// Free/busy ordering, either way round. "Until" for a free room = when it next gets booked (end of
// day if never); for a busy room = when it frees up.
function roomComparator(mode){
  function freeUntil(st){ return st.until == null ? 9999 : st.until; }
  var byName = function(a, b){ return a.v.name.localeCompare(b.v.name, 'en', { numeric: true }); };
  if(mode === 'name') return byName;
  var freeFirst = mode === 'free-long' || mode === 'free-short';
  return function(a, b){
    if(a.st.free !== b.st.free) return (a.st.free ? -1 : 1) * (freeFirst ? 1 : -1);
    var d;
    if(a.st.free) d = mode === 'free-short' ? freeUntil(a.st) - freeUntil(b.st) : freeUntil(b.st) - freeUntil(a.st);
    else d = mode === 'busy-long' ? b.st.until - a.st.until : a.st.until - b.st.until;
    return d || byName(a, b);
  };
}
function describeStatus(st, t){
  if(st.free){
    if(!st.next) return { pill: 'free', line: 'Free for the rest of the day' };
    var nb = st.next.bookings[0];
    return { pill: 'free', line: 'Free till <b>' + E.toHHMM(st.until) + '</b> · then ' + esc(nb.code) + ' <span class="muted">(' + esc(nb.who) + ')</span>' };
  }
  var cur = st.current[0];
  var rest = st.next ? ' · free ' + E.toHHMM(st.until) + '–' + E.toHHMM(st.next.s) : ' · free after';
  return { pill: 'busy', line: '<b>' + esc(cur.code) + '</b> ' + esc(cur.title !== cur.code ? cur.title : '') + ' <span class="muted">(' + esc(cur.who) + ')</span><br>till <b>' + E.toHHMM(st.until) + '</b>' + (st.next ? rest : '') };
}
function renderRooms(){
  var at = roomTime();
  syncRoomInputs();
  var q = state.room.q.trim().toLowerCase();
  var rows = E.ALL_VENUES.map(function(v){ return { v: v, st: E.venueStatus(v.key, at.iso, at.t) }; });
  var freeCount = rows.filter(function(r){ return r.st.free; }).length;
  var list = rows.filter(function(r){
    if(q) return (r.v.name + ' ' + r.v.desc + ' ' + r.v.key).toLowerCase().indexOf(q) !== -1;
    return state.room.filter === 'all' || r.st.free;
  });
  list.sort(roomComparator(state.room.sort));
  if(q && list.length === 1) state.room.open = list[0].v.key;
  document.getElementById('roomsSummary').innerHTML = '<b>' + freeCount + '</b> of ' + rows.length + ' rooms free · ' +
    esc(E.dateLabel(at.iso)) + ', ' + E.toHHMM(at.t) + (state.room.live ? ' (now)' : '') + (q ? ' · ' + list.length + ' match' + (list.length === 1 ? '' : 'es') : '');
  var ticks = '<div class="tl-ticks"><span>8 AM</span><span>11</span><span>2 PM</span><span>5</span><span>9 PM</span></div>';
  document.getElementById('roomGrid').innerHTML = list.length ? list.map(function(r){
    var d = describeStatus(r.st, at.t);
    var open = state.room.open === r.v.key;
    var html = '<div class="room-card' + (open ? ' expanded' : '') + '" data-key="' + r.v.key + '">' +
      '<div class="room-top"><span class="room-name">' + esc(r.v.name) + '</span><span class="pill ' + d.pill + '">' + d.pill + '</span></div>' +
      (r.v.desc ? '<div class="room-desc">' + esc(r.v.desc) + '</div>' : '') +
      '<div class="room-line">' + d.line + '</div>' +
      E.timelineBar(r.st.blocks, { at: at.t, from: 480, to: 1260, blockClass: function(b){ return b.bookings.every(function(x){ return x.batch === 'other'; }) ? 'other' : ''; } }) + ticks;
    if(open) html += '<div class="room-detail">' + roomDetail(r.v, at) + '</div>';
    return html + '</div>';
  }).join('') : '<div class="empty-hint">' + (q ? 'No room matches “' + esc(state.room.q) + '”.' : 'Every room is booked at this time.') + '</div>';
  renderLeaderboard();
}
function roomDetail(v, at){
  var bookings = E.venueOccupancy(at.iso)[v.key] || [];
  var html = '<div class="eyebrow">' + esc(E.dateLabel(at.iso)) + '</div>';
  html += bookings.length ? bookings.map(function(b){
    return '<div class="room-book' + (at.iso === E.todayISO() && b.e <= E.nowMinutes() ? ' past' : '') + '"><span class="t">' + E.toHHMM(b.s) + ' – ' + E.toHHMM(b.e) + '</span>' +
      '<span><b>' + esc(b.code) + '</b> ' + esc(b.title !== b.code ? b.title : '') + ' <span class="muted">· ' + esc(b.who) + '</span>' + (b.movedFrom ? ' <span class="muted">(moved here from ' + esc(b.movedFrom) + ')</span>' : '') + '</span></div>';
  }).join('') : '<div class="empty-hint">Nothing booked this day.</div>';
  html += '<div class="room-week">';
  for(var i=1;i<=6;i++){
    var iso = E.addDaysISO(at.iso, i);
    html += '<div><div class="room-week-day">' + esc(E.dateLabel(iso)) + '</div>' + E.timelineBar(E.venueBlocks(v.key, iso), { mini: true, from: 480, to: 1260 }) + '</div>';
  }
  return html + '</div>';
}
function renderLeaderboard(){
  var el = document.getElementById('leaderboard');
  if(!el.closest('details').open) return;
  var isoList = [];
  for(var i=0;i<7;i++) isoList.push(E.addDaysISO(E.todayISO(), i));
  var board = E.venueLoadLeaderboard(isoList).slice(0, 10);
  var max = board.length ? board[0].minutes : 1;
  el.innerHTML = board.map(function(b){
    return '<div class="lb-row"><span class="lb-name">' + esc(b.venue.name) + '</span><span class="lb-track"><span class="lb-bar" style="width:' + Math.max(4, Math.round(b.minutes/max*100)) + '%"></span></span><span class="lb-hrs">' + (b.minutes/60).toFixed(1) + 'h</span></div>';
  }).join('');
}
function openRoomsAt(name, iso, t){
  state.room.live = false; state.room.iso = iso; state.room.t = t;
  state.room.q = name || ''; document.getElementById('roomSearch').value = state.room.q;
  state.room.open = name ? E.venueKey(name) : null;
  setTab('rooms');
}

/* ================= Courses ================= */
// "Next" for every course, sorted soonest-first — courses meeting right now on top. Computed once
// per render; the engine caches each date's per-student days, so this stays quick.
function courseRows(){
  var today = E.todayISO(), now = E.nowMinutes();
  return E.COURSES.map(function(c){
    var nx = E.nextCourseSession(c.code, today, now, 14);
    var key = nx ? (nx.ongoing ? -1 : (E.isoToDate(nx.iso) - E.isoToDate(today)) / 864e5 * 1440 + nx.session.s) : 1e9;
    return { c: c, next: nx, key: key };
  }).sort(function(a, b){ return a.key - b.key || (a.c.code < b.c.code ? -1 : 1); });
}
function relDay(iso){
  var d = Math.round((E.isoToDate(iso) - E.isoToDate(E.todayISO())) / 864e5);
  return d === 0 ? 'today' : d === 1 ? 'tomorrow' : E.dateLabel(iso);
}
function renderCourses(){
  var cs = state.course;
  var q = cs.q.trim().toLowerCase();
  var rows = courseRows().filter(function(r){
    var c = r.c;
    if(cs.filter === 'fresher' && !c.fresher) return false;
    if(cs.filter === 'other' && !c.other) return false;
    if(!q) return true;
    return (c.code + ' ' + (c.title || '') + ' ' + (c.instructor || '')).toLowerCase().indexOf(q) !== -1;
  });
  if(q && rows.length === 1) cs.open = rows[0].c.code;
  var ongoing = rows.filter(function(r){ return r.next && r.next.ongoing; }).length;
  document.getElementById('coursesSummary').innerHTML = '<b>' + rows.length + '</b> course' + (rows.length === 1 ? '' : 's') +
    (ongoing ? ' · <b>' + ongoing + '</b> in session right now' : '');
  var shown = rows.slice(0, cs.limit);
  document.getElementById('courseMore').hidden = rows.length <= cs.limit;
  document.getElementById('courseList').innerHTML = shown.length ? shown.map(courseCardHtml).join('') :
    '<div class="empty-hint">No course matches “' + esc(cs.q) + '”.</div>';
}
function courseCardHtml(r){
  var c = r.c, nx = r.next, open = state.course.open === c.code;
  var tag = c.fresher && c.other ? '<span class="tag-batch fresher">2026 + others</span>' : c.fresher ? '<span class="tag-batch fresher">2026 batch</span>' : '<span class="tag-batch">other batches</span>';
  var next = '';
  if(nx){
    var ss = nx.session;
    next = '<div class="course-next' + (nx.ongoing ? ' now' : '') + '">' + (nx.ongoing ? '<b>On now</b> till ' + E.toHHMM(ss.e) : 'Next <b>' + esc(relDay(nx.iso)) + ' ' + E.toHHMM(ss.s) + '</b>') +
      (ss.venue ? ' @ ' + esc(ss.venue) : '') + (ss.label ? ' <span class="muted">· ' + esc(ss.label) + '</span>' : '') + '</div>';
  } else next = '<div class="course-next muted">No session in the next two weeks' + (c.floated ? '' : ' — not floated') + '</div>';
  var meta = [c.instructor, c.students ? c.students + ' students' : null].filter(Boolean).join(' · ');
  var html = '<div class="course-card' + (open ? ' expanded' : '') + '" data-course="' + c.code + '">' +
    '<div class="course-top"><span class="course-code">' + esc(c.code) + '</span>' + tag + '</div>' +
    (c.title ? '<div class="course-title">' + esc(c.title) + '</div>' : '') +
    (meta ? '<div class="course-meta">' + esc(meta) + '</div>' : '') + next;
  if(open) html += courseDetailHtml(c);
  return html + '</div>';
}
function courseDetailHtml(c){
  var pattern = E.courseWeekPattern(c.code);
  var html = '<div class="course-detail">';
  if(pattern.length){
    html += '<div class="eyebrow">usual week</div><div class="course-pattern" style="margin:0 0 10px;">' + pattern.map(function(p){
      return '<span>' + p.wd.slice(0, 3) + ' ' + E.toHHMM(p.s) + (p.kind ? ' ' + p.kind : '') + (p.venues.length ? ' · ' + esc(p.venues.slice(0, 3).join(', ')) + (p.venues.length > 3 ? ' +' + (p.venues.length - 3) : '') : '') + '</span>';
    }).join('') + '</div>';
  }
  html += '<div class="eyebrow">next 7 days</div>';
  var any = false;
  for(var d=0; d<7; d++){
    var iso = E.addDaysISO(E.todayISO(), d);
    var list = E.courseSessions(c.code, iso);
    if(!list.length) continue;
    any = true;
    html += '<div class="course-day"><div class="course-day-head">' + esc(E.dateLabel(iso)) + (d === 0 ? ' · today' : '') + '</div>' + list.map(function(ss){
      var badge = ss.source === 'override' ? '<span class="row-badge override">one-off</span>' : ss.source === 'overlay' ? '<span class="row-badge live">live update</span>' : '';
      var title = ss.title && ss.title !== c.title ? esc(ss.title) + ' ' : '';
      return '<div class="course-sess"><span class="t">' + E.toHHMM(ss.s) + ' – ' + E.toHHMM(ss.e) + '</span><span>' + title +
        (ss.venue ? '<span class="row-where link" style="margin-left:0" data-room="' + esc(ss.venue.split(',')[0]) + '" data-iso="' + iso + '" data-t="' + ss.s + '">@ ' + esc(ss.venue) + '</span>' : '') +
        ' <span class="muted">· ' + esc(ss.label || '') + '</span>' + badge +
        (ss.movedFrom ? ' <span class="muted">(moved from ' + esc(ss.movedFrom) + ')</span>' : '') +
        (ss.note ? ' <span class="muted">“' + esc(ss.note) + '”</span>' : '') + '</span></div>';
    }).join('') + '</div>';
  }
  if(!any) html += '<div class="empty-hint">No sessions in the next 7 days.</div>';
  var takers = c.fresher ? E.courseTakers(c.code) : [];
  html += '<div class="course-actions">' +
    (takers.length ? '<button class="btn btn-sm" data-course-day="' + c.code + '">See their day → (' + takers.length + ' students)</button>' : '') +
    '<button class="btn btn-sm" data-course-close="1">Close</button></div>';
  return html + '</div>';
}
function openCourseCohort(code){
  var takers = E.courseTakers(code);
  var id = 'course:' + code;
  E.UNIT_BY_ID[id] = { id: id, idxs: takers, mask: E.maskOf(takers), size: takers.length, label: code + ' students' };
  // Land on the day it next meets, not an empty Sunday.
  var nx = E.nextCourseSession(code, E.todayISO(), 0, 14);
  state.iso = nx ? nx.iso : E.todayISO();
  picker.set([{ op: 'add', id: id }]);
  setTab('day');
}

/* ================= init ================= */
function init(){
  E.mountThemeSwitcher(document.getElementById('themeSwitch'));
  picker = PICKER.mount(document.getElementById('picker'), {
    onChange: function(sel){ state.sel = sel; state.heatSel = null; renderWhoSummary(); renderActive(); }
  });
  var opts = [];
  for(var m=7*60; m<=22*60; m+=30) opts.push('<option value="' + m + '">' + E.toHHMM(m) + '</option>');
  document.getElementById('roomTime').innerHTML = opts.join('');

  document.getElementById('tabs').addEventListener('click', function(e){
    var b = e.target.closest('.tab'); if(b) setTab(b.getAttribute('data-tab'), true);
  });
  document.getElementById('whoToggle').addEventListener('click', function(){
    setWhoCollapsed(!document.getElementById('whoPanel').classList.contains('collapsed'));
  });
  renderWhoSummary();
  setWhoCollapsed(false); // starts open — so the button reads "Done", not "Change".
  // Tap the date for a month picker (build/monthpick.js).
  MonthPick.attach({ anchor: document.getElementById('dayDate'), getIso: function(){ return state.iso; },
    onPick: function(iso){ state.iso = iso; renderDay(); } });
  document.getElementById('view-day').addEventListener('click', function(e){
    var nav = e.target.closest('[data-day]');
    if(nav){
      var v = nav.getAttribute('data-day');
      state.iso = v === 'today' ? E.todayISO() : E.addDaysISO(state.iso, +v);
      renderDay(); return;
    }
    var room = e.target.closest('[data-room]');
    if(room){
      var item = room.getAttribute('data-room');
      var now = state.iso === E.todayISO() ? E.nowMinutes() : 600;
      openRoomsAt(E.venueNameFor(item), state.iso, now);
    }
  });
  document.getElementById('view-time').addEventListener('click', function(e){
    var cell = e.target.closest('.heat-cell[data-iso]');
    if(cell){ state.heatSel = { iso: cell.getAttribute('data-iso'), hour: +cell.getAttribute('data-hour') }; renderTime(); return; }
    var r = e.target.closest('[data-room-at]');
    if(r && state.heatSel){ openRoomsAt(r.getAttribute('data-room-at'), state.heatSel.iso, state.heatSel.hour*60); return; }
    var more = e.target.closest('[data-rooms-at]');
    if(more && state.heatSel){ e.preventDefault(); openRoomsAt('', state.heatSel.iso, state.heatSel.hour*60); }
  });
  document.getElementById('durationInput').addEventListener('change', function(e){ state.durationMin = Math.max(15, +e.target.value || 60); renderTime(); });
  document.getElementById('daysInput').addEventListener('change', function(e){ state.days = Math.max(1, Math.min(60, +e.target.value || 14)); renderTime(); });
  document.getElementById('require100Input').addEventListener('change', function(e){ state.require100 = e.target.checked; renderTime(); });
  document.getElementById('copySummaryBtn').addEventListener('click', function(){
    var s = state.lastSlots && state.lastSlots[0];
    if(!s) return;
    var text = '📅 Proposed: ' + E.dateLabel(s.iso) + ', ' + E.toHHMM(s.ws) + '–' + E.toHHMM(s.we) + ' — ' + s.free + '/' + s.total + ' (' + Math.round(s.pct*100) + '%) of ' + state.sel.label + ' free.';
    var alt = state.lastSlots[1];
    if(alt) text += ' Alt: ' + E.dateLabel(alt.iso) + ' ' + E.toHHMM(alt.ws) + '–' + E.toHHMM(alt.we) + ', ' + Math.round(alt.pct*100) + '% free.';
    try { navigator.clipboard.writeText(text); } catch(err){}
    var hint = document.getElementById('copyHint'); hint.textContent = text; hint.style.display = 'block';
  });

  document.getElementById('courseSearch').addEventListener('input', function(e){ state.course.q = e.target.value; state.course.limit = 40; if(!e.target.value) state.course.open = null; renderCourses(); });
  document.getElementById('courseFilter').addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b) return;
    state.course.filter = b.getAttribute('data-f'); state.course.limit = 40;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function(x){ x.classList.toggle('on', x === b); });
    renderCourses();
  });
  document.getElementById('courseMore').addEventListener('click', function(){ state.course.limit += 60; renderCourses(); });
  document.getElementById('courseList').addEventListener('click', function(e){
    var day = e.target.closest('[data-course-day]');
    if(day){ openCourseCohort(day.getAttribute('data-course-day')); return; }
    var room = e.target.closest('[data-room]');
    if(room){ openRoomsAt(E.venueNameFor(room.getAttribute('data-room')), room.getAttribute('data-iso'), +room.getAttribute('data-t')); return; }
    if(e.target.closest('[data-course-close]')){ state.course.open = null; renderCourses(); return; }
    var card = e.target.closest('.course-card');
    if(!card || card.classList.contains('expanded')) return;
    state.course.open = card.getAttribute('data-course');
    renderCourses();
    var el = document.querySelector('.course-card.expanded');
    if(el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  document.getElementById('roomSearch').addEventListener('input', function(e){ state.room.q = e.target.value; if(!e.target.value) state.room.open = null; renderRooms(); });
  document.getElementById('roomFilter').addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b) return;
    state.room.filter = b.getAttribute('data-f');
    Array.prototype.forEach.call(this.querySelectorAll('button'), function(x){ x.classList.toggle('on', x === b); });
    renderRooms();
  });
  document.getElementById('roomSort').addEventListener('change', function(e){
    state.room.sort = e.target.value;
    // Busy-first is pointless while only free rooms are listed.
    if(/^busy/.test(state.room.sort) && state.room.filter === 'free'){
      state.room.filter = 'all';
      Array.prototype.forEach.call(document.querySelectorAll('#roomFilter button'), function(x){ x.classList.toggle('on', x.getAttribute('data-f') === 'all'); });
    }
    renderRooms();
  });
  document.getElementById('roomNowBtn').addEventListener('click', function(){ state.room.live = true; renderRooms(); });
  document.getElementById('roomDate').addEventListener('change', function(e){ if(e.target.value){ state.room.live = false; state.room.iso = e.target.value; if(state.room.t == null) state.room.t = 600; renderRooms(); } });
  document.getElementById('roomTime').addEventListener('change', function(e){ state.room.live = false; state.room.t = +e.target.value; renderRooms(); });
  document.getElementById('roomGrid').addEventListener('click', function(e){
    var card = e.target.closest('.room-card'); if(!card) return;
    var k = card.getAttribute('data-key');
    state.room.open = state.room.open === k ? null : k;
    renderRooms();
  });
  document.querySelector('details.lb').addEventListener('toggle', renderLeaderboard);
  setInterval(function(){ if(state.tab === 'rooms' && state.room.live) renderRooms(); }, 60000);

  var initial = (location.hash || '').replace('#', '');
  setTab(['day', 'time', 'courses', 'rooms'].indexOf(initial) !== -1 ? initial : 'day');
}

// Test hook for build/verify_all.js (Node, no DOM): the engine plus the names the older spectate
// tests use. venueOccupancyForDate's bookings also carry `subject` (= code) for those tests.
window.__spectate = {
  ENGINE: E, DATA: E.DATA, ALL_VENUES: E.ALL_VENUES, venueKey: E.venueKey, HOUR_START: E.HOUR_START, HOUR_END: E.HOUR_END,
  busyIntervalsForStudent: E.busyIntervals, findSlots: E.findSlots, diversifySlots: E.diversifySlots,
  freeVenuesAt: E.freeVenuesAt, mealTagForHour: E.mealTagForHour, venueLoadLeaderboard: E.venueLoadLeaderboard,
  busyVenuesAt: function(iso, ws, we){
    return E.busyVenuesAt(iso, ws, we).map(function(b){ return { venue: b.venue, occupants: b.occupants.map(function(o){ return Object.assign({ subject: o.code }, o); }) }; });
  },
  venueOccupancyForDate: function(iso){
    var occ = E.venueOccupancy(iso), out = {};
    Object.keys(occ).forEach(function(k){ out[k] = occ[k].map(function(o){ return Object.assign({ subject: o.code }, o); }); });
    return out;
  }
};

// Live BR corrections (build/live_overlay_bridge.js) — same re-render as the dashboard does.
document.addEventListener('thirty:overlay', function(){
  E.setOverlay(window.__liveOverlay || []);
  renderActive();
});
document.addEventListener('DOMContentLoaded', init);
})();
