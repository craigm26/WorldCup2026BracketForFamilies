const test = require('node:test');
const assert = require('node:assert');
const H = require('./worldcup/help-data.js');

test('help-data exports cards + links', () => {
  assert.ok(Array.isArray(H.cards) && H.cards.length >= 15);
  assert.ok(Array.isArray(H.links) && H.links.length >= 1);
});

test('every card has group, id, icon, title, summary; ids unique', () => {
  const seen = new Set();
  H.cards.forEach((c) => {
    ['group', 'id', 'icon', 'title', 'summary'].forEach((k) =>
      assert.ok(c[k] && typeof c[k] === 'string', `card ${c.id} missing ${k}`));
    if ('steps' in c) {
      assert.ok(Array.isArray(c.steps) && c.steps.length > 0, `card ${c.id} has empty steps`);
      c.steps.forEach((s) => assert.equal(typeof s, 'string'));
    }
    assert.ok(!seen.has(c.id), `duplicate id ${c.id}`);
    seen.add(c.id);
  });
});

test('coverage: every required feature has a help card', () => {
  const ids = new Set(H.cards.map((c) => c.id));
  ['start-what','start-tabs','pickem','bracket','scores','stk-mark','stk-scan','stk-trade',
   'family-relative','family-host','schedule','watch','facts','play','extras','settings']
    .forEach((id) => assert.ok(ids.has(id), `missing help card: ${id}`));
});

test('no dead deep-links: every link id is a real card', () => {
  const ids = new Set(H.cards.map((c) => c.id));
  H.links.forEach((id) => assert.ok(ids.has(id), `deep-link target ${id} has no card`));
});
