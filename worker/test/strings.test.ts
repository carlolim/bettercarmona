/** The chat panel has a string, in both languages, for every code the API can return and every kind of source. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { join } from 'node:path';
import { ERROR_CODES } from '../../src/chat/codes.ts';
import { ROOT } from '../../scripts/kb/manifest.ts';
import { NOTICES } from '../reply.ts';
import { INDEX } from './helpers.ts';

const locale = (name: string) => JSON.parse(readFileSync(join(ROOT, `src/community/locales/${name}.json`), 'utf8'));

test('every error code, notice code, and source kind has a string in English and Filipino', () => {
  const kinds = [...new Set(Object.values(INDEX.documents).map((d) => d.kind))];
  for (const name of ['en', 'fil']) {
    const chat = locale(name).chat;
    for (const c of ERROR_CODES) assert.ok(chat.errors[c]?.trim(), `${name}: chat.errors.${c}`);
    for (const n of NOTICES) assert.ok(chat.notices[n]?.trim(), `${name}: chat.notices.${n}`);
    for (const k of kinds) assert.ok(chat.kinds[k]?.trim(), `${name}: chat.kinds.${k}`);
    assert.equal(chat.examples.length, 3);
    assert.ok(chat.examples.some((q: string) => /siga|burning/i.test(q)) && chat.examples.some((q: string) => /amilyar/i.test(q)));
  }
});

test('no chat string has a long dash or an emoji', () => {
  for (const name of ['en', 'fil']) {
    const text = JSON.stringify(locale(name).chat) + JSON.stringify(locale(name).about.assistant);
    assert.doesNotMatch(text, /[–—]|\p{Extended_Pictographic}/u, name);
  }
});
