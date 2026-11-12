/**
 * Tests the SB Office page parser against saved library pages in scripts/kb/fixtures/.
 *
 *   npm run kb:test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';
import { parseCategories, parseCategoryPage, parseItemPage, parseNumber, pdfPages } from './sb-office.ts';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const FILES = 'http://122.54.120.194:888/sboffice/files/timeline_files/';

test('item 23: a typed budget ordinance', () => {
  const p = parseItemPage(fixture('view-23.html'));
  assert.match(p.title, /^Appropriation Ordinance No\. 001-94 \( 001-94\) An ordinance enacting the Annual Budget/);
  assert.equal(p.numberListed, '001-94');
  assert.match(p.description, /^An ordinance enacting the Annual Budget .* \( P 35,270,478\.51\)$/);
  assert.equal(p.category, 'FINANCE AND APPROPRIATION');
  assert.deepEqual(p.fileUrls, [`${FILES}help_file5e3c8edbf2840-001-94.pdf`]);
});

test('item 514: a Tagalog ordinance listed under another number', () => {
  const p = parseItemPage(fixture('view-514.html'));
  assert.equal(p.title, 'Municipal Ordinance No. 02-2002 (02-2002) KAUTUSANG SUMASAKOP SA PAGSUSUNOG NG MGA BASURA SA BAYAN NG CARMONA, CAVITE');
  assert.equal(p.numberListed, '02-2002');
  assert.equal(p.description, 'KAUTUSANG SUMASAKOP SA PAGSUSUNOG NG MGA BASURA SA BAYAN NG CARMONA, CAVITE');
  assert.equal(p.category, 'HEALTH, ENERGY AND ENVIRONMENTAL PROTECTION');
  assert.deepEqual(p.fileUrls, [`${FILES}help_file5e5bf9302b525-002-02_Committee-on-Health-and-Environment.pdf`]);
});

test('item 694: Word markup in the description is reduced to text', () => {
  const p = parseItemPage(fixture('view-694.html'));
  assert.equal(p.numberListed, '03-2024');
  assert.equal(p.category, 'EDUCATION & CULTURE');
  assert.deepEqual(p.description.split('\n'), [
    'CITY ORDINANCE NO. 03-2024: AN ORDINANCE LOCALIZING REPUBLIC ACT NUMBER 11036, OTHERWISE KNOWN AS THE “MENTAL HEALTH ACT” THEREBY CREATING A MENTAL HEALTH TASK FORCE, DEFINING ITS DUTIES AND FUNCTIONS, AND FOR OTHER PURPOSES',
    'SP Joint Committees on Education & Health and Social Services',
    'Introduced by: Hon. Bernie A. Ortiz and Hon. Rebecca L. Reyes',
  ]);
  assert.doesNotMatch(p.description, /[<>]|mso-|&\w+;/);
  assert.deepEqual(p.fileUrls, [`${FILES}help_file67fc6bf4e9206-03-2024.pdf`]);
});

test('every item page lists the 27 categories in its sidebar', () => {
  for (const name of ['view-23.html', 'view-514.html', 'view-694.html']) {
    const cats = parseCategories(fixture(name));
    assert.equal(cats.length, 27);
    assert.ok(cats.some((c) => c.id === 20 && c.name === 'GAMES AMUSEMENT'));
    assert.ok(cats.some((c) => c.id === 41 && c.name === 'HOUSING & LAND USE'));
  }
});

test('the front page gives the categories with their item counts', () => {
  const cats = parseCategories(fixture('front.html'));
  assert.equal(cats.length, 27);
  assert.deepEqual(cats[0], { id: 1, name: 'AGRICULTURE', count: 9 });
  assert.ok(cats.every((c) => Number.isInteger(c.count)));
});

test('a category page lists all its items on one page', () => {
  const { ids, paged } = parseCategoryPage(fixture('category-13.html'));
  const count = parseCategories(fixture('front.html')).find((c) => c.id === 13)?.count;
  assert.equal(paged, false);
  assert.equal(ids.length, count);
  assert.ok(ids.includes(23));
});

test('numbers in listed titles', () => {
  assert.equal(parseNumber('Resolution No. 2019-045 approving'), '2019-045');
  assert.equal(parseNumber('Ordinance No.5 series of 1990'), '5');
  assert.equal(parseNumber('An ordinance with no number'), null);
});

test('PDF page counts, plain and in a compressed object stream', () => {
  const plain = Buffer.from('%PDF-1.4\n2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n', 'latin1');
  assert.equal(pdfPages(plain), 2);
  const inner = deflateSync(Buffer.from('2 0 << /Type /Pages /Count 6 /Kids [3 0 R] >>', 'latin1'));
  const packed = Buffer.concat([
    Buffer.from(`%PDF-1.5\n5 0 obj\n<< /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode /Length ${inner.length} >>\nstream\n`, 'latin1'),
    inner,
    Buffer.from('\nendstream\nendobj\n', 'latin1'),
  ]);
  assert.equal(pdfPages(packed), 6);
});
