// Creator-only cloud copy of the Kaizen roadmap state, so the dashboard shows the same Kaizen tasks — DSA track
// included — on the phone as on the Mac. Main dashboard only, and it does nothing at all (not even loading the
// Firebase auth SDK) unless the logged-in entry is 2026AIB1099.
//
// One Firestore doc, /kaizen/state, readable and writable ONLY by the creator's signed-in @iitrpr.ac.in Google
// account (see firestore.rules): { ticks: {code: {v, t}}, dsa: [task...], dsaHash }. The DSA track stays unpublished — it is never in the public bundle, only in this private doc,
// which the Mac's dashboard fills from the Kaizen app. Talks to app3.js through window.__kzCloud* and a
// 'thirty:kaizen' event, the same tiny-surface pattern as live_overlay_bridge.js.
const CREATOR = '2026AIB1099';
let entry = null;
try { entry = localStorage.getItem('thirtyatrpr_entry'); } catch (e) {}

// ---- Kaizen linking, for every student ---------------------------------------------------------------------
// Using Kaizen requires linking the student's own @iitrpr Google account: turning it on (or off) signs them in
// once and writes their public /kaizenUsers/{entry} record (firestore.rules lets only that account write it).
// The Firebase auth SDK is loaded lazily — window.__kzPreload() is called as soon as a kaizen switch or pitch is
// on screen, so the sign-in popup can still open straight from the tap (browsers block popups opened later).
const FB_V = 'https://www.gstatic.com/firebasejs/12.19.0/';
let fbPromise = null;
function loadFb() {
  if (!fbPromise) fbPromise = Promise.all([import(FB_V + 'firebase-app.js'), import(FB_V + 'firebase-auth.js'), import(FB_V + 'firebase-firestore.js')])
    .then(([{ initializeApp, getApps, getApp }, A, F]) => {
      const app = getApps().length ? getApp() : initializeApp({
        projectId: 'thirtyatrpr', appId: '1:179913818545:web:5b9ac08846032badbafd90',
        storageBucket: 'thirtyatrpr.firebasestorage.app', apiKey: atob('QUl6YVN5QWhCVHNmdVV6X0htc1FJMGl5blVQRVhhbGdTbEJ0c1p3'),
        authDomain: 'thirtyatrpr.firebaseapp.com', messagingSenderId: '179913818545' });
      const auth = A.getAuth(app);
      const ready = new Promise((res) => { const off = A.onAuthStateChanged(auth, (u) => { off(); res(u); }); });
      return { A, F, auth, db: F.getFirestore(app), ready };
    });
  return fbPromise;
}
const localPart = (u) => (u && u.email ? u.email.split('@')[0].toUpperCase() : '');
window.__kzPreload = () => { loadFb().catch(() => {}); };
// Resolves when the record is written; rejects with Error('wrong-account' | 'cancelled' | firebase code).
window.__kzLink = async (forEntry, on) => {
  const { A, F, auth, db, ready } = await loadFb();
  let user = auth.currentUser || await ready;
  if (localPart(user) !== forEntry) {
    const p = new A.GoogleAuthProvider();
    p.setCustomParameters({ hd: 'iitrpr.ac.in', login_hint: forEntry.toLowerCase() + '@iitrpr.ac.in', prompt: 'select_account' });
    try { user = (await A.signInWithPopup(auth, p)).user; }
    catch (err) { throw new Error(err && /popup-closed|cancelled/.test(err.code || '') ? 'cancelled' : (err && err.code) || 'sign-in-failed'); }
  }
  if (localPart(user) !== forEntry) throw new Error('wrong-account');
  await F.setDoc(F.doc(db, 'kaizenUsers', forEntry), { on: !!on, t: F.serverTimestamp() });
  return true;
};

// ---- One Kaizen user's day, the same on every device ---------------------------------------------------------
// /kaizenPrivate/{entry} = { on, min, from, mess, extras: {v, t}, moves: {iso: {v: JSON, t}} } — readable and
// writable ONLY by that entry's signed-in @iitrpr Google account (firestore.rules). app3.js owns the merging
// (newest t wins per field / per date) and keeps localStorage as the offline cache; this side only listens and
// writes. Surface: window.__kzPrivStart(entry), __kzPrivStatus ('on' | 'signed-out' | 'wrong-account' | 'error'),
// __kzPrivData, __kzPrivWrite(partial, dropDates) and a 'thirty:kaizen-private' event on every change.
let privFor = null;
window.__kzPrivStart = (forEntry) => {
  if (privFor || !forEntry) return;
  privFor = forEntry;
  loadFb().then(({ A, F, auth, db }) => {
    const ref = F.doc(db, 'kaizenPrivate', forEntry);
    const signal = () => document.dispatchEvent(new CustomEvent('thirty:kaizen-private'));
    let unsub = null;
    window.__kzPrivWrite = (partial, drop) => {
      if (window.__kzPrivStatus !== 'on') return Promise.resolve();
      const data = Object.assign({}, partial);
      if (drop && drop.length) { data.moves = Object.assign({}, data.moves); drop.forEach((d) => { data.moves[d] = F.deleteField(); }); }
      return F.setDoc(ref, data, { merge: true }).catch((err) => console.warn('kaizen private write failed:', err && err.code));
    };
    A.onAuthStateChanged(auth, (user) => {
      if (unsub) { unsub(); unsub = null; }
      window.__kzPrivData = null;
      if (localPart(user) !== forEntry) { window.__kzPrivStatus = user ? 'wrong-account' : 'signed-out'; signal(); return; }
      unsub = F.onSnapshot(ref, (snap) => {
        window.__kzPrivStatus = 'on';
        window.__kzPrivData = snap.exists() ? snap.data() : {};
        signal();
      }, (err) => { console.warn('kaizen private sync unavailable:', err && err.code); window.__kzPrivStatus = 'error'; signal(); });
    });
  }).catch((err) => { privFor = null; console.warn('kaizen private sync failed to init:', err); });
};
// Start right away when this device already knows its user is on Kaizen (app3.js also starts it as soon as the
// online /kaizenUsers record says so, or the moment Kaizen is switched on).
try {
  const p = JSON.parse(localStorage.getItem('thirtyatrpr_selfstudy_prefs') || 'null');
  if (entry && (entry === CREATOR || (p && p.on))) window.__kzPrivStart(entry);
} catch (e) {}

if (entry === CREATOR) {
  (async () => {
    try {
      const V = 'https://www.gstatic.com/firebasejs/12.19.0/';
      const [{ initializeApp, getApps, getApp }, A, F] = await Promise.all([
        import(V + 'firebase-app.js'), import(V + 'firebase-auth.js'), import(V + 'firebase-firestore.js')]);
      const app = getApps().length ? getApp() : initializeApp({
        projectId: 'thirtyatrpr', appId: '1:179913818545:web:5b9ac08846032badbafd90',
        storageBucket: 'thirtyatrpr.firebasestorage.app', apiKey: atob('QUl6YVN5QWhCVHNmdVV6X0htc1FJMGl5blVQRVhhbGdTbEJ0c1p3'),
        authDomain: 'thirtyatrpr.firebaseapp.com', messagingSenderId: '179913818545' });
      const auth = A.getAuth(app), db = F.getFirestore(app), ref = F.doc(db, 'kaizen', 'state');
      let unsub = null;
      const signal = (status) => { window.__kzCloudStatus = status; document.dispatchEvent(new CustomEvent('thirty:kaizen-status')); };
      window.__kzCloudSignIn = () => {
        const p = new A.GoogleAuthProvider();
        p.setCustomParameters({ hd: 'iitrpr.ac.in', login_hint: CREATOR.toLowerCase() + '@iitrpr.ac.in' });
        return A.signInWithPopup(auth, p).catch((err) => console.warn('kaizen sign-in failed:', err && err.code));
      };
      // merge:true deep-merges maps, so {ticks: {CODE: {...}}} touches only that one code.
      window.__kzCloudWrite = (partial) => {
        if (window.__kzCloudStatus !== 'on') return Promise.resolve();
        return F.setDoc(ref, partial, { merge: true }).catch((err) => console.warn('kaizen cloud write failed:', err && err.code));
      };
      A.onAuthStateChanged(auth, (user) => {
        if (unsub) { unsub(); unsub = null; }
        const mine = user && user.email && user.email.split('@')[0].toUpperCase() === CREATOR;
        if (!mine) { signal(user ? 'wrong-account' : 'signed-out'); return; }
        signal('on');
        unsub = F.onSnapshot(ref, (snap) => {
          window.__kzCloudData = snap.exists() ? snap.data() : {};
          document.dispatchEvent(new CustomEvent('thirty:kaizen'));
        }, (err) => { console.warn('kaizen cloud unavailable:', err && err.code); signal('error'); });
      });
    } catch (err) {
      console.warn('kaizen bridge failed to init (the dashboard still works from this device alone):', err);
    }
  })();
}
