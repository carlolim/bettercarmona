/**
 * Turns the model's reply into what the user sees. The Worker decides the links, never the model:
 * every source comes from kb-index.json, sources with a page on this site come first, and the
 * notices the model can't be trusted to add are added here, as codes the panel translates.
 */
import { OFFICIAL_SITE_URL } from './config.ts';

export type ReplyKind = 'answer' | 'clarify' | 'not_found' | 'out_of_scope';

export interface IndexEntry {
  title: string;
  kind: string;
  site_url?: string;
  source_url?: string;
  source_label: string;
  date: string | null;
  coverage?: string;
  reviewed?: boolean;
}

export interface Source {
  n: number;
  title: string;
  kind: string;
  site_url?: string;
  source_url?: string;
  source_label: string;
  date: string | null;
}

export type Notice = 'ordinance_may_have_changed' | 'unreviewed_transcription' | 'summary_only' | 'not_on_site_yet';

export interface Link {
  label: 'hotlines' | 'official_site';
  site_url?: string;
  source_url?: string;
}

export interface ChatReply {
  kind: ReplyKind;
  text: string;
  featured: { title: string; kind: string; site_url: string } | null;
  sources: Source[];
  notices: Notice[];
  /** For not_found and out_of_scope: where to go next. */
  links?: Link[];
}

const KINDS: ReplyKind[] = ['answer', 'clarify', 'not_found', 'out_of_scope'];
/** Pages about one thing, preferred for the featured card over list pages such as /hotlines or /services. */
const SINGLE_SUBJECT = ['service', 'ordinance', 'ordinance-summary'];
const ORDINANCE = ['ordinance', 'ordinance-summary'];
const LABEL = /\[S(\d+)\]/g;
const URL_TEXT = /\[([^\]]*)\]\((?:https?:)?\/\/[^)]*\)|(?:https?:\/\/|www\.)\S+/gi;

export const NEXT_STEPS: Link[] = [
  { label: 'hotlines', site_url: '/hotlines' },
  { label: 'official_site', source_url: OFFICIAL_SITE_URL },
];

/** The reply for a question the documents don't cover. `text` is empty: the panel shows its own translated line. */
export const notFound = (): ChatReply => ({ kind: 'not_found', text: '', featured: null, sources: [], notices: [], links: NEXT_STEPS });

/** The model's JSON, or the first JSON object in its text, or null. */
export function parseModelJson(raw: string): { kind?: unknown; text?: unknown; sources?: unknown } | null {
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(raw.trim());
  if (direct) return direct;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return start >= 0 && end > start ? tryParse(raw.slice(start, end + 1)) : null;
}

/**
 * Checks the model's reply against the passages it was sent (S1 to Sn, by document path) and the
 * index, and builds the reply. Labels not sent are removed; an answer left with none is not_found.
 */
export function buildReply(raw: string, sent: string[], index: Record<string, IndexEntry>): ChatReply {
  const parsed = parseModelJson(raw);
  if (!parsed || typeof parsed.text !== 'string' || !KINDS.includes(parsed.kind as ReplyKind)) return notFound();
  const kind = parsed.kind as ReplyKind;
  if (kind === 'not_found') return notFound();

  const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= sent.length && index[sent[n - 1]] !== undefined;
  const listed = Array.isArray(parsed.sources)
    ? parsed.sources.map((s) => (typeof s === 'string' ? Number(/^S(\d+)$/.exec(s.trim())?.[1]) : NaN))
    : [];
  const inText = [...parsed.text.matchAll(LABEL)].map((m) => Number(m[1]));
  const order = [...new Set([...listed, ...inText])].filter(valid);

  // Labels outside S1 to Sn are dropped from the text, as are any links the model wrote.
  let text = parsed.text.replace(URL_TEXT, (_m, label: string | undefined) => label ?? '').replace(LABEL, (m, n) => (valid(Number(n)) ? m : ''));
  text = text.replace(/[ \t]+([.,;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();

  if (kind === 'out_of_scope') return { kind, text, featured: null, sources: [], notices: [], links: NEXT_STEPS };
  if (kind === 'answer' && !order.length) return notFound();
  if (!text) return notFound();

  // One source per document, in the model's order, then those with a page here ahead of those without.
  const paths: string[] = [];
  const labelToPath = new Map<number, string>();
  for (const n of order) {
    const path = sent[n - 1];
    labelToPath.set(n, path);
    if (!paths.includes(path)) paths.push(path);
  }
  const onSite = paths.filter((p) => index[p].site_url);
  // The featured page: the first one about a single thing (a service, an ordinance), else the first with a page here.
  const featuredPath = kind === 'answer' ? (onSite.find((p) => SINGLE_SUBJECT.includes(index[p].kind)) ?? onSite[0]) : undefined;
  const ranked = [
    ...(featuredPath ? [featuredPath] : []),
    ...onSite.filter((p) => p !== featuredPath),
    ...paths.filter((p) => !index[p].site_url),
  ];
  const number = new Map(ranked.map((p, i) => [p, i + 1]));
  const sources: Source[] = ranked.map((p, i) => {
    const e = index[p];
    return { n: i + 1, title: e.title, kind: e.kind, site_url: e.site_url, source_url: e.source_url, source_label: e.source_label, date: e.date };
  });
  text = text
    .replace(LABEL, (_m, n) => `[${number.get(labelToPath.get(Number(n))!)}]`)
    .replace(/(\[\d+\])(?:\s*\1)+/g, '$1');

  const notices = new Set<Notice>();
  for (const p of ranked) {
    const e = index[p];
    if (ORDINANCE.includes(e.kind)) notices.add('ordinance_may_have_changed');
    if (ORDINANCE.includes(e.kind) && e.reviewed === false) notices.add('unreviewed_transcription');
    if (e.kind === 'ordinance-summary') notices.add('summary_only');
    if (e.kind === 'charter-index') notices.add('not_on_site_yet');
  }

  const f = featuredPath ? index[featuredPath] : undefined;
  const featured = f?.site_url ? { title: f.title, kind: f.kind, site_url: f.site_url } : null;
  return { kind, text, featured, sources, notices: [...notices] };
}
