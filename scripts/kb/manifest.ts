/**
 * The SB Office manifest, knowledge/sources/sb-office.json: one entry per library item, sorted by
 * library id. Entries are never deleted. An item that leaves the library keeps its entry and gains
 * `removed_at`.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const MANIFEST = join(ROOT, 'knowledge/sources/sb-office.json');
export const RAW = join(ROOT, 'knowledge/raw');

export const STATES = [
  'listed', 'downloaded', 'transcribed', 'summarized', 'missing-file', 'changed', 'needs-attention',
] as const;
export type State = (typeof STATES)[number];

export interface FileRecord {
  file_url: string;
  file_name: string;
  sha256: string | null;
  bytes: number | null;
  pages: number | null;
}

export interface Entry {
  sb_id: number;
  title: string;
  number_listed: string | null;
  description: string;
  category: string | null;
  page_url: string;
  file_url: string | null;
  file_name: string | null;
  sha256: string | null;
  bytes: number | null;
  pages: number | null;
  first_seen: string;
  fetched_at: string | null;
  state: State;
  removed_at?: string;
  /** Files after the first, for an item whose page holds more than one. */
  extra_files?: FileRecord[];
  /** The item's markdown file, relative to the repo root, once it is transcribed or summarized. */
  transcript?: string;
  /** Why the last kb:convert run left the item at `needs-attention`. */
  attention?: string;
}

export interface Manifest {
  library: string;
  categories: { id: number; name: string; count?: number }[];
  items: Entry[];
}

export function loadManifest(library: string): Manifest {
  if (!existsSync(MANIFEST)) return { library, categories: [], items: [] };
  return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest;
}

export function saveManifest(m: Manifest): void {
  m.items.sort((a, b) => a.sb_id - b.sb_id);
  const tmp = `${MANIFEST}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(m, null, 2)}\n`);
  renameSync(tmp, MANIFEST);
}

/** Where an item's file is saved: knowledge/raw/{id}.pdf, or {id}-2.pdf and so on for extra files. */
export function rawPath(id: number, fileName: string, index = 0): string {
  const ext = extname(fileName).toLowerCase() || '.pdf';
  return join(RAW, `${id}${index ? `-${index + 1}` : ''}${ext}`);
}

/** Today in the Philippines, as YYYY-MM-DD. */
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

/** The year in an item's listed number or title, for newest-first order. */
export function yearOf(e: Entry): number {
  const text = `${e.number_listed ?? ''} ${e.title}`;
  const four = /\b(19[5-9]\d|20[0-4]\d)\b/.exec(text);
  if (four) return Number(four[1]);
  const two = /-(\d{2})\b/.exec(e.number_listed ?? '');
  if (two) return Number(two[1]) + (Number(two[1]) > 50 ? 1900 : 2000);
  return 0;
}
