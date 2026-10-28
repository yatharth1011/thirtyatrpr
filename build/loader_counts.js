// Numbers shown by the Spectate / BR Tools loaders ("698 students · 12 groups · 42 rooms", "24 branch reps"…), taken from the
// SAME engine code the pages themselves use (build/engine.js: the student index, the picker's group/branch units, the Rooms tab's
// venue list) instead of counting raw data a second way — a second way of counting is how "42 rooms" got on screen while the
// Rooms tab says 37. splice.py runs this and bakes the result into the loaders; verify_all.js checks the built pages against it.
// Run from the portal root: node build/loader_counts.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const BASE = __dirname;
const sandbox = { console, Uint8Array, WeakMap };
sandbox.window = sandbox;
sandbox.document = { addEventListener() {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(BASE, 'thirty_data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(BASE, 'engine.js'), 'utf8') + '\nthis.__E = ENGINE; this.__D = THIRTY_DATA;', sandbox);
const E = sandbox.__E, D = sandbox.__D;
const units = Object.keys(E.UNIT_BY_ID).map((k) => E.UNIT_BY_ID[k]);
const reps = {};
(D.batchReps || []).forEach((r) => r.reps.forEach((e) => { reps[e] = 1; }));
const out = {
  students: E.N,
  groups: units.filter((u) => u.level === 'group').length,
  branches: units.filter((u) => u.level === 'branch').map((u) => u.label),   // already display names (MCB -> MnC)
  rooms: E.ALL_VENUES.length,
  reps: Object.keys(reps).length
};
process.stdout.write(JSON.stringify(out));
