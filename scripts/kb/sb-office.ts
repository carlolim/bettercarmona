/**
 * Reads the pages of the Carmona SB Office ordinance library. Pure functions, no network, so the
 * fixtures in scripts/kb/fixtures/ can test them. The library is server-rendered HTML with a fixed
 * shape, so plain regular expressions are enough and no HTML parser is needed.
 */
import { inflateSync } from 'node:zlib';

export const LIBRARY = 'http://122.54.120.194:888/sboffice/index.php/knowledge_base';

export const pageUrl = (id: number) => `${LIBRARY}/view/${id}`;
export const categoryUrl = (id: number) => `${LIBRARY}/category/${id}`;

export interface Category {
  id: number;
  name: string;
  /** The "N Articles" count on the library's front page, when read from there. */
  count?: number;
}

export interface ItemPage {
  title: string;
  numberListed: string | null;
  description: string;
  category: string | null;
  fileUrls: string[];
}

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ntilde: '\u00f1', Ntilde: '\u00d1', eacute: '\u00e9', aacute: '\u00e1', iacute: '\u00ed', oacute: '\u00f3', uacute: '\u00fa',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d', hellip: '\u2026', ndash: '\u2013', mdash: '\u2014',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return NAMED[code] ?? whole;
  });
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Text only, one line per paragraph. Drops comments (Word's conditional markup), scripts, and every tag. */
export function textOf(html: string): string {
  const marked = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(marked)
    .split('\n')
    .map(squash)
    .filter(Boolean)
    .join('\n');
}

/** The ordinance number in a listed title, such as "001-94" from "Appropriation Ordinance No. 001-94 ( 001-94)". */
export function parseNumber(title: string): string | null {
  const m = /\bNo\s*\.?\s*:?\s*(\d[\w-]*\d|\d)/i.exec(title);
  return m ? m[1] : null;
}

/** The 27 categories, from the sidebar of any library page or from the front page's cards. */
export function parseCategories(html: string): Category[] {
  const found = new Map<number, Category>();
  const card = /category\/(\d+)">\s*<div[^>]*>\s*<div[^>]*>\s*<h4>([^<]*)<\/h4>[\s\S]*?<span class="anchor">(\d+) Articles?<\/span>/g;
  for (const m of html.matchAll(card)) {
    found.set(Number(m[1]), { id: Number(m[1]), name: squash(decodeEntities(m[2])), count: Number(m[3]) });
  }
  if (found.size) return [...found.values()];
  const link = /category\/(\d+)" class="list-group-item[^"]*">([^<]*)<\/a>/g;
  for (const m of html.matchAll(link)) {
    found.set(Number(m[1]), { id: Number(m[1]), name: squash(decodeEntities(m[2])) });
  }
  return [...found.values()];
}

/** The item ids a category page lists, in page order, and whether the page shows any sign of paging. */
export function parseCategoryPage(html: string): { ids: number[]; paged: boolean } {
  const content = html.slice(html.indexOf('id="help-page-content"'));
  const ids = [...content.matchAll(/knowledge_base\/view\/(\d+)"/g)].map((m) => Number(m[1]));
  const paged = /class="[^"]*pagination|knowledge_base\/category\/\d+\/\d+/.test(content);
  return { ids: [...new Set(ids)], paged };
}

export function parseItemPage(html: string): ItemPage {
  const start = html.indexOf('id="help-page-content"');
  if (start < 0) throw new Error('no #help-page-content on the page');
  const content = html.slice(start);
  const h4 = /<h4[^>]*>([\s\S]*?)<\/h4>/.exec(content);
  if (!h4) throw new Error('no title in #help-page-content');
  const title = squash(textOf(h4[1]));
  const afterTitle = content.slice(h4.index + h4[0].length);
  const div = /^\s*<div>([\s\S]*?)<\/div>/.exec(afterTitle);
  const description = div ? textOf(div[1]) : '';
  const active = /category\/\d+" class="list-group-item active">([^<]*)<\/a>/.exec(html);
  const files = /<div class='timeline-images[^']*'>([\s\S]*?)<\/div>/g;
  const fileUrls: string[] = [];
  for (const block of afterTitle.matchAll(files)) {
    for (const e of block[1].matchAll(/<embed\b[^>]*?\bsrc=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      fileUrls.push(decodeEntities(e[1] ?? e[2] ?? e[3]));
    }
  }
  return {
    title,
    numberListed: parseNumber(title),
    description,
    category: active ? squash(decodeEntities(active[1])) : null,
    fileUrls,
  };
}

/** The file name the library gave a file: the last part of its URL, decoded. */
export function fileNameOf(url: string): string {
  const last = new URL(url).pathname.split('/').pop() ?? '';
  return decodeURIComponent(last);
}

/**
 * A PDF's page count, from the page tree's /Count. Looks in the file's plain objects first, then in
 * compressed object streams. Null when neither has one.
 */
export function pdfPages(bytes: Buffer): number | null {
  const best = (text: string) => {
    let max = 0;
    for (const m of text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)) {
      max = Math.max(max, Number(m[1] ?? m[2]));
    }
    return max;
  };
  const raw = bytes.toString('latin1');
  let max = best(raw.replace(/stream\r?\n[\s\S]*?endstream/g, 'stream endstream'));
  if (max) return max;
  for (const m of raw.matchAll(/<<([^]*?)>>\s*stream\r?\n/g)) {
    if (!/\/Type\s*\/ObjStm/.test(m[1]) || !/\/FlateDecode/.test(m[1])) continue;
    const begin = m.index + m[0].length;
    const end = raw.indexOf('endstream', begin);
    try {
      max = Math.max(max, best(inflateSync(bytes.subarray(begin, end)).toString('latin1')));
    } catch {
      // A stream that does not inflate cleanly is skipped.
    }
  }
  if (max) return max;
  const leaves = raw.match(/\/Type\s*\/Page\b(?!s)/g)?.length ?? 0;
  return leaves || null;
}
