/**
 * The search query for a question. A follow-up such as "Magkano?" says nothing on its own, so when
 * there are earlier turns, the person's previous question goes in front of it. The glossary then adds
 * the other side of any everyday or official term. Only the search sees this; the model gets the
 * question as asked.
 */
import { expandQuestion } from './glossary.ts';
import type { Turn } from './input.ts';

export function searchQuery(message: string, history: Turn[], glossary: Record<string, string[]>): string {
  const previous = [...history].reverse().find((t) => t.role === 'user')?.content;
  return expandQuestion(previous ? `${previous} ${message}` : message, glossary);
}
