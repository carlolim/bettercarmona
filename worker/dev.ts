/**
 * The entry for `npm run dev:api`: the same Worker, with the documents for the fixture search
 * (CHAT_FIXTURES=1). The deployed entry, worker/index.ts, carries none of them.
 */
import passages from '../.kb/fixture-passages.json' with { type: 'json' };
import { makeWorker } from './index.ts';
import type { FixturePassage } from './search.ts';

export default makeWorker(passages as FixturePassage[]);
