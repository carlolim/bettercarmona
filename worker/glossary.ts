/**
 * Expands a question with the glossary from kb:build, so "amilyar" also searches "real property tax"
 * and the other way round. Only the search query is expanded. The model sees the question as asked.
 *
 * The Worker has 10 ms of CPU per request, so terms are looked up by word sequences in a map built
 * once, not matched one by one.
 */

/** Lowercase words, with punctuation as spaces, so "Mayor's permit" and "mayor s permit" meet. */
const normalize = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

interface Lookup {
  terms: Map<string, string[]>;
  longest: number;
}

const built = new WeakMap<Record<string, string[]>, Lookup>();

function lookup(glossary: Record<string, string[]>): Lookup {
  let l = built.get(glossary);
  if (!l) {
    l = { terms: new Map(), longest: 1 };
    for (const [term, others] of Object.entries(glossary)) {
      const words = normalize(term);
      if (!words.length) continue;
      l.terms.set(words.join(' '), others);
      l.longest = Math.max(l.longest, words.length);
    }
    built.set(glossary, l);
  }
  return l;
}

/** The question, followed by the glossary terms its words call for. */
export function expandQuestion(question: string, glossary: Record<string, string[]>): string {
  const { terms, longest } = lookup(glossary);
  const words = normalize(question);
  const asked = ` ${words.join(' ')} `;
  const extra = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= longest && i + n <= words.length; n++) {
      for (const other of terms.get(words.slice(i, i + n).join(' ')) ?? []) {
        if (!asked.includes(` ${normalize(other).join(' ')} `)) extra.add(other);
      }
    }
  }
  return extra.size ? `${question} (${[...extra].join(', ')})` : question;
}
