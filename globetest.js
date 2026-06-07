const test = require('node:test');
const assert = require('node:assert');
const G = require('./worldcup/globe-data.js');
global.window = global.window || {};
require('./worldcup/data.js'); // sets window.WC
const WC = global.window.WC;

test('lonLatToVec3 maps known points onto the sphere', () => {
  const a = G.lonLatToVec3(0, 0, 1);
  assert.ok(Math.abs(a.x - 1) < 1e-9 && Math.abs(a.y) < 1e-9 && Math.abs(a.z) < 1e-9, JSON.stringify(a));
  const p = G.lonLatToVec3(0, 90, 1);
  assert.ok(Math.abs(p.y - 1) < 1e-9, JSON.stringify(p));
  const m = G.lonLatToVec3(37, -12, 2);
  assert.ok(Math.abs(Math.sqrt(m.x * m.x + m.y * m.y + m.z * m.z) - 2) < 1e-9);
});

test('TEAM_GEO covers every WC.T team with a valid pin', () => {
  Object.keys(WC.T).forEach((code) => {
    const g = G.TEAM_GEO[code];
    assert.ok(g, 'no globe entry for ' + code);
    assert.ok(Array.isArray(g.pin) && g.pin.length === 2, code + ' bad pin');
    assert.ok(g.pin[0] >= -180 && g.pin[0] <= 180, code + ' lon range');
    assert.ok(g.pin[1] >= -90 && g.pin[1] <= 90, code + ' lat range');
    assert.ok(g.iso === null || typeof g.iso === 'string', code + ' iso type');
  });
});

test('ENG and SCO have distinct pins (shared UK shape)', () => {
  assert.notDeepEqual(G.TEAM_GEO.ENG.pin, G.TEAM_GEO.SCO.pin);
  assert.equal(G.TEAM_GEO.ENG.iso, G.TEAM_GEO.SCO.iso); // both 826 (GB)
});

test('hasWebGL returns a boolean without throwing (no document in node)', () => {
  assert.equal(typeof G.hasWebGL(), 'boolean');
});
