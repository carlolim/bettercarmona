/**
 * Turns an ordinance's markdown body into plain blocks for the ordinance page, at build time, so the browser
 * renders React elements and never markdown or HTML. Only what knowledge/TRANSCRIPTION.md allows is handled:
 * `#` and `##` headings, paragraphs, `-` lists (nested by two spaces), tables, page markers, *italics*, and the
 * bracketed marks such as [illegible].
 */

import type { Block, Inline, ListItem } from '../../src/community/data/ordinances.ts';

export type { Block, Inline, ListItem };

const MARK = /\[(?:illegible|unclear:[^\]]*|table not transcribed:[^\]]*|annex not transcribed:[^\]]*|annex not in this file:[^\]]*)\]/g;

/** Splits text into plain, italic, and marked runs. */
export function inline(text: string): Inline[] {
  const out: Inline[] = [];
  const push = (run: Inline) => {
    if (!run.text) return;
    const last = out.at(-1);
    if (last && !last.em === !run.em && !last.mark === !run.mark) last.text += run.text;
    else out.push(run);
  };
  let rest = text;
  while (rest) {
    MARK.lastIndex = 0;
    const mark = MARK.exec(rest);
    const em = /\*([^*\s][^*]*?)\*/.exec(rest);
    const next = [mark, em].filter(Boolean).sort((a, b) => a!.index - b!.index)[0];
    if (!next) {
      push({ text: rest });
      break;
    }
    push({ text: rest.slice(0, next.index) });
    push(next === mark ? { text: next[0], mark: true } : { text: next[1], em: true });
    rest = rest.slice(next.index + next[0].length);
  }
  return out;
}

const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => inline(c.trim()));

/** The blocks of a body. Wrapped lines of a paragraph join with a space; a block of short lines keeps its breaks. */
export function toBlocks(body: string): Block[] {
  const lines = body.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const page = /^<!-- page (\d+) -->$/.exec(trimmed);
    if (!trimmed) {
      i++;
    } else if (page) {
      blocks.push({ type: 'page', n: Number(page[1]) });
      i++;
    } else if (/^##? /.test(trimmed)) {
      blocks.push({ type: 'heading', level: trimmed.startsWith('## ') ? 3 : 2, text: inline(trimmed.replace(/^##? /, '')) });
      i++;
    } else if (trimmed.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const body = rows.filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
      blocks.push({ type: 'table', head: cells(body[0] ?? ''), rows: body.slice(1).map(cells) });
    } else if (/^- /.test(trimmed)) {
      // Items start with "- " at an even indent; a line indented under an item continues it.
      const raw: { depth: number; text: string }[] = [];
      while (i < lines.length && lines[i].trim() && !/^<!--/.test(lines[i].trim())) {
        const l = lines[i];
        const m = /^(\s*)- (.*)$/.exec(l);
        if (m) raw.push({ depth: Math.floor(m[1].length / 2), text: m[2] });
        else if (raw.length && /^\s+\S/.test(l)) raw[raw.length - 1].text += ` ${l.trim()}`;
        else break;
        i++;
      }
      const root: ListItem[] = [];
      const stack: { depth: number; items: ListItem[] }[] = [{ depth: 0, items: root }];
      for (const r of raw) {
        while (stack.length > 1 && r.depth < stack[stack.length - 1].depth) stack.pop();
        const top = stack[stack.length - 1];
        if (r.depth > top.depth && top.items.length) {
          const parent = top.items[top.items.length - 1];
          parent.items ??= [];
          stack.push({ depth: r.depth, items: parent.items });
        }
        stack[stack.length - 1].items.push({ text: inline(r.text) });
      }
      blocks.push({ type: 'list', items: root });
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(##? |\||- |<!--)/.test(lines[i].trim())) para.push(lines[i++].trim());
      const short = para.length > 1 && para.every((l) => l.length < 70);
      blocks.push({ type: 'paragraph', lines: short ? para.map(inline) : [inline(para.join(' '))] });
    }
  }
  return blocks;
}
