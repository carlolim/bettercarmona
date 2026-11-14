/**
 * Brings the AI Search instance in line with .kb/: uploads new and changed documents, deletes items
 * no longer built, and leaves the rest alone. The hashes of what was uploaded are kept in
 * knowledge/sources/synced.json, committed, so the next run and the next person know the state.
 *
 *   npm run kb:sync                 upload what changed
 *   npm run kb:sync -- --dry-run    print the plan, change nothing
 *   npm run kb:sync -- --full       upload every document again
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argv, exit } from 'node:process';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { AiSearchClient, AuthError, loadSettings, type Item } from './ai-search.ts';
import { KB } from './build.ts';
import { ROOT } from './manifest.ts';

export const SYNCED = join(ROOT, 'knowledge/sources/synced.json');
/** Indexing states that are still in progress. */
const PENDING = ['queued', 'running'];
const INDEX_WAIT_MS = 5 * 60_000;

interface Synced {
  namespace: string;
  instance: string;
  /** Key -> SHA-256 of the document as uploaded. */
  documents: Record<string, string>;
}

export interface SyncSummary {
  uploaded: string[];
  deleted: string[];
  unchanged: number;
  failed: string[];
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** The documents in .kb/, keyed by their path, which is also their key in the instance and in kb-index.json. */
export function localDocuments(): Map<string, string> {
  if (!existsSync(KB)) throw new Error('.kb/ is missing: run npm run kb:build first');
  const docs = new Map<string, string>();
  for (const f of readdirSync(KB, { recursive: true, encoding: 'utf8' }).filter((p) => p.endsWith('.md')).sort()) {
    docs.set(f, readFileSync(join(KB, f), 'utf8'));
  }
  return docs;
}

function loadSynced(namespace: string, instance: string): Synced {
  const empty = { namespace, instance, documents: {} };
  if (!existsSync(SYNCED)) return empty;
  const s = JSON.parse(readFileSync(SYNCED, 'utf8')) as Synced;
  // Hashes recorded for another instance say nothing about this one.
  return s.namespace === namespace && s.instance === instance ? s : empty;
}

function saveSynced(s: Synced): void {
  const sorted = Object.fromEntries(Object.entries(s.documents).sort(([a], [b]) => a.localeCompare(b)));
  const tmp = `${SYNCED}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ ...s, documents: sorted }, null, 2)}\n`);
  renameSync(tmp, SYNCED);
}

/** Waits until no item is queued or running, or the time runs out. Returns the items that ended in error. */
async function waitForIndexing(client: AiSearchClient, keys: Set<string>): Promise<Item[]> {
  const until = Date.now() + INDEX_WAIT_MS;
  for (;;) {
    const items = (await client.list()).filter((i) => keys.has(i.key));
    const pending = items.filter((i) => PENDING.includes(i.status));
    if (!pending.length) return items.filter((i) => i.status === 'error');
    if (Date.now() > until) {
      console.log(`  ${pending.length} documents are still indexing; they will be searchable shortly.`);
      return items.filter((i) => i.status === 'error');
    }
    await sleep(5000);
  }
}

export async function sync({ dryRun = false, full = false } = {}): Promise<SyncSummary> {
  const settings = loadSettings();
  const client = new AiSearchClient(settings);
  const local = localDocuments();
  const synced = loadSynced(settings.namespace, settings.instance);
  const remote = new Map((await client.list()).map((i) => [i.key, i]));

  const toUpload = [...local].filter(([key, text]) => {
    const item = remote.get(key);
    return full || !item || item.status === 'error' || synced.documents[key] !== sha256(text);
  });
  const toDelete = [...remote.values()].filter((i) => !local.has(i.key));
  const summary: SyncSummary = { uploaded: [], deleted: [], unchanged: local.size - toUpload.length, failed: [] };

  console.log(`${settings.namespace}/${settings.instance}: ${local.size} documents built, ${remote.size} in the instance.`);
  console.log(`  ${toUpload.length} to upload, ${toDelete.length} to delete, ${summary.unchanged} unchanged.`);
  if (dryRun) {
    for (const [key] of toUpload) console.log(`  upload ${key}`);
    for (const i of toDelete) console.log(`  delete ${i.key}`);
    return summary;
  }

  for (const [key, text] of toUpload) {
    try {
      await client.upload(key, text);
      synced.documents[key] = sha256(text);
      summary.uploaded.push(key);
      saveSynced(synced);
    } catch (err) {
      if (err instanceof AuthError) throw err;
      summary.failed.push(`${key}: ${err instanceof Error ? err.message : err}`);
    }
  }
  for (const item of toDelete) {
    try {
      await client.remove(item.id);
      delete synced.documents[item.key];
      summary.deleted.push(item.key);
      saveSynced(synced);
    } catch (err) {
      if (err instanceof AuthError) throw err;
      summary.failed.push(`${item.key}: ${err instanceof Error ? err.message : err}`);
    }
  }
  // Hashes for keys no longer built are dropped even when the item was already gone.
  for (const key of Object.keys(synced.documents)) if (!local.has(key)) delete synced.documents[key];
  saveSynced(synced);

  if (summary.uploaded.length) {
    for (const item of await waitForIndexing(client, new Set(summary.uploaded))) {
      summary.failed.push(`${item.key}: indexing failed${item.error ? `: ${item.error}` : ''}`);
      delete synced.documents[item.key];
    }
    saveSynced(synced);
  }
  return summary;
}

if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  const args = argv.slice(2);
  sync({ dryRun: args.includes('--dry-run'), full: args.includes('--full') })
    .then((s) => {
      console.log(`Uploaded ${s.uploaded.length}, deleted ${s.deleted.length}, unchanged ${s.unchanged}, failed ${s.failed.length}.`);
      for (const f of s.failed) console.log(`  failed ${f}`);
      if (s.failed.length) exit(1);
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      exit(1);
    });
}
