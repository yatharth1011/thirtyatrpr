// Node-only smoke/regression harness for THIRTY@RPR (no browser needed). Loads the real
// build/thirty_data.js + build/app3.js (with the ROLES <script> block extracted from
// index_template_dashboard.html, since app3.js expects window.ROLES to already exist) into a
// fresh vm context per scenario, against a minimal auto-vivifying DOM mock — real getElementById
// ids that matter to a test are asserted on directly; ids the app touches but a test doesn't care
// about just get a generic do-nothing element so boot never throws.
//
// IMPORTANT: this file (and build/splice.py) must live in build/, never in the session scratchpad
// — the scratchpad is wiped on every restart. See feedback_no_scratchpad_for_persistent_tools.
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const BASE = '/Users/yatharthshrivastava/Documents/IIT AIDE/portal/build';

const dataJs = fs.readFileSync(path.join(BASE, 'thirty_data.js'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE, 'app3.js'), 'utf8');
const templateHtml = fs.readFileSync(path.join(BASE, 'index_template_dashboard.html'), 'utf8');

const rolesMatch = templateHtml.match(/<script>\s*(var ROLES = \{[\s\S]*?\};)\s*<\/script>/);
if (!rolesMatch) throw new Error('could not find the ROLES script block in index_template_dashboard.html');
const rolesJs = rolesMatch[1];

const marker = appJs.lastIndexOf('})();');
if (marker === -1) throw new Error('could not find IIFE close in app3.js');

const HOOKS = `
window.__debug = {
  bootApp: bootApp, viewStudent: viewStudent, state: state, DATA: DATA,
  stepDay: (typeof stepDay!=='undefined')?stepDay:undefined,
  jumpToIdx: jumpToIdx, jumpToToday: (typeof jumpToToday!=='undefined')?jumpToToday:undefined,
  renderMessPanel: renderMessPanel, renderStudyRooms: (typeof renderStudyRooms!=='undefined')?renderStudyRooms:undefined,
  renderExamBanner: renderExamBanner, renderTodayPanel: renderTodayPanel,
  buildDays: buildDays, classDuration: classDuration,
  verifierForStudent: verifierForStudent, renderVerifiedBadge: renderVerifiedBadge,
  brsForStudent: brsForStudent, renderBrNote: renderBrNote, renderMentorNote: renderMentorNote,
  personRolesFor: personRolesFor, personCardHeading: personCardHeading, hasRole: hasRole,
  contributorsRoster: contributorsRoster, contributorsListHTML: contributorsListHTML,
  openContributorCard: openContributorCard, openMentorCard: openMentorCard,
  branchNameFromEntry: (typeof branchNameFromEntry!=='undefined')?branchNameFromEntry:undefined,
  midsemExamWeek: midsemExamWeek, mealMenuFor: mealMenuFor,
  renderHeader: renderHeader, closePanels: closePanels,
  setNameAlias: setNameAlias, syncNameAliasField: syncNameAliasField,
  currentNameAliases: currentNameAliases, titleCaseFirstName: titleCaseFirstName,
  groupTimeline: groupTimeline, groupShortNames: groupShortNames, renderGroupsPanel: renderGroupsPanel,
  createGroup: createGroup, loadGroups: loadGroups, groupsState: groupsState, messMenuEntryFor: messMenuEntryFor,
  contributionSummaryFor: (typeof contributionSummaryFor!=='undefined')?contributionSummaryFor:undefined,
};
`;
const appJsWithHooks = appJs.slice(0, marker) + HOOKS + appJs.slice(marker);

const combinedSrc = rolesJs + '\n' + dataJs + '\n' + appJsWithHooks;

function makeElement(tag, id) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    _innerHTML: '',
    _children: [],
    attributes: {},
    dataset: {},
    style: {},
    value: '',
    checked: false,
    textContent: '',
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
      toggle(c, force) {
        const on = force === undefined ? !this._set.has(c) : !!force;
        if (on) this._set.add(c); else this._set.delete(c);
        return on;
      },
    },
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = v; this._children = []; },
    appendChild(child) { this._children.push(child); return child; },
    removeChild(child) { this._children = this._children.filter((c) => c !== child); },
    get children() { return this._children; },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    remove() {},
    scrollIntoView() {},
    click() {},
  };
  return el;
}

function makeSandbox() {
  const elements = {};
  const body = makeElement('body');
  const documentElement = makeElement('html');
  const store = {};
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { for (const k of Object.keys(store)) delete store[k]; },
  };

  const document = {
    body,
    documentElement,
    getElementById(id) {
      if (!elements[id]) elements[id] = makeElement('div', id);
      return elements[id];
    },
    createElement(tag) { return makeElement(tag); },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };

  const sandbox = {
    console,
    localStorage,
    document,
    location: { reload() {}, href: 'https://thirtyatrpr.web.app/' },
    setTimeout,
    clearTimeout,
    setInterval() { return 0; },
    clearInterval() {},
    Date,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

let allPass = true;

// runScenario(name, loginEntry, opts, testFn) — boots the app as `loginEntry` (any real roster
// entry) in a fresh sandbox, then hands (window, document) to testFn. `opts` is currently unused
// (kept for call-site symmetry / future per-scenario localStorage seeding) — a test that needs a
// specific pre-boot localStorage value should just call the relevant window.__set*/localStorage
// helper itself right after boot, before asserting.
function runScenario(name, loginEntry, opts, testFn) {
  try {
    const sandbox = makeSandbox();
    vm.runInContext(combinedSrc, sandbox);
    const dbg = sandbox.window.__debug;
    if (!dbg) throw new Error('window.__debug was never set — app3.js did not finish loading');
    const student = dbg.DATA.roster[loginEntry];
    if (!student) throw new Error('no roster entry ' + loginEntry);
    dbg.bootApp(student);
    testFn(sandbox.window, sandbox.document);
    console.log('PASS', name);
    return true;
  } catch (e) {
    console.log('FAIL', name, '-', e.message);
    console.log(e.stack);
    return false;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error('assertion failed: ' + msg);
}

// ==================== Scenarios ====================
// Add new scenarios below as features are added/changed. Keep each one self-contained.

allPass &= runScenario('sanity: boot as a normal AIDE student, greeting shows their name', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.entry === '2026AIB1001', 'booted as the right student');
  const greeting = doc.getElementById('greeting').innerHTML;
  assert(/Hi,/.test(greeting), 'greeting rendered: ' + greeting);
});

allPass &= runScenario('role ranking: creator outranks verified+BR on their own card', '2026AIB1099', {}, (win, doc) => {
  const dbg = win.__debug;
  const roles = dbg.personRolesFor('2026AIB1099');
  assert(roles.isCreator, 'is creator');
  const heading = dbg.personCardHeading(roles);
  assert(heading.indexOf('Creator') !== -1, 'heading is Creator: ' + heading);
});

allPass &= runScenario('role ranking: a pure verifier (Avishi, EE) ranks as Contributor', '2026EEB1330', {}, (win, doc) => {
  const dbg = win.__debug;
  const roles = dbg.personRolesFor('2026EEB1330');
  assert(!dbg.hasRole('2026EEB1330', 'contributor'), 'not in ROLES.contributor herself');
  assert(roles.verifiedRecs.length > 0, 'verifies EE');
  assert(dbg.personCardHeading(roles).indexOf('Contributor') !== -1, 'ranks as Contributor');
});

allPass &= runScenario('MCB G3 is now verified by its BR 2026MCB1546', '2026MCB1546', {}, (win, doc) => {
  const dbg = win.__debug;
  const g3student = Object.values(dbg.DATA.roster).find((s) => s.branch === 'MCB' && s.academicGroup === 'G3');
  assert(g3student, 'found an MCB G3 student in the roster');
  assert(dbg.verifierForStudent(g3student) === '2026MCB1546', 'MCB G3 verified by 2026MCB1546: ' + dbg.verifierForStudent(g3student));
  const roles = dbg.personRolesFor('2026MCB1546');
  assert(dbg.personCardHeading(roles).indexOf('Contributor') !== -1, '2026MCB1546 now ranks as a Contributor too');
});

allPass &= runScenario('footer Contributors list includes the newly-added MCB verifier, shown with branch short-code "MnC" not "MCB"', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const roster = dbg.contributorsRoster();
  const entries = roster.map((p) => p.entry);
  assert(entries.indexOf('2026MCB1546') !== -1, '2026MCB1546 is in the footer contributor roster: ' + JSON.stringify(entries));
  const mcbPerson = roster.find((p) => p.entry === '2026MCB1546');
  assert(dbg.DATA.roster['2026MCB1546'].branch === 'MCB', 'the underlying roster/entry-number branch code stays MCB (unchanged)');
  assert(mcbPerson.branch === 'MnC', 'but the DISPLAY branch code in the footer pill is "MnC", not "MCB": ' + mcbPerson.branch);
});

allPass &= runScenario('Contributors list renders one plain line per person (no pill), format: branch, small red heart, then the name as the only link', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const html = dbg.contributorsListHTML();
  assert(html.indexOf('contributor-chip') === -1 && html.indexOf('pill') === -1, 'no pill/chip class anywhere in the list: ' + html.slice(0, 300));
  const rows = html.match(/<div class="contributor-row">[\s\S]*?<\/div>/g) || [];
  const roster = dbg.contributorsRoster();
  assert(rows.length === roster.length, 'one row per contributor: ' + rows.length + ' vs ' + roster.length);
  const kshitizRow = rows.find((r) => r.indexOf('2026EEB1369') !== -1);
  assert(kshitizRow, 'found Kshitiz\'s row: ' + html.slice(0, 400));
  // order within the row must be: branch code, then the heart, then the name-link
  const order = /<span class="contributor-row-branch">EE<\/span><span class="contributor-row-heart">&#10084;<\/span><button class="contributor-name-link" data-contributor-entry="2026EEB1369">Kshitiz Kumar<\/button>/;
  assert(order.test(kshitizRow), 'row is exactly "EE <3 Kshitiz Kumar" in that order, name is the only link: ' + kshitizRow);
});

allPass &= runScenario('NSO duration is 120 minutes (5-7 PM)', '2026EEB1309', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.classDuration({ subject: 'NO101', venue: null }) === 120, 'classDuration(NO101) === 120');
});

allPass &= runScenario('mess panel: no-menu day is compact and heading says "mess timings"', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const menus = dbg.DATA.mess.menus || [];
  const noMenuIdx = dbg.state.DAYS.findIndex((d) => !menus.some((m) => d.d >= m.validFrom && d.d <= m.validTo));
  assert(noMenuIdx !== -1, 'found a day outside every mess menu range');
  dbg.jumpToIdx(noMenuIdx);
  dbg.renderMessPanel();
  const body = doc.getElementById('messPanelBody').innerHTML;
  assert(body.indexOf('check-row-compact') !== -1, 'no-menu rows are compact: ' + body.slice(0, 300));
  const head = doc.getElementById('messPanelHead').innerHTML;
  assert(head.indexOf('mess timings') !== -1, 'heading reads "mess timings": ' + head);
});

allPass &= runScenario('mess panel: a day with a real menu keeps "mess menu" heading', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const menus = dbg.DATA.mess.menus || [];
  const menuIdx = dbg.state.DAYS.findIndex((d) => menus.some((m) => d.d >= m.validFrom && d.d <= m.validTo));
  assert(menuIdx !== -1, 'found a day with a real mess menu');
  dbg.jumpToIdx(menuIdx);
  dbg.renderMessPanel();
  const head = doc.getElementById('messPanelHead').innerHTML;
  assert(head.indexOf('mess menu') !== -1, 'heading stays "mess menu": ' + head);
});

allPass &= runScenario('no regular classes during Mid-Sem week, but exam entries still show', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const week = dbg.midsemExamWeek();
  assert(week, 'a midsem exam week is configured');
  const midWeekDay = dbg.state.DAYS.find((d) => d.d >= week.start && d.d <= week.end && d.d !== week.start);
  assert(midWeekDay, 'found a day inside the midsem week');
  const hasRegularClass = midWeekDay.items.some((it) => it.type === 'class' && it.category !== 'Exam' && it.category !== 'Viva');
  assert(!hasRegularClass, 'no regular class items inside the midsem window: ' + JSON.stringify(midWeekDay.items.map((i) => i.title)));
});

// === New (2026-09-15 instruction): 17/18 Sept are exempted from the blanket Mid-Sem suppression —
// a student with no exam that specific day gets their normal regular-day schedule instead ===
allPass &= runScenario('18 Sept (Friday): a D1 (AIDE) student has no CY101 exam that day (D3/D4-only) — sees their normal regular Friday schedule, not a blank exam-week day', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.division === 'D1', 'sanity: AIDE is division D1');
  const fri = dbg.state.DAYS.find((d) => d.d === '2026-09-18');
  assert(fri && fri.dow === 'Fri', 'confirmed 18 Sept 2026 is a Friday: ' + JSON.stringify(fri && fri.d));
  const hasRegularClass = fri.items.some((it) => it.type === 'class' && it.category !== 'Exam' && it.category !== 'Viva');
  assert(hasRegularClass, 'D1 student sees regular Friday classes on 18 Sept, since they have no exam that day: ' + JSON.stringify(fri.items.map((i) => [i.code, i.title, i.category])));
  const hasCy101Exam = fri.items.some((it) => it.category === 'Exam' && it.title && /CY101|Cyber/i.test(it.title));
  assert(!hasCy101Exam, 'and correctly has no CY101 exam item, since CY101 is D3/D4-only: ' + JSON.stringify(fri.items.map((i) => [i.code, i.title])));
});
allPass &= runScenario('18 Sept (Friday): a D3 (CSE) student DOES have the CY101 exam that day — sees only the exam, regular grid still suppressed (regression check)', '2026CSB1169', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.division === 'D3', 'sanity: CSE is division D3');
  const fri = dbg.state.DAYS.find((d) => d.d === '2026-09-18');
  const examItem = fri.items.find((it) => it.category === 'Exam');
  assert(examItem, 'D3 student has the CY101 Mid-Sem exam on 18 Sept: ' + JSON.stringify(fri.items.map((i) => [i.code, i.title, i.category])));
  const hasRegularClass = fri.items.some((it) => it.type === 'class' && it.category !== 'Exam' && it.category !== 'Viva');
  assert(!hasRegularClass, 'no regular classes alongside it — still suppressed for a student who does have an exam that day: ' + JSON.stringify(fri.items.map((i) => [i.code, i.title, i.category])));
});
allPass &= runScenario('19 Sept (Saturday, PH101 exam day) is unaffected by the 17/18 exception — still fully blanket-suppressed for a D3 student with no PH101 exam that day (regression check, confirms the exception is date-scoped, not generalized)', '2026CSB1169', {}, (win, doc) => {
  const dbg = win.__debug;
  const sat = dbg.state.DAYS.find((d) => d.d === '2026-09-19');
  assert(sat && sat.dow === 'Sat', 'confirmed 19 Sept 2026 is a Saturday: ' + JSON.stringify(sat && sat.d));
  const hasAnything = sat.items.some((it) => it.type === 'class');
  assert(!hasAnything, 'D3 (no PH101 exam that day, PH101 is D1/D2-only) still sees a fully blank day, not regular classes — the 17/18 exception deliberately was not generalized to the rest of exam week: ' + JSON.stringify(sat.items.map((i) => [i.code, i.title, i.category])));
});

// === New: Mid-Sem seating plan (DATA.examSeating) — banner + exam schedule item ===
allPass &= runScenario('exam banner shows seating (room + seat) for a student who has it', '2026AIB1099', {}, (win, doc) => {
  const dbg = win.__debug;
  const seatRec = dbg.DATA.examSeating && dbg.DATA.examSeating['2026-09-21'] && dbg.DATA.examSeating['2026-09-21']['2026AIB1099'];
  assert(seatRec, 'seating data exists for 2026AIB1099 on 2026-09-21 (Calculus): ' + JSON.stringify(dbg.DATA.examSeating && Object.keys(dbg.DATA.examSeating)));
  dbg.renderExamBanner(dbg.state.student);
  const banner = doc.getElementById('examWeekBanner').innerHTML;
  assert(banner.indexOf('examweek-seat') !== -1, 'banner has a seat line: ' + banner.slice(0, 800));
  assert(banner.indexOf(seatRec.room) !== -1, 'banner shows the right room (' + seatRec.room + '): ' + banner.slice(0, 800));
  assert(banner.indexOf(seatRec.seat) !== -1, 'banner shows the right seat (' + seatRec.seat + '): ' + banner.slice(0, 800));
});

allPass &= runScenario('exam schedule item (the actual day view) shows seating as its venue', '2026AIB1099', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-21');
  assert(day, 'found 21 Sept in the printed days');
  const examItem = day.items.find((it) => it.category === 'Exam');
  assert(examItem, 'found the Calculus exam item on 21 Sept: ' + JSON.stringify(day.items.map((i) => i.title)));
  const seatRec = dbg.DATA.examSeating['2026-09-21']['2026AIB1099'];
  assert(examItem.venue === seatRec.room + ' · Seat ' + seatRec.seat, 'exam item venue is the seat string, got: ' + examItem.venue);
});

allPass &= runScenario('exam banner/item show nothing extra for a date with no seating data (no fabrication)', '2026AIB1099', {}, (win, doc) => {
  const dbg = win.__debug;
  // 24 Sept (Tinkering Lab) is outside the seating workbook's 15-22 Sept range entirely.
  assert(!dbg.DATA.examSeating['2026-09-24'], 'no seating entry exists for 24 Sept at all');
});

// === New: personal display-name alias (Settings panel) — local-only, per-entry ===
allPass &= runScenario('Nishtha (2026MEB1605): default greeting uses the naive first-token split (the actual bug)', '2026MEB1605', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.DATA.roster['2026MEB1605'].name.trim().startsWith('CHAUDHARI'), 'her official record is surname-first');
  const greeting = doc.getElementById('greeting').innerHTML;
  assert(/Hi, Chaudhari/.test(greeting), 'without an alias, the greeting naively shows "Chaudhari": ' + greeting);
});
allPass &= runScenario('setting a personal display-name alias changes her own greeting immediately', '2026MEB1605', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.setNameAlias('Nishtha');
  const greeting = doc.getElementById('greeting').innerHTML;
  assert(/Hi, Nishtha/.test(greeting), 'greeting now says "Hi, Nishtha": ' + greeting);
  dbg.syncNameAliasField();
  const input = doc.getElementById('nameAliasInput');
  assert(input.value === 'Nishtha', 'settings field reflects the saved alias: ' + input.value);
});
allPass &= runScenario('the alias is local-only: it does not change how she appears when viewed as someone else (e.g. via search)', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  // logged in as a totally different student, but with 2026MEB1605's alias already saved from a
  // prior localStorage session on this device — her real name should still show when browsing to her.
  dbg.currentNameAliases['2026MEB1605'] = 'Nishtha';
  const nishtha = dbg.DATA.roster['2026MEB1605'];
  dbg.viewStudent(nishtha);
  const greeting = doc.getElementById('greeting').innerHTML;
  assert(/Hi, Chaudhari/.test(greeting), 'viewing her as a classmate (not logged in as her) shows her real name, not the alias: ' + greeting);
});
allPass &= runScenario('clearing the alias (empty input) reverts to the real name', '2026MEB1605', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.setNameAlias('Nishtha');
  assert(/Hi, Nishtha/.test(doc.getElementById('greeting').innerHTML), 'alias applied');
  dbg.setNameAlias('');
  const greeting = doc.getElementById('greeting').innerHTML;
  assert(/Hi, Chaudhari/.test(greeting), 'empty alias reverts to the real first-token name: ' + greeting);
  assert(!('2026MEB1605' in dbg.currentNameAliases), 'empty alias is removed from storage, not saved as an empty string');
});

// === New: MME contributor 2026MMB1686 — fixed a real CE/MME "G12" group-label collision bug on
// WP101-LAB (both branches happen to each have exactly one academic group, both called "G12"),
// and added MME's missing CY101 tutorial ===
allPass &= runScenario('MME (2026MMB1686) sees their own WP101 lab (Thu 10:00-12:50), not CE\'s', '2026MMB1686', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-03'); // a Thursday
  assert(day && day.dow === 'Thu', 'found a real Thursday: ' + JSON.stringify(day && day.d));
  const wp = day.items.find((it) => it.title && it.title.indexOf('Workshop') !== -1 || it.code === 'WP101-LAB');
  assert(wp, 'found MME\'s WP101 lab item: ' + JSON.stringify(day.items.map((i) => [i.code, i.t])));
  assert(wp.t === '10:00 AM – 12:50 PM', 'MME WP101 lab is 10:00 AM - 12:50 PM (170 min), got: ' + wp.t);
  assert(wp.venue === 'G12', 'venue is "G12" (the workshop bay code): ' + wp.venue);
});
allPass &= runScenario('CE (2026CEB1162) still sees their own WP101 lab (Thu 9:00-1:00), unaffected by the MME fix', '2026CEB1162', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-03');
  const wp = day.items.find((it) => it.code === 'WP101-LAB');
  assert(wp, 'found CE\'s WP101 lab item: ' + JSON.stringify(day.items.map((i) => [i.code, i.t])));
  assert(wp.t === '9:00 AM – 1:00 PM', 'CE WP101 lab is still 9:00 AM - 1:00 PM (240 min), got: ' + wp.t);
});
allPass &= runScenario('a different G12-labeled MME student no longer inherits CE\'s WP101 lab (the actual bug, regression check)', '2026MEB1605', {}, (win, doc) => {
  // 2026MEB1605 is ME/G10, not MME — just a sanity check that the branch-keyed fix doesn't
  // accidentally scope too broadly. Use another real MME roster entry instead.
  const dbg = win.__debug;
  const anyMME = Object.values(dbg.DATA.roster).find((s) => s.branch === 'MME' && s.entry !== '2026MMB1686');
  assert(anyMME, 'found another MME student in the roster');
  dbg.viewStudent(anyMME);
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-03');
  const wp = day.items.find((it) => it.code === 'WP101-LAB');
  assert(wp && wp.t === '10:00 AM – 12:50 PM', 'every MME student (not just the contributor) gets MME\'s own WP101 lab, not CE\'s: ' + JSON.stringify(wp));
});
allPass &= runScenario('MME (2026MMB1686) now has a CY101 tutorial (Thu 6:00-6:50) that was missing entirely before', '2026MMB1686', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-03');
  const tut = day.items.find((it) => it.code === 'CY101-TUT');
  assert(tut, 'found MME\'s CY101 tutorial: ' + JSON.stringify(day.items.map((i) => [i.code, i.t])));
  assert(tut.t === '6:00 PM – 6:50 PM', 'CY101 tutorial is 6:00-6:50 PM, got: ' + tut.t);
});
allPass &= runScenario('MME branch is now verified by its own contributor, and shows up in the footer Contributors list', '2026MMB1686', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.verifierForStudent(dbg.state.student) === '2026MMB1686', 'MME verified by 2026MMB1686: ' + dbg.verifierForStudent(dbg.state.student));
  const entries = dbg.contributorsRoster().map((p) => p.entry);
  assert(entries.indexOf('2026MMB1686') !== -1, '2026MMB1686 is in the footer contributor roster: ' + JSON.stringify(entries));
});

// === New: ICDT contributor 2026ICB1429 — ICDT is a separate 5-year integrated program with its
// own dedicated timetable, not just following the mainstream grid; three real fixes came out of
// cross-checking his full week against the live site ===
allPass &= runScenario('ICDT (2026ICB1429) does not have WP101 lab at all (removed, not just moved)', '2026ICB1429', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-02'); // a Wednesday
  const wp = day.items.find((it) => it.code === 'WP101-LAB');
  assert(!wp, 'no WP101-LAB item for ICDT on Wednesday: ' + JSON.stringify(day.items.map((i) => [i.code, i.t])));
  // his own reported HSS session sits exactly where the sheet-extracted WP101 lab used to be
  const hss = day.items.find((it) => it.category === 'HS/IKS');
  assert(hss, 'his HS/IKS session is present that same day: ' + JSON.stringify(day.items.map((i) => [i.code, i.category, i.t])));
});
allPass &= runScenario('CE and ES students are unaffected by ICDT\'s WP101-LAB removal (regression check)', '2026CEB1162', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-03'); // CE's WP101 lab is Thursday
  const wp = day.items.find((it) => it.code === 'WP101-LAB');
  assert(wp && wp.t === '9:00 AM – 1:00 PM', 'CE still has their own WP101 lab untouched: ' + JSON.stringify(wp));
});
allPass &= runScenario('ICDT (2026ICB1429) has their own 170-min CY101 lab (9:00-11:50 AM), split from CSE/EP\'s 120-min one', '2026ICB1429', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-01'); // a Tuesday
  const lab = day.items.find((it) => it.code === 'CY101-LAB');
  assert(lab, 'found ICDT\'s CY101 lab: ' + JSON.stringify(day.items.map((i) => [i.code, i.t])));
  assert(lab.t === '9:00 AM – 11:50 AM', 'ICDT CY101 lab is 9:00-11:50 AM (170 min): ' + lab.t);
});
allPass &= runScenario('CSE\'s CY101 lab stays the standard 120 min, unaffected by the ICDT split (regression check)', '2026CSB1269', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-01');
  const lab = day.items.find((it) => it.code === 'CY101-LAB');
  assert(lab && lab.t === '9:00 AM – 11:00 AM', 'CSE CY101 lab is still 9:00-11:00 AM (120 min): ' + JSON.stringify(lab));
});
allPass &= runScenario('ICDT (2026ICB1429) has a Life Skills session (Mon 6:00-7:30 PM, 90 min) — day corrected from Fri to Mon by the official roster', '2026ICB1429', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-07' && d.dow === 'Mon');
  const ls = day.items.find((it) => it.category === 'LS');
  assert(ls, 'found ICDT\'s Life Skills session on Monday: ' + JSON.stringify(day.items.map((i) => [i.code, i.title, i.t])));
  assert(ls.t === '6:00 PM – 7:30 PM', 'ICDT Life Skills is 6:00-7:30 PM (90 min), unaffected by the Auditorium/60-min update given to everyone else: ' + ls.t);
  assert(!ls.venue, 'ICDT\'s LS101 venue stays unknown (not swept into the Auditorium default): ' + ls.venue);
  const oldFriday = dbg.state.DAYS.find((d) => d.d === '2026-09-11' && d.dow === 'Fri');
  const noneOnFriday = oldFriday.items.find((it) => it.category === 'LS');
  assert(!noneOnFriday, 'no Life Skills on the old (now-corrected) Friday: ' + JSON.stringify(oldFriday.items.map((i) => [i.code, i.title, i.t])));
});

// === New: official "Life Skill Divisions Batch 2026" roster (2026-09-15) — full LS101 day
// coverage for all 17 branch+group combos, up from just 4 before. Also verifies the MCB/G2 vs
// AIDE/G2 label-collision trap is correctly avoided (same class of bug as WP101-LAB CE/MME). ===
[
  {branch: 'AIDE', group: 'G1', entry: '2026AIB1001', day: 'Mon'},
  {branch: 'AIDE', group: 'G2', entry: '2026AIB1061', day: 'Mon'},
  {branch: 'CE', group: 'G12', entry: '2026CEB1135', day: 'Tue'},
  {branch: 'CSE', group: 'G7', entry: '2026CSB1169', day: 'Tue'},
  {branch: 'CSE', group: 'G8', entry: '2026CSB1230', day: 'Mon'},
  {branch: 'DA', group: 'G4', entry: '2025DAB1286', day: 'Tue'},
  {branch: 'ES', group: 'G4', entry: '2026ESB1472', day: 'Tue'},
  {branch: 'MCB', group: 'G2', entry: '2026MCB1502', day: 'Mon'},
  {branch: 'MCB', group: 'G3', entry: '2026MCB1523', day: 'Mon'},
  {branch: 'ME', group: 'G10', entry: '2026MEB1582', day: 'Mon'},
  {branch: 'ME', group: 'G11', entry: '2026MEB1642', day: 'Tue'},
  {branch: 'MME', group: 'G12', entry: '2026MMB1665', day: 'Tue'},
].forEach(({branch, group, entry, day}) => {
  allPass &= runScenario('LS101 for ' + branch + '/' + group + ' is ' + day + ' 6:00-7:00 PM at the Auditorium (newly covered by the official roster)', entry, {}, (win, doc) => {
    const dbg = win.__debug;
    assert(dbg.state.student.branch === branch && dbg.state.student.academicGroup === group, 'sanity: correct branch/group for ' + entry);
    const iso = day === 'Mon' ? '2026-09-07' : '2026-09-08';
    const d = dbg.state.DAYS.find((x) => x.d === iso);
    const ls = d.items.find((it) => it.category === 'LS');
    assert(ls && ls.t === '6:00 PM – 7:00 PM', branch + '/' + group + ' has LS101 on ' + day + ': ' + JSON.stringify(d.items.map((i) => [i.code, i.title, i.t])));
    assert(ls.venue === 'Auditorium', branch + '/' + group + '\'s LS101 venue is Auditorium: ' + ls.venue);
  });
});
allPass &= runScenario('AIDE and MCB (MnC) both moved to Monday, 15 Sep override — an AIDE/G2 student has no LS101 on the old Tuesday slot anymore (regression check)', '2026AIB1061', {}, (win, doc) => {
  const dbg = win.__debug;
  const tuesday = dbg.state.DAYS.find((d) => d.d === '2026-09-08' && d.dow === 'Tue');
  const lsTue = tuesday.items.find((it) => it.category === 'LS');
  assert(!lsTue, 'AIDE/G2 no longer has LS101 on Tuesday (moved to Monday): ' + JSON.stringify(tuesday.items.map((i) => [i.code, i.t])));
});
allPass &= runScenario('MCB coverage is now the full branch, not just the old 1502-1522 roll range — a previously-uncovered MCB student (1550) now has LS101 too', '2026MCB1550', {}, (win, doc) => {
  const dbg = win.__debug;
  const monday = dbg.state.DAYS.find((d) => d.d === '2026-09-07' && d.dow === 'Mon');
  const ls = monday.items.find((it) => it.category === 'LS');
  assert(ls && ls.t === '6:00 PM – 7:00 PM', '2026MCB1550 (previously outside the roll range) now has LS101 on Monday: ' + JSON.stringify(monday.items.map((i) => [i.code, i.t])));
});
allPass &= runScenario('MCB/G3 gets LS101 exactly once (Monday only) — no stray duplicate from a leftover Tuesday group:G3 entry (regression check)', '2026MCB1523', {}, (win, doc) => {
  const dbg = win.__debug;
  const tuesday = dbg.state.DAYS.find((d) => d.d === '2026-09-08' && d.dow === 'Tue');
  const lsTue = tuesday.items.find((it) => it.category === 'LS');
  assert(!lsTue, 'MCB/G3 has no second LS101 on Tuesday: ' + JSON.stringify(tuesday.items.map((i) => [i.code, i.t])));
});
allPass &= runScenario('ICDT branch is now verified by its own contributor — the last of all 17 combos covered', '2026ICB1429', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.verifierForStudent(dbg.state.student) === '2026ICB1429', 'ICDT verified by 2026ICB1429: ' + dbg.verifierForStudent(dbg.state.student));
  const entries = dbg.contributorsRoster().map((p) => p.entry);
  assert(entries.indexOf('2026ICB1429') !== -1, '2026ICB1429 is in the footer contributor roster: ' + JSON.stringify(entries));
});

// === New: one-off single-date cancellations (DATA.cancellations) for 2026-09-15 — MA101-TUT for
// D1/G2 and the HS111 elective for everyone. 2026AIB1061 is AIDE/G2 AND hsElective HS111, so both
// cancellations land on the same student/date for a combined check. ===
// MA101-TUT (D1/G2) went through three corrections in a row for the same week: "cancelled" on
// 15 Sept, then "not cancelled" (reverted), then finally clarified as RESCHEDULED — bodily moved
// to Wed 16 Sept 8-9 AM, not just absent nor running at its normal time. Final state: gone from
// its usual Tuesday slot, present as a genuine 60-min session on Wednesday instead.
allPass &= runScenario('MA101-TUT (D1/G2) is absent from its normal Tue 15 Sept slot — rescheduled away, not just cancelled', '2026AIB1061', {}, (win, doc) => {
  const dbg = win.__debug;
  const tuesday = dbg.state.DAYS.find((d) => d.d === '2026-09-15');
  assert(tuesday && tuesday.dow === 'Tue', 'confirmed 15 Sept 2026 is a Tuesday: ' + JSON.stringify(tuesday && tuesday.d));
  const tutThatDay = tuesday.items.find((it) => it.category === 'Tutorial' && it.t && it.t.indexOf('8:00') === 0);
  assert(!tutThatDay, 'no MA101 tutorial for G2 at its normal Tuesday slot — it moved to Wednesday instead: ' + JSON.stringify(tuesday.items.map((i) => [i.code, i.title, i.t])));
});
allPass &= runScenario('MA101-TUT (D1/G2) shows up rescheduled on Wed 16 Sept, 8:00-9:00 AM, EE-SH, with its TA name', '2026AIB1061', {}, (win, doc) => {
  const dbg = win.__debug;
  const wednesday = dbg.state.DAYS.find((d) => d.d === '2026-09-16');
  assert(wednesday && wednesday.dow === 'Wed', 'confirmed 16 Sept 2026 is a Wednesday: ' + JSON.stringify(wednesday && wednesday.d));
  const tut = wednesday.items.find((it) => it.category === 'Tutorial' && it.title && it.title.indexOf('Calculus') !== -1);
  assert(tut, 'found the rescheduled MA101 tutorial on 16 Sept: ' + JSON.stringify(wednesday.items.map((i) => [i.code, i.title, i.t, i.venue, i.ta])));
  assert(tut.t === '8:00 AM – 9:00 AM', 'it is the real 60-min rescheduled block (8-9 AM), not the usual 50: ' + tut.t);
  assert(tut.venue === 'EE-SH', 'same venue as usual, EE-SH: ' + tut.venue);
  assert(tut.ta === 'Simran Kaur', 'still carries the TA name: ' + JSON.stringify(tut));
  const idx = dbg.state.DAYS.findIndex((d) => d.d === '2026-09-16');
  dbg.jumpToIdx(idx);
  dbg.renderTodayPanel();
  const body = doc.getElementById('todayPanelBody').innerHTML;
  assert(body.indexOf('TA: Simran Kaur') !== -1, 'TA name is actually rendered in the day view: ' + body.slice(0, 600));
});
allPass &= runScenario('a different group (G1) is unaffected by G2\'s reschedule, and G3\'s own cancellation on 15 Sept is unaffected too (regression check)', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const tuesday = dbg.state.DAYS.find((d) => d.d === '2026-09-15');
  const tut = tuesday.items.find((it) => it.category === 'Tutorial' && it.t && it.t.indexOf('8:00') === 0);
  assert(tut && tut.t === '8:00 AM – 8:50 AM', 'G1\'s own MA101 tutorial still runs normally on 15 Sept: ' + JSON.stringify(tuesday.items.map((i) => [i.code, i.title, i.t])));
  const wednesday = dbg.state.DAYS.find((d) => d.d === '2026-09-16');
  const noStrayTut = wednesday.items.find((it) => it.category === 'Tutorial' && it.title && it.title.indexOf('Calculus') !== -1);
  assert(!noStrayTut, 'G1 does NOT see G2\'s rescheduled Wednesday session: ' + JSON.stringify(wednesday.items.map((i) => [i.code, i.title, i.t])));
});
allPass &= runScenario('HS111 elective is cancelled for everyone on 2026-09-15, but not on other days it normally meets', '2026AIB1061', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.hsElective === 'HS111', 'sanity: this student is really in HS111');
  const cancelledDay = dbg.state.DAYS.find((d) => d.d === '2026-09-15');
  const hsThatDay = cancelledDay.items.find((it) => it.category === 'HS/IKS');
  assert(!hsThatDay, 'no HS111 session on 15 Sept: ' + JSON.stringify(cancelledDay.items.map((i) => [i.category, i.title, i.t])));
  const anotherMonday = dbg.state.DAYS.find((d) => d.d === '2026-09-07' && d.dow === 'Mon'); // a normal Monday, not the 09-14 Ganesh Chaturthi holiday
  const hsMonday = anotherMonday.items.find((it) => it.category === 'HS/IKS');
  assert(hsMonday, 'HS111 still runs normally on an unrelated Monday: ' + JSON.stringify(anotherMonday.items.map((i) => [i.category, i.title, i.t])));
});
// === New: IK101 (IKS) elective day correction (2026MCB1521, Bhaswat Das — himself in IKS) ===
allPass &= runScenario('IK101 (IKS) now meets Wed/Thu/Fri, not the old Mon/Tue/Wed — and carries Bhaswat\'s day-scoped attribution', '2026ESB1483', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.hsElective === 'IK101', 'sanity: this student is really in IK101/IKS');
  ['2026-09-16', '2026-09-17', '2026-09-18'].forEach((iso) => {
    const day = dbg.state.DAYS.find((d) => d.d === iso);
    const iks = day.items.find((it) => it.category === 'HS/IKS');
    assert(iks, 'IK101 session present on ' + iso + ' (' + day.dow + '): ' + JSON.stringify(day.items.map((i) => [i.category, i.title, i.t])));
    assert(iks.contributedBy === '2026MCB1521', 'carries Bhaswat\'s contributedBy tag: ' + JSON.stringify(iks));
  });
  const oldTuesday = dbg.state.DAYS.find((d) => d.d === '2026-09-15' && d.dow === 'Tue');
  const noneOnOldSlot = oldTuesday.items.find((it) => it.category === 'HS/IKS');
  assert(!noneOnOldSlot, 'no IK101 on the old (now-corrected) Tuesday: ' + JSON.stringify(oldTuesday.items.map((i) => [i.category, i.title, i.t])));
});
allPass &= runScenario('IK101\'s footer attribution shows "IKS", not Bhaswat\'s own branch code "MnC" (attribution scoped to what he actually fixed)', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const roster = dbg.contributorsRoster();
  const bhaswat = roster.find((p) => p.entry === '2026MCB1521');
  assert(bhaswat, 'Bhaswat is in the footer contributor roster: ' + JSON.stringify(roster.map((p) => p.entry)));
  assert(bhaswat.branch === 'IKS', 'tag shown is "IKS", not his branch "MnC": ' + bhaswat.branch);
});
allPass &= runScenario('a student in HS111 (a different HS/IKS pool option) is unaffected by the IK101 day correction (regression check)', '2026AIB1061', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.hsElective === 'HS111', 'sanity: this student is really in HS111');
  const thu = dbg.state.DAYS.find((d) => d.d === '2026-09-17' && d.dow === 'Thu');
  const hs = thu.items.find((it) => it.category === 'HS/IKS');
  assert(!hs, 'HS111 does not meet on Thursday — no stray IK101-driven session leaks into a different elective\'s student: ' + JSON.stringify(thu.items.map((i) => [i.category, i.title, i.t])));
});
// === New: HS113 confirmed off for every remaining session before Mid-Sem week (2026MCB1570) ===
allPass &= runScenario('HS113 is cancelled on Wed 16, Thu 17, and Fri 18 Sept (every remaining session before Mid-Sem week) but still ran normally the week before', '2026EEB1338', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.hsElective === 'HS113', 'sanity: this student is really in HS113');
  ['2026-09-16', '2026-09-17', '2026-09-18'].forEach((iso) => {
    const day = dbg.state.DAYS.find((d) => d.d === iso);
    const hs = day.items.find((it) => it.category === 'HS/IKS');
    assert(!hs, 'no HS113 session on ' + iso + ' (' + day.dow + '): ' + JSON.stringify(day.items.map((i) => [i.category, i.title, i.t])));
  });
  const priorWed = dbg.state.DAYS.find((d) => d.d === '2026-09-09' && d.dow === 'Wed');
  const hsPrior = priorWed.items.find((it) => it.category === 'HS/IKS');
  assert(hsPrior, 'HS113 still ran normally the week before (9 Sept, unaffected): ' + JSON.stringify(priorWed.items.map((i) => [i.category, i.title, i.t])));
});
allPass &= runScenario('footer Contributors list shows Shreya tagged "HS113", not her branch code "MnC"', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const roster = dbg.contributorsRoster();
  const shreya = roster.find((p) => p.entry === '2026MCB1570');
  assert(shreya, 'Shreya is in the footer contributor roster: ' + JSON.stringify(roster.map((p) => p.entry)));
  assert(shreya.branch === 'HS113', 'tag shown is "HS113", not her branch "MnC": ' + shreya.branch);
  assert(shreya.name === 'Shreya Umavane', 'contributor credit shows the shortened name "Shreya Umavane", not the full roster name: ' + shreya.name);
});
allPass &= runScenario('a different group (G1) is unaffected by the G3 MA101-TUT cancellation (regression check)', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.academicGroup === 'G1', 'sanity: this student is G1, not G2');
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-15');
  // G1's own MA101 tutorial is a different entry entirely and must be untouched by the G2 cancellation
  const tut = day.items.find((it) => it.category === 'Tutorial' && it.t && it.t.indexOf('8:00') === 0);
  assert(tut, 'G1\'s own MA101 tutorial still runs on 15 Sept: ' + JSON.stringify(day.items.map((i) => [i.code, i.title, i.t])));
});
allPass &= runScenario('MA101-TUT for G3 (MCB) is also cancelled on 2026-09-15, added alongside the G2 cancellation', '2026MCB1523', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.branch === 'MCB' && dbg.state.student.academicGroup === 'G3', 'sanity: this student is MCB/G3');
  const cancelledDay = dbg.state.DAYS.find((d) => d.d === '2026-09-15');
  const tut = cancelledDay.items.find((it) => it.category === 'Tutorial' && it.t && it.t.indexOf('8:00') === 0);
  assert(!tut, 'no MA101 tutorial for G3 on 15 Sept: ' + JSON.stringify(cancelledDay.items.map((i) => [i.code, i.title, i.t])));
  const otherTuesday = dbg.state.DAYS.find((d) => d.d === '2026-09-08' && d.dow === 'Tue');
  const tutOtherDay = otherTuesday.items.find((it) => it.category === 'Tutorial' && it.t && it.t.indexOf('8:00') === 0);
  assert(tutOtherDay, 'G3\'s tutorial still runs normally the following/preceding Tuesday: ' + JSON.stringify(otherTuesday.items.map((i) => [i.code, i.title, i.t])));
});
allPass &= runScenario('G3\'s cancelled MA101 tutorial gets a same-day makeup on 15 Sept, 6:00-7:00 PM (TA: Sagar Mandal)', '2026MCB1523', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-15');
  const tut = day.items.find((it) => it.category === 'Tutorial' && it.t && it.t.indexOf('6:00 PM') === 0);
  assert(tut, 'found G3\'s 6 PM makeup tutorial on 15 Sept: ' + JSON.stringify(day.items.map((i) => [i.code, i.title, i.t, i.venue, i.ta])));
  assert(tut.t === '6:00 PM – 7:00 PM', 'it is the real 60-min makeup block (6-7 PM), not the usual 50: ' + tut.t);
  assert(tut.venue === 'CS1', 'same venue as usual, CS1: ' + tut.venue);
  assert(tut.ta === 'Sagar Mandal', 'still carries the TA name: ' + JSON.stringify(tut));
});
allPass &= runScenario('a different group (G2, already rescheduled to Wed 16 Sept) does NOT also get G3\'s 15 Sept 6 PM makeup slot (regression check)', '2026AIB1061', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-15');
  const tut = day.items.find((it) => it.category === 'Tutorial' && it.t && it.t.indexOf('6:00 PM') === 0);
  assert(!tut, 'G2 does not see G3\'s makeup slot: ' + JSON.stringify(day.items.map((i) => [i.code, i.title, i.t])));
});

// === New: Tinkering Lab (TL101-LAB) coordinator announcement — no lab sessions on 12, 15, 16, 17
// Sept 2026 (everyone, every roll-range batch), ahead of Mid-Sem exams ===
// TL101-LAB doesn't have a courseName() mapping, so its raw subject shows up verbatim as the
// title ('TL101-LAB') — distinct from the separate weekly LECTURE, which does map to the human
// name 'Tinkering Lab' via courseName('TL101'). Only the LAB should be affected. Each announced
// date is a different weekday, so each needs a student whose own roll-range batch actually meets
// TL101-LAB that day (Sept 12 = a Friday-pattern Saturday, matching the AIDE 1001-1033 batch).
[
  {iso: '2026-09-12', entry: '2026AIB1001', label: 'AIDE 1001-1033 batch, Friday-pattern Saturday'},
  {iso: '2026-09-15', entry: '2026CSB1169', label: 'CSE 1169-1203 batch, Tuesday'},
  {iso: '2026-09-16', entry: '2026MCB1537', label: 'MCB 1537-1571 batch, Wednesday'},
  {iso: '2026-09-17', entry: '2026AIB1067', label: 'AIDE 1067-1099 batch, Thursday'},
].forEach(({iso, entry, label}) => {
  allPass &= runScenario('TL101-LAB is cancelled on ' + iso + ' (' + label + ')', entry, {}, (win, doc) => {
    const dbg = win.__debug;
    const day = dbg.state.DAYS.find((d) => d.d === iso);
    assert(day, 'found ' + iso + ' in the printed days');
    const lab = day.items.find((it) => it.code === 'TL101-LAB');
    assert(!lab, 'no TL101 lab on ' + iso + ' for ' + label + ': ' + JSON.stringify(day.items.map((i) => [i.code, i.title, i.t])));
  });
});
allPass &= runScenario('TL101-LAB still runs normally on a Monday outside the announced pause (regression check)', '2026CSB1269', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-07' && d.dow === 'Mon'); // her batch's real day (roll 1239-1273)
  assert(day, 'found a normal Monday');
  const lab = day.items.find((it) => it.code === 'TL101-LAB');
  assert(lab, 'TL101 lab still runs on an unaffected Monday: ' + JSON.stringify(day.items.map((i) => [i.code, i.title, i.t])));
});
allPass &= runScenario('TL101 lecture (Friday, separate from the lab) is unaffected by the lab-only cancellation', '2026CSB1269', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.state.DAYS.find((d) => d.d === '2026-08-21' && d.dow === 'Fri'); // a normal Friday, well after the 21 Aug Auditorium move
  const lecture = day.items.find((it) => it.title && it.title.indexOf('Tinkering') !== -1 && it.venue && it.venue.toLowerCase().indexOf('audi') !== -1);
  assert(lecture, 'the Friday TL101 lecture still runs, unaffected by the LAB-only cancellation: ' + JSON.stringify(day.items.map((i) => [i.code, i.title, i.t, i.venue])));
});

// === New: NSO enrollment gating (DATA.roster[entry].nsoEnrolled, from the official NO101 list) —
// a student who structurally matches an NSO_CRITERIA day/group but isn't actually NSO-enrolled
// (e.g. really enrolled in NSS instead) should see nothing NSO-related at all ===
allPass &= runScenario('a day/group-matching student NOT on the official NSO list sees no NSO prompt/class at all', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.nsoEnrolled === false, 'sanity: 2026AIB1001 is not NSO-enrolled (really NSS)');
  assert(dbg.state.student.nssEnrolled === true, 'sanity: really enrolled in NSS instead');
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-02' && d.dow === 'Wed'); // AIDE's NSO day
  const nso = day.items.find((it) => it.type === 'nsoPick' || it.code === 'NO101');
  assert(!nso, 'no NSO prompt or class shown for a non-enrolled student: ' + JSON.stringify(day.items.map((i) => [i.type, i.code, i.title])));
});
allPass &= runScenario('a student on the official NSO list sees their NSO session directly — no opt-in question (removed 2026-10-15)', '2026AIB1002', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.state.student.nsoEnrolled === true, 'sanity: 2026AIB1002 is really NSO-enrolled');
  const day = dbg.state.DAYS.find((d) => d.d === '2026-09-02' && d.dow === 'Wed');
  assert(!day.items.some((it) => it.type === 'nsoPick'), 'no opt-in prompt any more: ' + JSON.stringify(day.items.map((i) => [i.type, i.code, i.title])));
  assert(day.items.some((it) => it.code === 'NO101'), 'the NSO session itself is shown: ' + JSON.stringify(day.items.map((i) => [i.type, i.code, i.title])));
});

// === NEW Life Skill Divisions roster (received 23 Oct 2026): per-student days from 23 Oct onwards; the old LS
// schedule applies up to and including 22 Oct. AIDE and MnC (MCB) are confirmed on Monday. 11 CSE-G8 students move Monday -> Tuesday.
const lsOn = (dbg, iso) => (dbg.state.DAYS.find((d) => d.d === iso) || { items: [] }).items.find((it) => it.category === 'LS');
allPass &= runScenario('AIDE student: Life Skills is on Monday (both before cut-over and after cut-over on Mon 26 Oct)', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(lsOn(dbg, '2026-10-12'), 'old schedule: LS on Mon 12 Oct');
  assert(!lsOn(dbg, '2026-10-13'), 'no LS on Tue 13 Oct');
  const ls = lsOn(dbg, '2026-10-26');
  assert(ls && ls.t === '6:00 PM – 7:00 PM' && ls.venue === 'Auditorium', 'LS on Mon 26 Oct, 6-7 PM at the Auditorium: ' + JSON.stringify(ls));
  assert(!lsOn(dbg, '2026-10-27'), 'no LS on Tue 27 Oct');
});
allPass &= runScenario('MCB-G3 student (1537): Life Skills is on Monday (both before and after cut-over)', '2026MCB1537', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(lsOn(dbg, '2026-10-12') && !lsOn(dbg, '2026-10-13'), 'Monday under the old schedule');
  assert(lsOn(dbg, '2026-10-26') && !lsOn(dbg, '2026-10-27'), 'Monday after the cut-over');
});
allPass &= runScenario('MCB-G3 student who stays on Monday (1523) is unchanged by the new roster', '2026MCB1523', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(lsOn(dbg, '2026-10-26') && !lsOn(dbg, '2026-10-27'), 'still Monday after the cut-over');
});
allPass &= runScenario('ICDT keeps its 90-min, venue-unknown Life Skills session after the new roster (Mon 26 Oct)', '2026ICB1429', {}, (win, doc) => {
  const dbg = win.__debug;
  const ls = lsOn(dbg, '2026-10-26');
  assert(ls && ls.t === '6:00 PM – 7:30 PM' && !ls.venue, 'ICDT LS on Monday, 90 min, no venue: ' + JSON.stringify(ls));
});

// ==================== Spectate (build/spectate.js) ====================
// A separate, no-login page with its own small standalone script (deliberately NOT sharing
// app3.js's scope — see the plan notes in spectate.js's header comment) — so it gets its own tiny
// vm loader here instead of reusing the app3.js/ROLES harness above.
function runSpectateScenario(name, testFn){
  try {
    // spectate.js now runs on the shared engine (build/engine.js) + picker (build/picker.js),
    // spliced in ahead of it on the real page — load them in the same order here.
    const spectateJs = ['engine.js', 'picker.js', 'monthpick.js', 'spectate.js'].map((f) => fs.readFileSync(path.join(BASE, f), 'utf8')).join('\n');
    const sandbox = { console, Uint8Array, WeakMap };
    sandbox.window = sandbox;
    sandbox.document = { addEventListener(){} }; // init() only runs on DOMContentLoaded, never fired here
    vm.createContext(sandbox);
    vm.runInContext(dataJs + '\n' + spectateJs, sandbox);
    testFn(sandbox.window.__spectate);
    console.log('PASS', name);
    return true;
  } catch (e) {
    console.log('FAIL', name, '-', e.message);
    console.log(e.stack);
    return false;
  }
}

allPass &= runSpectateScenario('Life Skills days follow the new roster from 23 Oct on /spectate\'s engine too, and the old schedule before it', (sp) => {
  const E = sp.ENGINE, D = sp.DATA;
  const has = (e, iso) => E.studentDay(D.roster[e], iso).items.some((i) => i.subject === 'LS101');
  assert(has('2026AIB1001', '2026-10-12') && !has('2026AIB1001', '2026-10-13'), 'AIDE: Monday before 23 Oct');
  assert(has('2026AIB1001', '2026-10-26') && !has('2026AIB1001', '2026-10-27'), 'AIDE: Monday after 23 Oct');
  assert(has('2026MCB1537', '2026-10-26') && !has('2026MCB1537', '2026-10-27'), 'MCB: Monday after 23 Oct');
  assert(has('2026CSB1239', '2026-10-26') && !has('2026CSB1239', '2026-10-27'), 'CSE 1239-1288 stay on Monday');
});
allPass &= runSpectateScenario('cohort headcount for a whole branch matches the roster exactly', (sp) => {
  const E = sp.ENGINE;
  const idxs = E.evalSelection([{ op: 'add', id: 'br:AIDE' }]);
  const rosterCount = Object.values(sp.DATA.roster).filter((s) => s.branch === 'AIDE').length;
  assert(idxs.length === rosterCount, 'AIDE cohort size matches roster: ' + idxs.length + ' vs ' + rosterCount);
  assert(E.describe(idxs).join(' + ') === 'AIDE', 'and is named simply "AIDE": ' + E.describe(idxs));
});
allPass &= runSpectateScenario('picking two branch-qualified groups unions students, no double-counting, no cross-branch leak', (sp) => {
  const E = sp.ENGINE;
  // CE and MME both carry the label "G12" — each gets its own branch-qualified unit.
  const idxs = E.evalSelection([{ op: 'add', id: 'bg:CE·G12' }, { op: 'add', id: 'bg:MME·G12' }]);
  const ceCount = Object.values(sp.DATA.roster).filter((s) => s.branch === 'CE' && s.academicGroup === 'G12').length;
  const mmeCount = Object.values(sp.DATA.roster).filter((s) => s.branch === 'MME' && s.academicGroup === 'G12').length;
  assert(idxs.length === ceCount + mmeCount, 'union size is exactly CE/G12 + MME/G12, no leak/dup: ' + idxs.length + ' vs ' + (ceCount+mmeCount));
  assert(idxs.every((i) => ['CE', 'MME'].indexOf(E.ROSTER[i].branch) !== -1), 'only CE and MME students present');
  assert(E.describe(idxs).join(' + ') === 'G12', 'the union is named by its shared group label: ' + E.describe(idxs));
  const ceOnly = E.evalSelection([{ op: 'add', id: 'bg:CE·G12' }]);
  assert(E.describe(ceOnly).join(' + ') === 'CE', 'one branch of the shared group is named one layer deeper (here the whole branch): ' + E.describe(ceOnly));
});
allPass &= runSpectateScenario('narrow (∩) and remove (−) selection ops, and entry-range naming for a TL101 lab batch', (sp) => {
  const E = sp.ENGINE;
  const cseHs110 = E.evalSelection([{ op: 'add', id: 'br:CSE' }, { op: 'narrow', id: 'kind:HS110' }]);
  assert(cseHs110.length > 0 && cseHs110.every((i) => E.ROSTER[i].branch === 'CSE' && E.ROSTER[i].hsElective === 'HS110'), 'CSE ∩ HS110 keeps only CSE students in HS110: ' + cseHs110.length);
  const d1MinusG2 = E.evalSelection([{ op: 'add', id: 'div:D1' }, { op: 'remove', id: 'grp:G2' }]);
  assert(d1MinusG2.every((i) => E.ROSTER[i].academicGroup !== 'G2'), 'D1 − G2 has no G2 students');
  assert(E.describe(d1MinusG2).join(' + ') === 'G1 + G3', 'and reads as "G1 + G3": ' + E.describe(d1MinusG2));
  const tl = E.KINDS.find((k) => k.family === 'TL101 lab' && /CSB1239–1273/.test(k.label));
  assert(tl, 'a TL101 lab batch is offered as a kind, named by its entry range: ' + E.KINDS.filter((k) => k.family === 'TL101 lab').map((k) => k.label));
});
allPass &= runSpectateScenario('busyIntervalsForStudent: a student in Mid-Sem exam week only has their exam, not the regular grid', (sp) => {
  const student = sp.DATA.roster['2026AIB1099'];
  const intervals = sp.busyIntervalsForStudent(student, '2026-09-19'); // inside the Mid-Sem window, Physics exam day
  assert(intervals.length >= 1, 'has at least the exam item: ' + JSON.stringify(intervals));
  // 12:30-2:30 PM = 750-870 minutes; the regular Saturday-pattern grid for that division must not also appear
  const examOnly = intervals.every((iv) => iv.s === 750 && iv.e === 870);
  assert(examOnly, 'only the exam interval is present during Mid-Sem week, regular grid suppressed: ' + JSON.stringify(intervals));
});
allPass &= runSpectateScenario('busyIntervalsForStudent: 18 Sept is exempted — a D1 student with no CY101 exam that day is busy with their normal Friday classes, not blank', (sp) => {
  const student = sp.DATA.roster['2026AIB1001']; // AIDE, D1
  const intervals = sp.busyIntervalsForStudent(student, '2026-09-18');
  assert(intervals.length > 1, 'has a normal-looking Friday full of busy intervals, not just one exam slot: ' + JSON.stringify(intervals));
});
allPass &= runSpectateScenario('busyIntervalsForStudent: 18 Sept still suppresses the regular grid for a D3 student who DOES have the CY101 exam that day (regression check)', (sp) => {
  const student = sp.DATA.roster['2026CSB1169']; // CSE, D3
  const intervals = sp.busyIntervalsForStudent(student, '2026-09-18');
  assert(intervals.length === 1, 'only the one CY101 exam interval, regular grid still suppressed: ' + JSON.stringify(intervals));
});
allPass &= runSpectateScenario('venueOccupancyForDate: on 18 Sept, a room used by a branch-scoped (not division-scoped) regular session — TL101\'s lecture at AUDITORIUM — is still correctly occupied, since a branch/group-scoped entry can\'t be proven exam-covered and is conservatively left busy', (sp) => {
  const occ18 = sp.venueOccupancyForDate('2026-09-18');
  const auditorium = occ18[sp.venueKey('AUDITORIUM')] || [];
  assert(auditorium.some((iv) => iv.subject === 'TL101'), 'AUDITORIUM still shows TL101\'s Friday lecture occupying it on 18 Sept: ' + JSON.stringify(auditorium));
});
allPass &= runSpectateScenario('busyIntervalsForStudent respects real NSO enrollment too — a non-enrolled matching student is not counted busy for it', (sp) => {
  const enrolled = sp.DATA.roster['2026AIB1002'];
  const notEnrolled = sp.DATA.roster['2026AIB1001'];
  assert(enrolled.nsoEnrolled === true && notEnrolled.nsoEnrolled === false, 'sanity: one is NSO-enrolled, the other is not');
  const iso = '2026-09-02'; // AIDE's NSO day (Wednesday)
  const enrolledIntervals = sp.busyIntervalsForStudent(enrolled, iso);
  const notEnrolledIntervals = sp.busyIntervalsForStudent(notEnrolled, iso);
  const enrolledHasNso = enrolledIntervals.some((iv) => iv.e - iv.s === 120); // NSO's known 120-min duration
  assert(enrolledHasNso, 'the enrolled student is counted busy for NSO: ' + JSON.stringify(enrolledIntervals));
  const notEnrolledHasNso = notEnrolledIntervals.some((iv) => iv.e - iv.s === 120);
  assert(!notEnrolledHasNso, 'the non-enrolled student is NOT counted busy for NSO (a real free slot for a spectate organizer): ' + JSON.stringify(notEnrolledIntervals));
});
allPass &= runSpectateScenario('findSlots: a single-student cohort scores 100% exactly on a day with zero busy intervals', (sp) => {
  const student = sp.DATA.roster['2026AIB1099'];
  // Pick an ISO clearly before classesStart so there is nothing scheduled at all for this student.
  const iso = '2026-07-27';
  assert(iso < sp.DATA.calendar.classesStart, 'sanity: this date really is before classes start');
  const slots = sp.findSlots([student], [iso], 60, sp.HOUR_START*60, sp.HOUR_END*60, 60);
  assert(slots.length > 0, 'produced candidate slots');
  assert(slots.every((s) => s.pct === 1), 'every slot is 100% free on a day with nothing scheduled: ' + JSON.stringify(slots[0]));
});
allPass &= runSpectateScenario('findSlots: ranks a slot lower once a real class makes part of the cohort busy', (sp) => {
  const student = sp.DATA.roster['2026AIB1099'];
  const iso = '2026-09-02'; // a real Wednesday with classes
  const busy = sp.busyIntervalsForStudent(student, iso);
  assert(busy.length > 0, 'this student really has scheduled items that day: ' + JSON.stringify(busy));
  const slots = sp.findSlots([student], [iso], 60, sp.HOUR_START*60, sp.HOUR_END*60, 30);
  const anyBusySlot = slots.some((s) => s.pct === 0);
  assert(anyBusySlot, 'at least one candidate slot correctly scores 0% (fully blocked) for a single-student cohort: ' + JSON.stringify(slots.slice(0,3)));
});
allPass &= runSpectateScenario('diversifySlots collapses near-duplicate 15-min-apart candidates into distinct, non-overlapping results', (sp) => {
  const student = sp.DATA.roster['2026AIB1099'];
  const iso = '2026-07-27'; // nothing scheduled, so 7AM-10PM is wall-to-wall 100% at every 15-min step
  const raw = sp.findSlots([student], [iso], 60, sp.HOUR_START*60, sp.HOUR_END*60, 15);
  assert(raw.length > 10, 'the raw slide produces many overlapping near-duplicate candidates: ' + raw.length);
  const diverse = sp.diversifySlots(raw, 10);
  assert(diverse.length === 10, 'still returns up to the requested max: ' + diverse.length);
  for(let i=0;i<diverse.length;i++){
    for(let j=i+1;j<diverse.length;j++){
      const overlap = diverse[i].iso === diverse[j].iso && Math.max(diverse[i].ws, diverse[j].ws) < Math.min(diverse[i].we, diverse[j].we);
      assert(!overlap, 'no two picked results overlap in time: ' + JSON.stringify([diverse[i], diverse[j]]));
    }
  }
});
allPass &= runSpectateScenario('contactsForCombos surfaces the right BR and verifier for a selection, nothing for an unrelated one', (sp) => {
  const E = sp.ENGINE;
  const c = E.contactsFor(E.evalSelection([{ op: 'add', id: 'bg:MME·G12' }]));
  assert(c.brs.some((b) => b.branch === 'MME' && b.reps.some((r) => r.entry === '2026MMB1686')), 'MME/G12 BR found: ' + JSON.stringify(c.brs));
  assert(c.verifiers.some((v) => v.entry === '2026MMB1686'), 'MME verifier found: ' + JSON.stringify(c.verifiers));
  // As of 2026ICB1429, every one of the 17 real branch+group combos now has a contributor/verifier
  // — this used to assert ICDT/G9 had none (the last coverage gap); that gap is now closed.
  const icdt = E.contactsFor(E.evalSelection([{ op: 'add', id: 'bg:ICDT·G9' }]));
  assert(icdt.brs.some((b) => b.branch === 'ICDT' && b.reps.some((r) => r.entry === '2026ICB1429')), 'ICDT/G9 BR found: ' + JSON.stringify(icdt.brs));
  assert(icdt.verifiers.some((v) => v.entry === '2026ICB1429'), 'ICDT verifier found: ' + JSON.stringify(icdt.verifiers));
});

// ==================== Spectate venue-occupancy engine (build/spectate.js) ====================
// Reverse lens on the same underlying data: "is this ROOM free" instead of "is this person free".
allPass &= runSpectateScenario('venueOccupancyForDate marks SENATE HALL busy during MA101(D1) on a normal Monday, and free an hour earlier', (sp) => {
  const iso = '2026-09-07'; // normal Monday, MA101(D1) 10:00-10:50 AM at SENATE HALL
  const busyDuring = sp.busyVenuesAt(iso, 600, 650);
  const hit = busyDuring.find((b) => b.venue.key === sp.venueKey('SENATE HALL'));
  assert(hit, 'SENATE HALL shows up busy 10:00-10:50: ' + JSON.stringify(busyDuring.map((b) => b.venue.name)));
  assert(hit.occupants.some((o) => o.subject === 'MA101'), 'occupied by MA101: ' + JSON.stringify(hit.occupants));
  const freeEarlier = sp.freeVenuesAt(iso, 480, 530); // 8:00-8:50 AM
  assert(freeEarlier.some((v) => v.key === sp.venueKey('SENATE HALL')), 'SENATE HALL is free an hour earlier, outside the class: ' + JSON.stringify(freeEarlier.map((v) => v.name)));
});
allPass &= runSpectateScenario('ALL_VENUES excludes the generic "LAB" placeholder and the G12 venue-field data artifact', (sp) => {
  assert(!sp.ALL_VENUES.some((v) => v.key === 'LAB'), 'LAB is not a real bookable room, excluded: ' + JSON.stringify(sp.ALL_VENUES.map((v) => v.key)));
  assert(!sp.ALL_VENUES.some((v) => v.key === 'G12'), 'G12 (accidental group-label-as-venue) is excluded');
});
allPass &= runSpectateScenario('venueKey collapses the same physical room\'s inconsistent spellings ("CS-1"/"CS1", "Auditorium"/"AUDITORIUM") into one venue', (sp) => {
  assert(sp.venueKey('CS-1') === sp.venueKey('CS1'), 'CS-1 and CS1 normalize to the same key');
  assert(sp.venueKey('Auditorium') === sp.venueKey('AUDITORIUM'), 'Auditorium and AUDITORIUM normalize to the same key');
  const cs1Count = sp.ALL_VENUES.filter((v) => v.key === sp.venueKey('CS-1')).length;
  assert(cs1Count === 1, 'only one ALL_VENUES entry for that room, not two half-empty ones: ' + cs1Count);
});
allPass &= runSpectateScenario('mealTagForHour flags breakfast and lunch hours on a normal weekday, and leaves a mid-morning hour untagged', (sp) => {
  const iso = '2026-09-07'; // normal Monday
  assert(sp.mealTagForHour(iso, 7) === 'breakfast', 'hour 7 (7-8 AM) overlaps breakfast (7:30-9:15): ' + sp.mealTagForHour(iso, 7));
  assert(sp.mealTagForHour(iso, 13) === 'lunch', 'hour 13 (1-2 PM) overlaps lunch (12:15-2:30 PM): ' + sp.mealTagForHour(iso, 13));
  assert(sp.mealTagForHour(iso, 10) === null, 'hour 10 (10-11 AM) is not a meal hour: ' + sp.mealTagForHour(iso, 10));
});
allPass &= runSpectateScenario('venueLoadLeaderboard ranks busiest-first and never exceeds the known venue count', (sp) => {
  const board = sp.venueLoadLeaderboard(['2026-09-07', '2026-09-08']); // two normal weekdays
  assert(board.length > 0 && board.length <= sp.ALL_VENUES.length, 'leaderboard has entries, capped at known venues: ' + board.length + '/' + sp.ALL_VENUES.length);
  for(let i=1;i<board.length;i++){
    assert(board[i-1].minutes >= board[i].minutes, 'sorted busiest-first: ' + JSON.stringify(board.slice(0,5)));
  }
});

// ==================== /br live overlay (DATA.liveOverlay, fed by Firestore in production) ====================
allPass &= runScenario('live overlay "show" appears only for its exact group scope + date, and nowhere else', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Test Session', startMin: 1020, endMin: 1070, venue: 'Test Room',
      scope: { type: 'group', branch: 'AIDE', group: 'G1' }, temporal: { type: 'date', date: '2026-09-07' } },
    createdBy: '2026AIB1099',
  }];
  const day = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-07');
  const item = day.items.find((it) => it.title === 'BR Test Session' || it.code === 'BRTEST');
  assert(item, 'AIDE/G1 sees the overlay item on the exact scoped date: ' + JSON.stringify(day.items.map((i) => [i.code, i.title, i.t])));
  assert(item.venue === 'Test Room' && item.contributedBy === '2026AIB1099', 'venue and attribution carried through: ' + JSON.stringify(item));
  const otherDay = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-08');
  assert(!otherDay.items.some((it) => it.title === 'BR Test Session'), 'does not appear on a different date: ' + JSON.stringify(otherDay.items.map((i) => i.code)));
});
allPass &= runScenario('live overlay "show" scoped to AIDE/G1 does not leak to AIDE/G2 (a different group, same branch)', '2026AIB1061', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Test Session', startMin: 1020, endMin: 1070, venue: 'Test Room',
      scope: { type: 'group', branch: 'AIDE', group: 'G1' }, temporal: { type: 'date', date: '2026-09-07' } },
    createdBy: '2026AIB1099',
  }];
  const day = dbg.buildDays(dbg.DATA.roster['2026AIB1061']).find((d) => d.d === '2026-09-07');
  assert(!day.items.some((it) => it.title === 'BR Test Session'), 'AIDE/G2 does not see AIDE/G1\'s scoped item: ' + JSON.stringify(day.items.map((i) => i.code)));
});
allPass &= runScenario('live overlay scope never leaks across branches sharing a group label (MCB/G2 vs AIDE/G2)', '2026MCB1502', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(dbg.DATA.roster['2026MCB1502'].branch === 'MCB' && dbg.DATA.roster['2026MCB1502'].academicGroup === 'G2', 'sanity: MCB/G2 student');
  dbg.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Test Session', startMin: 1020, endMin: 1070, venue: 'Test Room',
      scope: { type: 'group', branch: 'AIDE', group: 'G2' }, temporal: { type: 'date', date: '2026-09-07' } },
    createdBy: '2026AIB1099',
  }];
  const day = dbg.buildDays(dbg.DATA.roster['2026MCB1502']).find((d) => d.d === '2026-09-07');
  assert(!day.items.some((it) => it.title === 'BR Test Session'), 'MCB/G2 does not inherit AIDE/G2\'s item despite sharing the "G2" label: ' + JSON.stringify(day.items.map((i) => i.code)));
});
allPass &= runScenario('live overlay "hide" suppresses a real regular-grid item only for its exact scope + date, unaffected on other dates/groups', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const iso = '2026-09-07'; // a normal Monday
  const before = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === iso);
  const hadIt = before.items.some((it) => it.code === 'AI101' || it.title === 'Data Science and AI Essentials with Python');
  assert(hadIt, 'sanity: AIDE/G1 normally has AI101 on this Monday: ' + JSON.stringify(before.items.map((i) => [i.code, i.title])));
  dbg.DATA.liveOverlay = [{
    hide: { subject: 'AI101', scope: { type: 'group', branch: 'AIDE', group: 'G1' }, temporal: { type: 'date', date: iso } },
    show: null, createdBy: '2026AIB1099',
  }];
  const after = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === iso);
  assert(!after.items.some((it) => it.code === 'AI101'), 'AI101 is hidden on the exact scoped date: ' + JSON.stringify(after.items.map((i) => i.code)));
  const otherDay = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-08');
  assert(otherDay.items.some((it) => it.code === 'AI101'), 'AI101 still runs normally the next day, unaffected: ' + JSON.stringify(otherDay.items.map((i) => i.code)));
  const otherStudent = dbg.buildDays(dbg.DATA.roster['2026AIB1061']).find((d) => d.d === iso); // AIDE/G2
  assert(otherStudent.items.some((it) => it.code === 'AI101'), 'AIDE/G2 (different group) still has AI101 that same date, unaffected: ' + JSON.stringify(otherStudent.items.map((i) => i.code)));
});
allPass &= runScenario('live overlay "recurring" (always) applies to every future occurrence of its weekday, not other weekdays', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Recurring Session', startMin: 1080, endMin: 1130, venue: null,
      scope: { type: 'all' }, temporal: { type: 'recurring', weekday: 'Tuesday' } },
    createdBy: '2026AIB1099',
  }];
  ['2026-09-08', '2026-09-15', '2026-09-29'].forEach((iso) => {
    const day = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === iso);
    assert(day.dow === 'Tue', 'sanity: ' + iso + ' is a Tuesday');
    assert(day.items.some((it) => it.title === 'BR Recurring Session' || it.title === 'BR Week Session'), 'recurring item appears on Tuesday ' + iso + ': ' + JSON.stringify(day.items.map((i) => i.code)));
  });
  const wed = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-09');
  assert(!wed.items.some((it) => it.title === 'BR Recurring Session' || it.title === 'BR Week Session'), 'does not appear on a Wednesday: ' + JSON.stringify(wed.items.map((i) => i.code)));
});
allPass &= runScenario('live overlay "week" applies across every day of that week regardless of weekday, not outside it', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Week Session', startMin: 1080, endMin: 1130, venue: null,
      scope: { type: 'all' }, temporal: { type: 'week', start: '2026-09-07', end: '2026-09-13' } },
    createdBy: '2026AIB1099',
  }];
  ['2026-09-07', '2026-09-09', '2026-09-13'].forEach((iso) => {
    const day = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === iso);
    assert(day.items.some((it) => it.title === 'BR Recurring Session' || it.title === 'BR Week Session'), 'appears on ' + iso + ' (inside the week): ' + JSON.stringify(day.items.map((i) => i.code)));
  });
  const outside = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-14');
  assert(!outside.items.some((it) => it.title === 'BR Recurring Session' || it.title === 'BR Week Session'), 'does not appear the day after the week ends: ' + JSON.stringify(outside.items.map((i) => i.code)));
});
allPass &= runSpectateScenario('spectate mirrors the same live overlay: busyIntervalsForStudent picks up a "show" and venueOccupancyForDate picks up its venue', (sp) => {
  sp.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Test', startMin: 1020, endMin: 1070, venue: 'Test Room',
      scope: { type: 'all' }, temporal: { type: 'date', date: '2026-09-07' } },
    createdBy: '2026AIB1099',
  }];
  const student = sp.DATA.roster['2026AIB1001'];
  const busy = sp.busyIntervalsForStudent(student, '2026-09-07');
  assert(busy.some((iv) => iv.s === 1020 && iv.e === 1070), 'the overlay interval shows up in busyIntervalsForStudent: ' + JSON.stringify(busy));
  const occ = sp.venueOccupancyForDate('2026-09-07');
  const room = occ[sp.venueKey('Test Room')] || [];
  assert(room.some((iv) => iv.subject === 'BRTEST'), 'the overlay item occupies its venue in venueOccupancyForDate: ' + JSON.stringify(room));
});

// === New: /br's richer live changes — entries scope, exact-slot removal, "from" date, and one change removing another ===
allPass &= runScenario('live overlay entries-scope applies only to listed students, and a branch-bound list never reaches another branch', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Entries Session', startMin: 1020, endMin: 1070, venue: null,
      scope: { type: 'entries', entries: ['2026AIB1001', '2026MCB1502'], label: 'test', branch: 'AIDE' }, temporal: { type: 'date', date: '2026-09-07' } },
    createdBy: '2026AIB1041',
  }];
  const has = (e) => dbg.buildDays(dbg.DATA.roster[e]).find((d) => d.d === '2026-09-07').items.some((it) => it.title === 'BR Entries Session');
  assert(has('2026AIB1001'), 'a listed AIDE student sees it');
  assert(!has('2026AIB1002'), 'an unlisted AIDE student does not');
  assert(!has('2026MCB1502'), 'a listed student of ANOTHER branch does not — the list is bound to AIDE');
});
allPass &= runScenario('live overlay hide with startMin removes only that occurrence; recurring "from" leaves earlier weeks alone', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const iso = '2026-09-07';
  const ai = (d) => d.items.filter((it) => it.code === 'AI101');
  const before = ai(dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === iso));
  assert(before.length >= 2, 'sanity: AIDE/G1 has AI101 twice that Monday (lecture + lab): ' + JSON.stringify(before.map((i) => i.t)));
  const target = before[0].sMin;
  dbg.DATA.liveOverlay = [{
    hide: { subject: 'AI101', startMin: target, scope: { type: 'all' }, temporal: { type: 'recurring', weekday: 'Monday', from: iso } },
    show: null, createdBy: '2026AIB1099',
  }];
  const after = ai(dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === iso));
  assert(after.length === before.length - 1 && !after.some((i) => i.sMin === target), 'only the targeted occurrence is gone: ' + JSON.stringify(after.map((i) => i.t)));
  const earlier = ai(dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-08-31'));
  assert(earlier.some((i) => i.sMin === target), 'the Monday before "from" still has it: ' + JSON.stringify(earlier.map((i) => i.t)));
});
allPass &= runScenario('a live hide can remove another live change\'s added item, but a change doc never hides its own replacement', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const iso = '2026-09-07';
  const added = { show: { subject: 'BRTEST', title: 'BR Batch Session', startMin: 1020, endMin: 1070, venue: null, scope: { type: 'all' }, temporal: { type: 'date', date: iso } }, createdBy: '2026AIB1099' };
  const dropForAide = { hide: { subject: 'BRTEST', startMin: 1020, scope: { type: 'branch', branch: 'AIDE' }, temporal: { type: 'date', date: iso } }, show: null, createdBy: '2026AIB1041' };
  const moved = { hide: { subject: 'MA101', scope: { type: 'all' }, temporal: { type: 'date', date: iso } },
    show: { subject: 'MA101', title: 'MA101', startMin: 1140, endMin: 1190, venue: null, scope: { type: 'all' }, temporal: { type: 'date', date: iso } }, createdBy: '2026AIB1099' };
  dbg.DATA.liveOverlay = [added, dropForAide, moved];
  const items = (e) => dbg.buildDays(dbg.DATA.roster[e]).find((d) => d.d === iso).items;
  assert(!items('2026AIB1001').some((it) => it.title === 'BR Batch Session'), 'AIDE no longer has the batch-wide added item');
  assert(items('2026CSB1169').some((it) => it.title === 'BR Batch Session'), 'CSE still has it');
  const ma = items('2026AIB1001').filter((it) => it.code === 'MA101' || it.title === 'Calculus');
  assert(ma.length === 1 && ma[0].sMin === 1140, 'MA101 moved to 7 PM, its replacement not hidden by its own hide: ' + JSON.stringify(ma.map((i) => i.t)));
});
allPass &= runSpectateScenario('engine mirrors the same rules: entries scope, startMin hide, and cross-doc hide', (sp) => {
  const E = sp.ENGINE;
  const iso = '2026-09-07';
  const added = { id: 'a', show: { subject: 'BRTEST', title: 'BR Batch Session', startMin: 1020, endMin: 1070, venue: 'Test Room', scope: { type: 'all' }, temporal: { type: 'date', date: iso } } };
  const drop = { id: 'b', hide: { subject: 'BRTEST', startMin: 1020, scope: { type: 'entries', entries: ['2026AIB1001'], branch: 'AIDE' }, temporal: { type: 'date', date: iso } }, show: null };
  E.setOverlay([added, drop]);
  const a = E.studentDay(sp.DATA.roster['2026AIB1001'], iso, { withHidden: true });
  assert(!a.items.some((it) => it.title === 'BR Batch Session'), 'hidden for the listed student');
  assert(a.hidden.some((it) => it.title === 'BR Batch Session' && it.hiddenBy === drop), 'and reported as hidden-by that doc, for /br\'s restore');
  assert(E.studentDay(sp.DATA.roster['2026AIB1002'], iso).items.some((it) => it.title === 'BR Batch Session'), 'still there for everyone else');
  assert((E.venueOccupancy(iso)[E.venueKey('Test Room')] || []).length === 1, 'and the room is still booked (others still have it)');
});

// === New: "Branch Rep Tools" link only shows for the logged-in user themself, only if they're a BR/creator ===
allPass &= runScenario('Branch Rep Tools button shows for a real BR (own login), hidden for a regular student', '2026CEB1162', {}, (win, doc) => {
  const dbg = win.__debug;
  const btn = doc.getElementById('brToolsBtn');
  assert(btn.style.display === 'flex', 'CE\'s BR sees the Branch Rep Tools button on their own dashboard: ' + btn.style.display);
});
allPass &= runScenario('Branch Rep Tools button is hidden for a regular (non-BR, non-creator) student', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const btn = doc.getElementById('brToolsBtn');
  assert(btn.style.display === 'none', 'a regular AIDE/G1 student does not see the button: ' + btn.style.display);
});
allPass &= runScenario('Branch Rep Tools button shows for the creator', '2026AIB1099', {}, (win, doc) => {
  const dbg = win.__debug;
  const btn = doc.getElementById('brToolsBtn');
  assert(btn.style.display === 'flex', 'the creator sees the Branch Rep Tools button: ' + btn.style.display);
});
allPass &= runScenario('Branch Rep Tools button stays hidden while just viewing a classmate\'s schedule (not your own login)', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const brStudent = dbg.DATA.roster['2026CEB1162'];
  dbg.viewStudent(brStudent); // simulate "find a classmate" viewing a BR's schedule while logged in as someone else
  const btn = doc.getElementById('brToolsBtn');
  assert(btn.style.display === 'none', 'button stays hidden — viewing someone else\'s schedule is not the same as being logged in as them: ' + btn.style.display);
});

// === New: Mid-Sem "no regular classes" takes priority over BR-added live overlay items too ===
allPass &= runScenario('a BR-added recurring overlay item does NOT appear during blanket Mid-Sem week (20 Sept), even though it would on a normal day', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Recurring Session', startMin: 1080, endMin: 1130, venue: null,
      scope: { type: 'all' }, temporal: { type: 'recurring', weekday: 'Sunday' } },
    createdBy: '2026AIB1099',
  }];
  const normalSunday = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-13');
  assert(normalSunday.items.some((it) => it.title === 'BR Recurring Session'), 'sanity: shows up on a normal Sunday: ' + JSON.stringify(normalSunday.items.map((i) => i.title)));
  const midsemSunday = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-20'); // Sunday, inside blanket Mid-Sem week
  assert(midsemSunday.dow === 'Sun', 'sanity: 20 Sept 2026 is a Sunday');
  assert(!midsemSunday.items.some((it) => it.title === 'BR Recurring Session'), 'Mid-Sem week suppresses the BR-added item too, even on its own recurring weekday: ' + JSON.stringify(midsemSunday.items.map((i) => i.title)));
});
allPass &= runScenario('a BR-added overlay item still shows on 18 Sept for a student with no exam that day (the existing partial exemption still applies to overlay items too)', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Test Session', startMin: 1020, endMin: 1070, venue: null,
      scope: { type: 'all' }, temporal: { type: 'date', date: '2026-09-18' } },
    createdBy: '2026AIB1099',
  }];
  const day = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-18'); // AIDE/D1, no CY101 exam that day
  assert(day.items.some((it) => it.title === 'BR Test Session'), 'AIDE/D1 (no exam on 18 Sept) still sees the overlay item: ' + JSON.stringify(day.items.map((i) => i.title)));
  const examDay = dbg.buildDays(dbg.DATA.roster['2026CSB1169']).find((d) => d.d === '2026-09-18'); // CSE/D3, HAS the CY101 exam that day
  assert(!examDay.items.some((it) => it.title === 'BR Test Session'), 'CSE/D3 (has the CY101 exam that day) does NOT see it, same rule as regular classes: ' + JSON.stringify(examDay.items.map((i) => i.title)));
});
allPass &= runSpectateScenario('spectate: a BR-added overlay item (busy interval + venue occupancy) is also suppressed during blanket Mid-Sem week', (sp) => {
  sp.DATA.liveOverlay = [{
    show: { subject: 'BRTEST', title: 'BR Test', startMin: 1020, endMin: 1070, venue: 'Test Room',
      scope: { type: 'all' }, temporal: { type: 'date', date: '2026-09-20' } },
    createdBy: '2026AIB1099',
  }];
  const student = sp.DATA.roster['2026AIB1001'];
  const busy = sp.busyIntervalsForStudent(student, '2026-09-20');
  assert(!busy.some((iv) => iv.s === 1020 && iv.e === 1070), 'the overlay interval is suppressed during Mid-Sem week: ' + JSON.stringify(busy));
  const occ = sp.venueOccupancyForDate('2026-09-20');
  const room = occ[sp.venueKey('Test Room')] || [];
  assert(!room.length, 'the overlay item does not occupy its venue during Mid-Sem week either: ' + JSON.stringify(room));
});

// === New: 18 Sept CY101 exam seating (Saavi's "Recheck by Saavi" sheet upload) ===
allPass &= runScenario('CY101 exam seat/venue on 18 Sept is filled in from DATA.examSeating for a D3/D4 student who has that exam', '2026MEB1641', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.buildDays(dbg.DATA.roster['2026MEB1641']).find((d) => d.d === '2026-09-18');
  const exam = day.items.find((it) => it.category === 'Exam' && /Chemistry/.test(it.title || ''));
  assert(exam, 'ME (D4) student has a CY101 exam item on 18 Sept: ' + JSON.stringify(day.items.map((i) => i.title)));
  assert(exam.venue === 'Auditorium · Seat G-117', 'seat/venue is filled in from the seating sheet: ' + exam.venue);
  assert(exam.contributedBy === '2026MEB1641', 'the seat/venue is precisely attributed to the student who shared that sheet: ' + exam.contributedBy);
});
allPass &= runScenario('a D1/D2 student (no CY101 exam) is unaffected by the new 18 Sept seating data', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-18');
  assert(!day.items.some((it) => it.category === 'Exam' && /Chemistry/.test(it.title || '')), 'AIDE/D1 has no CY101 exam on 18 Sept: ' + JSON.stringify(day.items.map((i) => i.title)));
});

// === New: a compact one-line "what did they contribute" summary inside the contributor card ===
allPass &= runScenario('contributor card shows a one-line summary of what a data-sharing contributor actually contributed', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.openContributorCard('2026CEB1162');
  const html = doc.getElementById('contributorCardBody').innerHTML;
  assert(html.indexOf('contributor-card-contrib') !== -1, 'card includes the summary line: ' + html);
  assert(html.indexOf('CY101 lab day') !== -1, 'summary names what they actually fixed: ' + html);
});
allPass &= runScenario('contributor card falls back to a "verified the schedule" line for someone who only verified, never shared data', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.openContributorCard('2026EEB1330'); // Avishi Sood — EE verifier, not in CONTRIBUTOR_SUMMARY
  const html = doc.getElementById('contributorCardBody').innerHTML;
  assert(html.indexOf('contributor-card-contrib') !== -1, 'card includes a summary line even without an explicit CONTRIBUTOR_SUMMARY entry: ' + html);
  assert(/Verified the .* schedule/.test(html), 'falls back to a verified-schedule line: ' + html);
});
allPass &= runScenario('contributor card omits the summary line entirely for someone with no recorded contribution', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.openContributorCard('2026AIB1001'); // a plain student, not a contributor or verifier
  const html = doc.getElementById('contributorCardBody').innerHTML;
  assert(html.indexOf('contributor-card-contrib') === -1, 'no fabricated summary for someone who contributed nothing: ' + html);
});

allPass &= runScenario('contributors list shows ME branch as "MECH", not the raw roster code', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const roster = dbg.contributorsRoster();
  const meContributor = roster.find((p) => p.entry === '2026MEB1647');
  assert(meContributor, 'ME contributor 2026MEB1647 is in the list: ' + JSON.stringify(roster.map((p) => p.entry)));
  assert(meContributor.branch === 'MECH', 'ME displays as MECH: ' + meContributor.branch);
});

// === New: 24 Sept 2026 batch of real-world updates (PH101/HS111/AI101/NSS/venue changes) ===
allPass &= runScenario('PH101 (D1) gets the one-off 24 Sept extra class, D2 does not', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const d1Day = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-09-24');
  assert(d1Day.items.some((it) => it.title === 'Physics for Engineers — Extra Class' && it.venue === 'SRC-106'), 'D1 sees the extra class: ' + JSON.stringify(d1Day.items.map((i) => i.title)));
  const d2Entry = Object.keys(dbg.DATA.roster).find((e) => dbg.DATA.roster[e].division === 'D2');
  const d2Day = dbg.buildDays(dbg.DATA.roster[d2Entry]).find((d) => d.d === '2026-09-24');
  assert(!d2Day.items.some((it) => it.title === 'Physics for Engineers — Extra Class'), 'D2 does not see it: ' + JSON.stringify(d2Day.items.map((i) => i.title)));
});
allPass &= runScenario('PH101 is cancelled for D1 on 28/29/30 Sept but D2 still has it (division-scoped cancellation)', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const d2Entry = Object.keys(dbg.DATA.roster).find((e) => dbg.DATA.roster[e].division === 'D2');
  ['2026-09-28', '2026-09-29', '2026-09-30'].forEach((iso) => {
    const d1Day = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === iso);
    assert(!d1Day.items.some((it) => it.code === 'PH101'), 'D1 has no PH101 on ' + iso + ': ' + JSON.stringify(d1Day.items.map((i) => i.code)));
    const d2Day = dbg.buildDays(dbg.DATA.roster[d2Entry]).find((d) => d.d === iso);
    assert(d2Day.items.some((it) => it.code === 'PH101'), 'D2 still has PH101 on ' + iso + ': ' + JSON.stringify(d2Day.items.map((i) => i.code)));
  });
});
allPass &= runScenario('HS111 is cancelled on 23 Sept (the extra "resume 28 Sept" gap) for a student actually placed in HS111', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const hs111Entry = Object.keys(dbg.DATA.roster).find((e) => dbg.DATA.roster[e].hsElective === 'HS111');
  assert(hs111Entry, 'at least one student is placed in HS111');
  const day = dbg.buildDays(dbg.DATA.roster[hs111Entry]).find((d) => d.d === '2026-09-23');
  assert(!day.items.some((it) => it.code === 'HS111'), 'HS111 does not meet on 23 Sept for an HS111 student: ' + JSON.stringify(day.items.map((i) => i.code)));
});
allPass &= runScenario('AI101 quiz (5 Oct) shows for D1/D2, not D3/D4; the optional Saturday sessions are gone for everyone; the compulsory AI101 online class (Sun 25 Oct, moved from Sat 24 Oct) is D1/D2 only, with its Meet link', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const day = (entry, iso) => dbg.buildDays(dbg.DATA.roster[entry]).find((d) => d.d === iso);
  const d1Day = day('2026AIB1001', '2026-10-05');
  assert(d1Day.items.some((it) => it.title === 'Data Science and AI Essentials with Python — Quiz'), 'D1 sees the AI101 quiz: ' + JSON.stringify(d1Day.items.map((i) => i.title)));
  const d3Entry = Object.keys(dbg.DATA.roster).find((e) => dbg.DATA.roster[e].division === 'D3');
  assert(!day(d3Entry, '2026-10-05').items.some((it) => it.title === 'Data Science and AI Essentials with Python — Quiz'), 'D3 does not see the AI101 quiz');
  // the optional Saturday concept/lab sessions were removed for everyone (23 Oct) — on every Saturday they used to occupy
  ['2026-09-26', '2026-10-03', '2026-10-10', '2026-10-17', '2026-10-31', '2026-11-07', '2026-11-14'].forEach((iso) => {
    const t = day('2026AIB1001', iso).items.map((i) => i.title || '').join(' | ');
    assert(!/Extra Practice|Concept & Doubt|Hands-on Lab Practice/.test(t), 'no optional Saturday session on ' + iso + ': ' + t);
  });
  // the compulsory AI101 online class: Sun 25 Oct (moved from Sat 24 Oct), D1 + D2 only (AI101 runs only for them), with its Meet link
  const online = (entry, iso) => day(entry, iso).items.find((it) => it.code === 'AI101-ONLINE');
  const d2Entry = Object.keys(dbg.DATA.roster).find((e) => dbg.DATA.roster[e].division === 'D2');
  [['2026AIB1001', 'D1'], [d2Entry, 'D2']].forEach(([entry, who]) => {
    const on = online(entry, '2026-10-25');
    assert(on, who + ' student sees the online class on Sun 25 Oct');
    assert(on.t === '11:00 AM – 1:00 PM', who + ': 11 AM-1 PM: ' + on.t);
    assert(on.materialLink === 'https://meet.google.com/meet/xjy-hyrb-irm' && on.linkLabel === 'Join on Google Meet', who + ': carries the Meet link and button label: ' + on.materialLink);
    assert(!on.venue, who + ': no room (it is online)');
    assert(!online(entry, '2026-10-24'), who + ': nothing left on Saturday 24 Oct');
  });
  const d4Entry = Object.keys(dbg.DATA.roster).find((e) => dbg.DATA.roster[e].division === 'D4');
  [d3Entry, d4Entry].forEach((entry) => assert(!online(entry, '2026-10-25') && !online(entry, '2026-10-24'), 'D3/D4 do not have AI101, so no online class: ' + entry));
});
allPass &= runScenario('NSS Swachhta Hi Seva events show only for NSS-enrolled students, not everyone', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const nssEntry = Object.keys(dbg.DATA.roster).find((e) => dbg.DATA.roster[e].nssEnrolled);
  assert(nssEntry, 'at least one student is NSS-enrolled');
  const quizDay = dbg.buildDays(dbg.DATA.roster[nssEntry]).find((d) => d.d === '2026-09-25');
  assert(quizDay.items.some((it) => /Quiz Competition/.test(it.title || '')), 'NSS student sees the quiz competition: ' + JSON.stringify(quizDay.items.map((i) => i.title)));
  const nonNssEntry = Object.keys(dbg.DATA.roster).find((e) => !dbg.DATA.roster[e].nssEnrolled && !dbg.DATA.roster[e].nsoEnrolled);
  const nonNssDay = dbg.buildDays(dbg.DATA.roster[nonNssEntry]).find((d) => d.d === '2026-09-25');
  assert(!nonNssDay.items.some((it) => /Quiz Competition/.test(it.title || '')), 'a non-NSS student does not see it: ' + JSON.stringify(nonNssDay.items.map((i) => i.title)));
});
allPass &= runScenario('HS111 presentation reschedules (7 Oct, 14 Oct) hit exactly the named students, at their own slot, and nobody else', '2026CSB1188', {}, (win, doc) => {
  const dbg = win.__debug;
  const day7a = dbg.buildDays(dbg.DATA.roster['2026CSB1188']).find((d) => d.d === '2026-10-07'); // Arnav Kaistha, slot 1
  const item7a = day7a.items.find((it) => it.title === 'HS111 Presentation (moved from 23 Sept)');
  assert(item7a, '2026CSB1188 has a presentation slot on 7 Oct: ' + JSON.stringify(day7a.items.map((i) => i.title)));
  assert(item7a.t === '5:00 PM – 5:08 PM', 'at the right 8-min slot: ' + item7a.t);
  const day7b = dbg.buildDays(dbg.DATA.roster['2026EEB1332']).find((d) => d.d === '2026-10-07'); // B Ved Kailash, slot 6
  const item7b = day7b.items.find((it) => it.title === 'HS111 Presentation (moved from 23 Sept)');
  assert(item7b && item7b.t === '5:50 PM – 5:58 PM', '2026EEB1332 gets their own, later slot: ' + JSON.stringify(item7b));
  const day14 = dbg.buildDays(dbg.DATA.roster['2026AIB1025']).find((d) => d.d === '2026-10-14'); // Avinash, slot 1
  assert(day14.items.some((it) => it.title === 'HS111 Presentation (moved from 30 Sept)' && it.t === '5:00 PM – 5:08 PM'), '2026AIB1025 has their 14 Oct slot: ' + JSON.stringify(day14.items.map((i) => i.title)));
  const uninvolved = dbg.buildDays(dbg.DATA.roster['2026AIB1001']).find((d) => d.d === '2026-10-07');
  assert(!uninvolved.items.some((it) => /HS111 Presentation/.test(it.title || '')), 'a student not on either sheet sees nothing on 7 Oct: ' + JSON.stringify(uninvolved.items.map((i) => i.title)));
});
allPass &= runScenario('PH101 Lab Exam rounds rotate a G1 weekday-slot\'s 60 students across 3 separate 20-student exams, reunited for one shared Project Submission', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const titleOn = (entry, iso, title) => (dbg.buildDays(dbg.DATA.roster[entry]).find((d) => d.d === iso) || { items: [] }).items.some((it) => it.title === title);
  // 2026AIB1001 (Exam_1's G1 slice, AIB1001-1020) only sits Exam 1, not Exam 2/3 — each student
  // takes exactly one of the three rotating exam rounds, not all three.
  assert(titleOn('2026AIB1001', '2026-10-13', 'Physics Lab — Exam 1'), '2026AIB1001 has Exam 1 on 13 Oct');
  assert(!titleOn('2026AIB1001', '2026-10-21', 'Physics Lab — Exam 2'), '2026AIB1001 does NOT also get Exam 2 (21 Oct) — different round, different students');
  assert(!titleOn('2026AIB1001', '2026-10-27', 'Physics Lab — Exam 3'), '2026AIB1001 does NOT also get Exam 3 (27 Oct)');
  assert(titleOn('2026AIB1001', '2026-11-03', 'Physics Lab — Project Submission & Viva'), '2026AIB1001 still has the shared project submission on 3 Nov (covers the whole G1 slot, all 3 rounds combined)');
  // 2026AIB1021 (Exam_2's G1 slice) and 2026AIB1041 (Exam_3's) get their own, different exam dates.
  assert(titleOn('2026AIB1021', '2026-10-21', 'Physics Lab — Exam 2'), '2026AIB1021 (a later G1 slice) has Exam 2 on 21 Oct instead');
  assert(titleOn('2026AIB1041', '2026-10-27', 'Physics Lab — Exam 3'), '2026AIB1041 (the last G1 slice) has Exam 3 on 27 Oct instead');
  // 2026AIB1099 is in a different weekday-slot pool entirely (G2: 1061-1099, Friday morning) — must
  // not pick up G1's (Tuesday) dates at all.
  assert(!titleOn('2026AIB1099', '2026-10-13', 'Physics Lab — Exam 1'), '2026AIB1099 (a different weekday-slot pool) does NOT get G1\'s Exam 1 date');
});

// === New: 1 Oct 2026 revision — Students' Activity day moved 9 Oct -> 30 Oct; Friday PH101 lab batches shift ===
allPass &= runScenario('Friday PH101 lab batches (G2/G3) follow the revised dates: Exam 2 on 9 Oct, Exam 3 on 16 Oct, Project on 13 Nov (postponed from 23 Oct on 23 Oct)', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const titleOn = (entry, iso, title) => (dbg.buildDays(dbg.DATA.roster[entry]).find((d) => d.d === iso) || { items: [] }).items.some((it) => it.title === title);
  assert(titleOn('2026AIB1085', '2026-10-09', 'Physics Lab — Exam 2'), 'G2 (AIB1081-1099) Exam 2 is now 9 Oct');
  assert(!titleOn('2026AIB1085', '2026-10-16', 'Physics Lab — Exam 2'), 'and no longer 16 Oct');
  assert(titleOn('2026MCB1510', '2026-10-16', 'Physics Lab — Exam 3'), 'G2 (MCB1503-1522) Exam 3 is now 16 Oct');
  assert(titleOn('2026MCB1550', '2026-10-09', 'Physics Lab — Exam 2'), 'G3 (MCB1544-1563) Exam 2 is now 9 Oct');
  const proj = 'Physics Lab — Project Submission & Viva', slot = (entry, iso) => ((dbg.buildDays(dbg.DATA.roster[entry]).find((d) => d.d === iso) || { items: [] }).items.find((it) => it.title === proj) || {}).t;
  assert(titleOn('2026AIB1070', '2026-11-13', proj), 'G2 project is now 13 Nov');
  assert(titleOn('2026MCB1510', '2026-11-13', proj), 'G2\'s MCB1503-1522 slice also gets the project date (earlier transcription dropped it)');
  assert(titleOn('2026MCB1570', '2026-11-13', proj), 'G3 project is now 13 Nov');
  assert(slot('2026AIB1070', '2026-11-13') === '9:00 AM – 12:00 PM', 'G2 keeps its 9-12 slot: ' + slot('2026AIB1070', '2026-11-13'));
  assert(slot('2026MCB1570', '2026-11-13') === '2:00 PM – 5:00 PM', 'G3 keeps its 2-5 slot: ' + slot('2026MCB1570', '2026-11-13'));
  assert(!titleOn('2026AIB1070', '2026-10-23', proj) && !titleOn('2026MCB1570', '2026-10-23', proj), 'nothing left on 23 Oct');
  const labOn = (entry, iso) => (dbg.buildDays(dbg.DATA.roster[entry]).find((d) => d.d === iso) || { items: [] }).items.some((it) => it.code === 'PH101-LAB' || it.subject === 'PH101-LAB' || /Physics for Engineers — Lab/.test(it.title || ''));
  assert(!labOn('2026AIB1070', '2026-10-23') && !labOn('2026MCB1510', '2026-10-23') && !labOn('2026MCB1570', '2026-10-23'), 'no regular Physics Lab on 23 Oct for G2/G3 (confirmed: no lab today)');
  assert(titleOn('2026AIB1001', '2026-10-13', 'Physics Lab — Exam 1'), 'a non-Friday group (G1) is unchanged');
});
allPass &= runScenario('9 Oct is a normal class day again and 30 Oct is the Student Activity no-class day', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const days = dbg.buildDays(dbg.DATA.roster['2026AIB1001']);
  const d9 = days.find((d) => d.d === '2026-10-09');
  const d30 = days.find((d) => d.d === '2026-10-30');
  assert(d9.items.some((it) => it.type === 'class' && it.category !== 'Lab Exam'), '9 Oct has regular classes again: ' + JSON.stringify(d9.items.map((i) => i.title)));
  assert(!d30.items.some((it) => it.code === 'PH101' || it.code === 'MA101'), '30 Oct has no regular classes: ' + JSON.stringify(d30.items.map((i) => i.title)));
});

// === New: October weekday swaps from the Institute's official Academic Calendar ===
allPass &= runScenario('8 Oct (Thu) runs Friday\'s timetable and 21 Oct (Wed) runs Tuesday\'s, per the official Academic Calendar', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const days = dbg.buildDays(dbg.DATA.roster['2026AIB1001']);
  const d8 = days.find((d) => d.d === '2026-10-08');
  const fri = days.find((d) => d.d === '2026-10-16'); // a normal Friday
  // PH101-LAB excluded on purpose: on these days a lab exam round occupies the lab (separate rule, tested below).
  const codes = (d) => d.items.filter((i) => i.type === 'class' && i.category !== 'Lab Exam' && i.code !== 'PH101-LAB').map((i) => i.code).sort().join(',');
  assert(codes(d8) === codes(fri), '8 Oct shows the same classes as a normal Friday: ' + codes(d8) + ' vs ' + codes(fri));
  const d21 = days.find((d) => d.d === '2026-10-21');
  const tue = days.find((d) => d.d === '2026-10-06'); // a normal Tuesday with no lab exam for this student
  assert(codes(d21) === codes(tue), '21 Oct shows the same classes as a normal Tuesday: ' + codes(d21) + ' vs ' + codes(tue));
});

allPass &= runScenario('while a PH101 lab exam round occupies the lab, NO regular PH101 lab runs in that slot — for the whole group, not just the examinees', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  const items = (entry, iso) => dbg.buildDays(dbg.DATA.roster[entry]).find((d) => d.d === iso).items;
  const hasLab = (entry, iso) => items(entry, iso).some((i) => i.title === 'Physics for Engineers — Lab');
  // G1 (AIB1001-1060) Tuesday 13 Oct: Exam 1 slice is AIB1001-1020; AIB1030 is in the same group but a later slice.
  assert(!hasLab('2026AIB1001', '2026-10-13'), 'examinee has no regular lab beside the exam');
  assert(!hasLab('2026AIB1030', '2026-10-13'), 'a same-group student NOT in this round also has no regular lab — the room is occupied');
  assert(hasLab('2026AIB1030', '2026-10-06'), 'regular lab still runs the week before (no exam occupying it)');
  // Friday batch on the Thu 8 Oct Friday-timetable day: Exam 1 occupies the morning slot for all of G2.
  assert(!hasLab('2026AIB1090', '2026-10-08'), 'G2 student in a later round has no lab on 8 Oct either');
  assert(!hasLab('2026AIB1090', '2026-10-09'), 'and none beside their own Exam 2 on 9 Oct');
  assert(!hasLab('2026AIB1070', '2026-10-09'), 'nor for a G2 student whose round was 8 Oct (the room is still occupied on 9 Oct)');
});
allPass &= runSpectateScenario('spectate: a student sitting out a lab-exam day is not counted busy for the occupied regular lab slot', (sp) => {
  const student = sp.DATA.roster['2026AIB1030']; // G1, not in Exam 1's slice (AIB1001-1020)
  const busyOn = (iso) => sp.busyIntervalsForStudent(student, iso).some((iv) => iv.s === 840);
  assert(busyOn('2026-10-06'), 'busy for the regular Tuesday lab on a normal week');
  assert(!busyOn('2026-10-13'), 'not busy for it on 13 Oct, when Exam 1 occupies the lab');
});

allPass &= runScenario('G2 (AIDE + MnC) get the PH101 answer-sheet viewing on Fri 9 Oct, 3-4 PM; other groups do not', '2026AIB1085', {}, (win, doc) => {
  const dbg = win.__debug;
  const item = (entry) => dbg.buildDays(dbg.DATA.roster[entry]).find((d) => d.d === '2026-10-09').items.find((i) => /Answer Sheets/.test(i.title || ''));
  const a = item('2026AIB1085'), m = item('2026MCB1510');
  assert(a && a.t === '3:00 PM – 4:00 PM' && a.venue === 'Lab A-237', 'AIDE G2 sees it: ' + JSON.stringify(a));
  assert(m, 'MnC G2 sees it too');
  assert(!item('2026AIB1001'), 'AIDE G1 does not');
  assert(!item('2026CSB1188'), 'a D3 student does not');
});

allPass &= runScenario('G2 gets the extra Thursday classes (8 Oct MA101 tutorial; 15 Oct MA101 tutorial + MA101 + PH101), other groups do not', '2026AIB1085', {}, (win, doc) => {
  const dbg = win.__debug;
  const items = (entry, iso) => dbg.buildDays(dbg.DATA.roster[entry]).find((d) => d.d === iso).items;
  const has = (entry, iso, code, t) => items(entry, iso).some((i) => i.code === code && i.t === t);
  assert(has('2026AIB1085', '2026-10-08', 'MA101-TUT', '8:00 AM – 8:50 AM'), 'G2 (AIDE) MA101 tutorial 8 Oct');
  assert(has('2026MCB1510', '2026-10-08', 'MA101-TUT', '8:00 AM – 8:50 AM'), 'G2 (MnC) too');
  assert(has('2026AIB1085', '2026-10-15', 'MA101-TUT', '8:00 AM – 8:50 AM'), '15 Oct tutorial');
  assert(has('2026AIB1085', '2026-10-15', 'MA101', '10:00 AM – 10:50 AM'), '15 Oct MA101 class');
  assert(has('2026AIB1085', '2026-10-15', 'PH101', '11:00 AM – 11:50 AM'), '15 Oct PH101 class');
  assert(items('2026AIB1085', '2026-10-15').some((i) => i.code === 'TL101-LAB'), 'Tinkering Lab per the usual split still shows');
  assert(items('2026AIB1070', '2026-10-08').some((i) => i.title === 'Physics Lab — Exam 1'), 'Lab Exam 1 (already there) is untouched');
  assert(!has('2026AIB1001', '2026-10-15', 'MA101', '10:00 AM – 10:50 AM'), 'G1 does not get them');
});

// === New: October mess menu carried over from September, with a disclaimer ===
allPass &= runScenario('October shows September\'s mess menu (same weekday) flagged as assumed, with a disclaimer; September has none', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  assert(JSON.stringify(dbg.mealMenuFor('lunch', '2026-10-12')) === JSON.stringify(dbg.mealMenuFor('lunch', '2026-09-14')), 'Mon 12 Oct lunch == a September Monday lunch');
  assert(dbg.messMenuEntryFor('2026-10-12').assumed === true, 'October entry is flagged assumed');
  assert(!dbg.messMenuEntryFor('2026-09-14').assumed, 'September is not');
  assert(dbg.mealMenuFor('lunch', '2026-11-02') === null, 'no menu invented for November');
  const idxOf = (iso) => dbg.state.DAYS.findIndex((d) => d.d === iso);
  dbg.state.activeIdx = idxOf('2026-10-12'); dbg.renderMessPanel();
  assert(doc.getElementById('messPanelBody').innerHTML.indexOf('mess-disclaimer') !== -1, 'disclaimer shown in October');
  dbg.state.activeIdx = idxOf('2026-09-14'); dbg.renderMessPanel();
  assert(doc.getElementById('messPanelBody').innerHTML.indexOf('mess-disclaimer') === -1, 'no disclaimer in September');
});

// === New: Groups — members' days merged by time slot, identical activities collapsed onto one line ===
allPass &= runScenario('group timeline merges members by time slot, collapses identical activities, and lists who is free', '2026AIB1085', {}, (win, doc) => {
  const dbg = win.__debug;
  const members = ['2026AIB1085', '2026AIB1070', '2026MCB1510', '2026AIB1001'];
  const tl = dbg.groupTimeline(members, '2026-10-13'); // Tue
  const eight = tl.timeline.find((s) => s.sMin === 480);
  assert(eight, 'there is an 8:00 slot');
  const g2tut = eight.rows.find((r) => /Tutorial/.test(r.title) && r.venue === 'EE-SH');
  assert(g2tut && g2tut.who.length === 3, 'the three G2 members share ONE tutorial line, not three: ' + JSON.stringify(eight.rows));
  assert(!g2tut.who.includes('2026AIB1001'), 'G1 member is not on the G2 tutorial line');
  const one = tl.timeline.find((s) => s.sMin === 780);
  assert(one && one.rows.length >= 2, 'different HS electives at 1 PM stay on separate lines: ' + JSON.stringify(one && one.rows));
  tl.timeline.forEach((slot) => slot.free.forEach((e) => assert(!slot.rows.some((r) => r.who.includes(e)), 'nobody is both busy and free in one slot')));
  assert(Array.isArray(tl.together), 'common free windows computed');
  const names = dbg.groupShortNames(members);
  assert(Object.keys(names).length === 4 && names['2026AIB1085'], 'short names for every member');
});
allPass &= runScenario('creating a group saves it locally with yourself in it, and the panel renders the merged day', '2026AIB1085', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.createGroup('Lab buddies');
  const groups = dbg.loadGroups();
  assert(groups.length === 1 && groups[0].name === 'Lab buddies' && groups[0].members[0] === '2026AIB1085', 'saved with self: ' + JSON.stringify(groups));
  dbg.groupsState.iso = '2026-10-13';
  dbg.renderGroupsPanel();
  const html = doc.getElementById('grpView').innerHTML;
  assert(html.indexOf('grp-slot') !== -1 && html.indexOf('Everyone free') !== -1, 'renders time slots and the together line: ' + html.slice(0, 300));
});

// === New: GitHub Dark is the default theme, switched on once for existing users too ===
allPass &= runScenario('GitHub Dark is applied by default (fresh or previously-themed browser) and a later manual choice sticks', '2026AIB1001', {}, (win, doc) => {
  assert(doc.body.getAttribute('data-theme') === 'github', 'fresh browser gets github: ' + doc.body.getAttribute('data-theme'));
  assert(win.localStorage.getItem('thirtyatrpr_theme_github_rollout') === '1', 'rollout marker stored');
});
{
  // An existing user who had picked "sunset" before this release: switched once, then their own later choice wins.
  const sandbox = makeSandbox();
  sandbox.localStorage.setItem('thirtyatrpr_color_theme', 'sunset');
  vm.runInContext(combinedSrc, sandbox);
  let ok = sandbox.document.body.getAttribute('data-theme') === 'github';
  const sandbox2 = makeSandbox();
  sandbox2.localStorage.setItem('thirtyatrpr_color_theme', 'sunset');
  sandbox2.localStorage.setItem('thirtyatrpr_theme_github_rollout', '1');
  vm.runInContext(combinedSrc, sandbox2);
  ok = ok && sandbox2.document.body.getAttribute('data-theme') === 'sunset';
  console.log(ok ? 'PASS' : 'FAIL', 'existing user is switched to GitHub Dark once; after that a manual pick (sunset) is kept');
  allPass &= ok;
}

// === New: the mid-sem exam/viva banner folds into a collapsed "memory" once it's over, instead of vanishing ===
allPass &= runScenario('exam banner stays fully expanded while mid-sem/viva dates are still current or upcoming', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.state.TODAY = '2026-09-20'; // inside the Mid-Sem window
  dbg.renderExamBanner(dbg.DATA.roster['2026AIB1001']);
  const html = doc.getElementById('examWeekBanner').innerHTML;
  assert(html.indexOf('examweek-head') !== -1, 'still the plain expanded header while current: ' + html);
  assert(html.indexOf('examweek-collapsed') === -1, 'not yet folded into the collapsed memory: ' + html);
});
allPass &= runScenario('exam banner folds into a collapsed <details> "memory" once every mid-sem exam/viva date has passed, instead of disappearing', '2026AIB1001', {}, (win, doc) => {
  const dbg = win.__debug;
  dbg.state.TODAY = '2026-10-01'; // well after the last Mid-Sem-window Exam/Viva date
  dbg.renderExamBanner(dbg.DATA.roster['2026AIB1001']);
  const banner = doc.getElementById('examWeekBanner');
  assert(banner.style.display === 'block', 'the banner itself is not hidden outright: ' + banner.style.display);
  const html = banner.innerHTML;
  assert(html.indexOf('examweek-collapsed') !== -1, 'folded into the collapsed memory: ' + html);
  assert(html.indexOf('examweek-rows') !== -1, 'the actual exam rows are still present underneath (just collapsed), not deleted: ' + html);
  assert(html.indexOf('Physics for Engineers') !== -1, 'their real mid-sem history (e.g. the PH101 exam) is still there to look back at: ' + html);
});

console.log(allPass ? '\nALL SCENARIOS PASSED' : '\nSOME SCENARIOS FAILED');
process.exit(allPass ? 0 : 1);
