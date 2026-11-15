/** The reply check: labels, links, order, the featured page, and notices. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReply, parseModelJson } from '../reply.ts';
import { INDEX } from './helpers.ts';

const docs = INDEX.documents;
const reply = (o: unknown) => JSON.stringify(o);
const SIX = ['hotlines/_all.md', 'services/registration-of-live-birth.md', 'charter-index/547-real-property-tax.md', 'ordinances/514.md', 'ordinances/23.md', 'officials.md'];

test('a reply citing only S9, when six passages were sent, is not_found', () => {
  const r = buildReply(reply({ kind: 'answer', text: 'Pay at the office. [S9]', sources: ['S9'] }), SIX, docs);
  assert.equal(r.kind, 'not_found');
  assert.deepEqual(r.sources, []);
  assert.equal(r.featured, null);
});

test('unknown labels and model-written links are removed from the text', () => {
  const r = buildReply(reply({ kind: 'answer', text: 'Go to https://example.com/x or [the page](https://evil.example). [S2][S9]', sources: ['S2', 'S9'] }), SIX, docs);
  assert.equal(r.kind, 'answer');
  assert.doesNotMatch(r.text, /https?:|evil|S9|\[S/);
  assert.match(r.text, /the page/);
  assert.match(r.text, /\[1\]/);
});

test('every link comes from the index, sources with a page here first, the featured one as number 1', () => {
  const r = buildReply(reply({ kind: 'answer', text: 'Call [S1]. Register at the office [S2]. See [S3].', sources: ['S1', 'S3', 'S2'] }), SIX, docs);
  assert.deepEqual(r.sources.map((s) => s.title), [docs['services/registration-of-live-birth.md'].title, docs['hotlines/_all.md'].title, docs['charter-index/547-real-property-tax.md'].title]);
  assert.deepEqual(r.featured, { title: docs['services/registration-of-live-birth.md'].title, kind: 'service', site_url: '/services/registration-of-live-birth' });
  for (const s of r.sources) {
    const e = Object.values(docs).find((d) => d.title === s.title)!;
    assert.equal(s.site_url, e.site_url);
    assert.equal(s.source_url, e.source_url);
  }
  assert.equal(r.text, 'Call [2]. Register at the office [1]. See [3].');
});

test('the featured page is the one the text cites most; a tie goes to the model\'s order', () => {
  const most = buildReply(reply({ kind: 'answer', text: 'Burning is banned [S4]. Bring the form [S2]. Pay at the office [S2]. Claim it [S2].', sources: ['S4', 'S2'] }), SIX, docs);
  assert.equal(most.featured?.site_url, '/services/registration-of-live-birth');
  assert.equal(most.sources[0].key, 'services/registration-of-live-birth.md', 'the featured page is number 1');
  const tie = buildReply(reply({ kind: 'answer', text: 'Burning is banned [S4]. Bring the form [S2].', sources: ['S4', 'S2'] }), SIX, docs);
  assert.equal(tie.featured?.site_url, '/ordinances/514');
});

test('a reply whose only source is a charter index entry has no featured page and says so', () => {
  const r = buildReply(reply({ kind: 'answer', text: 'It is on page 547 of the charter. [S3]', sources: ['S3'] }), SIX, docs);
  assert.equal(r.featured, null);
  assert.deepEqual(r.notices, ['not_on_site_yet']);
});

test('ordinance notices: may have changed, and summary only', () => {
  const full = buildReply(reply({ kind: 'answer', text: 'Bawal ang pagsisiga. [S4]', sources: ['S4'] }), SIX, docs);
  assert.deepEqual(full.notices, ['ordinance_may_have_changed']);
  assert.equal(full.featured?.site_url, '/ordinances/514');
  const summary = buildReply(reply({ kind: 'answer', text: 'The 1994 budget was P35,270,478.51. [S5]', sources: ['S5'] }), SIX, docs);
  assert.ok(summary.notices.includes('summary_only'));
  assert.ok(summary.notices.includes('ordinance_may_have_changed'));
});

test('an unreviewed ordinance carries the unchecked transcription notice', () => {
  const index = { ...docs, 'ordinances/514.md': { ...docs['ordinances/514.md'], reviewed: false } };
  const r = buildReply(reply({ kind: 'answer', text: 'Bawal. [S4]', sources: ['S4'] }), SIX, index);
  assert.ok(r.notices.includes('unreviewed_transcription'));
});

test('clarify, not_found, and out_of_scope have no featured page; the last two point onward', () => {
  const c = buildReply(reply({ kind: 'clarify', text: 'Is the business new or a renewal?', sources: [] }), SIX, docs);
  assert.equal(c.kind, 'clarify');
  assert.equal(c.featured, null);
  const o = buildReply(reply({ kind: 'out_of_scope', text: 'I can help with city services.', sources: ['S1'] }), SIX, docs);
  assert.equal(o.featured, null);
  assert.deepEqual(o.sources, []);
  assert.deepEqual(o.links?.map((l) => l.label), ['hotlines', 'official_site']);
  const n = buildReply(reply({ kind: 'not_found', text: 'Wala.', sources: [] }), SIX, docs);
  assert.equal(n.kind, 'not_found');
  assert.deepEqual(n.links?.map((l) => l.label), ['hotlines', 'official_site']);
});

test('model output that is not JSON becomes not_found; JSON wrapped in prose is recovered once', () => {
  assert.equal(buildReply('Sure! Here is the answer: pay P100.', SIX, docs).kind, 'not_found');
  assert.equal(buildReply('{"kind": "answer", "text": "x [S2]"', SIX, docs).kind, 'not_found');
  const wrapped = 'Here you go:\n```json\n{"kind":"answer","text":"Register within 30 days. [S2]","sources":["S2"]}\n```';
  assert.equal(buildReply(wrapped, SIX, docs).kind, 'answer');
  assert.equal(parseModelJson('[1,2]'), null);
});

test('two passages from one document make one source', () => {
  const sent = ['ordinances/711.md', 'ordinances/711.md'];
  const r = buildReply(reply({ kind: 'answer', text: 'A [S1]. B [S2].', sources: ['S1', 'S2'] }), sent, docs);
  assert.equal(r.sources.length, 1);
  assert.equal(r.text, 'A [1]. B [1].');
});

test('a bracket of several labels is split, checked, and numbered', () => {
  const r = buildReply(reply({ kind: 'answer', text: 'Call 0917 [S1, S2, S9].', sources: ['S1', 'S2'] }), SIX, docs);
  assert.equal(r.text, 'Call 0917 [2][1].');
  assert.equal(r.sources.length, 2);
});
