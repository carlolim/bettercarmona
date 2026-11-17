/**
 * Prints, per SB Office category: how many items are listed, downloaded, transcribed, summarized,
 * and reviewed, then the totals.
 *
 *   npm run kb:status
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadManifest, rawPath, ROOT } from './manifest.ts';
import { LIBRARY } from './sb-office.ts';

const ORDINANCES = join(ROOT, 'knowledge/ordinances');

/** Library ids whose ordinance file has `reviewed: true`. */
function reviewedIds(): Set<number> {
  const ids = new Set<number>();
  if (!existsSync(ORDINANCES)) return ids;
  for (const name of readdirSync(ORDINANCES, { recursive: true, encoding: 'utf8' })) {
    if (!name.endsWith('.md')) continue;
    const text = readFileSync(join(ORDINANCES, name), 'utf8');
    const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
    const id = /^sb_id:\s*(\d+)/m.exec(front);
    if (id && /^\s*reviewed:\s*true\b/m.test(front)) ids.add(Number(id[1]));
  }
  return ids;
}

const m = loadManifest(LIBRARY);
const reviewed = reviewedIds();
const COLUMNS = ['listed', 'downloaded', 'transcribed', 'summarized', 'reviewed'] as const;
type Row = Record<(typeof COLUMNS)[number], number>;
const rows = new Map<string, Row>();
const zero = (): Row => ({ listed: 0, downloaded: 0, transcribed: 0, summarized: 0, reviewed: 0 });
let removed = 0;
const flagged: string[] = [];

for (const c of m.categories) rows.set(c.name, zero());
for (const e of m.items) {
  if (e.removed_at) {
    removed++;
    continue;
  }
  const row = rows.get(e.category ?? '(no category)') ?? zero();
  rows.set(e.category ?? '(no category)', row);
  row.listed++;
  if (e.file_name && existsSync(rawPath(e.sb_id, e.file_name))) row.downloaded++;
  if (e.state === 'transcribed') row.transcribed++;
  if (e.state === 'summarized') row.summarized++;
  if (reviewed.has(e.sb_id)) row.reviewed++;
  if (['missing-file', 'changed', 'needs-attention'].includes(e.state)) flagged.push(`${e.sb_id} ${e.state}`);
}

const total = zero();
for (const row of rows.values()) for (const k of COLUMNS) total[k] += row[k];
const width = Math.min(48, Math.max(...[...rows.keys()].map((k) => k.length), 8));
const line = (name: string, r: Row) =>
  `${name.slice(0, width).padEnd(width)}  ${COLUMNS.map((k) => String(r[k]).padStart(k.length)).join('  ')}`;

console.log(`${''.padEnd(width)}  ${COLUMNS.join('  ')}`);
for (const [name, row] of [...rows].sort(([a], [b]) => a.localeCompare(b))) console.log(line(name, row));
console.log(line('Total', total));
if (removed) console.log(`\n${removed} items no longer in the library are not counted.`);
if (flagged.length) console.log(`\nNeeds a look: ${flagged.join(', ')}`);
