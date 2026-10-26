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
  var state = { ops: (opts.initial || []).slice(), mode: 'add', past: [] };
  var openSections = { div: true, grp: true };

  function partOf(u){ return uniMask ? E.intersect(u.idxs, uniMask) : u.idxs; }
  function visible(u){ return partOf(u).length > 0; }
  function selection(){ return E.evalSelection(state.ops, universe); }
  function label(idxs){
    if(!idxs.length) return 'nobody yet';
    return E.describe(idxs).join(' + ');
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
        '<div class="seg pk-mode">'+
          ['add','narrow','remove'].map(function(m){
            var t = m === 'add' ? '＋ Add' : m === 'narrow' ? '∩ Narrow' : '− Remove';
            return '<button data-mode="'+m+'" class="'+(state.mode === m ? 'on' : '')+'" title="'+
              (m === 'add' ? 'tap a chip to include those students' : m === 'narrow' ? 'tap a chip to keep only selected students who are also in it' : 'tap a chip to take those students out')+'">'+t+'</button>';
          }).join('')+
        '</div>'+
        '<button class="btn btn-sm" data-act="undo"'+(state.past.length ? '' : ' disabled')+'>↶</button>'+
        '<button class="btn btn-sm" data-act="clear"'+(state.ops.length ? '' : ' disabled')+'>Clear</button>'+
      '</div>'+
      '<div class="pk-summary"><span class="pk-count">'+idxs.length+'</span> student'+(idxs.length === 1 ? '' : 's')+
        (idxs.length ? ' · <b>'+esc(label(idxs))+'</b>' : ' — tap any chip below')+'</div>'+
      (supers.length ? '<div class="pk-nav"><span class="pk-nav-label">widen to</span><div class="chips">'+supers.map(function(u){ return '<button class="chip ghost" data-jump="'+u.id+'">'+esc(u.label)+' <span class="n">'+partOf(u).length+'</span></button>'; }).join('')+'</div></div>' : '')+
      (subs.length ? '<div class="pk-nav"><span class="pk-nav-label">narrow to</span><div class="chips">'+subs.map(function(u){ return '<button class="chip ghost" data-jump="'+u.id+'">'+esc(u.label)+' <span class="n">'+partOf(u).length+'</span></button>'; }).join('')+'</div></div>' : '')+
      (universe ? '' : '<div class="chips" style="margin:10px 0 2px;">'+chip(everyone, selMask)+'</div>')+
      section('div', 'Divisions', '', byLevel('division'), selMask)+
      section('grp', 'Groups', 'shared labels list both branches', byLevel('group'), selMask)+
      section('br', 'Branches', '', byLevel('branch'), selMask)+
      section('bg', 'One branch of a shared group', 'when only part of a group is meant', byLevel('bgroup'), selMask)+
      section('atom', 'Finest ranges', 'the smallest blocks the timetable splits students into', E.ATOMS, selMask)+
      (kindHtml ? '<details class="pk-sec" data-sec="kind"'+(openSections.kind ? ' open' : '')+'><summary>Kinds <span class="muted">HSS · IKS · NSO · NSS · Life Skills · lab batches</span></summary>'+kindHtml+'</details>' : '');
    el.innerHTML = html;
  }

  el.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('button');
    if(!t || !el.contains(t)) return;
    if(t.hasAttribute('data-mode')){ state.mode = t.getAttribute('data-mode'); render(); return; }
    var act = t.getAttribute('data-act');
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
