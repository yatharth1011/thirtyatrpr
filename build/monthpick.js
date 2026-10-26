/* Month date picker + day-switch slide, shared by /spectate, /br and the dashboard's Squads panel (spliced in by
   build/splice.py; its styles are build/monthpick.css). Tapping the day bar's date opens a month grid — today ringed, the chosen day filled, holidays and
   no-class days marked, Sunday-first like the dashboard's Month panel — and picking a date jumps there.

   MonthPick.attach({ anchor, getIso, onPick, after })   anchor: the date element; the popup goes right after
                                                        `after` (default: the anchor's .daynav, else its parent).
   Safe to call again on a freshly re-rendered anchor: the page-wide listeners are shared, and pickers whose
   elements have left the page are dropped.
   MonthPick.slide(el, prevIso, iso)              the dashboard's quick day-switch slide (only when the day changed)
*/
(function(){
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function isoOf(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(iso){ var p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function today(){ return isoOf(new Date()); }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var live = [];                                           // open-able pickers: {pop, anchor, close}
  function prune(){ live = live.filter(function(p){ return p.pop.isConnected; }); }
  document.addEventListener('click', function(e){
    prune();
    live.forEach(function(p){
      if(!p.pop.hidden && e.target.isConnected && !p.pop.contains(e.target) && !p.anchor.contains(e.target)) p.close();
    });
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ prune(); live.forEach(function(p){ if(!p.pop.hidden) p.close(); }); } });

  function attach(opts){
    var anchor = opts.anchor, nav = opts.after || anchor.closest('.daynav') || anchor.parentNode;
    var pop = document.createElement('div');
    pop.className = 'mp-pop'; pop.hidden = true;
    nav.parentNode.insertBefore(pop, nav.nextSibling);
    anchor.classList.add('mp-anchor');
    anchor.setAttribute('role', 'button'); anchor.setAttribute('tabindex', '0');
    anchor.setAttribute('aria-label', 'Pick a date');
    var view = null;                                       // first day of the month on show

    function render(){
      // the page-wide data bundle (engine.js keeps its own DATA private)
      var cal = (typeof THIRTY_DATA !== 'undefined' && THIRTY_DATA.calendar) || {};
      var sel = opts.getIso(), t = today();
      var y = view.getFullYear(), m = view.getMonth();
      var first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
      var cells = '';
      for(var i = 0; i < first.getDay(); i++) cells += '<span class="mp-cell mp-blank"></span>';
      for(var d = 1; d <= days; d++){
        var iso = y + '-' + pad(m + 1) + '-' + pad(d);
        var off = (cal.holidays && cal.holidays[iso]) || (cal.noClassDays && cal.noClassDays[iso]);
        var out = (cal.rangeStart && iso < cal.rangeStart) || (cal.rangeEnd && iso > cal.rangeEnd);
        var cls = 'mp-cell' + (iso === t ? ' mp-today' : '') + (iso === sel ? ' mp-sel' : '') + (off ? ' mp-off' : '') +
          (new Date(y, m, d).getDay() === 0 ? ' mp-sun' : '');
        cells += out ? '<span class="' + cls + ' mp-out">' + d + '</span>'
          : '<button type="button" class="' + cls + '" data-mp="' + iso + '"' + (off ? ' title="' + String(off).replace(/"/g, '&quot;') + '"' : '') + '>' + d + '</button>';
      }
      pop.innerHTML =
        '<div class="mp-head"><button type="button" class="mp-nav" data-mp-month="-1" aria-label="Previous month">&#8249;</button>' +
        '<b>' + MONTHS[m] + ' ' + y + '</b>' +
        '<button type="button" class="mp-nav" data-mp-month="1" aria-label="Next month">&#8250;</button></div>' +
        '<div class="mp-grid">' + ['S','M','T','W','T','F','S'].map(function(w){ return '<span class="mp-dow">' + w + '</span>'; }).join('') + cells + '</div>' +
        '<div class="mp-foot"><span><i class="mp-key mp-key-off"></i> no classes</span><button type="button" class="mp-today-btn" data-mp="' + t + '">today</button></div>';
    }
    function open(){ var s = parse(opts.getIso()); view = new Date(s.getFullYear(), s.getMonth(), 1); render(); pop.hidden = false; anchor.classList.add('open'); }
    function close(){ pop.hidden = true; anchor.classList.remove('open'); }

    anchor.addEventListener('click', function(){ pop.hidden ? open() : close(); });
    anchor.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); pop.hidden ? open() : close(); } });
    pop.addEventListener('click', function(e){
      // Clicks inside never count as "outside" — a month change re-renders the grid, detaching the button that
      // was clicked, which the document-level handler below would otherwise read as a click outside.
      e.stopPropagation();
      var mv = e.target.closest('[data-mp-month]');
      if(mv){ view = new Date(view.getFullYear(), view.getMonth() + Number(mv.getAttribute('data-mp-month')), 1); render(); return; }
      var b = e.target.closest('[data-mp]');
      if(b){ close(); opts.onPick(b.getAttribute('data-mp')); }
    });
    prune();
    live.push({ pop: pop, anchor: anchor, close: close });
    return { open: open, close: close, refresh: function(){ if(!pop.hidden) render(); } };
  }

  // Same quick slide as the dashboard's day switch: from the right going forward, the left going back.
  function slide(el, prevIso, iso){
    if(!el || !prevIso || prevIso === iso) return;
    el.classList.remove('day-in-next', 'day-in-prev');
    void el.offsetWidth;
    el.classList.add(iso > prevIso ? 'day-in-next' : 'day-in-prev');
  }

  window.MonthPick = { attach: attach, slide: slide };
})();
