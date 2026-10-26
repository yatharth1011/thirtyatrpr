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
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getFirestore, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const firebaseConfig = {
  projectId: "thirtyatrpr",
  appId: "1:179913818545:web:5b9ac08846032badbafd90",
  storageBucket: "thirtyatrpr.firebasestorage.app",
  apiKey: atob("QUl6YVN5QWhCVHNmdVV6X0htc1FJMGl5blVQRVhhbGdTbEJ0c1p3"),
  authDomain: "thirtyatrpr.firebaseapp.com",
  messagingSenderId: "179913818545"
};

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
