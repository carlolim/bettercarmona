/** The ordinance pages' data: the block parser and what kb:build writes to public/data/ordinances/. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { inline, toBlocks } from './blocks.ts';
import { build, PAGE_DATA } from './build.ts';
import { loadManifest } from './manifest.ts';
import { LIBRARY } from './sb-office.ts';

build();
const read = (name: string) => JSON.parse(readFileSync(join(PAGE_DATA, name), 'utf8'));

test('inline text: italics and the guide\'s marks, nothing else', () => {
  assert.deepEqual(inline('See *Seksiyon 16* and [illegible] here'), [
    { text: 'See ' }, { text: 'Seksiyon 16', em: true }, { text: ' and ' }, { text: '[illegible]', mark: true }, { text: ' here' },
  ]);
  assert.deepEqual(inline('<b>not html</b>'), [{ text: '<b>not html</b>' }]);
});

test('blocks: headings, page markers, wrapped paragraphs, nested lists, and tables', () => {
  const blocks = toBlocks([
    '<!-- page 1 -->', '', '# ORDINANCE NO. 1', '', '## Section 1.', '', `${'A long line that wraps at the edge of the file, as transcriptions do, '.repeat(2)}`, 'onto a second line.', '',
    '- a. First', '  - i. Inner', '- b. Second', '', '| H1 | H2 |', '|---|---|', '| x | y |',
  ].join('\n'));
  assert.deepEqual(blocks.map((b) => b.type), ['page', 'heading', 'heading', 'paragraph', 'list', 'table']);
  assert.deepEqual(blocks[3], { type: 'paragraph', lines: [[{ text: `${'A long line that wraps at the edge of the file, as transcriptions do, '.repeat(2).trim()} onto a second line.` }]] });
  // A block of short lines, such as a letterhead, keeps its breaks.
  assert.deepEqual(toBlocks('REPUBLIKA NG PILIPINAS\nLALAWIGAN NG CAVITE'), [{ type: 'paragraph', lines: [[{ text: 'REPUBLIKA NG PILIPINAS' }], [{ text: 'LALAWIGAN NG CAVITE' }]] }]);
  const list = blocks[4] as { items: { items?: unknown[] }[] };
  assert.equal(list.items.length, 2);
  assert.equal(list.items[0].items?.length, 1);
});

test('the list has every library item', () => {
  const manifest = loadManifest(LIBRARY).items.filter((e) => !e.removed_at);
  const index = read('index.json') as { sb_id: number }[];
  assert.equal(index.length, manifest.length);
  for (const e of manifest) assert.ok(read(`${e.sb_id}.json`), `${e.sb_id}.json`);
});

test('514 has the Tagalog text in blocks, both numbers, and its sources', () => {
  const o = read('514.json');
  assert.equal(o.coverage, 'full');
  assert.equal(o.language, 'fil');
  assert.equal(o.number_printed, '002-02');
  assert.equal(o.number_listed, '02-2002');
  assert.ok(o.title_en);
  assert.equal(o.blocks.filter((b: { type: string }) => b.type === 'page').length, 4);
  assert.ok(o.blocks.some((b: { type: string; text?: { text: string }[] }) => b.type === 'heading' && b.text?.[0].text.startsWith('SEKSIYON 4')));
  assert.match(o.source.page_url, /knowledge_base\/view\/514$/);
  assert.match(o.source.file_url, /\.pdf$/);
  assert.doesNotMatch(JSON.stringify(o.blocks), /<[a-z]/);
});

test('23 is a summary with key facts and no text; an untranscribed item has its description', () => {
  const s = read('23.json');
  assert.equal(s.coverage, 'summary');
  assert.equal(s.blocks.length, 0);
  assert.ok(s.key_facts.some((f: { value: string }) => f.value === 'P35,270,478.51'));
  const n = read('193.json');
  assert.equal(n.coverage, 'none');
  assert.ok('description' in n);
  assert.match(n.source.page_url, /view\/193$/);
});
