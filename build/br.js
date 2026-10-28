import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

/* /br — Branch Rep live schedule tool.
   Pick a kind of student (build/picker.js), see their day exactly as they see it on the dashboard
   (build/engine.js mirrors app3.js's buildDays(), so hand-made overrides, cancellations, venue
   relocations, HS/IKS and NSO assignments and every other BR's live changes all show), then remove,
   move or add things right in that view. Every edit is written to Firestore immediately (live for
   students within seconds) and recorded as an undoable step — Undo/Redo up top, or Ctrl/⌘+Z.

   Firestore doc shape (/scheduleOverlay/{id}) is unchanged from the original wizard, plus three
   optional additions every reader understands: scope {type:'entries', entries[], label, branch?},
   hide.startMin (remove one occurrence, not every one that day), temporal.from (recurring "from
   this date on"). */

const firebaseConfig = {
  projectId: "thirtyatrpr",
  appId: "1:179913818545:web:5b9ac08846032badbafd90",
  storageBucket: "thirtyatrpr.firebasestorage.app",
  apiKey: atob("QUl6YVN5QWhCVHNmdVV6X0htc1FJMGl5blVQRVhhbGdTbEJ0c1p3"),
  authDomain: "thirtyatrpr.firebaseapp.com",
  messagingSenderId: "179913818545"
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

var E = ENGINE;
var DATA = E.DATA;
var esc = E.escapeHtml;
var CREATOR_ENTRY = '2026AIB1099';
E.applyTheme();
E.mountThemeSwitcher(document.getElementById('themeSwitch'));

/* ================= permissions ================= */
// Mirrors merge.py's BATCH_REPS (and firestore.rules' brBranch()).
var BR_BRANCH = {};
(DATA.batchReps || []).forEach(function(r){ r.reps.forEach(function(entry){ BR_BRANCH[entry] = r.branch; }); });
var me = null; // {entry, name, isCreator, branch}
function canWriteScope(scope){
  if(!me || !scope) return false;
  if(me.isCreator) return true;
  return scope.type === 'all' || scope.branch === me.branch;
}

/* ================= scopes ================= */
function allIdxs(){ return E.UNIT_BY_ID['all'].idxs; }
function idxsWhere(fn){ var out = []; E.ROSTER.forEach(function(s, i){ if(fn(s)) out.push(i); }); return out; }
// The tidiest scope that names exactly these students: everyone, a branch, a branch+group, or
// (anything else) an explicit entry list with a human label. A list inside one branch also
// carries `branch`, which is what the Firestore rules check for BRs.
function compileScope(idxs){
  if(idxs.length === E.N) return { type: 'all' };
  var s0 = E.ROSTER[idxs[0]];
  var oneBranch = idxs.every(function(i){ return E.ROSTER[i].branch === s0.branch; });
  if(oneBranch){
    if(E.sameSet(idxs, E.UNIT_BY_ID['br:' + s0.branch].idxs)) return { type: 'branch', branch: s0.branch };
    if(idxs.every(function(i){ return E.ROSTER[i].academicGroup === s0.academicGroup; })){
      var bg = idxsWhere(function(s){ return s.branch === s0.branch && s.academicGroup === s0.academicGroup; });
      if(E.sameSet(idxs, bg)) return { type: 'group', branch: s0.branch, group: s0.academicGroup };
    }
  }
  return { type: 'entries', entries: idxs.map(function(i){ return E.ROSTER[i].entry; }),
    label: E.describe(idxs).join(' + '), branch: oneBranch ? s0.branch : null };
}
function studentsOfScope(scope){ return idxsWhere(function(s){ return E.overlayScopeMatches(scope, s); }); }
function scopeLabel(scope){
  if(!scope) return '?';
  if(scope.type === 'all') return 'everyone';
  if(scope.type === 'branch') return E.bshort(scope.branch);
  if(scope.type === 'group') return E.bshort(scope.branch) + '·' + scope.group;
  return scope.label || (scope.entries ? scope.entries.length + ' students' : '?');
}
function temporalFor(choice, iso){
  if(choice === 'weekly') return { type: 'recurring', weekday: E.weekdayNameOf(iso), from: iso };
  if(choice === 'week'){ var w = E.weekRange(iso); return { type: 'week', start: w.start, end: w.end }; }
  return { type: 'date', date: iso };
}
function temporalLabel(t){
  if(!t) return '';
  if(t.type === 'date') return E.dateLabel(t.date);
  if(t.type === 'week') return 'week of ' + E.dateLabel(t.start);
  if(t.type === 'recurring') return 'every ' + t.weekday + (t.from ? ' from ' + E.dateLabel(t.from) : '');
  return '';
}
function temporalChoiceOf(t){ return !t ? 'date' : t.type === 'recurring' ? 'weekly' : t.type === 'week' ? 'week' : 'date'; }
function minToInput(m){ return String(Math.floor(m/60)).padStart(2, '0') + ':' + String(m%60).padStart(2, '0'); }
function inputToMin(v){ if(!v) return null; var p = v.split(':'); return (+p[0])*60 + (+p[1]); }
function summarizeDoc(d){
  var base = d.show || d.hide;
  var tail = ' · for <b>' + esc(scopeLabel(base.scope)) + '</b> · ' + esc(temporalLabel(base.temporal));
  var at = d.hide && d.hide.startMin != null ? ' (' + E.toHHMM(d.hide.startMin) + ')' : '';
  if(d.hide && d.show) return '✏️ <b>' + esc(d.hide.subject) + '</b>' + at + ' → ' + esc(d.show.title || d.show.subject) + ', ' + E.toHHMM(d.show.startMin) + '–' + E.toHHMM(d.show.endMin) + (d.show.venue ? ' @ ' + esc(d.show.venue) : '') + tail;
  if(d.hide) return '🚫 <b>' + esc(d.hide.subject) + '</b>' + at + ' removed' + tail;
  return '➕ <b>' + esc(d.show.title || d.show.subject) + '</b>, ' + E.toHHMM(d.show.startMin) + '–' + E.toHHMM(d.show.endMin) + (d.show.venue ? ' @ ' + esc(d.show.venue) : '') + tail;
}

/* ================= live data ================= */
var overlay = [];
var COL = collection(db, 'scheduleOverlay');
onSnapshot(COL, function(snap){
  overlay = snap.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); });
  E.setOverlay(overlay);
  if(me){ renderView(); if(state.tab === 'changes') renderChanges(); }
}, function(err){ toast('Live data unavailable: ' + (err && err.message ? err.message : err)); });

/* ================= undo / redo =================
   Every user action is a list of primitive Firestore ops, each knowing its own inverse. Undo
   replays the inverses newest-first. Re-created docs are re-stamped with the current BR as
   author (the rules only let you create docs in your own name). */
var past = [], future = [], busy = false;
function stamp(data){
  var out = JSON.parse(JSON.stringify(data, function(k, v){ return k === 'id' || k === 'createdAt' || k === 'updatedAt' ? undefined : v; }));
  out.createdBy = me.entry; out.createdByName = me.name;
  out.createdAt = (data.createdAt && typeof data.createdAt.toDate === 'function') ? data.createdAt : serverTimestamp();
  out.updatedAt = serverTimestamp();
  if(out.note === undefined) out.note = null;
  if(out.hide === undefined) out.hide = null;
  if(out.show === undefined) out.show = null;
  return out;
}
function opCreate(data){
  var ref = doc(COL);
  return { run: function(){ return setDoc(ref, stamp(data)); }, back: function(){ return deleteDoc(ref); } };
}
function opDelete(d){
  var ref = doc(db, 'scheduleOverlay', d.id);
  return { run: function(){ return deleteDoc(ref); }, back: function(){ return setDoc(ref, stamp(d)); } };
}
function opReplace(d, after){
  var ref = doc(db, 'scheduleOverlay', d.id);
  return { run: function(){ return setDoc(ref, stamp(after)); }, back: function(){ return setDoc(ref, stamp(d)); } };
}
function chain(fns){ return fns.reduce(function(p, f){ return p.then(f); }, Promise.resolve()); }
function perform(label, ops){
  if(busy || !ops.length) return Promise.resolve();
  busy = true;
  var action = { label: label, ops: ops };
  return chain(ops.map(function(o){ return o.run; })).then(function(){
    past.push(action); future = [];
    toast(label, true);
  }).catch(function(err){ toast('Failed: ' + (err && err.message ? err.message : err)); })
    .finally(function(){ busy = false; paintHistory(); });
}
function undo(){
  if(busy || !past.length) return;
  busy = true;
  var a = past.pop();
  chain(a.ops.slice().reverse().map(function(o){ return o.back; })).then(function(){ future.push(a); toast('Undone: ' + a.label); })
    .catch(function(err){ past.push(a); toast('Undo failed: ' + (err && err.message ? err.message : err)); })
    .finally(function(){ busy = false; paintHistory(); });
}
function redo(){
  if(busy || !future.length) return;
  busy = true;
  var a = future.pop();
  chain(a.ops.map(function(o){ return o.run; })).then(function(){ past.push(a); toast('Redone: ' + a.label); })
    .catch(function(err){ future.push(a); toast('Redo failed: ' + (err && err.message ? err.message : err)); })
    .finally(function(){ busy = false; paintHistory(); });
}
function paintHistory(){
  var u = document.getElementById('undoBtn'), r = document.getElementById('redoBtn');
  u.disabled = !past.length; r.disabled = !future.length;
  u.title = past.length ? 'Undo: ' + past[past.length-1].label.replace(/<[^>]+>/g, '') : 'Nothing to undo';
  r.title = future.length ? 'Redo: ' + future[future.length-1].label.replace(/<[^>]+>/g, '') : 'Nothing to redo';
}
var toastTimer = null;
function toast(msg, withUndo){
  var t = document.getElementById('toast');
  t.innerHTML = '<span>' + msg + '</span>' + (withUndo ? '<button class="btn btn-sm" id="toastUndo">Undo</button>' : '');
  t.classList.add('show');
  if(withUndo) document.getElementById('toastUndo').addEventListener('click', function(){ t.classList.remove('show'); undo(); });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, withUndo ? 6000 : 2600);
}
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.addEventListener('keydown', function(e){
  if(!me || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
  var tag = (e.target && e.target.tagName) || '';
  if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  e.preventDefault();
  if(e.shiftKey) redo(); else undo();
});

/* ================= building the ops for each kind of edit ================= */
// "This live change should no longer apply to these students": shrink its scope, or delete it if
// nobody's left. Returns null if the shrunken scope isn't one this BR may write (e.g. carving
// their branch out of an everyone-wide change) — callers then fall back to an additive doc.
function subtractOps(d, whoIdxs){
  var base = d.show || d.hide;
  var mask = E.maskOf(whoIdxs);
  var remaining = studentsOfScope(base.scope).filter(function(i){ return !mask[i]; });
  if(!remaining.length) return canWriteScope(base.scope) ? [opDelete(d)] : null;
  var scope = compileScope(remaining);
  if(!canWriteScope(scope) || !canWriteScope(base.scope)) return null;
  var after = JSON.parse(JSON.stringify(d));
  if(after.show) after.show.scope = scope;
  if(after.hide) after.hide.scope = scope;
  return [opReplace(d, after)];
}
function showFromItem(it, scope, temporal){
  return { subject: it.subject || it.title, category: it.category || null, title: it.code ? (it.code) : it.title,
    startMin: it.sMin, endMin: it.eMin, venue: it.venue || null, scope: scope, temporal: temporal };
}
function removeOps(row, whoIdxs, temporal, note){
  var it = row.item;
  var scope = compileScope(whoIdxs);
  if(it.source === 'overlay'){
    var d = it.overlay;
    var docIdxs = studentsOfScope(d.show.scope);
    var whoMask = E.maskOf(whoIdxs);
    var coversAll = docIdxs.every(function(i){ return whoMask[i]; });
    if(coversAll && canWriteScope(d.show.scope)){
      // A BR-added item removed for everyone it was added for: drop its add half (keep a "moved
      // from" hide, if it had one, as its own removal so the original doesn't spring back).
      if(d.hide) return [opReplace(d, Object.assign({}, d, { show: null }))];
      return [opDelete(d)];
    }
  }
  return [opCreate({ hide: { subject: it.subject, startMin: it.sMin, scope: scope, temporal: temporal }, show: null, note: note || null })];
}
function editOps(row, whoIdxs, fields, temporal, note){
  var it = row.item;
  var scope = compileScope(whoIdxs);
  var show = { subject: fields.subject, category: it.category || null, title: fields.title, startMin: fields.startMin, endMin: fields.endMin, venue: fields.venue || null, scope: scope, temporal: temporal };
  if(it.source === 'overlay'){
    var d = it.overlay;
    var docIdxs = studentsOfScope(d.show.scope);
    var whoMask = E.maskOf(whoIdxs);
    if(docIdxs.every(function(i){ return whoMask[i]; }) && canWriteScope(d.show.scope)){
      var after = JSON.parse(JSON.stringify(d));
      after.show = show;
      if(after.hide){ after.hide.scope = scope; after.hide.temporal = temporal; }
      after.note = note || d.note || null;
      return [opReplace(d, after)];
    }
    // Only part of who it applies to: those students get the edited copy, others keep the original.
    var sub = subtractOps(d, whoIdxs);
    if(sub) return sub.concat([opCreate({ hide: d.hide ? Object.assign({}, d.hide, { scope: scope, temporal: temporal }) : null, show: show, note: note || null })]);
    return [opCreate({ hide: { subject: it.subject, startMin: it.sMin, scope: scope, temporal: temporal }, show: show, note: note || null })];
  }
  return [opCreate({ hide: { subject: it.subject, startMin: it.sMin, scope: scope, temporal: temporal }, show: show, note: note || null })];
}
function addOps(whoIdxs, fields, temporal, note){
  return [opCreate({ hide: null, show: { subject: fields.subject, category: 'Update', title: fields.title, startMin: fields.startMin, endMin: fields.endMin, venue: fields.venue || null, scope: compileScope(whoIdxs), temporal: temporal }, note: note || null })];
}
// Bring back something a live change removed, for these students.
function restoreOps(row, whoIdxs){
  var d = row.item.hiddenBy;
  var docIdxs = studentsOfScope(d.hide.scope);
  var whoMask = E.maskOf(whoIdxs);
  if(docIdxs.every(function(i){ return whoMask[i]; }) && canWriteScope(d.hide.scope)){
    // The removal only ever applied to these students: undo it at the source.
    if(d.show) return [opReplace(d, Object.assign({}, JSON.parse(JSON.stringify(d)), { hide: null }))];
    return [opDelete(d)];
  }
  var sub = d.show ? null : subtractOps(d, whoIdxs);
  if(sub) return sub;
  // Can't narrow someone else's wider change — re-add the item for just these students instead.
  var it = row.item;
  return [opCreate({ hide: null, show: { subject: it.subject, category: it.category || null, title: it.title, startMin: it.sMin, endMin: it.eMin, venue: it.venue || null, scope: compileScope(whoIdxs), temporal: d.hide.temporal }, note: null })];
}

/* ================= view ================= */
var state = { tab: 'tt', iso: E.todayISO(), sel: { idxs: [], label: '' }, ed: null };
var picker = null;
var viewRows = {};

function renderView(){
  var box = document.getElementById('studentView');
  var iso = state.iso;
  document.getElementById('dayDate').innerHTML = esc(E.dateLabel(iso)) + (iso === E.todayISO() ? ' <span class="muted">· today</span>' : '') + ' <span class="mp-caret">&#9662;</span>';
  MonthPick.slide(box, renderView.lastIso, iso); renderView.lastIso = iso;
  var idxs = state.sel.idxs;
  if(!idxs.length){
    box.innerHTML = '<div class="empty-hint">Pick students in “whose timetable?”. Their day shows up here exactly as it does on their dashboard — every override included — and you can remove, move or add things right here.</div>';
    return;
  }
  var same = E.isHomogeneousDay(idxs, iso);
  var d = E.cohortDay(idxs, iso, { withHidden: true });
  var ctx = E.dayContext(iso);
  viewRows = {};
  var n = 0;
  function reg(r){ var k = 'r' + (n++); viewRows[k] = r; return k; }

  var html = '<div class="view-head"><b>' + esc(state.sel.label) + '</b> · ' + idxs.length + ' student' + (idxs.length === 1 ? '' : 's') +
    (idxs.length > 1 ? (same ? '<span class="same-badge same">identical day</span>' : '<span class="same-badge mixed">days differ</span>') : '') + '<br>' +
    '<span class="muted">' + (same ? 'This is literally what each of them sees today on their dashboard.' : 'Each line says who it’s for. Use “narrow to” in the picker to see one kind of student.') + '</span></div>';
  d.notes.forEach(function(note){ html += '<div class="day-note">' + esc(note) + '</div>'; });
  if(ctx.examLabel) html += '<div class="day-note">' + esc(ctx.examLabel) + '</div>';
  if(state.ed && state.ed.mode === 'add') html += editorHtml();
  if(!d.timeline.length && !d.untimed.length) html += '<div class="empty-hint">Nothing scheduled.</div>';
  d.timeline.forEach(function(slot){
    html += '<div class="slot"><div class="slot-time">' + E.toHHMM(slot.sMin) + '</div><div class="slot-rows">';
    slot.rows.forEach(function(r){ html += rowHtml(r, reg(r), !same); });
    html += '</div></div>';
  });
  if(d.untimed.length){
    html += '<div class="slot"><div class="slot-time">time tbc</div><div class="slot-rows">';
    d.untimed.forEach(function(r){ html += rowHtml(r, reg(r), !same); });
    html += '</div></div>';
  }
  if(d.hidden.length){
    html += '<div class="slot"><div class="slot-time" style="color:var(--rose)">removed</div><div class="slot-rows">';
    d.hidden.forEach(function(r){ html += hiddenRowHtml(r, reg(r), !same); });
    html += '</div></div>';
  }
  if(!state.ed || state.ed.mode !== 'add'){
    html += '<div class="add-bar"><button class="btn btn-primary" data-act="add">＋ Add something on ' + esc(E.dateLabel(iso)) + '</button></div>';
  }
  box.innerHTML = html;
  bindEditor();
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
function rowHtml(r, key, showWho){
  var it = r.item;
  var editing = state.ed && state.ed.rowUid === it.uid && state.ed.whoKey === r.who.join(',');
  var badge = it.source === 'overlay' ? '<span class="row-badge live">live · ' + esc(nameOf(it.contributedBy)) + '</span>'
    : it.source === 'override' ? '<span class="row-badge override">one-off</span>' : '';
  var canAct = !!it.subject;
  var html = '<div class="row' + (editing ? ' editing' : '') + '"><div class="row-main">' +
    (showWho ? whoHtml(r.label) : '') +
    '<span class="row-what" style="color:' + it.color + '">' + esc(it.title) + '</span>' +
    (it.code && it.code !== it.title ? '<span class="row-code">' + esc(it.code) + '</span>' : '') + badge +
    (it.venue ? '<span class="row-where">' + venueHtml(it.venue) + '</span>' : '') +
    (it.eMin != null ? '<span class="row-till">till ' + E.toHHMM(it.eMin) + '</span>' : (it.rawTime ? '<span class="row-till">' + esc(it.rawTime) + '</span>' : '')) +
    (it.venueMovedFrom ? '<span class="row-moved">moved from ' + esc(it.venueMovedFrom) + '</span>' : '') +
    (it.source === 'overlay' && it.overlay.note ? '<span class="row-moved" style="color:var(--violet)">“' + esc(it.overlay.note) + '”</span>' : '') +
    E.seatListHtml(r, esc) + '</div>' +
    (canAct ? '<div class="row-actions"><button class="icon-btn" data-act="edit" data-row="' + key + '" title="Move / change">✎</button>' +
      '<button class="icon-btn danger" data-act="remove" data-row="' + key + '" title="Remove">✕</button></div>' : '') +
    '</div>';
  if(editing) html += editorHtml();
  return html;
}
function hiddenRowHtml(r, key, showWho){
  var it = r.item, by = it.hiddenBy;
  return '<div class="row removed"><div class="row-main">' +
    (showWho ? whoHtml(r.label) : '') +
    '<span class="row-what">' + esc(it.title) + '</span>' +
    (it.sMin != null ? '<span class="row-till">' + E.toHHMM(it.sMin) + '</span>' : '') +
    '<span class="row-badge removed">' + (by.show ? 'moved' : 'removed') + ' · ' + esc(nameOf(by.createdBy)) + '</span>' +
    (by.note ? '<span class="row-moved" style="color:var(--violet)">“' + esc(by.note) + '”</span>' : '') +
    '</div><div class="row-actions"><button class="btn btn-sm" data-act="restore" data-row="' + key + '">Restore</button></div></div>';
}
function nameOf(entry){
  if(!entry) return 'BR';
  var s = DATA.roster[entry];
  return s ? E.titleCase(s.name).split(' ')[0] : entry;
}

/* ---- inline editor ---- */
function openEditor(mode, row){
  var it = row ? row.item : null;
  var who = row ? row.who : state.sel.idxs;
  state.ed = {
    mode: mode, rowUid: it ? it.uid : null, whoKey: row ? row.who.join(',') : null, row: row,
    rowWho: who, scopeChoice: 'row', when: it && it.overlay ? temporalChoiceOf(it.overlay.show && it.overlay.show.temporal) : 'date',
    title: it ? (it.code || it.title) : '', start: it && it.sMin != null ? it.sMin : 600, end: it && it.eMin != null ? it.eMin : 650,
    venue: it ? (it.venue || '') : '', note: ''
  };
  renderView();
  var first = document.querySelector('.editor input:not([type=hidden])');
  if(first && mode !== 'remove') first.focus();
}
// "For": the students on that line (or the whole selection, when adding), or the whole batch —
// the one wider scope every BR may write (common-to-everyone changes are collectively managed).
function scopeOptions(){
  var ed = state.ed;
  var who = ed.row ? ed.rowWho : state.sel.idxs;
  var label = E.sameSet(who, state.sel.idxs) ? state.sel.label : E.describe(who).join(' + ');
  var opts = [{ id: 'row', label: label, n: who.length }];
  if(who.length !== E.N) opts.push({ id: 'all', label: 'the whole batch', n: E.N });
  return opts;
}
function whoForChoice(){
  var ed = state.ed;
  if(ed.scopeChoice === 'all') return allIdxs();
  return ed.row ? ed.rowWho : state.sel.idxs;
}
function freeRoomsHtml(){
  var ed = state.ed;
  if(ed.start == null || ed.end == null || ed.end <= ed.start) return '';
  var free = E.ALL_VENUES.filter(function(v){
    var st = E.venueStatus(v.key, state.iso, ed.start);
    return st.free && (st.until == null || st.until >= ed.end);
  });
  if(!free.length) return '<div class="ed-hint">No known room is free for that whole slot.</div>';
  return '<div class="ed-hint">Free then (all batches):</div><div class="ed-rooms">' + free.slice(0, 14).map(function(v){
    return '<button class="chip' + (E.venueKey(ed.venue) === v.key ? ' on' : '') + '" data-room="' + esc(v.name) + '">' + esc(v.name) + '</button>';
  }).join('') + '</div>';
}
function editorHtml(){
  var ed = state.ed;
  var iso = state.iso;
  var it = ed.row ? ed.row.item : null;
  var verb = ed.mode === 'add' ? 'Add' : ed.mode === 'edit' ? 'Move / change' : 'Remove';
  var whenOpts = [['date', 'Just ' + E.dateLabel(iso)], ['weekly', 'Every ' + E.weekdayNameOf(iso) + ' from now'], ['week', 'This week only']];
  var html = '<div class="editor"><div class="editor-title">' + verb + (it ? ' <span class="muted">' + esc(it.title) + (it.sMin != null ? ' · ' + E.toHHMM(it.sMin) : '') + '</span>' : '') + '</div>';
  if(ed.mode !== 'remove'){
    html += '<div class="ed-grid">' +
      '<div class="ed-field full"><label>What</label><input class="input" list="subjectList" data-f="title" value="' + esc(ed.title) + '" placeholder="Course code or a name — e.g. MA101, Extra class, Quiz"></div>' +
      '<div class="ed-field"><label>Starts</label><input class="input" type="time" data-f="start" value="' + minToInput(ed.start) + '"></div>' +
      '<div class="ed-field"><label>Ends</label><input class="input" type="time" data-f="end" value="' + minToInput(ed.end) + '"></div>' +
      '<div class="ed-field full"><label>Where</label><input class="input" list="venueList" data-f="venue" value="' + esc(ed.venue) + '" placeholder="Room (optional)">' + '<div data-free-rooms>' + freeRoomsHtml() + '</div></div>' +
      '</div>';
  }
  html += '<div class="ed-field" style="margin-top:10px;"><label>For</label><div class="chips">' + scopeOptions().map(function(o){
    return '<button class="chip' + (ed.scopeChoice === o.id ? ' on' : '') + '" data-scope="' + o.id + '">' + esc(o.label) + ' <span class="n">' + o.n + '</span></button>';
  }).join('') + '</div></div>';
  html += '<div class="ed-field" style="margin-top:10px;"><label>When</label><div class="chips">' + whenOpts.map(function(w){
    return '<button class="chip' + (ed.when === w[0] ? ' on' : '') + '" data-when="' + w[0] + '">' + esc(w[1]) + '</button>';
  }).join('') + '</div></div>';
  html += '<div class="ed-field" style="margin-top:10px;"><label>Note for students (optional)</label><input class="input" data-f="note" value="' + esc(ed.note) + '" placeholder="e.g. Prof is away — makeup on Saturday"></div>';
  html += '<div class="ed-actions"><span class="ed-hint grow">Goes live for students as soon as you save · undo anytime.</span>' +
    '<button class="btn" data-act="cancel">Cancel</button>' +
    '<button class="btn ' + (ed.mode === 'remove' ? 'btn-danger' : 'btn-primary') + '" data-act="save">' + (ed.mode === 'remove' ? 'Remove' : 'Save') + '</button></div></div>';
  return html;
}
function bindEditor(){
  var box = document.querySelector('.editor');
  if(!box) return;
  Array.prototype.forEach.call(box.querySelectorAll('input[data-f]'), function(inp){
    inp.addEventListener('input', function(){
      var f = inp.getAttribute('data-f');
      if(f === 'start' || f === 'end'){
        var v = inputToMin(inp.value);
        if(v == null) return;
        if(f === 'start'){ var dur = state.ed.end - state.ed.start; state.ed.start = v; if(dur > 0){ state.ed.end = v + dur; var endInp = box.querySelector('[data-f="end"]'); if(endInp) endInp.value = minToInput(state.ed.end); } }
        else state.ed.end = v;
        var fr = box.querySelector('[data-free-rooms]'); if(fr) fr.innerHTML = freeRoomsHtml();
      } else state.ed[f] = inp.value;
    });
  });
}
function subjectFromTitle(text){
  var t = text.trim();
  var m = t.match(/^([A-Z]{2,4}\d{3}(?:-[A-Z]+)?)\b/i);
  if(m) return m[1].toUpperCase();
  return t;
}
function save(){
  var ed = state.ed;
  var who = whoForChoice();
  var temporal = temporalFor(ed.when, state.iso);
  var scope = compileScope(who);
  if(!canWriteScope(scope)){ toast('As ' + E.bshort(me.branch) + ' BR you can change your own branch, or the whole batch.'); return; }
  var ops, label;
  var whoLabel = scopeLabel(scope);
  if(ed.mode === 'remove'){
    ops = removeOps(ed.row, who, temporal, ed.note);
    label = 'Removed ' + esc(ed.row.item.title) + ' for ' + esc(whoLabel) + ' · ' + esc(temporalLabel(temporal));
  } else {
    if(!ed.title.trim()){ toast('Say what it is first.'); return; }
    if(ed.end <= ed.start){ toast('End time must be after start time.'); return; }
    var title = ed.title.trim();
    var subject = subjectFromTitle(title);
    var nice = E.courseName(subject);
    var fields = { subject: subject, title: nice ? subject : title, startMin: ed.start, endMin: ed.end, venue: ed.venue.trim() };
    if(ed.mode === 'edit'){
      ops = editOps(ed.row, who, fields, temporal, ed.note);
      label = 'Moved ' + esc(ed.row.item.title) + ' to ' + E.toHHMM(ed.start) + (fields.venue ? ' @ ' + esc(fields.venue) : '') + ' for ' + esc(whoLabel);
    } else {
      ops = addOps(who, fields, temporal, ed.note);
      label = 'Added ' + esc(nice || title) + ' ' + E.toHHMM(ed.start) + ' for ' + esc(whoLabel);
    }
  }
  state.ed = null;
  perform(label, ops).then(renderView);
}

document.getElementById('studentView').addEventListener('click', function(e){
  var b = e.target.closest('button');
  if(!b) return;
  var act = b.getAttribute('data-act');
  if(act === 'add'){ openEditor('add', null); return; }
  if(act === 'edit' || act === 'remove'){ openEditor(act, viewRows[b.getAttribute('data-row')]); return; }
  if(act === 'restore'){
    var r = viewRows[b.getAttribute('data-row')];
    var sc = compileScope(r.who);
    if(!canWriteScope(sc)){ toast('That covers students outside your branch.'); return; }
    perform('Restored ' + esc(r.item.title) + ' for ' + esc(scopeLabel(sc)), restoreOps(r, r.who)).then(renderView);
    return;
  }
  if(act === 'cancel'){ state.ed = null; renderView(); return; }
  if(act === 'save'){ save(); return; }
  if(b.hasAttribute('data-scope')){ state.ed.scopeChoice = b.getAttribute('data-scope'); renderView(); return; }
  if(b.hasAttribute('data-when')){ state.ed.when = b.getAttribute('data-when'); renderView(); return; }
  if(b.hasAttribute('data-room')){ state.ed.venue = b.getAttribute('data-room'); renderView(); return; }
});
document.querySelector('#screen-tt .daynav').addEventListener('click', function(e){
  var b = e.target.closest('[data-day]');
  if(!b) return;
  var v = b.getAttribute('data-day');
  state.iso = v === 'today' ? E.todayISO() : E.addDaysISO(state.iso, +v);
  state.ed = null;
  renderView();
});
// Tap the date for a month picker (build/monthpick.js), in place of the old native date input.
MonthPick.attach({ anchor: document.getElementById('dayDate'), getIso: function(){ return state.iso; },
  onPick: function(iso){ state.iso = iso; state.ed = null; renderView(); } });

/* ================= all changes ================= */
function canEditDoc(d){ var base = d.show || d.hide; return !!base && canWriteScope(base.scope); }
function renderChanges(){
  var box = document.getElementById('changesList');
  var list = overlay.filter(canEditDoc).sort(function(a, b){
    var ta = a.updatedAt && a.updatedAt.seconds || 0, tb = b.updatedAt && b.updatedAt.seconds || 0;
    return tb - ta;
  });
  if(!list.length){ box.innerHTML = '<div class="empty-hint">No live changes yet.</div>'; return; }
  box.innerHTML = list.map(function(d){
    var when = d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    return '<div class="change-row"><div class="change-sum">' + summarizeDoc(d) + '</div>' +
      '<div class="change-meta">by ' + esc(d.createdByName || d.createdBy || '?') + (when ? ' · ' + esc(when) : '') + (d.note ? ' · “' + esc(d.note) + '”' : '') + '</div>' +
      '<div class="change-actions"><button class="btn btn-sm" data-show="' + d.id + '">Show in timetable</button>' +
      '<button class="btn btn-sm btn-danger" data-del="' + d.id + '">Delete</button></div></div>';
  }).join('');
}
document.getElementById('changesList').addEventListener('click', function(e){
  var b = e.target.closest('button');
  if(!b) return;
  var id = b.getAttribute('data-show') || b.getAttribute('data-del');
  var d = overlay.find(function(x){ return x.id === id; });
  if(!d) return;
  if(b.hasAttribute('data-del')){ perform('Deleted: ' + summarizeDoc(d).replace(/<[^>]+>/g, ''), [opDelete(d)]); return; }
  var base = d.show || d.hide;
  var idxs = studentsOfScope(base.scope);
  if(me.branch && !me.isCreator) idxs = idxs.filter(function(i){ return E.ROSTER[i].branch === me.branch; });
  var tmpId = 'tmp:' + d.id;
  E.UNIT_BY_ID[tmpId] = { id: tmpId, idxs: idxs, mask: E.maskOf(idxs), size: idxs.length, label: scopeLabel(base.scope) };
  var t = base.temporal;
  if(t.type === 'date') state.iso = t.date;
  else if(t.type === 'week') state.iso = t.start;
  else if(t.type === 'recurring'){
    var iso = t.from && t.from > E.todayISO() ? t.from : E.todayISO();
    for(var k=0;k<7 && E.weekdayNameOf(iso) !== t.weekday;k++) iso = E.addDaysISO(iso, 1);
    state.iso = iso;
  }
  picker.set([{ op: 'add', id: tmpId }]);
  setTab('tt');
});

/* ================= tabs ================= */
function setTab(tab){
  state.tab = tab;
  Array.prototype.forEach.call(document.querySelectorAll('#tabs .tab'), function(b){ b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
  showScreen(tab === 'tt' ? 'screen-tt' : 'screen-changes');
  if(tab === 'changes') renderChanges(); else renderView();
}
document.getElementById('tabs').addEventListener('click', function(e){ var b = e.target.closest('.tab'); if(b) setTab(b.getAttribute('data-tab')); });
function showScreen(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.toggle('active', s.id === id); });
}

/* ================= datalists ================= */
(function(){
  document.getElementById('venueList').innerHTML = E.ALL_VENUES.map(function(v){ return '<option value="' + esc(v.name) + '">'; }).join('');
  var subs = {};
  Object.keys(DATA.courseNames || {}).forEach(function(c){ subs[c] = c + ' — ' + DATA.courseNames[c]; });
  Object.keys(DATA.timetable).forEach(function(wd){ DATA.timetable[wd].forEach(function(e){ if(!subs[e.subject]) subs[e.subject] = e.subject + (E.courseName(e.subject) ? ' — ' + E.courseName(e.subject) : ''); }); });
  document.getElementById('subjectList').innerHTML = Object.keys(subs).sort().map(function(c){ return '<option value="' + esc(subs[c]) + '">'; }).join('');
})();

/* ================= auth ================= */
var provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: 'iitrpr.ac.in' });
document.getElementById('googleBtn').addEventListener('click', function(){
  document.getElementById('signinErr').textContent = '';
  signInWithPopup(auth, provider).catch(function(err){
    document.getElementById('signinErr').textContent = 'Sign-in failed: ' + (err && err.message ? err.message : err);
  });
});
document.getElementById('deniedSignOutBtn').addEventListener('click', function(){ signOut(auth); });
document.getElementById('signOutBtn').addEventListener('click', function(){ signOut(auth); });

// Local preview only (python http.server on localhost): ?preview=ENTRY opens the UI as that BR
// without Google sign-in, to try the view and editor. Firestore still rejects every write from an
// unauthenticated page (see firestore.rules), so nothing can reach live data this way.
var PREVIEW_ENTRY = (function(){
  if(!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return null;
  var p = new URLSearchParams(location.search).get('preview');
  return p ? p.toUpperCase() : null;
})();
onAuthStateChanged(auth, function(user){
  if(!user && PREVIEW_ENTRY) user = { email: PREVIEW_ENTRY + '@iitrpr.ac.in' };
  var signedIn = !!user;
  ['tabs', 'historyBtns', 'meBadge', 'signOutBtn'].forEach(function(id){ document.getElementById(id).style.display = 'none'; });
  if(!signedIn){ me = null; showScreen('screen-signin'); return; }
  var entry = (user.email || '').split('@')[0].toUpperCase();
  var isCreator = entry === CREATOR_ENTRY;
  if(!isCreator && !BR_BRANCH[entry]){
    document.getElementById('deniedText').textContent = entry + ' isn’t on the Branch Rep list yet. If that’s wrong, ask the creator to add you.';
    showScreen('screen-denied');
    document.getElementById('signOutBtn').style.display = '';
    return;
  }
  var roster = DATA.roster[entry];
  me = { entry: entry, name: roster ? E.titleCase(roster.name) : entry, isCreator: isCreator, branch: isCreator ? null : BR_BRANCH[entry] };
  document.getElementById('tabs').style.display = '';
  document.getElementById('historyBtns').style.display = '';
  document.getElementById('signOutBtn').style.display = '';
  var badge = document.getElementById('meBadge');
  badge.style.display = '';
  badge.textContent = (isCreator ? '👑 ' : '⭐ ' + E.bshort(me.branch) + ' BR · ') + me.name.split(' ')[0];
  if(!picker){
    var universe = isCreator ? null : E.UNIT_BY_ID['br:' + me.branch].idxs;
    document.getElementById('pickerSub').textContent = isCreator
      ? 'Tap a kind of student — a division, a group, a lab batch, an HS section — or combine them.'
      : 'Your branch (' + E.bshort(me.branch) + '). Tap a group, a lab batch, an HS section — or combine them. To change something for the whole batch, pick “the whole batch” when saving.';
    var myGroup = roster ? (isCreator ? 'grp:' + roster.academicGroup : (E.UNIT_BY_ID['bg:' + roster.branch + '·' + roster.academicGroup] ? 'bg:' + roster.branch + '·' + roster.academicGroup : 'grp:' + roster.academicGroup)) : null;
    picker = PICKER.mount(document.getElementById('picker'), {
      universe: universe,
      initial: myGroup ? [{ op: 'add', id: myGroup }] : [],
      onChange: function(sel){ state.sel = sel; state.ed = null; renderView(); }
    });
    state.sel = picker.get();
  }
  paintHistory();
  setTab(state.tab);
});
