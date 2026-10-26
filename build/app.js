(function(){
'use strict';
var DATA = THIRTY_DATA;
var LS_KEY = 'thirtyatrpr_entry';

/* ---------------- time helpers ---------------- */
var TIME_ORDER = {
  '8.00 - 8.50': 480, '9.00 - 9.50': 540, '10.00 - 10. 50': 600, '10.00 - 10.50': 600,
  '11.00 - 11.50': 660, '12.00 - 12. 50': 720, '12.00 - 12.50': 720,
  '2.00 - 2.50': 840, '3.00 - 3.50': 900, '4.00 - 4.50': 960,
  '5.00 - 5.50': 1020, '6.00- 6.50': 1080, '6.00 - 6.50': 1080, '7.00-7.50': 1140, '7.00 - 7.50': 1140
};
function timeSort(t){ return TIME_ORDER[t] !== undefined ? TIME_ORDER[t] : 9999; }

function pad(n){ return String(n).padStart(2,'0'); }
function todayDate(){ return new Date(); }
function todayISO(d){ d = d || todayDate(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
var WEEKDAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function todayWeekday(d){ d = d || todayDate(); return WEEKDAY_NAMES[d.getDay()]; }
function nowMinutes(){ var d = todayDate(); return d.getHours()*60 + d.getMinutes(); }
function hhmmToMin(hhmm){ var p = hhmm.split(':').map(Number); return p[0]*60+p[1]; }
function to12(hhmm){
  var m = hhmmToMin(hhmm);
  var h = Math.floor(m/60), mm = m%60;
  var ap = h >= 12 ? 'PM' : 'AM';
  var h12 = h % 12; if(h12===0) h12=12;
  return h12+':'+pad(mm)+' '+ap;
}
function fmtDateLabel(iso){
  var d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'long'});
}

/* ---------------- matching logic ---------------- */
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

/* ---------------- state ---------------- */
var state = { student: null, ttDay: null, orDate: null };

/* ---------------- login ---------------- */
var loginScreen = document.getElementById('loginScreen');
var appEl = document.getElementById('app');
var entryInput = document.getElementById('entryInput');
var loginBtn = document.getElementById('loginBtn');
var loginErr = document.getElementById('loginErr');

function normalizeEntry(v){ return (v||'').trim().toUpperCase().replace(/\s+/g,''); }

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

document.getElementById('logoutBtn').addEventListener('click', function(){
  localStorage.removeItem(LS_KEY);
  state.student = null;
  appEl.classList.remove('show');
  loginScreen.style.display = 'flex';
  entryInput.value = '';
  loginErr.textContent = '';
  entryInput.focus();
});

/* ---------------- boot ---------------- */
function bootApp(student){
  state.student = student;
  loginScreen.style.display = 'none';
  appEl.classList.add('show');
  document.getElementById('topName').textContent = student.name;
  renderProfile(student);
  initTabs();
  renderHome(student);
  renderTimetable(student);
  renderOrientation(student);
}

(function initialLoad(){
  var saved = localStorage.getItem(LS_KEY);
  if(saved && DATA.roster[saved]){
    bootApp(DATA.roster[saved]);
  } else {
    loginScreen.style.display = 'flex';
  }
})();

/* ---------------- profile ---------------- */
function initials(name){
  var parts = name.trim().split(/\s+/);
  var s = parts[0][0] + (parts.length>1 ? parts[1][0] : (parts[0][1]||''));
  return s.toUpperCase();
}
function renderProfile(student){
  var branchName = DATA.branchNames[student.branch] || student.branch;
  var agNum = student.academicGroup ? student.academicGroup.replace('G','') : null;
  var mismatch = student.ismpGroup && agNum && String(student.ismpGroup) !== agNum;
  var html = '';
  html += '<div class="profile-top">';
  html += '<div class="avatar">'+initials(student.name)+'</div>';
  html += '<div><div class="profile-name">'+student.name+'</div>';
  html += '<div class="profile-branch">'+branchName+'</div>';
  html += '<div class="profile-entry">'+student.entry+'</div></div>';
  html += '</div>';
  html += '<div class="chip-row">';
  html += '<div class="chip accent"><span class="k">Division</span> '+(student.division||'—')+'</div>';
  html += '<div class="chip"><span class="k">Academic Group</span> '+(student.academicGroup||'—')+'</div>';
  if(student.ismpGroup){
    html += '<div class="chip'+(mismatch?' mismatch':'')+'"><span class="k">ISMP Group</span> '+student.ismpGroup+'</div>';
  } else {
    html += '<div class="chip"><span class="k">ISMP Group</span> pending</div>';
  }
  html += '</div>';
  if(mismatch){
    html += '<div class="mentor-line">Heads up — your academic group and ISMP (orientation) group are numbered differently this time. Timetable uses Academic Group '+student.academicGroup+', Orientation uses ISMP Group '+student.ismpGroup+'.</div>';
  }
  if(student.mentor){
    html += '<div class="mentor-line"><b>Mentor:</b> '+student.mentor+(student.mentorEntry ? ' ('+student.mentorEntry+')' : '')+'</div>';
  }
  document.getElementById('profileCard').innerHTML = html;
}

/* ---------------- tabs ---------------- */
function initTabs(){
  var btns = document.querySelectorAll('.tabbtn');
  btns.forEach(function(b){
    b.addEventListener('click', function(){
      btns.forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); });
      document.getElementById('sec-'+b.dataset.tab).classList.add('active');
    });
  });
}

/* ---------------- mess ---------------- */
function messStatusHTML(student, dateForSunCheck){
  var m = DATA.mess;
  var isSun = todayWeekday(dateForSunCheck) === 'Sunday';
  var lunch = isSun ? m.lunchSun : m.lunch;
  var windows = [
    {label:'Breakfast', s:m.breakfast.s, e:m.breakfast.e},
    {label: isSun ? 'Lunch (Sunday)' : 'Lunch', s:lunch.s, e:lunch.e},
    {label:'Dinner', s:m.dinner.s, e:m.dinner.e}
  ];
  var now = nowMinutes();
  var html = '<div class="card"><h3>Mess Timings</h3><div class="mess-grid">';
  windows.forEach(function(w){
    var s = hhmmToMin(w.s), e = hhmmToMin(w.e);
    var isNow = now>=s && now<=e;
    html += '<div class="mess-item'+(isNow?' now':'')+'"><div class="ml">'+w.label+(isNow?' &middot; now':'')+'</div><div class="mt">'+to12(w.s)+' &ndash; '+to12(w.e)+'</div></div>';
  });
  html += '</div><div class="mess-note">Sunday lunch runs 12:30&ndash;2:30 PM; every other day 12:15&ndash;2:30 PM.</div></div>';
  return html;
}

/* ---------------- home ---------------- */
function renderHome(student){
  var el = document.getElementById('sec-home');
  var now = todayDate();
  var wd = todayWeekday(now);
  var iso = todayISO(now);
  var html = '';
  html += messStatusHTML(student, now);

  // today's classes (only Mon-Fri)
  html += '<div class="card"><h3>Today’s Classes</h3>';
  if(DATA.timetable[wd]){
    var slots = DATA.timetable[wd].filter(function(e){ return ttMatches(e, student); });
    slots.sort(function(a,b){ return timeSort(a.time)-timeSort(b.time); });
    if(slots.length){
      slots.forEach(function(s){ html += slotHTML(s); });
    } else {
      html += '<div class="empty-note"><div class="big">&#9749;</div>Nothing on your personal timetable for today.</div>';
    }
  } else {
    html += '<div class="empty-note"><div class="big">&#127793;</div>No classes on '+wd+'s.</div>';
  }
  html += '</div>';

  // today's orientation events
  var day = DATA.ismpSchedule.find(function(d){ return d.date === iso; });
  html += '<div class="card"><h3>Today in Orientation</h3>';
  if(day){
    var items = day.items.filter(function(it){ return ismpMatches(it, student); });
    if(items.length){
      items.forEach(function(it){ html += eventHTML(it, student); });
    } else {
      html += '<div class="empty-note">Nothing listed for your group today.</div>';
    }
  } else {
    html += '<div class="empty-note">'+iso+' is outside the orientation calendar (27 Jul &ndash; 25 Aug).</div>';
  }
  html += '</div>';

  el.innerHTML = html;
}

/* ---------------- timetable tab ---------------- */
var WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
function renderTimetable(student){
  var el = document.getElementById('sec-timetable');
  var wd = todayWeekday();
  state.ttDay = WEEK_DAYS.indexOf(wd) !== -1 ? wd : 'Monday';

  var html = '<div class="weekpills" id="weekpills">';
  WEEK_DAYS.forEach(function(d){
    var isToday = d === wd;
    html += '<button class="weekpill'+(d===state.ttDay?' active':'')+(isToday?' today':'')+'" data-day="'+d+'">'+d.slice(0,3)+(isToday?' &bull;':'')+'</button>';
  });
  html += '</div><div id="ttList"></div>';
  el.innerHTML = html;

  document.querySelectorAll('#weekpills .weekpill').forEach(function(b){
    b.addEventListener('click', function(){
      state.ttDay = b.dataset.day;
      document.querySelectorAll('#weekpills .weekpill').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      renderTTList(student);
    });
  });
  renderTTList(student);
}
function slotHTML(s){
  var venueDesc = '';
  if(s.venue){
    var key = s.venue.replace(/[\s\-()]/g,'').toUpperCase();
    var leg = DATA.venueLegend[key];
    if(leg && leg.desc) venueDesc = leg.desc;
  }
  return '<div class="slot"><div class="slot-time">'+dispTime(s.time)+'<span class="cat">'+(s.category||'')+'</span></div>' +
    '<div class="slot-body"><div class="slot-subject">'+s.subject+'</div>' +
    (s.venue ? '<div class="slot-venue">'+s.venue+(venueDesc?'<span class="vd">'+venueDesc+'</span>':'')+'</div>' : (s.universal ? '<div class="slot-venue">as scheduled</div>' : '')) +
    '</div></div>';
}
function dispTime(t){
  if(!t) return '';
  var mins = timeSort(t);
  if(mins===9999) return t;
  var h = Math.floor(mins/60), m = mins%60;
  var ap = h>=12 ? 'PM' : 'AM';
  var h12 = h%12; if(h12===0) h12=12;
  return h12+':'+pad(m)+' '+ap;
}
function renderTTList(student){
  var list = document.getElementById('ttList');
  var slots = (DATA.timetable[state.ttDay]||[]).filter(function(e){ return ttMatches(e, student); });
  slots.sort(function(a,b){ return timeSort(a.time)-timeSort(b.time); });
  if(!slots.length){
    list.innerHTML = '<div class="card"><div class="empty-note"><div class="big">&#9749;</div>Nothing on your personal timetable for '+state.ttDay+'.<br>(Electives/labs not yet tagged to your division will appear here once confirmed.)</div></div>';
    return;
  }
  list.innerHTML = '<div class="card"><h3>'+state.ttDay+'</h3>'+slots.map(slotHTML).join('')+'</div>';
}

/* ---------------- orientation tab ---------------- */
function clampOrientationIndex(){
  var iso = todayISO();
  var idx = DATA.ismpSchedule.findIndex(function(d){ return d.date === iso; });
  if(idx !== -1) return idx;
  if(iso < DATA.ismpSchedule[0].date) return 0;
  return DATA.ismpSchedule.length - 1;
}
function renderOrientation(student){
  var el = document.getElementById('sec-orientation');
  var startIdx = clampOrientationIndex();
  state.orIdx = startIdx;

  var html = '<div class="daystrip-wrap"><div class="daystrip" id="daystrip">';
  var todayIso = todayISO();
  DATA.ismpSchedule.forEach(function(d, i){
    var dnum = d.date.slice(8);
    html += '<div class="daychip'+(i===startIdx?' active':'')+(d.date===todayIso?' today':'')+'" data-idx="'+i+'">' +
      '<div class="dow">'+d.day.slice(0,3)+'</div><div class="dnum">'+parseInt(dnum,10)+'</div></div>';
  });
  html += '</div></div><div id="orList"></div>';
  el.innerHTML = html;

  document.querySelectorAll('#daystrip .daychip').forEach(function(chip){
    chip.addEventListener('click', function(){
      state.orIdx = parseInt(chip.dataset.idx, 10);
      document.querySelectorAll('#daystrip .daychip').forEach(function(x){ x.classList.remove('active'); });
      chip.classList.add('active');
      chip.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
      renderOrList(student);
    });
  });
  renderOrList(student);
  setTimeout(function(){
    var active = document.querySelector('#daystrip .daychip.active');
    if(active) active.scrollIntoView({behavior:'instant', inline:'center', block:'nearest'});
  }, 30);
}
function eventHTML(it, student){
  var typeTag = it.type === 'sport' ? '<span class="tag sport">Sport</span>'
    : it.type === 'common' ? '<span class="tag common">Institute-wide</span>'
    : '<span class="tag mine">Your group</span>';
  var venueTag = it.venue ? '<span class="tag venue">'+it.venue+'</span>' : '';
  return '<div class="ev"><div class="ev-time">'+(it.time||'&mdash;')+'</div>' +
    '<div class="ev-body"><div class="ev-title">'+it.title+'</div>' +
    '<div class="ev-meta">'+typeTag+venueTag+'</div></div></div>';
}
function renderOrList(student){
  var list = document.getElementById('orList');
  var day = DATA.ismpSchedule[state.orIdx];
  if(!day){ list.innerHTML=''; return; }
  var items = day.items.filter(function(it){ return ismpMatches(it, student); });
  var html = '<div class="card"><div class="daylabel">'+day.day+'<span class="sub">'+fmtDateLabel(day.date)+'</span></div>';
  if(items.length){
    items.forEach(function(it){ html += eventHTML(it, student); });
  } else {
    html += '<div class="empty-note">'+(student.ismpGroup ? 'Nothing listed for your group on this day.' : 'Your ISMP group isn’t in our records yet, so only institute-wide events show here.') +'</div>';
  }
  html += '</div>';
  list.innerHTML = html;
}

})();
