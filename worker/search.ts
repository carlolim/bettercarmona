/**
 * Search, behind a small interface. The real one is the AI Search binding. The fixture does a plain
 * keyword match over the documents kb:build wrote, costs nothing, and is used in tests and local work.
 */
import { MAX_PASSAGES, SCORE_THRESHOLD } from './config.ts';
import type { IndexEntry } from './reply.ts';

export type SearchType = 'hybrid' | 'keyword';

export interface Passage {
  /** The document's path in .kb/, which is its key in kb-index.json. */
  key: string;
  text: string;
  score: number;
}

/** The passages the model sees: those whose document is in the index and that score at least the threshold. */
export function selectPassages(found: Passage[], documents: Record<string, IndexEntry>, threshold = SCORE_THRESHOLD, max = MAX_PASSAGES): Passage[] {
  return found.filter((p) => documents[p.key] !== undefined && p.score >= threshold).slice(0, max);
}

export interface Search {
  search(query: string, type: SearchType): Promise<Passage[]>;
}

/** The AI Search instance bound as KB. */
export class AiSearch implements Search {
  private kb: AiSearchInstance;

  constructor(kb: AiSearchInstance) {
    this.kb = kb;
  }

  async search(query: string, type: SearchType): Promise<Passage[]> {
    const res = await this.kb.search({
      query,
      ai_search_options: {
        retrieval: { retrieval_type: type, max_num_results: MAX_PASSAGES, match_threshold: SCORE_THRESHOLD, keyword_match_mode: 'or', return_on_failure: false },
        query_rewrite: { enabled: false },
        // The instance's reranker has its own threshold, 0.4 by default, which would drop Tagalog matches first.
        reranking: { enabled: true, match_threshold: SCORE_THRESHOLD },
      },
    });
    return res.chunks.map((c) => ({ key: c.item.key.replace(/^\/+/, ''), text: c.text, score: c.score }));
  }
}

export interface FixturePassage {
  key: string;
  title: string;
  text: string;
}

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);

/** Matches query words, or words they start, in each passage. A word in the title counts double. */
export class FixtureSearch implements Search {
  private passages: FixturePassage[];

  constructor(passages: FixturePassage[]) {
    this.passages = passages;
  }

  async search(query: string): Promise<Passage[]> {
    const q = [...new Set(words(query))];
    if (!q.length) return [];
    const scored = this.passages.map((p) => {
      const title = words(p.title);
      const text = new Set(words(p.text));
      let hits = 0;
      for (const w of q) {
        const has = (list: Iterable<string>) => [...list].some((t) => t === w || (w.length > 3 && t.startsWith(w)));
        if (has(title)) hits += 2;
        else if (has(text)) hits += 1;
      }
      // Between equal hits, a shorter title is a closer match.
      return { key: p.key, text: p.text, hits: hits - title.length / 1000 };
    });
    const best = Math.max(0, ...scored.map((p) => p.hits));
    // Scores are relative to the best match, so a long, glossary-expanded question still clears the threshold.
    return scored
      .filter((p) => p.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, MAX_PASSAGES)
      .map((p) => ({ key: p.key, text: p.text, score: p.hits / best }));
  }
}
