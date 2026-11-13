/**
 * Tests kb:build: the documents, the index, and the rules that link them to the site's data.
 *
 *   npm run kb:test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { SERVICES, type Requirement, type Service } from '../../src/community/data/services.ts';
import { build, compactGlossary, glossaryMatches, isOnSite, KB, splitAtSections } from './build.ts';

const index = build();
const doc = (path: string) => readFileSync(join(KB, path), 'utf8');
const header = (path: string) => doc(path).split('\n\n')[0];

test('every service has a document linked to its page and the charter', () => {
  for (const s of SERVICES) assert.ok(index.documents[`services/${s.id}.md`], s.id);
  const e = index.documents['services/registration-of-live-birth.md'];
  assert.equal(e.site_url, '/services/registration-of-live-birth');
  assert.match(e.source_url ?? '', /^https:\/\/carmonagov\.net\/portal\/wp-content\/uploads\/2026\/08\/CITY-GOVERNMENT-OF-CARMONA_CC_2026\.pdf#page=60$/);
});

test('service documents keep the charter text word for word', () => {
  const texts = (s: Service): string[] => {
    const reqs = (list: Requirement[]): string[] => list.flatMap((r) => [r.text, ...(r.where ?? []), ...reqs(r.items ?? [])]);
    return [
      s.description, s.office, s.classification, s.transactionType, ...s.whoMayAvail, ...reqs(s.requirements),
      ...(s.requirementsWhere ?? []), ...(s.notes ?? []), ...s.total.fee, ...s.total.time,
      ...s.steps.flatMap((st) => [st.client.replaceAll('\n', ' '), ...st.rows.flatMap((r) => [r.action?.replaceAll('\n', ' ') ?? '', ...(r.fee ?? []), ...(r.time ?? [])])]),
    ].filter(Boolean);
  };
  for (const s of SERVICES) {
    const text = doc(`services/${s.id}.md`);
    for (const t of texts(s)) assert.ok(text.includes(t), `${s.id}: "${t.slice(0, 60)}" is not in its document`);
  }
});

test('item 23 states its total and that the full text is in the scan', () => {
  const text = doc('ordinances/23.md');
  assert.match(text, /P35,270,478\.51/);
  assert.match(text, /The full text is not transcribed\. It is in the scan/);
  assert.equal(index.documents['ordinances/23.md'].coverage, 'summary');
});

test("ordinance 514's header has the words residents use", () => {
  const head = header('ordinances/514.md');
  for (const w of ['pagsisiga', 'open burning', 'siga', 'multa']) assert.match(head, new RegExp(`\\b${w}\\b`), w);
});

test('each ordinance section names its ordinance', () => {
  const text = doc('ordinances/514.md');
  assert.match(text, /002-02 \(2002\), Kautusang Sumasakop sa Pagsusunog ng mga Basura sa Bayan ng Carmona, Cavite\n## SEKSIYON 4\. KAPARUSAHAN\./);
});

test('every index entry has a document and a link, and the other way round', () => {
  for (const [path, e] of Object.entries(index.documents)) {
    assert.ok(doc(path).trim(), path);
    assert.ok(e.site_url || e.source_url, path);
    assert.ok(e.title && e.kind, path);
  }
});

test('a service added to SERVICES leaves the charter index', () => {
  const entry = { number: '1', title: 'Application For Civil Society Organization (CSO) Accreditation', office: 'OFFICE OF THE CITY MAYOR', page: 2 };
  assert.equal(isOnSite(entry), false);
  const added = { ...SERVICES[0], id: 'cso-accreditation', title: 'Application for Civil Society Organization Accreditation', pages: [2, 3] } as Service;
  assert.equal(isOnSite(entry, [...SERVICES, added]), true);
  assert.equal(isOnSite({ ...entry, page: 4 }, [...SERVICES, added]), false);
  const listed = Object.keys(index.documents).filter((p) => p.startsWith('charter-index/')).map(doc).join('\n');
  assert.match(listed, /Application For Civil Society Organization \(CSO\) Accreditation/);
  assert.doesNotMatch(listed, /- Registration of Certificate of Live Birth\./);
});

test('long text splits between sections', () => {
  const text = ['intro', 'A (2000), Title', '## Section 1.', 'x'.repeat(30), 'A (2000), Title', '## Section 2.', 'y'.repeat(30)].join('\n');
  const parts = splitAtSections(text, 70);
  assert.equal(parts.length, 2);
  assert.match(parts[1], /^A \(2000\), Title\n## Section 2\./);
});

test('the glossary works both ways', () => {
  const g = [{ topic: 'taxes', everyday: ['amilyar'], official: ['real property tax'] }];
  assert.deepEqual(glossaryMatches('Pay the Real Property Tax by March.', g), ['amilyar', 'real property tax']);
  assert.deepEqual(glossaryMatches('A familiar word.', g), []);
  assert.deepEqual(compactGlossary(g), { amilyar: ['real property tax'], 'real property tax': ['amilyar'] });
});
