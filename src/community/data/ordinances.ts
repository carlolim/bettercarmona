/**
 * The ordinance pages' data, written by `npm run kb:build` to public/data/ordinances/ from the SB Office manifest
 * and the files in knowledge/ordinances/. Shared with scripts/kb/build.ts, which writes it.
 */

/** A run of text: plain, italic, or one of the transcription guide's bracketed marks, shown muted. */
export type Inline = { text: string; em?: true; mark?: true };

export interface ListItem {
  text: Inline[];
  items?: ListItem[];
}

/** An ordinance's text, parsed at build time, so the page renders React elements and never markdown or HTML. */
export type Block =
  | { type: 'heading'; level: 2 | 3; text: Inline[] }
  | { type: 'paragraph'; lines: Inline[][] }
  | { type: 'list'; items: ListItem[] }
  | { type: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { type: 'page'; n: number };

export type Coverage = 'full' | 'summary' | 'none';

/** One library item, as the list page needs it: no summaries and no text. */
export interface OrdinanceListItem {
  sb_id: number;
  kind: string | null;
  number_printed: string | null;
  number_listed: string | null;
  title: string;
  title_en: string | null;
  year: number | null;
  category: string | null;
  language: string | null;
  coverage: Coverage;
  reviewed: boolean;
  status: string;
  keywords: string[];
}

export interface OrdinanceSource {
  page_url: string;
  file_url: string | null;
  fetched_at: string;
}

/** Everything one ordinance's page shows. */
export type OrdinanceDetail = OrdinanceListItem & {
  listed_title: string;
  pandemic: boolean;
  source: OrdinanceSource;
} & (
    | {
        coverage: 'full' | 'summary';
        issuing_body: string | null;
        session: string | null;
        date_enacted: string | null;
        date_approved: string | null;
        introduced_by: string[];
        committees: string[];
        summary_en: string;
        summary_fil: string;
        key_facts: { label: string; value: string; page: number }[];
        blocks: Block[];
      }
    | { coverage: 'none'; description: string; missing_file: boolean }
  );

let index: Promise<OrdinanceListItem[]> | null = null;

/** The list of every library item, fetched once per page load. */
export function loadOrdinanceIndex(): Promise<OrdinanceListItem[]> {
  index ??= fetch('/data/ordinances/index.json').then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<OrdinanceListItem[]>;
  });
  index.catch(() => (index = null));
  return index;
}

/** One ordinance, or null when there is none with that id. */
export async function loadOrdinance(sbId: string): Promise<OrdinanceDetail | null> {
  if (!/^\d+$/.test(sbId)) return null;
  const r = await fetch(`/data/ordinances/${sbId}.json`);
  if (r.status === 404) return null;
  if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) {
    // The site answers unknown files with index.html; that means there is no such ordinance.
    if (r.ok) return null;
    throw new Error(`HTTP ${r.status}`);
  }
  return (await r.json()) as OrdinanceDetail;
}
