/* Diwali decorations for every page and theme, coloured by the --dw-* variables in build/diwali.css. No end date. */
(function(){
  try {
    var v = function(n){ return 'var(--dw-' + n + ')'; };
    var f = function(n){ return Math.round(n * 10) / 10; };

    function marigold(x, y, r){
      var out = '', i, a;
      for(i = 0; i < 11; i++){ a = i / 11 * 6.283; out += '<circle cx="' + f(x + r * .74 * Math.cos(a)) + '" cy="' + f(y + r * .74 * Math.sin(a)) + '" r="' + f(r * .4) + '" fill="' + v('m2') + '"/>'; }
      for(i = 0; i < 8; i++){ a = i / 8 * 6.283 + .3; out += '<circle cx="' + f(x + r * .42 * Math.cos(a)) + '" cy="' + f(y + r * .42 * Math.sin(a)) + '" r="' + f(r * .32) + '" fill="' + v('m1') + '"/>'; }
      return out + '<circle cx="' + x + '" cy="' + y + '" r="' + f(r * .2) + '" fill="' + v('m3') + '"/>';
    }
    function leaf(x, y, len, deg){
      return '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + deg + ')"><path d="M0 0C' + f(len * .34) + ' ' + f(len * .22) + ' ' + f(len * .3) + ' ' + f(len * .74) + ' 0 ' + len + 'C' + f(-len * .3) + ' ' + f(len * .74) + ' ' + f(-len * .34) + ' ' + f(len * .22) + ' 0 0Z" fill="' + v('leaf') + '"/><path d="M0 1V' + f(len - 2) + '" stroke="' + v('leaf2') + '" stroke-width=".7" fill="none"/></g>';
    }
    function bell(x, y){
      return '<path d="M' + x + ' ' + y + 'v5" stroke="' + v('rope') + '" stroke-width="1"/><path d="M' + (x - 4) + ' ' + (y + 12) + 'q1-7 4-7t4 7z" fill="' + v('m1') + '"/><circle cx="' + x + '" cy="' + (y + 13) + '" r="1.3" fill="' + v('m3') + '"/>';
    }
    // One scallop of the toran: rope, marigolds along it, mango leaves and a bell hanging from the low point
    function toran(id){
      var W = 132, tile = '', i, t, x, y;
      var q = function(t){ return { x: W * t, y: 3 + 2 * (1 - t) * t * 30 }; };
      for(i = 0; i < 7; i++){ t = (i + .5) / 7; var p = q(t); tile += leaf(p.x, p.y + 3, 15, (t - .5) * 34 + (i % 2 ? 9 : -9)); }
      tile += '<path d="M0 3Q' + (W / 2) + ' 63 ' + W + ' 3" fill="none" stroke="' + v('rope') + '" stroke-width="1.4"/>';
      tile += bell(W / 2, 33);
      for(i = 0; i < 8; i++){ t = i / 8 + .0625; var m = q(t); tile += marigold(f(m.x), f(m.y), i % 2 ? 6 : 7.4); }
      return '<svg class="dw-toran" aria-hidden="true"><defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="' + W + '" height="52">' + tile + '</pattern></defs><rect width="100%" height="52" fill="url(#' + id + ')"/></svg>';
    }
    // Akash kandil: a tall star lantern, a pleated round one and a slim diamond, each with bands and a tassel
    function tassel(x, y){
      var out = '', i;
      for(i = -2; i <= 2; i++) out += '<path d="M' + x + ' ' + y + 'L' + (x + i * 2) + ' ' + (y + 15 - Math.abs(i)) + '" stroke="' + v('m1') + '" stroke-width="1"/>';
      return out + '<circle cx="' + x + '" cy="' + y + '" r="2.2" fill="' + v('band') + '"/>';
    }
    function lantern(kind, id){
      var glow = '<defs><radialGradient id="' + id + '"><stop offset="0" stop-color="' + v('m1') + '" stop-opacity=".9"/><stop offset="1" stop-color="' + v('m1') + '" stop-opacity="0"/></radialGradient></defs><circle cx="30" cy="62" r="30" fill="url(#' + id + ')" style="opacity:' + v('glow') + '"/>';
      var top = '<path d="M30 0V26" stroke="' + v('rope') + '" stroke-width="1.2"/><rect x="24" y="26" width="12" height="4" rx="1.5" fill="' + v('band') + '"/>';
      if(kind === 'a') return '<svg viewBox="0 0 60 130" aria-hidden="true">' + glow + top +
        '<path d="M30 30L52 62 30 96 8 62Z" fill="' + v('l1') + '"/><path d="M30 30L52 62H8Z" fill="' + v('l2') + '" opacity=".85"/>' +
        '<path d="M30 30V96M8 62H52M19 46L41 79M41 46L19 79" stroke="' + v('band') + '" stroke-width="1" opacity=".75"/>' +
        '<path d="M8 62L0 72 14 76M52 62L60 72 46 76" fill="' + v('l3') + '"/><circle cx="30" cy="62" r="5" fill="' + v('band') + '"/>' + tassel(30, 96) + '</svg>';
      if(kind === 'b') return '<svg viewBox="0 0 60 130" aria-hidden="true">' + glow + top +
        '<ellipse cx="30" cy="62" rx="25" ry="32" fill="' + v('l2') + '"/><ellipse cx="30" cy="62" rx="15" ry="32" fill="' + v('l1') + '" opacity=".75"/><ellipse cx="30" cy="62" rx="6" ry="32" fill="' + v('l3') + '" opacity=".8"/>' +
        '<path d="M8 47Q30 56 52 47M5 62Q30 72 55 62M8 77Q30 87 52 77" fill="none" stroke="' + v('band') + '" stroke-width="1.2"/>' +
        '<rect x="22" y="92" width="16" height="4" rx="1.5" fill="' + v('band') + '"/>' + tassel(30, 96) + '</svg>';
      return '<svg viewBox="0 0 60 130" aria-hidden="true">' + glow + top +
        '<path d="M16 30H44L52 50 44 90H16L8 50Z" fill="' + v('l3') + '"/><path d="M16 30H44L38 50 44 90H16L22 50Z" fill="' + v('l1') + '"/><path d="M22 50H38" stroke="' + v('band') + '" stroke-width="1.4"/><path d="M8 50H52" stroke="' + v('band') + '" stroke-width="1"/>' +
        '<circle cx="30" cy="66" r="6" fill="' + v('band') + '"/><circle cx="30" cy="66" r="3" fill="' + v('l2') + '"/>' + tassel(30, 90) + '</svg>';
    }
    function diya(id){
      var dots = '', i;
      for(i = 0; i < 7; i++) dots += '<circle cx="' + (14 + i * 6) + '" cy="' + (i % 2 ? 56 : 54) + '" r="1.3" fill="' + v('rim') + '"/>';
      return '<div class="dw-diya"><svg viewBox="0 0 60 76" aria-hidden="true"><defs><radialGradient id="' + id + '"><stop offset="0" stop-color="' + v('m1') + '" stop-opacity=".95"/><stop offset="1" stop-color="' + v('m1') + '" stop-opacity="0"/></radialGradient></defs>' +
        '<circle cx="32" cy="26" r="26" fill="url(#' + id + ')" style="opacity:' + v('glow') + '"/>' +
        '<path d="M3 46C10 44 50 44 57 46C54 66 42 72 30 72S6 66 3 46Z" fill="' + v('clay') + '"/><path d="M30 72C42 72 54 66 57 46C52 45 48 45 44 45C44 58 38 68 30 72Z" fill="' + v('clay2') + '"/>' +
        '<ellipse cx="30" cy="46" rx="27" ry="6" fill="' + v('rim') + '"/><ellipse cx="30" cy="46" rx="22" ry="4" fill="' + v('oil') + '"/><path d="M48 44Q44 40 34 43" stroke="' + v('band') + '" stroke-width="2" fill="none"/>' + dots +
        '<g class="dw-flame"><path d="M33 42C24 34 30 22 33 12C37 22 43 34 33 42Z" fill="' + v('m2') + '"/><path d="M33 41C29 35 31 28 33 22C35 28 38 35 33 41Z" fill="' + v('m1') + '"/><path d="M33 40C31.6 37 32 34 33 31C34 34 34.6 37 33 40Z" fill="' + v('dot') + '"/></g></svg></div>';
    }
    function rangoli(){
      var c = 110, out = '', i, a, R;
      var petal = function(r0, r1, w, deg, fill){ return '<path transform="rotate(' + f(deg) + ' ' + c + ' ' + c + ')" d="M' + c + ' ' + (c - r0) + 'C' + (c + w) + ' ' + (c - (r0 + r1) / 2) + ' ' + (c + w * .4) + ' ' + (c - r1 + 4) + ' ' + c + ' ' + (c - r1) + 'C' + (c - w * .4) + ' ' + (c - r1 + 4) + ' ' + (c - w) + ' ' + (c - (r0 + r1) / 2) + ' ' + c + ' ' + (c - r0) + 'Z" fill="' + fill + '"/>'; };
      for(i = 0; i < 16; i++) out += petal(66, 108, 15, i * 22.5 + 11.25, v(i % 2 ? 'r1' : 'r3'));
      out += '<circle cx="' + c + '" cy="' + c + '" r="70" fill="' + v('r2') + '"/>';
      for(i = 0; i < 24; i++){ a = i / 24 * 6.283; out += '<circle cx="' + f(c + 64 * Math.cos(a)) + '" cy="' + f(c + 64 * Math.sin(a)) + '" r="2.4" fill="' + v('dot') + '"/>'; }
      out += '<circle cx="' + c + '" cy="' + c + '" r="58" fill="' + v('r4') + '"/>';
      for(i = 0; i < 12; i++) out += petal(26, 58, 14, i * 30, v(i % 2 ? 'r3' : 'r1'));
      out += '<circle cx="' + c + '" cy="' + c + '" r="30" fill="' + v('dot') + '"/>';
      for(i = 0; i < 8; i++) out += petal(6, 29, 9, i * 45 + 22.5, v('r2'));
      for(i = 0; i < 8; i++){ a = i / 8 * 6.283; R = 42; out += '<circle cx="' + f(c + R * Math.cos(a)) + '" cy="' + f(c + R * Math.sin(a)) + '" r="1.8" fill="' + v('dot') + '"/>'; }
      return '<div class="dw-rangoli"><svg viewBox="0 0 220 220" aria-hidden="true">' + out + '<circle cx="' + c + '" cy="' + c + '" r="7" fill="' + v('r1') + '"/><circle cx="' + c + '" cy="' + c + '" r="3" fill="' + v('dot') + '"/></svg></div>';
    }
    function burst(cls, color, color2, left){
      var out = '', i, a;
      for(i = 0; i < 16; i++){
        a = i / 16 * 6.283;
        var r0 = i % 2 ? 12 : 8, r1 = i % 2 ? 26 : 22;
        out += '<path d="M' + f(30 + r0 * Math.cos(a)) + ' ' + f(30 + r0 * Math.sin(a)) + 'L' + f(30 + r1 * Math.cos(a)) + ' ' + f(30 + r1 * Math.sin(a)) + '" stroke="' + (i % 3 ? color : color2) + '" stroke-width="1.5" stroke-linecap="round"/><circle cx="' + f(30 + (r1 + 3) * Math.cos(a)) + '" cy="' + f(30 + (r1 + 3) * Math.sin(a)) + '" r="1.2" fill="' + color2 + '"/>';
      }
      return '<div class="dw-burst" style="left:' + left + '"><svg class="dw-twinkle ' + cls + '" viewBox="0 0 60 60" aria-hidden="true">' + out + '<circle cx="30" cy="30" r="2.4" fill="' + color + '"/></svg></div>';
    }
    // LED strings. The toran owns the horizontal, so these run straight down the PC margins and diagonally in the footer.
    // Regular on purpose: even spacing, equal leads, warm tones. Each fits its box and ends at a clip.
    var arcId = 0;
    function drawSegs(w, h, segs){
      var id = 'dwA' + (++arcId), defs = '', body = '', wire = '', clips = '', i, j, bulb = 0, cols = ['led1', 'led2', 'led1'];
      for(i = 0; i < 3; i++) defs += '<radialGradient id="' + id + 'g' + i + '"><stop offset="0" stop-color="' + v(cols[i]) + '" stop-opacity=".62"/><stop offset=".35" stop-color="' + v(cols[i]) + '" stop-opacity=".22"/><stop offset="1" stop-color="' + v(cols[i]) + '" stop-opacity="0"/></radialGradient>';
      segs.forEach(function(g, n){
        var cx = (g.x0 + g.x1) / 2 + (g.bx || 0), cy = (g.y0 + g.y1) / 2 + (g.by || 0);
        var len = Math.sqrt(Math.pow(g.x1 - g.x0, 2) + Math.pow(g.y1 - g.y0, 2));
        wire += 'M' + f(g.x0) + ' ' + f(g.y0) + 'Q' + f(cx) + ' ' + f(cy) + ' ' + f(g.x1) + ' ' + f(g.y1);
        clips += '<circle cx="' + f(g.x0) + '" cy="' + f(g.y0) + '" r="2.1" fill="' + v('wire') + '"/><circle cx="' + f(g.x1) + '" cy="' + f(g.y1) + '" r="2.1" fill="' + v('wire') + '"/>';
        var count = Math.max(2, Math.round(len / (g.gap || 92)));
        for(j = 0; j < count; j++){
          var t = (j + .5) / count;
          var px = (1 - t) * (1 - t) * g.x0 + 2 * (1 - t) * t * cx + t * t * g.x1, py = (1 - t) * (1 - t) * g.y0 + 2 * (1 - t) * t * cy + t * t * g.y1;
          var lead = 5, c = bulb % 2, bx = f(px), by = f(py + lead);
          body += '<circle cx="' + bx + '" cy="' + f(by + 10) + '" r="18" fill="url(#' + id + 'g' + c + ')" style="opacity:' + v('glow2') + '"/>' +
            '<path d="M' + f(px) + ' ' + f(py) + 'L' + bx + ' ' + by + '" stroke="' + v('wire') + '" stroke-width=".7"/>' +
            '<rect x="' + f(bx - 1.6) + '" y="' + f(by - .4) + '" width="3.2" height="3.8" rx=".8" fill="' + v('wire') + '"/>' +
            '<path d="M' + bx + ' ' + f(by + 3) + 'c3 1.6 3.9 4.3 3.2 6.5c-.6 1.9-1.9 3.6-3.2 3.6s-2.6-1.7-3.2-3.6c-.7-2.2.2-4.9 3.2-6.5z" fill="' + v(cols[c]) + '"/>' +
            '<ellipse cx="' + f(bx - 1) + '" cy="' + f(by + 7.4) + '" rx=".8" ry="1.9" fill="#fff" opacity=".85"/>';
          bulb++;
        }
      });
      return '<svg aria-hidden="true" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><defs>' + defs + '</defs><path d="' + wire + '" fill="none" stroke="' + v('wire') + '" stroke-width=".9"/>' + body + clips + '</svg>';
    }
    var layouts = {
      // two long diagonals sweeping down toward the rangoli
      foot: function(w, h){
        var m = Math.min(w * .2, 170);
        return [{ x0: 8, y0: 4, x1: w / 2 - m, y1: h - 26, by: 14, gap: 130 }, { x0: w - 8, y0: 4, x1: w / 2 + m, y1: h - 26, by: 14, gap: 130 }];
      },
      // a straight vertical string with evenly spaced bulbs
      vert: function(w, h){ return [{ x0: w / 2, y0: 3, x1: w / 2, y1: h - 3, gap: 150 }]; }
    };
    function fitRun(el){
      var r = el.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height), key = w + 'x' + h;
      if(!w || !h || key === el.getAttribute('data-w')) return;
      el.setAttribute('data-w', key);
      el.innerHTML = drawSegs(w, h, layouts[el.getAttribute('data-run')](w, h));
    }
    var runWatch = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function(list){ list.forEach(function(e){ fitRun(e.target); }); }) : null;
    function fitRuns(){
      Array.prototype.forEach.call(document.querySelectorAll('[data-run]:not([data-seen])'), function(el){
        el.setAttribute('data-seen', '1');
        if(runWatch) runWatch.observe(el);
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-run]'), fitRun);
    }

    var main = document.querySelector('main'), foot = document.querySelector('footer');
    var top = document.createElement('div');
    top.className = 'dw-top' + (main ? '' : ' dw-sub');
    top.setAttribute('aria-hidden', 'true');
    top.innerHTML =
      burst('', v('spark1'), v('spark2'), '26%') + burst('b', v('spark3'), v('spark1'), '50%') + burst('c', v('spark2'), v('spark3'), '72%') +
      toran('dwToran') +
      '<div class="dw-lantern" style="left:5%">' + lantern('a', 'dwG1') + '</div>' +
      '<div class="dw-lantern b" style="right:12%">' + lantern('b', 'dwG2') + '</div>' +
      '<div class="dw-lantern c" style="right:4%">' + lantern('c', 'dwG3') + '</div>';
    if(main) main.insertBefore(top, main.firstChild);
    else {
      var wrap = document.querySelector('.wrap');   // /spectate and /br
      if(wrap) wrap.insertBefore(top, wrap.firstChild);
    }
    if(foot && foot.parentNode){
      var low = document.createElement('div');
      low.className = 'dw-foot';
      low.setAttribute('aria-hidden', 'true');
      low.innerHTML = '<div class="dw-run-foot" data-run="foot"></div>' +
        '<div class="dw-scene">' + diya('dwD1') + diya('dwD2') + rangoli() + diya('dwD3') + diya('dwD4') + '</div>' +
        '<div class="dw-wish">Shubh Deepavali</div>';
      foot.parentNode.insertBefore(low, foot);
    }
    /* Decorations resting on real things, so the festival feels part of the page rather than pasted over it.
       Cards rebuild their contents, so dress() is idempotent and re-runs after any change. */
    var uid = 0;
    function strand(){
      var id = 'dwS' + (++uid), W = 72, tile = '<path d="M0 6Q' + (W / 2) + ' 15 ' + W + ' 6" fill="none" stroke="' + v('rope') + '" stroke-width="1"/>';
      tile += leaf(12, 11, 9, 24) + leaf(36, 13, 10, -14) + leaf(60, 11, 9, 16);
      tile += marigold(12, 9, 5) + marigold(36, 11, 5.8) + marigold(60, 9, 5);
      return '<svg aria-hidden="true" width="100%" height="24"><defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="' + W + '" height="24">' + tile + '</pattern></defs><rect width="100%" height="24" fill="url(#' + id + ')"/></svg>';
    }
    function cluster(){
      return '<svg viewBox="0 0 60 60" aria-hidden="true">' + leaf(30, 28, 26, 150) + leaf(30, 28, 24, 62) + leaf(30, 28, 22, -60) + marigold(22, 24, 12) + marigold(40, 20, 9.5) + marigold(32, 39, 9) + '</svg>';
    }
    function bloom(){
      return '<svg viewBox="0 0 30 30" aria-hidden="true">' + leaf(15, 15, 13, 130) + leaf(15, 15, 12, 220) + marigold(15, 15, 10) + '</svg>';
    }
    function add(el, key, cls, html){
      if(!el) return;
      el.classList.add('dw-host');
      for(var i = 0; i < el.children.length; i++) if(el.children[i].getAttribute('data-dw') === key) return;
      var d = document.createElement('div');
      d.className = 'dw-on ' + cls;
      d.setAttribute('data-dw', key);
      d.setAttribute('aria-hidden', 'true');
      d.innerHTML = html;
      el.appendChild(d);
    }
    var one = function(q){ return document.querySelector(q); };
    function dress(){
      if(main){
        add(one('#todayPanel'), 'strand', 'dw-strand', strand());
        add(one('.panel-grid > .panel'), 'sit', 'dw-sit', diya('dwO' + (++uid)));
        add(one('#kaizenPanel'), 'corner', 'dw-cluster tl', cluster());
        add(one('#examWeekBanner'), 'corner', 'dw-cluster tr', cluster());
        add(one('#paperThemeBanner'), 'corner', 'dw-cluster br', cluster());
        add(one('.heat-panel'), 'corner', 'dw-corner', rangoli());
        add(one('.heat-panel'), 'sit', 'dw-sit left', diya('dwO' + (++uid)));
        add(one('#calToggleBtn'), 'clip', 'dw-clip', bloom());
        add(one('#studyToggleBtn'), 'clip', 'dw-clip', bloom());
        add(one('#miniStudy'), 'clip', 'dw-clip', bloom());
        add(one('.mini-brand'), 'clip', 'dw-clip', bloom());
        add(one('#miniBar'), 'strand', 'dw-strand hang', strand());
      } else {
        add(one('.topbar'), 'strand', 'dw-strand hang', strand());
        var cards = document.querySelectorAll('.wrap .panel');
        for(var i = 0; i < cards.length; i++){
          if(i === 0) add(cards[i], 'strand', 'dw-strand', strand());
          else if(i % 2) add(cards[i], 'corner', 'dw-cluster tr', cluster());
          else add(cards[i], 'sit', 'dw-sit', diya('dwO' + (++uid)));
        }
      }
    }
    dress();
    if(typeof MutationObserver !== 'undefined'){
      var dressTimer = null;
      new MutationObserver(function(){
        if(!dressTimer) dressTimer = setTimeout(function(){ dressTimer = null; dress(); fitRuns(); }, 300);
      }).observe(document.body, {childList:true, subtree:true});
    }

    // Vertical strings down both margins: always in view, never over the text
    var hostV = main ? document.getElementById('app') : document.body;
    if(hostV) ['l', 'r'].forEach(function(side){
      var run = document.createElement('div');
      run.className = 'dw-vrun ' + side + (main ? ' app' : '');
      run.setAttribute('data-run', 'vert');
      run.setAttribute('aria-hidden', 'true');
      hostV.appendChild(run);
    });

    var app = document.getElementById('app');
    if(app && main){
      var side = document.createElement('div');
      side.className = 'dw-side';
      side.setAttribute('aria-hidden', 'true');
      side.innerHTML = '<div class="dw-lantern">' + lantern('b', 'dwG4') + '</div><div class="dw-lantern b">' + lantern('a', 'dwG5') + '</div>';
      app.appendChild(side);
      // A garland that stays with you on PC once the big toran has scrolled away, so no scroll position is left bare
      var hang = document.createElement('div');
      hang.className = 'dw-hang';
      hang.setAttribute('aria-hidden', 'true');
      hang.innerHTML = strand();
      app.appendChild(hang);
      var syncHang = function(){ hang.classList.toggle('on', window.pageYOffset > 70); };
      window.addEventListener('scroll', syncHang, {passive:true});
      syncHang();
    }
    fitRuns();
  } catch(e){}   // purely decorative: must never stop the app
})();
