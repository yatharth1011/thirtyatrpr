/* Cohort picker shared by /spectate and /br (spliced in after build/engine.js). Nothing to type:
   every choice is a chip built from the data itself — divisions, groups, branches, branch-qualified
   groups (only for the group labels two branches share), the finest entry ranges the timetable
   actually uses, and "kinds" (HS/IKS sections, NSO, NSS, Life Skills slots, lab batches). A mode
   switch decides what a tap does — Add (∪), Narrow (∩), Remove (−) — so "CSE ∩ HS110" or
   "D1 − G2" are two taps, and the widen/narrow rows jump to the selection's supersets/subsets.
   Exposes PICKER.mount(el, opts). */
var PICKER = (function(){
'use strict';
var E = ENGINE;
var esc = E.escapeHtml;

function mount(el, opts){
  opts = opts || {};
  var universe = opts.universe || null;         // idxs a BR is limited to (their branch), or null
  var uniMask = universe ? E.maskOf(universe) : null;
  var state = { ops: (opts.initial || []).slice(), mode: 'add', past: [], q: [], qCur: 0, qSearch: '' };   // qCur: cursor position in the query (0 = before the first piece)   // q: the set query being built (opts.query)
  var openSections = { div: true, grp: true };
  // Advanced mode (opts.query): the set-query builder instead of the chip sections; off by default, remembered per device
  try { state.adv = !!opts.query && localStorage.getItem('thirtyatrpr_picker_adv') === '1'; } catch(e){ state.adv = false; }

  function partOf(u){ return uniMask ? E.intersect(u.idxs, uniMask) : u.idxs; }
  function visible(u){ return partOf(u).length > 0; }
  function selection(){ return E.evalSelection(state.ops, universe); }
  function label(idxs){
    if(!idxs.length) return 'nobody yet';
    if(state.ops.length === 1 && state.ops[0].op === 'expr') return E.queryText(state.ops[0].tokens);   // a query names itself
    return E.describe(idxs).join(' + ');
  }

  /* ---- set query builder (opts.query): built only with buttons; the search box just finds a set to add ---- */
  // everything works at the cursor (state.qCur), so a "(" can go in front of what is already there and a ")" after it
  function qBefore(){ return state.q[state.qCur - 1]; }
  function qAfter(){ return state.q[state.qCur]; }
  function isOperand(t){ return !!t && (t.t === 'set' || t.t === ')'); }
  function startsOperand(t){ return !!t && (t.t === 'set' || t.t === '(' || t.t === 'not'); }
  function qOpenParens(){ var n = 0; state.q.forEach(function(t){ if(t.t === '(') n++; else if(t.t === ')') n--; }); return n; }
  function qOpenBeforeCursor(){ var n = 0; state.q.slice(0, state.qCur).forEach(function(t){ if(t.t === '(') n++; else if(t.t === ')') n--; }); return n; }
  function qEndsOperand(){ return isOperand(qBefore()); }
  function qPut(list){ state.q.splice.apply(state.q, [state.qCur, 0].concat(list)); state.qCur += list.length; }
  // a set (or a "(" / "¬") placed next to another operand gets joined with ∪ on that side — visible, ⌫ removes it
  function qInsertOperandStart(tk, closesItself){
    var list = [];
    if(qEndsOperand()) list.push({ t: 'op', v: '∪' });
    list.push(tk);
    qPut(list);
    if(closesItself && startsOperand(qAfter())){ state.q.splice(state.qCur, 0, { t: 'op', v: '∪' }); }
  }
  function qInsertSet(id){ qInsertOperandStart({ t: 'set', id: id }, true); }
  // the selection follows the query by itself: whenever it is complete and valid it becomes the selection (cleared query -> nobody)
  function qChanged(){
    var r = E.queryEval(state.q, universe);
    if(!state.q.length){ if(state.ops.length){ state.ops = []; changed(); return; } render(); return; }
    if(!r.error && qOpenParens() === 0){ state.ops = [{ op: 'expr', tokens: state.q.slice() }]; changed(); return; }
    render();
  }
  function qSuggest(){
    var term = state.qSearch.trim().toLowerCase();
    var pool = E.UNITS.filter(function(u){ return u.level !== 'atom' && visible(u); });
    var list = term
      ? pool.filter(function(u){ return (u.label + ' ' + (u.sub || '') + ' ' + (u.family || '')).toLowerCase().indexOf(term) !== -1; }).slice(0, 24)
      : pool.filter(function(u){ return u.level === 'all' || u.level === 'division' || u.level === 'group' || u.level === 'branch'; });
    if(!list.length) return '<span class="muted">no set matches “' + esc(state.qSearch) + '”</span>';
    return list.map(function(u){ return '<button class="chip" data-qset="' + u.id + '">' + esc(u.label) + ' <span class="n">' + partOf(u).length + '</span></button>'; }).join('');
  }
  function qWords(tokens){
    return tokens.map(function(t){
      if(t.t === 'set'){ var u = E.UNIT_BY_ID[t.id]; return '<b>' + esc(u ? u.label : '?') + '</b>'; }
      if(t.t === 'op') return t.v === '∪' ? ' or ' : t.v === '∩' ? ' and also in ' : ' but not in ';
      if(t.t === 'not') return universe ? 'everyone in your branch except ' : 'everyone except ';
      return t.t === '(' ? '(' : ')';
    }).join('');
  }
  function queryHtml(){
    var r = E.queryEval(state.q, universe), ends = qEndsOperand(), open = qOpenParens();
    var canOp = ends, canOpen = true, canClose = ends && qOpenBeforeCursor() > 0;
    var caret = '<span class="pq-caret" aria-hidden="true"></span>';
    var expr = state.q.length
      ? '<button class="pq-start" data-qat="0" title="put the cursor at the start">' + (state.qCur === 0 ? caret : '') + '</button>' +
        state.q.map(function(t, i){
          var inner = t.t === 'set' ? esc((E.UNIT_BY_ID[t.id] || {}).label || '?') : (t.t === 'op' ? t.v : t.t === 'not' ? '¬' : t.t);
          return '<button class="' + (t.t === 'set' ? 'pq-tok' : 'pq-sym') + '" data-qat="' + (i + 1) + '" title="put the cursor after this">' + inner + '</button>' + (state.qCur === i + 1 ? caret : '');
        }).join('')
      : '<span class="muted">start with a set below, or ¬ / (</span>';
    var btn = function(attr, label, on, title){ return '<button class="btn btn-sm pq-b" ' + attr + (on ? '' : ' disabled') + ' title="' + title + '">' + label + '</button>'; };
    // unfinished is not wrong: while a set or a ")" is still to come, prompt the next step instead of flagging an error
    var pending = r.error && (/ends too early/.test(r.error) || /never closed/.test(r.error));
    var result = !state.q.length ? '' : pending
      ? '<div class="pq-result">next: ' + (/never closed/.test(r.error) && ends ? 'close the bracket with )' : 'pick a set below') + '</div>'
      : r.error
      ? '<div class="pq-result pq-err">' + esc(r.error) + '</div>'
      : '<div class="pq-result"><b>' + r.idxs.length + '</b> student' + (r.idxs.length === 1 ? '' : 's') + (r.idxs.length ? ' · ' + esc(E.describe(r.idxs).join(' + ')) : '') + '</div>';
    return '<div class="pq">' +
      '<div class="pq-hint">Build a group of students: pick a set, then choose how the next one combines with it. Brackets group parts together.</div>' +
      '<div class="pq-expr">' + expr + '</div>' +
      (state.q.length ? '<div class="pq-read">Students in ' + qWords(state.q) + '</div>' : '') +
      '<div class="pq-ops">' +
        btn('data-qop="∪"', '∪ or', canOp, 'union: in either set') + btn('data-qop="∩"', '∩ and', canOp, 'intersection: in both sets') +
        btn('data-qop="−"', '− not in', canOp, 'difference: in the first, not the second') + btn('data-qop="not"', '¬ all but', canOpen, 'complement: everyone except the next set') +
        btn('data-qop="("', '(', canOpen, 'open a bracket') + btn('data-qop=")"', ')', canClose, 'close a bracket') +
        btn('data-qact="left"', '◀', state.qCur > 0, 'move the cursor left') + btn('data-qact="right"', '▶', state.qCur < state.q.length, 'move the cursor right') +
        btn('data-qact="back"', '⌫', state.qCur > 0, 'remove the piece before the cursor') + btn('data-qact="clear"', 'Clear', state.q.length, 'start over') +
      '</div>' + result +
      '<input class="pq-search" type="search" placeholder="Find a set — G3, HS110, PH101 lab, NSO…" value="' + esc(state.qSearch) + '" autocomplete="off">' +
      '<div class="chips pq-sugg">' + qSuggest() + '</div>' +
    '</div>';
  }
  function apply(op, id){
    state.past.push(state.ops.slice());
    if(op === 'set') state.ops = [{ op: 'add', id: id }];
    else state.ops.push({ op: op, id: id });
    changed();
  }
  function changed(){ render(); if(opts.onChange) opts.onChange(api.get()); }

  function chip(u, selMask){
    var part = partOf(u);
    var inCount = 0;
    for(var i=0;i<part.length;i++) if(selMask[part[i]]) inCount++;
    var cls = inCount === part.length && part.length ? ' on' : (inCount ? ' part' : '');
    return '<button class="chip'+cls+'" data-unit="'+u.id+'" title="'+esc(u.sub || '')+'">'+esc(u.label)+
      (u.sub && u.level !== 'branch' && u.level !== 'atom' && u.level !== 'kind' ? ' <span class="sub">'+esc(u.sub)+'</span>' : '')+
      (u.level === 'kind' && u.sub ? ' <span class="sub">'+esc(u.sub)+'</span>' : '')+
      ' <span class="n">'+part.length+'</span></button>';
  }
  function section(key, title, hint, units, selMask){
    units = units.filter(visible);
    if(!units.length) return '';
    var open = !!openSections[key];
    return '<details class="pk-sec" data-sec="'+key+'"'+(open ? ' open' : '')+'><summary>'+title+
      (hint ? ' <span class="muted">'+hint+'</span>' : '')+'</summary><div class="chips">'+
      units.map(function(u){ return chip(u, selMask); }).join('')+'</div></details>';
  }

  function render(){
    var idxs = selection();
    var selMask = E.maskOf(idxs);
    var byLevel = function(l){ return E.UNITS.filter(function(u){ return u.level === l; }); };
    var families = {};
    E.KINDS.forEach(function(k){ (families[k.family] = families[k.family] || []).push(k); });
    var kindHtml = Object.keys(families).map(function(f){
      var list = families[f].filter(visible);
      if(!list.length) return '';
      return '<div class="pk-family"><span class="pk-family-name">'+esc(f)+'</span><div class="chips">'+list.map(function(u){ return chip(u, selMask); }).join('')+'</div></div>';
    }).join('');

    // Several units can be the very same students once limited to a BR's branch (CSE = D3 =
    // Everyone there) — offer each distinct set once, under its first (most natural) name.
    function distinct(list){
      var seen = {};
      return list.filter(function(u){ var k = partOf(u).join(','); if(seen[k]) return false; seen[k] = 1; return true; });
    }
    var supers = idxs.length ? distinct(E.supersetsOf(idxs, universe).filter(visible)).slice(0, 5) : [];
    var subs = idxs.length ? distinct(E.subsetsOf(idxs, universe).filter(function(u){ return partOf(u).length; })).slice(0, 14) : [];

    var everyone = E.UNIT_BY_ID['all'];
    var html =
      '<div class="pk-top">'+
        (state.adv ? '<span class="pk-mode pq-title">Advanced query</span>' : '<div class="seg pk-mode">'+
          ['add','narrow','remove'].map(function(m){
            var t = m === 'add' ? '＋ Add' : m === 'narrow' ? '∩ Narrow' : '− Remove';
            return '<button data-mode="'+m+'" class="'+(state.mode === m ? 'on' : '')+'" title="'+
              (m === 'add' ? 'tap a chip to include those students' : m === 'narrow' ? 'tap a chip to keep only selected students who are also in it' : 'tap a chip to take those students out')+'">'+t+'</button>';
          }).join('')+
        '</div>')+
        (opts.query ? '<button class="btn btn-sm pk-adv'+(state.adv ? ' on' : '')+'" data-act="adv" title="switch between tapping chips and building a set query">'+(state.adv ? 'Simple' : 'Advanced')+'</button>' : '')+
        '<button class="btn btn-sm" data-act="undo"'+(state.past.length ? '' : ' disabled')+'>↶</button>'+
        '<button class="btn btn-sm" data-act="clear"'+(state.ops.length ? '' : ' disabled')+'>Clear</button>'+
      '</div>'+
      '<div class="pk-summary"><span class="pk-count">'+idxs.length+'</span> student'+(idxs.length === 1 ? '' : 's')+
        (idxs.length ? ' · <b>'+esc(label(idxs))+'</b>' : ' — tap any chip below')+'</div>'+
      (!state.adv && supers.length ? '<div class="pk-nav"><span class="pk-nav-label">widen to</span><div class="chips">'+supers.map(function(u){ return '<button class="chip ghost" data-jump="'+u.id+'">'+esc(u.label)+' <span class="n">'+partOf(u).length+'</span></button>'; }).join('')+'</div></div>' : '')+
      (!state.adv && subs.length ? '<div class="pk-nav"><span class="pk-nav-label">narrow to</span><div class="chips">'+subs.map(function(u){ return '<button class="chip ghost" data-jump="'+u.id+'">'+esc(u.label)+' <span class="n">'+partOf(u).length+'</span></button>'; }).join('')+'</div></div>' : '')+
      (state.adv ? queryHtml() : (
      (universe ? '' : '<div class="chips" style="margin:10px 0 2px;">'+chip(everyone, selMask)+'</div>')+
      section('div', 'Divisions', '', byLevel('division'), selMask)+
      section('grp', 'Groups', 'shared labels list both branches', byLevel('group'), selMask)+
      section('br', 'Branches', '', byLevel('branch'), selMask)+
      section('bg', 'One branch of a shared group', 'when only part of a group is meant', byLevel('bgroup'), selMask)+
      section('atom', 'Finest ranges', 'the smallest blocks the timetable splits students into', E.ATOMS, selMask)+
      (kindHtml ? '<details class="pk-sec" data-sec="kind"'+(openSections.kind ? ' open' : '')+'><summary>Kinds <span class="muted">HSS · IKS · NSO · NSS · Life Skills · lab batches</span></summary>'+kindHtml+'</details>' : '')));
    el.innerHTML = html;
  }

  el.addEventListener('click', function(e){
    // a click in the query box but not on a piece (the empty space after it) puts the cursor at the end, like a text field
    var box = e.target.closest && e.target.closest('.pq-expr');
    if(box && !e.target.closest('button')){ state.qCur = state.q.length; render(); return; }
    var t = e.target.closest && e.target.closest('button');
    if(!t || !el.contains(t)) return;
    if(t.hasAttribute('data-mode')){ state.mode = t.getAttribute('data-mode'); render(); return; }
    if(t.hasAttribute('data-qset')){ qInsertSet(t.getAttribute('data-qset')); state.qSearch = ''; qChanged(); return; }
    if(t.hasAttribute('data-qop')){
      var v = t.getAttribute('data-qop');
      if(v === '(' || v === 'not') qInsertOperandStart(v === 'not' ? { t: 'not' } : { t: '(' }, false);
      else if(v === ')'){ qPut([{ t: ')' }]); if(startsOperand(qAfter())) state.q.splice(state.qCur, 0, { t: 'op', v: '∪' }); }
      else qPut([{ t: 'op', v: v }]);
      qChanged(); return;
    }
    var qa = t.getAttribute('data-qact');
    if(t.hasAttribute('data-qat')){ state.qCur = Math.max(0, Math.min(state.q.length, +t.getAttribute('data-qat'))); render(); return; }
    if(qa === 'left'){ if(state.qCur > 0) state.qCur--; render(); return; }
    if(qa === 'right'){ if(state.qCur < state.q.length) state.qCur++; render(); return; }
    if(qa === 'back'){ if(state.qCur > 0){ state.q.splice(state.qCur - 1, 1); state.qCur--; } qChanged(); return; }
    if(qa === 'clear'){ state.q = []; state.qCur = 0; qChanged(); return; }
    var act = t.getAttribute('data-act');
    if(act === 'adv'){ state.adv = !state.adv; try { localStorage.setItem('thirtyatrpr_picker_adv', state.adv ? '1' : '0'); } catch(x){} render(); return; }
    if(act === 'undo'){ if(state.past.length){ state.ops = state.past.pop(); changed(); } return; }
    if(act === 'clear'){ state.past.push(state.ops.slice()); state.ops = []; changed(); return; }
    if(t.hasAttribute('data-jump')){ apply('set', t.getAttribute('data-jump')); return; }
    var id = t.getAttribute('data-unit');
    if(!id) return;
    var mode = state.mode;
    // In Add mode, tapping a chip that's already fully in takes it back out — a plain toggle.
    if(mode === 'add' && t.classList.contains('on')) mode = 'remove';
    // The very first tap always starts a selection, whatever the mode.
    if(!state.ops.length) mode = 'add';
    apply(mode, id);
  });
  // the set search only refreshes its own suggestions (a full re-render would drop the keyboard focus)
  el.addEventListener('input', function(e){
    if(!e.target.classList || !e.target.classList.contains('pq-search')) return;
    state.qSearch = e.target.value;
    var box = el.querySelector('.pq-sugg'); if(box) box.innerHTML = qSuggest();
  });
  el.addEventListener('toggle', function(e){
    var d = e.target;
    if(d && d.getAttribute && d.getAttribute('data-sec')) openSections[d.getAttribute('data-sec')] = d.open;
  }, true);

  var api = {
    get: function(){ var idxs = selection(); return { ops: state.ops.slice(), idxs: idxs, label: label(idxs) }; },
    set: function(ops){ state.past.push(state.ops.slice()); state.ops = ops.slice(); changed(); },
    refresh: render
  };
  render();
  return api;
}

return { mount: mount };
})();
