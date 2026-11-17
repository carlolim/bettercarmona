/**
 * Tests the ordinance validator: the two examples pass, and copies with one thing broken fail.
 *
 *   npm run kb:test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadManifest } from './manifest.ts';
import { LIBRARY } from './sb-office.ts';
import { fileProblems, ORDINANCES } from './validate.ts';

const manifest = new Map(loadManifest(LIBRARY).items.map((e) => [e.sb_id, e]));
const FULL = '2002/514-pagsusunog-ng-basura.md';
const SUMMARY = '1994/23-annual-budget-1994.md';
const text = (name: string) => readFileSync(join(ORDINANCES, name), 'utf8');
const problems = (name: string, body: string) => fileProblems(`knowledge/ordinances/${name}`, body, manifest).problems;

test('the two examples pass', () => {
  assert.deepEqual(problems(FULL, text(FULL)), []);
  assert.deepEqual(problems(SUMMARY, text(SUMMARY)), []);
});

test('a changed hash fails', () => {
  const copy = text(FULL).replace(/sha256: "4ec2/, 'sha256: "0000');
  assert.match(problems(FULL, copy).join('\n'), /sha256 differs from the manifest/);
});

test('a missing field fails', () => {
  const copy = text(FULL).replace(/^session: .*\n/m, '');
  assert.match(problems(FULL, copy).join('\n'), /session must be text or null/);
});

test('a long dash fails', () => {
  const copy = text(FULL).replace('SAPAGKAT, alinsunod', 'SAPAGKAT \u2014 alinsunod');
  assert.match(problems(FULL, copy).join('\n'), /long dash on line/);
});

test('a wrong uncertain count fails', () => {
  const copy = text(FULL).replace('SAPAGKAT, alinsunod', 'SAPAGKAT, [illegible] alinsunod');
  assert.match(problems(FULL, copy).join('\n'), /uncertain is 0, but the file has 1/);
});

test('a missing page marker fails', () => {
  const copy = text(FULL).replace('<!-- page 2 -->', '');
  assert.match(problems(FULL, copy).join('\n'), /3 page markers, but source.pages is 4/);
});

test('a summary amount not in key_facts fails', () => {
  const copy = text(SUMMARY).replace('kabuuang halagang P35,270,478.51', 'kabuuang halagang P35,270,478.15');
  assert.match(problems(SUMMARY, copy).join('\n'), /P35,270,478\.15, which is not in key_facts/);
});

test('transcribed text in a summary-only body fails', () => {
  const copy = `${text(SUMMARY)}\nSECTION 1. The sum of...\n`;
  assert.match(problems(SUMMARY, copy).join('\n'), /holds only its heading/);
});

test('a file name that does not match fails', () => {
  assert.match(problems('2003/514-pagsusunog-ng-basura.md', text(FULL)).join('\n'), /file name must be/);
  assert.match(problems('2002/514-basura.md', text(FULL)).join('\n'), /file name must be/);
});

test('date_approved before date_enacted fails', () => {
  const copy = text(FULL).replace('date_approved: 2002-04-29', 'date_approved: 2002-04-01');
  assert.match(problems(FULL, copy).join('\n'), /date_approved is before date_enacted/);
});
