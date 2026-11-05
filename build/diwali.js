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
      return '<div class="dw-diya" role="button" tabindex="0" title="Click for Diwali fireworks & flower shower ✨" aria-label="Light the diya for fireworks"><svg viewBox="0 0 60 76" aria-hidden="true"><defs><radialGradient id="' + id + '"><stop offset="0" stop-color="' + v('m1') + '" stop-opacity=".95"/><stop offset="1" stop-color="' + v('m1') + '" stop-opacity="0"/></radialGradient></defs>' +
        '<circle cx="32" cy="26" r="26" fill="url(#' + id + ')" style="opacity:' + v('glow') + '"/>' +
        '<path d="M3 46C10 44 50 44 57 46C54 66 42 72 30 72S6 66 3 46Z" fill="' + v('clay') + '"/><path d="M30 72C42 72 54 66 57 46C52 45 48 45 44 45C44 58 38 68 30 72Z" fill="' + v('clay2') + '"/>' +
        '<ellipse cx="30" cy="46" rx="27" ry="6" fill="' + v('rim') + '"/><ellipse cx="30" cy="46" rx="22" ry="4" fill="' + v('oil') + '"/><path d="M48 44Q44 40 34 43" stroke="' + v('band') + '" stroke-width="2" fill="none"/>' + dots +
        '<g class="dw-flame"><path d="M33 42C24 34 30 22 33 12C37 22 43 34 33 42Z" fill="' + v('f2') + '"/><path d="M33 41C29 35 31 28 33 22C35 28 38 35 33 41Z" fill="' + v('f1') + '"/><path d="M33 40C31.6 37 32 34 33 31C34 34 34.6 37 33 40Z" fill="' + v('dot') + '"/></g></svg></div>';
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

    // Dedicated Quadrant Rangoli (Kona Rangoli / Corner Kolam):
    // Artfully designed specifically for the bottom-right corner of cards, radiating diagonally inward
    // with concentric jali bands, peacock/flame petals, scalloped marigold lace, and an apex crown diya.
    function quadrantRangoli(){
      var cx = 120, cy = 120, out = '';
      function arc(r, stroke, sw, dash){
        return '<path d="M' + f(cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + cx + ' ' + f(cy - r) + '" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
      }

      // Corner quadrant warm backing wash
      out += '<path d="M' + cx + ' ' + cy + ' L' + (cx - 114) + ' ' + cy + ' A114 114 0 0 1 ' + cx + ' ' + (cy - 114) + ' Z" fill="' + v('r4') + '" opacity="0.32"/>';

      // Outer lace scallops (r = 102 to 114)
      var numScallops = 10, i;
      for(i = 0; i < numScallops; i++){
        var a0 = 180 + (i / numScallops) * 90, a1 = 180 + ((i + 1) / numScallops) * 90, aMid = (a0 + a1) / 2;
        var r0 = 102, r1 = 114;
        var rad0 = a0 * Math.PI / 180, rad1 = a1 * Math.PI / 180, radM = aMid * Math.PI / 180;
        var x0 = f(cx + r0 * Math.cos(rad0)), y0 = f(cy + r0 * Math.sin(rad0));
        var x1 = f(cx + r0 * Math.cos(rad1)), y1 = f(cy + r0 * Math.sin(rad1));
        var xm = f(cx + r1 * Math.cos(radM)), ym = f(cy + r1 * Math.sin(radM));
        out += '<path d="M' + x0 + ' ' + y0 + ' Q' + xm + ' ' + ym + ' ' + x1 + ' ' + y1 + '" fill="' + v('m2') + '" stroke="' + v('m1') + '" stroke-width="1"/>';
        out += '<circle cx="' + xm + '" cy="' + ym + '" r="1.5" fill="' + v('dot') + '"/>';
      }

      // Outer pearl ring at r = 100
      for(i = 0; i <= 18; i++){
        var a = (180 + (i / 18) * 90) * Math.PI / 180;
        out += '<circle cx="' + f(cx + 100 * Math.cos(a)) + '" cy="' + f(cy + 100 * Math.sin(a)) + '" r="1.6" fill="' + v('dot') + '"/>';
      }
      out += arc(98, v('rope'), 1.2);
      out += arc(94, v('r1'), 2.5);

      // Large Radiating Peacock / Flame Petals (r = 58 to 92)
      var numPetals = 7;
      for(i = 0; i < numPetals; i++){
        var deg = 180 + (i + 0.5) * (90 / numPetals);
        var rad = deg * Math.PI / 180;
        var isCenter = (i === 3);
        var rOuter = isCenter ? 94 : 88, rInner = 58, halfWidth = 5.8;
        var fill = isCenter ? v('m1') : (i % 2 === 0 ? v('r1') : v('r3'));
        var normRad = rad + Math.PI / 2;
        var pTipX = cx + rOuter * Math.cos(rad), pTipY = cy + rOuter * Math.sin(rad);
        var pLeftX = cx + (rInner + 16) * Math.cos(rad) + halfWidth * Math.cos(normRad);
        var pLeftY = cy + (rInner + 16) * Math.sin(rad) + halfWidth * Math.sin(normRad);
        var pRightX = cx + (rInner + 16) * Math.cos(rad) - halfWidth * Math.cos(normRad);
        var pRightY = cy + (rInner + 16) * Math.sin(rad) - halfWidth * Math.sin(normRad);

        out += '<path d="M' + f(cx + rInner * Math.cos(rad)) + ' ' + f(cy + rInner * Math.sin(rad)) + ' Q' + f(pLeftX) + ' ' + f(pLeftY) + ' ' + f(pTipX) + ' ' + f(pTipY) + ' Q' + f(pRightX) + ' ' + f(pRightY) + ' ' + f(cx + rInner * Math.cos(rad)) + ' ' + f(cy + rInner * Math.sin(rad)) + 'Z" fill="' + fill + '" stroke="' + v('rope') + '" stroke-width="0.8"/>';
        var dropRad = rInner + (rOuter - rInner) * 0.55;
        out += '<circle cx="' + f(cx + dropRad * Math.cos(rad)) + '" cy="' + f(cy + dropRad * Math.sin(rad)) + '" r="2" fill="' + v('dot') + '"/>';
      }

      // Middle ring arc band
      out += arc(58, v('r2'), 3);
      out += arc(55, v('dot'), 1, '2,3');
      out += arc(52, v('r4'), 2);

      // Inner Lotus Petals (r = 24 to 50) - 5 fuller petals
      var numInner = 5;
      for(i = 0; i < numInner; i++){
        var degI = 180 + (i + 0.5) * (90 / numInner);
        var radI = degI * Math.PI / 180;
        var isCenterI = (i === 2);
        var rOuterI = isCenterI ? 51 : 47, rInnerI = 24;
        var fillI = isCenterI ? v('r1') : (i % 2 === 0 ? v('m2') : v('m1'));
        var normRadI = radI + Math.PI / 2;
        var pTipXI = cx + rOuterI * Math.cos(radI), pTipYI = cy + rOuterI * Math.sin(radI);
        var pLeftXI = cx + (rInnerI + 12) * Math.cos(radI) + 6.5 * Math.cos(normRadI);
        var pLeftYI = cy + (rInnerI + 12) * Math.sin(radI) + 6.5 * Math.sin(normRadI);
        var pRightXI = cx + (rInnerI + 12) * Math.cos(radI) - 6.5 * Math.cos(normRadI);
        var pRightYI = cy + (rInnerI + 12) * Math.sin(radI) - 6.5 * Math.sin(normRadI);
        out += '<path d="M' + f(cx + rInnerI * Math.cos(radI)) + ' ' + f(cy + rInnerI * Math.sin(radI)) + ' Q' + f(pLeftXI) + ' ' + f(pLeftYI) + ' ' + f(pTipXI) + ' ' + f(pTipYI) + ' Q' + f(pRightXI) + ' ' + f(pRightYI) + ' ' + f(cx + rInnerI * Math.cos(radI)) + ' ' + f(cy + rInnerI * Math.sin(radI)) + 'Z" fill="' + fillI + '"/>';
      }

      // Inner ring band
      out += arc(24, v('r2'), 2.5);
      out += arc(21, v('rope'), 1);

      // Core corner lotus bud / golden hub at (120, 120)
      out += '<path d="M' + (cx - 18) + ' ' + cy + ' A18 18 0 0 1 ' + cx + ' ' + (cy - 18) + ' L' + cx + ' ' + cy + ' Z" fill="' + v('r1') + '"/>';
      out += '<path d="M' + (cx - 10) + ' ' + cy + ' A10 10 0 0 1 ' + cx + ' ' + (cy - 10) + ' L' + cx + ' ' + cy + ' Z" fill="' + v('m1') + '"/>';
      out += '<circle cx="' + (cx - 4) + '" cy="' + (cy - 4) + '" r="3" fill="' + v('dot') + '"/>';

      // Apex Crown Diya pointing inward along the 225 deg diagonal
      var dx = 42, dy = 42;
      out += '<g transform="translate(' + dx + ', ' + dy + ') rotate(-45)">' +
        '<path d="M-10 4C-6 10 6 10 10 4C7 2 -7 2 -10 4Z" fill="' + v('clay') + '"/>' +
        '<path d="M-10 4Q0 1 10 4" stroke="' + v('rim') + '" stroke-width="1.2" fill="none"/>' +
        '<g class="dw-flame"><path d="M0 2C-3 -3 0 -8 0 -11C0 -8 3 -3 0 2Z" fill="' + v('f1') + '"/><path d="M0 2C-1.5 -1 0 -4 0 -6C0 -4 1.5 -1 0 2Z" fill="' + v('dot') + '"/></g>' +
      '</g>';

      return '<div class="dw-quad-rangoli"><svg viewBox="0 0 120 120" aria-hidden="true">' + out + '</svg></div>';
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
    function ladiSvg(w){
      var W = Math.max(120, w || 800);
      var arcTarget = 74;
      var n = Math.max(2, Math.round(W / arcTarget));
      var arcW = W / n;
      var sag = Math.min(13, Math.max(8.5, arcW * 0.165));
      var H = Math.round(sag + 16);
      var wire = '', bulbs = '', clips = '';
      var cols = ['m1', 'spark2', 'm1', 'spark1', 'm1', 'm2', 'spark3', 'm1'];
      var bulbIdx = 0;
      var ts = [0.15, 0.38, 0.62, 0.85];

      for(var k = 0; k < n; k++){
        var x0 = k * arcW, x1 = (k + 1) * arcW;
        var midX = (x0 + x1) / 2;
        wire += 'M' + f(x0) + ' 3Q' + f(midX) + ' ' + f(3 + sag * 2) + ' ' + f(x1) + ' 3';
        clips += '<rect x="' + f(x0 - 1.2) + '" y="1" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>';
        for(var b = 0; b < 4; b++){
          var t = ts[b];
          var bx = f(x0 + t * arcW);
          var by = f(3 + 4 * t * (1 - t) * sag);
          var col = cols[bulbIdx % cols.length];
          var twCls = (bulbIdx % 3 === 0) ? ' class="dw-ladi-t1"' : (bulbIdx % 5 === 0) ? ' class="dw-ladi-t2"' : (bulbIdx % 7 === 0) ? ' class="dw-ladi-t3"' : '';
          bulbIdx++;
          bulbs += '<g' + twCls + '>' +
            '<rect x="' + f(bx - 0.9) + '" y="' + by + '" width="1.8" height="2.8" rx=".4" fill="' + v('flex') + '"/>' +
            '<circle cx="' + bx + '" cy="' + f(by + 5.2) + '" r="8" fill="' + v(col) + '" opacity=".18"/>' +
            '<ellipse cx="' + bx + '" cy="' + f(by + 5.2) + '" rx="3.4" ry="4.2" fill="' + v(col) + '" opacity=".4"/>' +
            '<ellipse cx="' + bx + '" cy="' + f(by + 5.0) + '" rx="1.4" ry="2.5" fill="' + v(col) + '"/>' +
            '<ellipse cx="' + bx + '" cy="' + f(by + 4.8) + '" rx=".5" ry="1.1" fill="#fffef5"/>' +
            '</g>';
        }
      }
      clips += '<rect x="' + f(W - 1.2) + '" y="1" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>';

      return '<svg viewBox="0 0 ' + Math.round(W) + ' ' + H + '" width="100%" height="' + H + '" aria-hidden="true">' +
        '<path d="' + wire + '" fill="none" stroke="' + v('flex') + '" stroke-width="1.1" stroke-linecap="round"/>' +
        clips + bulbs + '</svg>';
    }

    function mountLadi(el){
      if(!el) return;
      var timer = null;
      function refresh(){
        var w = el.clientWidth || (el.parentElement ? el.parentElement.clientWidth : 0) || (typeof window !== 'undefined' ? window.innerWidth : 800) || 800;
        if(w > 0) el.innerHTML = ladiSvg(w);
      }
      refresh();
      if(typeof ResizeObserver !== 'undefined'){
        new ResizeObserver(function(){
          if(timer) cancelAnimationFrame(timer);
          timer = requestAnimationFrame(refresh);
        }).observe(el);
      } else if(typeof window !== 'undefined'){
        window.addEventListener('resize', refresh, { passive: true });
      }
    }

    function bezierPt(x0, y0, cx, cy, x1, y1, t){
      return {
        x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
        y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1
      };
    }

    function makeBulbs(pts, cols, twSeed){
      var out = '';
      for(var i = 0; i < pts.length; i++){
        var p = pts[i];
        var col = cols[i % cols.length];
        var tw = ((i + twSeed) % 3 === 0) ? ' class="dw-ladi-t1"' : ((i + twSeed) % 5 === 0) ? ' class="dw-ladi-t2"' : '';
        out += '<g' + tw + '>' +
          '<rect x="' + f(p.x - 0.9) + '" y="' + f(p.y) + '" width="1.8" height="2.8" rx=".4" fill="' + v('flex') + '"/>' +
          '<circle cx="' + f(p.x) + '" cy="' + f(p.y + 5.2) + '" r="8" fill="' + v(col) + '" opacity=".18"/>' +
          '<ellipse cx="' + f(p.x) + '" cy="' + f(p.y + 5.2) + '" rx="3.4" ry="4.2" fill="' + v(col) + '" opacity=".4"/>' +
          '<ellipse cx="' + f(p.x) + '" cy="' + f(p.y + 5.0) + '" rx="1.4" ry="2.5" fill="' + v(col) + '"/>' +
          '<ellipse cx="' + f(p.x) + '" cy="' + f(p.y + 4.8) + '" rx=".5" ry="1.1" fill="#fffef5"/>' +
          '</g>';
      }
      return out;
    }

    function heroLadiSvg(w){
      var W = Math.max(320, w || 800), H = 42;
      var xm = f(W * 0.44), ym = 15;
      var xr = f(W - 14), yr = 3;
      var c1x = f(W * 0.22), c1y = 25;
      var c2x = f(W * 0.72), c2y = 19;
      var tx = f(xr - 2), ty = 28;

      var wire = 'M12 2Q' + c1x + ' ' + c1y + ' ' + xm + ' ' + ym +
                 'Q' + c2x + ' ' + c2y + ' ' + xr + ' ' + yr +
                 'Q' + (xr + 4) + ' ' + (yr + 14) + ' ' + tx + ' ' + ty;
      var clips = '<rect x="10.8" y="1" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>' +
                  '<rect x="' + (xm - 1.2) + '" y="' + (ym - 1) + '" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>' +
                  '<rect x="' + (xr - 1.2) + '" y="' + (yr - 1) + '" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>';

      var pts = [
        bezierPt(12, 2, c1x, c1y, xm, ym, 0.22),
        bezierPt(12, 2, c1x, c1y, xm, ym, 0.54),
        bezierPt(12, 2, c1x, c1y, xm, ym, 0.82),
        bezierPt(xm, ym, c2x, c2y, xr, yr, 0.26),
        bezierPt(xm, ym, c2x, c2y, xr, yr, 0.60),
        bezierPt(xm, ym, c2x, c2y, xr, yr, 0.86),
        { x: tx, y: ty }
      ];

      return '<svg viewBox="0 0 ' + Math.round(W) + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
        '<path d="' + wire + '" fill="none" stroke="' + v('flex') + '" stroke-width="1.1" stroke-linecap="round"/>' +
        clips + makeBulbs(pts, ['m1', 'spark2', 'm1', 'spark1', 'm1', 'm2', 'spark3'], 0) + '</svg>';
    }

    // Style 1: Top-Right steep diagonal with trailing tail
    function cardLadi1(){
      var W = 125, H = 65;
      var wire = 'M14 1Q56 46 108 30Q114 42 110 54';
      var clips = '<rect x="12.8" y="0" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>' +
                  '<rect x="106.8" y="29" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>';
      var pts = [
        bezierPt(14, 1, 56, 46, 108, 30, 0.25),
        bezierPt(14, 1, 56, 46, 108, 30, 0.58),
        bezierPt(14, 1, 56, 46, 108, 30, 0.86),
        { x: 110, y: 54 }
      ];
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
        '<path d="' + wire + '" fill="none" stroke="' + v('flex') + '" stroke-width="1.1" stroke-linecap="round"/>' +
        clips + makeBulbs(pts, ['m1', 'spark1', 'm2', 'spark2'], 1) + '</svg>';
    }

    // Style 2: Top-Left loose lazy swag
    function cardLadi2(){
      var W = 125, H = 60;
      var wire = 'M6 38Q68 48 118 2';
      var clips = '<rect x="4.8" y="37" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>' +
                  '<rect x="116.8" y="1" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>';
      var pts = [
        bezierPt(6, 38, 68, 48, 118, 2, 0.16),
        bezierPt(6, 38, 68, 48, 118, 2, 0.42),
        bezierPt(6, 38, 68, 48, 118, 2, 0.68),
        bezierPt(6, 38, 68, 48, 118, 2, 0.90)
      ];
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
        '<path d="' + wire + '" fill="none" stroke="' + v('flex') + '" stroke-width="1.1" stroke-linecap="round"/>' +
        clips + makeBulbs(pts, ['spark2', 'm1', 'spark3', 'm1'], 2) + '</svg>';
    }

    // Style 3: Top-Right gentle shallow diagonal
    function cardLadi3(){
      var W = 135, H = 42;
      var wire = 'M8 2Q72 26 128 18';
      var clips = '<rect x="6.8" y="1" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>' +
                  '<rect x="126.8" y="17" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>';
      var pts = [
        bezierPt(8, 2, 72, 26, 128, 18, 0.22),
        bezierPt(8, 2, 72, 26, 128, 18, 0.54),
        bezierPt(8, 2, 72, 26, 128, 18, 0.84)
      ];
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
        '<path d="' + wire + '" fill="none" stroke="' + v('flex') + '" stroke-width="1.1" stroke-linecap="round"/>' +
        clips + makeBulbs(pts, ['m1', 'm2', 'spark1'], 0) + '</svg>';
    }

    // Style 4: Top-Left steep swoop with tail
    function cardLadi4(){
      var W = 125, H = 65;
      var wire = 'M112 1Q70 46 18 30Q12 42 16 54';
      var clips = '<rect x="110.8" y="0" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>' +
                  '<rect x="16.8" y="29" width="2.4" height="3" rx=".5" fill="' + v('rope') + '"/>';
      var pts = [
        bezierPt(112, 1, 70, 46, 18, 30, 0.25),
        bezierPt(112, 1, 70, 46, 18, 30, 0.58),
        bezierPt(112, 1, 70, 46, 18, 30, 0.86),
        { x: 16, y: 54 }
      ];
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
        '<path d="' + wire + '" fill="none" stroke="' + v('flex') + '" stroke-width="1.1" stroke-linecap="round"/>' +
        clips + makeBulbs(pts, ['spark3', 'm1', 'spark2', 'm1'], 3) + '</svg>';
    }

    function addCardLadi(el, styleIdx){
      if(!el) return;
      var styles = [
        { cls: 'tr1', fn: cardLadi1 },
        { cls: 'tl2', fn: cardLadi2 },
        { cls: 'tr3', fn: cardLadi3 },
        { cls: 'tl4', fn: cardLadi4 }
      ];
      var s = styles[styleIdx % styles.length];
      addDeco(el, 'card-ladi', 'dw-card-ladi ' + s.cls, s.fn());
    }

    var uid = 0;
    function addDeco(el, key, cls, html){
      if(!el) return;
      if(!el.classList.contains('settings') && !el.classList.contains('calpanel')){
        el.classList.add('dw-host');
      }
      var d = el.querySelector('[data-dw="' + key + '"]');
      if(!d){
        d = document.createElement('div');
        d.setAttribute('data-dw', key);
        d.setAttribute('aria-hidden', 'true');
        el.appendChild(d);
      }
      d.className = cls;
      if(d.firstChild) return;      // already dressed: rewriting would retrigger the page watcher forever
      d.innerHTML = html;
    }
    var strandId = 0;
    function strand(){
      var id = 'dwS' + (++strandId), W = 72, tile = '<path d="M0 6Q' + (W / 2) + ' 15 ' + W + ' 6" fill="none" stroke="' + v('rope') + '" stroke-width="1"/>';
      tile += leaf(12, 11, 9, 24) + leaf(36, 13, 10, -14) + leaf(60, 11, 9, 16);
      tile += marigold(12, 9, 5) + marigold(36, 11, 5.8) + marigold(60, 9, 5);
      return '<svg aria-hidden="true" width="100%" height="24"><defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="' + W + '" height="24">' + tile + '</pattern></defs><rect width="100%" height="24" fill="url(#' + id + ')"/></svg>';
    }

    function mountSearchDiya(btn){
      if(!btn) return;
      var d = btn.querySelector('[data-dw="search-diya"]');
      if(!d){
        d = document.createElement('span');
        d.className = 'dw-search-diya';
        d.setAttribute('data-dw', 'search-diya');
        d.setAttribute('role', 'button');
        d.setAttribute('tabindex', '0');
        d.setAttribute('title', 'Click for Diwali fireworks & flower shower ✨');
        d.setAttribute('aria-label', 'Light the diya for fireworks');
        d.addEventListener('mouseenter', function(){ btn.classList.add('dw-diya-hovered'); });
        d.addEventListener('mouseleave', function(){ btn.classList.remove('dw-diya-hovered'); });
        btn.appendChild(d);
      }
      d.innerHTML = diya('dwSearchD' + (++uid));
    }

    function mountBootDiya(log){
      if(!log) return;
      var d = log.querySelector('[data-dw="boot-diya"]');
      if(!d){
        d = document.createElement('span');
        d.className = 'dw-boot-diya';
        d.setAttribute('data-dw', 'boot-diya');
        d.setAttribute('role', 'button');
        d.setAttribute('tabindex', '0');
        d.setAttribute('title', 'Click for Diwali fireworks & flower shower ✨');
        d.setAttribute('aria-label', 'Light the diya for fireworks');
        log.appendChild(d);
      }
      d.innerHTML = diya('dwBootD' + (++uid));
    }

    function mountHeroLadi(el){
      if(!el) return;
      el.classList.add('dw-host');
      var container = el.querySelector('[data-dw="hero-ladi"]');
      if(!container){
        container = document.createElement('div');
        container.className = 'dw-hero-ladi';
        container.setAttribute('data-dw', 'hero-ladi');
        container.setAttribute('aria-hidden', 'true');
        el.appendChild(container);
      }
      var timer = null;
      function refresh(){
        var w = el.clientWidth || 800;
        container.innerHTML = heroLadiSvg(w);
      }
      refresh();
      if(typeof ResizeObserver !== 'undefined'){
        new ResizeObserver(function(){
          if(timer) cancelAnimationFrame(timer);
          timer = requestAnimationFrame(refresh);
        }).observe(el);
      }
    }

    function cluster(){
      return '<svg viewBox="0 0 60 60" aria-hidden="true">' + leaf(30, 28, 26, 150) + leaf(30, 28, 24, 62) + leaf(30, 28, 22, -60) + marigold(22, 24, 12) + marigold(40, 20, 9.5) + marigold(32, 39, 9) + '</svg>';
    }
    function bloom(){
      return '<svg viewBox="0 0 30 30" aria-hidden="true">' + leaf(15, 15, 13, 130) + leaf(15, 15, 12, 220) + marigold(15, 15, 10) + '</svg>';
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
      low.innerHTML = '<div class="dw-foot-toran">' + toran('dwToranFoot') + '</div>' +
        '<div class="dw-scene">' + diya('dwD1') + diya('dwD2') + rangoli() + diya('dwD3') + diya('dwD4') + '</div>' +
        '<div class="dw-wish">Shubh Deepawali</div>';
      foot.parentNode.insertBefore(low, foot);
    }

    // Festival days only, as ordinary timed rows in their proper place in the day
    function decorateSquadView(view){
      if(!view) return;
      var slots = Array.prototype.slice.call(view.querySelectorAll('.grp-slot:not(.dw-milestone)'));
      if(!slots.length) return;
      var dateEl = view.querySelector('.grp-date'), label = dateEl ? dateEl.textContent : '';
      var m = label.match(/(\d{1,2})\s*Nov/i), festive = m && [6, 7, 8, 9, 10, 20].indexOf(Number(m[1])) !== -1;
      if(festive && !view.querySelector('.dw-milestone')){
        var sunday = /^\s*sun/i.test(label);
        var lunch = sunday ? '12:30 PM – 2:30 PM' : '12:15 PM – 2:30 PM';
        var slotMin = function(el){
          var t = el.querySelector('.grp-slot-time'), p = t && t.textContent.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if(!p) return -1;
          return (Number(p[1]) % 12 + (p[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(p[2]);
        };
        [{ at: sunday ? 750 : 735, time: lunch, what: 'Mithai break' }, { at: 1050, time: '5:30 PM', what: 'Light the diyas' }].forEach(function(e){
          var row = document.createElement('div');
          row.className = 'grp-slot dw-milestone';
          row.innerHTML = '<div class="grp-slot-time">' + e.time + '</div><div class="grp-row"><span class="grp-what">' + e.what + '</span></div>';
          var next = null;
          for(var k = 0; k < slots.length; k++){ if(slotMin(slots[k]) >= e.at){ next = slots[k]; break; } }
          if(next) next.parentNode.insertBefore(row, next);
          else slots[slots.length - 1].parentNode.insertBefore(row, slots[slots.length - 1].nextSibling);
        });
      }
      if(festive && !view.querySelector('.dw-squad-finale')){
        var finale = document.createElement('div');
        finale.className = 'dw-squad-finale';
        finale.innerHTML = '<button type="button" class="dw-squad-fireworks-btn">Celebrate with your squad</button>';
        view.appendChild(finale);
      }
    }

    function decorateCalGrid(){
      var calGrid = document.querySelector('#calGrid');
      if(!calGrid) return;
      var festiveDays = ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-20'];
      var cells = calGrid.querySelectorAll('.cal-cell[data-idx]');
      for(var ci = 0; ci < cells.length; ci++){
        var cidx = Number(cells[ci].getAttribute('data-idx'));
        var cday = (window.state && window.state.DAYS) ? window.state.DAYS[cidx] : null;
        if(cday && festiveDays.indexOf(cday.d) !== -1){
          cells[ci].classList.add('dw-festive-cell');
        }
      }
    }

    var one = function(q){ return document.querySelector(q); };
    function dress(){
      if(main){
        // 1. The Hero Card (#todayPanel): Sweeping asymmetrical garland
        mountHeroLadi(one('#todayPanel'));

        // 2. Desktop: search button perched diya; Phone: boot-log dashed line diya
        mountSearchDiya(one('#searchBtn'));
        mountBootDiya(one('.boot-log'));

        // 3. Special cards and banners - guaranteed varied styles (no copy-paste):
        // - Mess menu: Top-Left gentle curve (Style 1: tl2) + festive marigold cluster
        var messHead = one('#messPanelHead');
        var messCard = messHead ? messHead.closest('.panel') : null;
        if(messCard) {
          addCardLadi(messCard, 1);
          addDeco(messCard, 'cluster', 'dw-cluster tr', cluster());
        }

        // - End Sem Exams banner: Top-Right deep swag with hanging tail (Style 0: tr1)
        addCardLadi(one('#examWeekBanner'), 0);

        // - Kaizen panel: Top-Left steep swoop with tail (Style 3: tl4)
        addCardLadi(one('#kaizenPanel'), 3);

        // - Clay Dark / Paper rollout banner: Top-Right shallow garland (Style 2: tr3)
        addCardLadi(one('#paperThemeBanner'), 2);

        // - Semester at a glance heatmap: Top-Right shallow garland (Style 2: tr3) + custom quadrant rangoli
        addCardLadi(one('.heat-panel'), 2);
        addDeco(one('.heat-panel'), 'corner', 'dw-corner', quadrantRangoli());

        // 4. Remaining Grid Panels (if any extra): cycle styles avoiding duplicate
        var panels = document.querySelectorAll('.panel-grid > .panel');
        for(var i = 0; i < panels.length; i++){
          if(panels[i] !== messCard) {
            addCardLadi(panels[i], (i + 1) % 4);
          }
        }

        // 5. Authentic flower accents:
        // - Marigold bloom on 30 logo:
        addDeco(one('.mini-brand'), 'clip', 'dw-clip', bloom());

        // - Marigold blooms on navigation pills:
        addDeco(one('#calToggleBtn'), 'clip', 'dw-clip', bloom());
        addDeco(one('#groupsToggleBtn'), 'clip', 'dw-clip', bloom());
        addDeco(one('#studyRoomsToggleBtn') || one('#studyToggleBtn'), 'clip', 'dw-clip', bloom());
        addDeco(one('#miniStudy'), 'clip', 'dw-clip', bloom());

        // - Flower clusters on card corners:
        addDeco(one('#kaizenPanel'), 'cluster', 'dw-cluster tl', cluster());
        addDeco(one('#examWeekBanner'), 'cluster', 'dw-cluster tr', cluster());
        addDeco(one('#paperThemeBanner'), 'cluster', 'dw-cluster br', cluster());

        // - Month panel (#calPanel) festive dressing:
        var calPanel = one('#calPanel');
        if(calPanel){
          decorateCalGrid();
        }

        // - Squads panel (#groupsPanel) festive dressing:
        var grpPanel = one('#groupsPanel');
        if(grpPanel){
          decorateSquadView(grpPanel.querySelector('#grpView'));
          addDeco(grpPanel.querySelector('.settings-inner'), 'strand', 'dw-strand inset', strand());
        }
      } else {
        // Sub-pages (/spectate, /br): varied diagonal LEDs on cards
        var cards = document.querySelectorAll('.wrap .panel');
        for(var j = 0; j < cards.length; j++){
          addCardLadi(cards[j], j);
        }
      }
    }
    ['calPrevBtn', 'calNextBtn', 'calToggleBtn'].forEach(function(id){
      var btn = document.getElementById(id);
      if(btn) btn.addEventListener('click', function(){ setTimeout(decorateCalGrid, 60); });
    });
    dress();
    if(typeof MutationObserver !== 'undefined'){
      var dressTimer = null;
      new MutationObserver(function(){
        if(!dressTimer) dressTimer = setTimeout(function(){ dressTimer = null; dress(); }, 250);
      }).observe(document.body, {childList:true, subtree:true});
    }
    var app = document.getElementById('app');
    if(app && main){
      var side = document.createElement('div');
      side.className = 'dw-side';
      side.setAttribute('aria-hidden', 'true');
      side.innerHTML = '<div class="dw-lantern">' + lantern('b', 'dwG4') + '</div><div class="dw-lantern b">' + lantern('a', 'dwG5') + '</div>';
      app.appendChild(side);
    }

    /* -------------------------------------------------------------
       Diwali Celebration: Fireworks Overlay & Falling Flower Petals
       ------------------------------------------------------------- */
    var fxCanvas = null, fxCtx = null;
    var fxState = {
      animId: null,
      rockets: [],
      sparks: [],
      rings: [],
      petals: [],
      timers: []
    };

    function ensureFxCanvas(){
      if(!fxCanvas){
        fxCanvas = document.getElementById('dwFxCanvas');
        if(!fxCanvas){
          fxCanvas = document.createElement('canvas');
          fxCanvas.id = 'dwFxCanvas';
          fxCanvas.setAttribute('aria-hidden', 'true');
          document.body.appendChild(fxCanvas);
        }
        fxCtx = fxCanvas.getContext('2d');
        if(typeof window !== 'undefined'){
          window.addEventListener('resize', resizeFxCanvas, { passive: true });
        }
      }
      resizeFxCanvas();
    }

    function resizeFxCanvas(){
      if(!fxCanvas || !fxCtx) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = window.innerWidth, h = window.innerHeight;
      fxCanvas.width = Math.round(w * dpr);
      fxCanvas.height = Math.round(h * dpr);
      fxCanvas.style.width = w + 'px';
      fxCanvas.style.height = h + 'px';
      fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    var PALETTES = [
      { main: '#ff9e8f', glow: 'rgba(255, 158, 143, 0.45)', colors: ['#ff9e8f', '#fb7185', '#ffc2b8', '#fff1f2', '#f9a8c4'] },
      { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)', colors: ['#f43f5e', '#e11d48', '#fb7185', '#fda4af', '#fff1f2'] },
      { main: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', colors: ['#10b981', '#34d399', '#059669', '#6ee7b7', '#a7f3d0'] },
      { main: '#a855f7', glow: 'rgba(168, 85, 247, 0.45)', colors: ['#a855f7', '#f472b6', '#c084fc', '#fb7185', '#e9d5ff'] },
      { main: '#ffffff', glow: 'rgba(255, 255, 255, 0.55)', colors: ['#ffffff', '#fce7f3', '#f9a8c4', '#ffc2b8', '#f8fafc'] }
    ];

    function launchRocket(x0, y0, targetX, targetY, palIdx, shellType){
      var pal = PALETTES[palIdx % PALETTES.length];
      var steps = Math.round(36 + Math.random() * 12);
      var grav = 0.16;
      var dx = targetX - x0;
      var dy = targetY - y0;
      var vx = dx / steps;
      var vy = dy / steps - 0.5 * grav * steps;
      fxState.rockets.push({
        x: x0,
        y: y0,
        vx: vx,
        vy: vy,
        grav: grav,
        targetY: targetY,
        life: steps,
        trail: [],
        pal: pal,
        shellType: shellType || 'chrysanthemum'
      });
    }

    function createExplosion(x, y, pal, shellType){
      fxState.rings.push({
        x: x,
        y: y,
        r: 6,
        maxR: 70 + Math.random() * 30,
        color: pal.main,
        alpha: 0.85
      });

      var count = 90 + Math.floor(Math.random() * 45);
      var isWillow = (shellType === 'willow');
      var isRing = (shellType === 'ring');

      for(var i = 0; i < count; i++){
        var angle, speed;
        if(isRing){
          angle = (i / count) * 6.283 + (Math.random() - 0.5) * 0.12;
          speed = (4.2 + (i % 2) * 1.6 + Math.random() * 0.8);
        } else {
          angle = Math.random() * 6.283;
          speed = Math.pow(Math.random(), 0.5) * (isWillow ? 5.8 : 6.8) + 0.8;
        }

        var col = pal.colors[Math.floor(Math.random() * pal.colors.length)];
        var decay = isWillow ? (0.008 + Math.random() * 0.006) : (0.013 + Math.random() * 0.010);
        var grav = isWillow ? 0.12 : 0.08;
        var drag = isWillow ? 0.965 : 0.975;
        var size = isWillow ? (2.2 + Math.random() * 1.4) : (1.8 + Math.random() * 1.5);

        fxState.sparks.push({
          x: x,
          y: y,
          prevX: x,
          prevY: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: col,
          glowColor: pal.glow,
          alpha: 1.0,
          decay: decay,
          grav: grav,
          drag: drag,
          size: size,
          isWillow: isWillow,
          flicker: Math.random() > 0.45,
          flickerSeed: Math.random() * 10
        });
      }
    }

    function spawnWickSparks(x, y){
      for(var i = 0; i < 24; i++){
        var angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
        var speed = 2.5 + Math.random() * 4.5;
        fxState.sparks.push({
          x: x,
          y: y,
          prevX: x,
          prevY: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: (i % 2 ? '#ffc2b8' : '#fb7185'),
          glowColor: 'rgba(251, 113, 133, 0.5)',
          alpha: 1.0,
          decay: 0.035 + Math.random() * 0.02,
          grav: 0.12,
          drag: 0.96,
          size: 1.6 + Math.random() * 1.2,
          isWillow: false,
          flicker: true,
          flickerSeed: i
        });
      }
    }

    function spawnPetals(count){
      var W = window.innerWidth, H = window.innerHeight;
      var types = [
        { type: 'marigold_orange', front: '#f4707a', back: '#c7355a', vein: '#ffd0d6', aspect: 0.52 },
        { type: 'marigold_yellow', front: '#f472b6', back: '#be185d', vein: '#fbcfe8', aspect: 0.54 },
        { type: 'rose',            front: '#e11d48', back: '#881337', vein: '#fecdd3', aspect: 0.68 },
        { type: 'rose_pink',       front: '#f43f5e', back: '#9f1239', vein: '#fda4af', aspect: 0.65 },
        { type: 'jasmine',         front: '#fffbeb', back: '#fef3c7', vein: '#ffffff', aspect: 0.44 }
      ];

      for(var i = 0; i < count; i++){
        var r = Math.random();
        var t = (r < 0.35) ? types[0] : (r < 0.60) ? types[1] : (r < 0.80) ? types[2] : (r < 0.92) ? types[3] : types[4];

        var size = 13 + Math.random() * 11;
        var startY = -15 - Math.random() * (H * 0.75);
        var startX = Math.random() * W;

        fxState.petals.push({
          x: startX,
          y: startY,
          size: size,
          aspect: t.aspect,
          front: t.front,
          back: t.back,
          vein: t.vein,
          isRose: (t.type.indexOf('rose') >= 0),
          isJasmine: (t.type === 'jasmine'),
          vy: 1.3 + Math.random() * 1.7,
          vx: (Math.random() - 0.5) * 0.7,
          swayAmp: 1.4 + Math.random() * 2.2,
          swayFreq: 0.02 + Math.random() * 0.02,
          swayPhase: Math.random() * 6.283,
          rotZ: Math.random() * 6.283,
          dRotZ: (Math.random() - 0.5) * 0.028,
          rotX: Math.random() * 6.283,
          dRotX: (Math.random() - 0.5) * 0.038,
          rotY: Math.random() * 6.283,
          dRotY: (Math.random() - 0.5) * 0.045,
          alpha: 1.0,
          age: 0
        });
      }
    }

    function updateAndRenderFx(){
      if(!fxCtx || !fxCanvas) return;
      var W = window.innerWidth, H = window.innerHeight;

      fxCtx.clearRect(0, 0, W, H);

      // 1. Shockwaves
      fxCtx.save();
      fxCtx.globalCompositeOperation = 'lighter';
      for(var ri = fxState.rings.length - 1; ri >= 0; ri--){
        var ring = fxState.rings[ri];
        ring.r += (ring.maxR - ring.r) * 0.16;
        ring.alpha -= 0.045;
        if(ring.alpha <= 0 || ring.r >= ring.maxR - 1){
          fxState.rings.splice(ri, 1);
          continue;
        }
        fxCtx.beginPath();
        fxCtx.arc(ring.x, ring.y, ring.r, 0, 6.283);
        fxCtx.strokeStyle = ring.color;
        fxCtx.globalAlpha = Math.max(0, ring.alpha);
        fxCtx.lineWidth = Math.max(1, 4 * (1 - ring.r / ring.maxR));
        fxCtx.stroke();
      }
      fxCtx.restore();

      // 2. Rockets
      fxCtx.save();
      fxCtx.globalCompositeOperation = 'lighter';
      for(var rk = fxState.rockets.length - 1; rk >= 0; rk--){
        var rkt = fxState.rockets[rk];
        rkt.x += rkt.vx;
        rkt.y += rkt.vy;
        rkt.vy += rkt.grav;
        rkt.life--;

        rkt.trail.push({ x: rkt.x, y: rkt.y, alpha: 1, size: 2.2 });
        if(rkt.trail.length > 14) rkt.trail.shift();

        for(var ti = 0; ti < rkt.trail.length; ti++){
          var tp = rkt.trail[ti];
          tp.alpha -= 0.07;
          if(tp.alpha <= 0) continue;
          fxCtx.beginPath();
          fxCtx.arc(tp.x, tp.y, tp.size * tp.alpha, 0, 6.283);
          fxCtx.fillStyle = rkt.pal.main;
          fxCtx.globalAlpha = Math.max(0, tp.alpha * 0.7);
          fxCtx.fill();
        }

        fxCtx.beginPath();
        fxCtx.arc(rkt.x, rkt.y, 3, 0, 6.283);
        fxCtx.fillStyle = '#ffffff';
        fxCtx.globalAlpha = 1;
        fxCtx.fill();

        fxCtx.beginPath();
        fxCtx.arc(rkt.x, rkt.y, 6.5, 0, 6.283);
        fxCtx.fillStyle = rkt.pal.main;
        fxCtx.globalAlpha = 0.55;
        fxCtx.fill();

        if(rkt.y <= rkt.targetY || rkt.vy >= -0.2 || rkt.life <= 0){
          createExplosion(rkt.x, rkt.y, rkt.pal, rkt.shellType);
          fxState.rockets.splice(rk, 1);
        }
      }
      fxCtx.restore();

      // 3. Fireworks Sparks
      fxCtx.save();
      fxCtx.globalCompositeOperation = 'lighter';
      for(var si = fxState.sparks.length - 1; si >= 0; si--){
        var spk = fxState.sparks[si];
        spk.prevX = spk.x;
        spk.prevY = spk.y;
        spk.x += spk.vx;
        spk.y += spk.vy;
        spk.vx *= spk.drag;
        spk.vy *= spk.drag;
        spk.vy += spk.grav;
        spk.alpha -= spk.decay;

        if(spk.alpha <= 0 || spk.y > H + 20){
          fxState.sparks.splice(si, 1);
          continue;
        }

        var curAlpha = spk.alpha;
        if(spk.flicker){
          curAlpha *= (0.7 + 0.3 * Math.sin(spk.alpha * 30 + spk.flickerSeed));
        }

        fxCtx.beginPath();
        fxCtx.arc(spk.x, spk.y, spk.size * 2.2, 0, 6.283);
        fxCtx.fillStyle = spk.glowColor;
        fxCtx.globalAlpha = Math.max(0, curAlpha * 0.35);
        fxCtx.fill();

        fxCtx.beginPath();
        fxCtx.moveTo(spk.prevX, spk.prevY);
        fxCtx.lineTo(spk.x, spk.y);
        fxCtx.strokeStyle = spk.color;
        fxCtx.lineWidth = spk.size;
        fxCtx.lineCap = 'round';
        fxCtx.globalAlpha = Math.max(0, curAlpha);
        fxCtx.stroke();

        if(spk.alpha > 0.55){
          fxCtx.beginPath();
          fxCtx.arc(spk.x, spk.y, spk.size * 0.45, 0, 6.283);
          fxCtx.fillStyle = '#ffffff';
          fxCtx.globalAlpha = Math.max(0, curAlpha * 0.85);
          fxCtx.fill();
        }
      }
      fxCtx.restore();

      // 4. Falling Flower Petals
      fxCtx.save();
      fxCtx.globalCompositeOperation = 'source-over';
      for(var pi = fxState.petals.length - 1; pi >= 0; pi--){
        var pet = fxState.petals[pi];
        pet.age++;
        pet.y += pet.vy;
        pet.x += pet.vx + Math.sin(pet.age * pet.swayFreq + pet.swayPhase) * pet.swayAmp;
        pet.rotZ += pet.dRotZ;
        pet.rotX += pet.dRotX;
        pet.rotY += pet.dRotY;

        if(pet.y > H - 80){
          pet.alpha = Math.max(0, (H + 40 - pet.y) / 120);
        }

        if(pet.alpha <= 0 || pet.y > H + 50){
          fxState.petals.splice(pi, 1);
          continue;
        }

        if(pet.y < -30) continue;

        fxCtx.save();
        fxCtx.translate(pet.x, pet.y);
        fxCtx.rotate(pet.rotZ);

        var sx = Math.cos(pet.rotY);
        var sy = Math.cos(pet.rotX);
        fxCtx.scale(sx, sy);
        fxCtx.globalAlpha = Math.max(0, Math.min(1, pet.alpha));

        var isBack = (sy < 0);
        fxCtx.fillStyle = isBack ? pet.back : pet.front;

        var L = pet.size, Wp = pet.size * pet.aspect;
        fxCtx.beginPath();
        if(pet.isRose){
          fxCtx.moveTo(0, -L * 0.46);
          fxCtx.bezierCurveTo(Wp * 0.82, -L * 0.40, Wp * 0.90, L * 0.25, 0, L * 0.50);
          fxCtx.bezierCurveTo(-Wp * 0.90, L * 0.25, -Wp * 0.82, -L * 0.40, 0, -L * 0.46);
        } else if(pet.isJasmine){
          fxCtx.moveTo(0, -L * 0.50);
          fxCtx.bezierCurveTo(Wp * 0.50, -L * 0.20, Wp * 0.50, L * 0.20, 0, L * 0.50);
          fxCtx.bezierCurveTo(-Wp * 0.50, L * 0.20, -Wp * 0.50, -L * 0.20, 0, -L * 0.50);
        } else {
          fxCtx.moveTo(0, -L * 0.50);
          fxCtx.bezierCurveTo(Wp * 0.72, -L * 0.35, Wp * 0.76, L * 0.30, 0, L * 0.50);
          fxCtx.bezierCurveTo(-Wp * 0.76, L * 0.30, -Wp * 0.72, -L * 0.35, 0, -L * 0.50);
        }
        fxCtx.fill();

        if(!isBack && !pet.isJasmine){
          fxCtx.strokeStyle = pet.vein;
          fxCtx.lineWidth = 0.65;
          fxCtx.beginPath();
          fxCtx.moveTo(0, -L * 0.34);
          fxCtx.quadraticCurveTo(Wp * 0.08, 0, 0, L * 0.35);
          fxCtx.stroke();
        }

        fxCtx.restore();
      }
      fxCtx.restore();

      var totalActive = fxState.rings.length + fxState.rockets.length + fxState.sparks.length + fxState.petals.length;
      if(totalActive > 0){
        fxState.animId = requestAnimationFrame(updateAndRenderFx);
      } else {
        fxState.animId = null;
        if(fxCanvas) fxCanvas.style.display = 'none';
      }
    }

    function igniteCelebration(ox, oy){
      ensureFxCanvas();
      if(fxCanvas) fxCanvas.style.display = 'block';

      var W = window.innerWidth, H = window.innerHeight;

      spawnWickSparks(ox, oy);
      launchRocket(ox, oy, W * 0.5 + (Math.random() - 0.5) * 80, H * 0.22, 0, 'willow');
      spawnPetals(85);

      var schedule = [
        { t: 350,  x: W * 0.24, y: H + 10, tx: W * 0.28, ty: H * 0.26, pal: 1, type: 'peony' },
        { t: 800,  x: W * 0.76, y: H + 10, tx: W * 0.72, ty: H * 0.20, pal: 2, type: 'chrysanthemum' },
        { t: 1350, x: W * 0.42, y: H + 10, tx: W * 0.46, ty: H * 0.16, pal: 3, type: 'ring' },
        { t: 1950, x: W * 0.18, y: H + 10, tx: W * 0.32, ty: H * 0.28, pal: 4, type: 'chrysanthemum' },
        { t: 2000, x: W * 0.82, y: H + 10, tx: W * 0.68, ty: H * 0.24, pal: 1, type: 'peony' },
        { t: 2750, x: W * 0.50, y: H + 10, tx: W * 0.50, ty: H * 0.18, pal: 0, type: 'willow' }
      ];

      schedule.forEach(function(s){
        var tid = setTimeout(function(){
          launchRocket(s.x, s.y, s.tx, s.ty, s.pal, s.type);
          if(!fxState.animId) fxState.animId = requestAnimationFrame(updateAndRenderFx);
        }, s.t);
        fxState.timers.push(tid);
      });

      if(!fxState.animId){
        fxState.animId = requestAnimationFrame(updateAndRenderFx);
      }
    }

    function handleDiyaClick(e){
      var triggerEl = e.target && e.target.closest ? e.target.closest('.dw-diya, .dw-search-diya, .dw-boot-diya, .dw-squad-fireworks-btn') : null;
      if(!triggerEl) return;
      if(e.preventDefault) e.preventDefault();
      if(e.stopPropagation) e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();

      var diyaEl = triggerEl.classList.contains('dw-diya') ? triggerEl : triggerEl.querySelector('.dw-diya');
      if(diyaEl){
        diyaEl.classList.remove('dw-diya-burst');
        void diyaEl.offsetWidth;
        diyaEl.classList.add('dw-diya-burst');
        setTimeout(function(){ diyaEl.classList.remove('dw-diya-burst'); }, 700);
      }
      if(triggerEl.classList.contains('dw-squad-fireworks-btn')){
        triggerEl.style.transform = 'scale(0.95)';
        setTimeout(function(){ triggerEl.style.transform = ''; }, 200);
      }

      if(typeof navigator !== 'undefined' && navigator.vibrate){
        try { navigator.vibrate([35, 45, 60, 30]); } catch(_){}
      }

      var rect = triggerEl.getBoundingClientRect();
      var ox = rect.left + rect.width * 0.55;
      var oy = rect.top + rect.height * 0.25;
      if(ox <= 0 || ox >= window.innerWidth || oy <= 0 || oy >= window.innerHeight){
        ox = window.innerWidth * 0.5;
        oy = window.innerHeight - 30;
      }

      igniteCelebration(ox, oy);
    }

    if(typeof document !== 'undefined'){
      document.addEventListener('click', handleDiyaClick, true);
      document.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){
          var triggerEl = e.target && e.target.closest ? e.target.closest('.dw-diya, .dw-search-diya, .dw-boot-diya, .dw-squad-fireworks-btn') : null;
          if(triggerEl) handleDiyaClick(e);
        }
      }, true);
    }
  } catch(e){}   // purely decorative: must never stop the app
})();
