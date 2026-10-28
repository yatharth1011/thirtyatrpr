// Shared, READ-ONLY Firestore bridge for the student-facing pages (main app + spectate). Loaded as
// its own <script type="module"> — never shares scope with app3.js/spectate.js (both plain classic
// scripts) — so it talks to the rest of the page through one deliberately tiny, explicit surface:
// window.__liveOverlay (the raw array of scheduleOverlay docs) plus a 'thirty:overlay' event fired
// on every update. This keeps the bulk of the Firebase SDK's write-capable surface out of these
// pages entirely — only build/br.js (the authoring tool) ever imports the write functions.
//
// Deliberately resilient to Firestore being slow/unreachable: the page has already rendered from
// the static baked-in DATA by the time this resolves (or fails) — this only ever ADDS live BR
// corrections on top, never blocks or delays the first paint.
// The Firebase SDK is imported only AFTER the page's own load event (dynamic import below), not statically: static module
// imports from gstatic.com are subresources of the page, so the browser kept "loading" — including Chrome's progress bar
// at the top of the installed app — until two Firebase modules and their dependencies had downloaded. The live edits are
// not delayed in practice: app3.js reads them straight away over REST (window.__overlayFast) and this listener takes over.
const FB_V = 'https://www.gstatic.com/firebasejs/12.19.0/';
const firebaseConfig = {
  projectId: "thirtyatrpr",
  appId: "1:179913818545:web:5b9ac08846032badbafd90",
  storageBucket: "thirtyatrpr.firebasestorage.app",
  apiKey: atob("QUl6YVN5QWhCVHNmdVV6X0htc1FJMGl5blVQRVhhbGdTbEJ0c1p3"),
  authDomain: "thirtyatrpr.firebaseapp.com",
  messagingSenderId: "179913818545"
};

function init(appMod, fsMod) {
  const { initializeApp, getApps, getApp } = appMod;
  const { getFirestore, collection, onSnapshot } = fsMod;
  try {
    // The creator-only Kaizen bridge (kaizen_bridge.js) may have created the default app first.
    const fbApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(fbApp);
    window.__liveOverlay = [];
    onSnapshot(collection(db, 'scheduleOverlay'), function(snap){
      window.__liveOverlaySdk = true;   // from here on the SDK is the source; app3's REST fast path stands down
      window.__liveOverlay = snap.docs.map(function(d){ return Object.assign({id: d.id}, d.data()); });
      document.dispatchEvent(new CustomEvent('thirty:overlay'));
    }, function(err){
      // Read is public (no sign-in) — students never authenticate on this page at all. A failure
      // here (offline, Firestore down, ad-blocker) is expected sometimes and not fatal: the static
      // baked schedule has already rendered by the time this listener even attaches.
      console.warn('live overlay unavailable (this is fine — static schedule is unaffected):', err && err.message);
      document.dispatchEvent(new CustomEvent('thirty:overlay-failed', { detail: (err && err.code) || 'error' }));
    });
    // Who uses Kaizen (public, see firestore.rules) — the dashboard greets them in kaizen style and colours their
    // names in Squads. window.__kaizenUsers = { entry: { on } }, plus a 'thirty:kaizen-users' event on every change.
    onSnapshot(collection(db, 'kaizenUsers'), function(snap){
      var users = {};
      snap.docs.forEach(function(d){ users[d.id] = { on: !!d.data().on }; });
      window.__kaizenUsers = users;
      document.dispatchEvent(new CustomEvent('thirty:kaizen-users'));
    }, function(err){ console.warn('kaizen users list unavailable:', err && err.code); });
  } catch(err){
    console.warn('live overlay bridge failed to init (this is fine — static schedule is unaffected):', err);
    document.dispatchEvent(new CustomEvent('thirty:overlay-failed', { detail: 'init' }));
  }
}

function start() {
  Promise.all([import(FB_V + 'firebase-app.js'), import(FB_V + 'firebase-firestore.js')])
    .then(function (m) { init(m[0], m[1]); })
    .catch(function (err) {
      console.warn('live overlay bridge failed to load the Firebase SDK (this is fine — static schedule is unaffected):', err);
      document.dispatchEvent(new CustomEvent('thirty:overlay-failed', { detail: 'init' }));
    });
}
if (document.readyState === 'complete') start();
else window.addEventListener('load', start, { once: true });
