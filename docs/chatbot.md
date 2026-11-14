# The chat API

The Worker that serves the site also answers chat questions under `/api/`. It checks the caller, searches the
knowledge base that `npm run kb:build` makes (see `knowledge/README.md`), has a model write a short answer from what it
found, checks that answer, and returns it with source links taken from the index, never from the model.

It runs on Cloudflare's free allowances and stops answering before any of them could run out. It stores counts,
hashes, and cached answers. It never stores or logs a question, a conversation, or an IP address.

The code is in `worker/`. The settings are in `worker/config.ts`.

## How a request runs

Static files and client-side routes never run the Worker: `wrangler.jsonc` sends only `/api/*` to it
(`assets.run_worker_first`), so the rest of the site stays free and behaves as before.

`POST /api/chat` goes through these steps in order and stops at the first that fails:

| Step | Fails with |
|---|---|
| 1. A valid, unexpired session for this IP | 401 `session` |
| 2. The `Origin` header is this site | 403 `origin` |
| 3. Body under 8 KB, a question of 1 to 500 characters, at most 6 earlier messages of at most 500 characters | 400 `input` |
| 4. 5 questions a minute per IP (rate limiting binding) | 429 `slow_down` |
| 5. 20 questions a day per IP (D1) | 429 `daily_limit` |
| 6. The day's Neurons and 40 answered questions a day for the whole site (D1) | 429 `site_busy` |
| 7. Expand the question with the glossary, for search only | |
| 8. A first question already answered for this index version comes from the cache | |
| 9. Search: hybrid while the month has semantic queries left, then keyword, then stop | 429 `monthly_limit` |
| 10. Keep passages that are in the index and score at least 0.4. None left: "not found", no model call | |
| 11. The model writes a reply as JSON, at most 400 tokens | |
| 12. Check the reply and build the sources from the index | |
| 13. Cache an answer to a first question, unless it repeats something only the user wrote | |

Any failure of a binding, or an allowance that has run out, returns 503 `unavailable`. The error never includes a
stack trace, and nothing retries.

## Routes

Every reply is JSON with `cache-control: no-store`. Errors are `{ "error": code }`, with `retry_after` in seconds
where waiting helps. An `/api/` path not listed here returns a JSON 404.

| Route | Body | Returns |
|---|---|---|
| `GET /api/chat/status` | | `{ enabled, limits: { question_chars } }` |
| `POST /api/chat/session` | `{ turnstile_token }` | `{ session, expires_at }` |
| `POST /api/chat` | `{ message, history, locale }`, with `Authorization: Bearer {session}` | The reply below |
| `POST /api/chat/feedback` | `{ rating: "up" or "down", kind }`, with the session | `{ ok: true }` |

When `CHAT_ENABLED` is not `"true"`, `status` says `enabled: false` and every other route returns 503 `disabled`.

A session comes from a Turnstile token. Turnstile is Cloudflare's free check that the visitor is a person, and each
token works once, so the session carries later questions for 30 minutes. It is signed with HMAC-SHA-256 and holds a
random id, its expiry, and a hash of the IP, so the Worker checks it without storing anything.

### The reply

```json
{
  "kind": "answer",
  "text": "Register within 30 days of the birth. [1]",
  "featured": { "title": "Registration of Certificate of Live Birth", "kind": "service", "site_url": "/services/registration-of-live-birth" },
  "sources": [{
    "n": 1, "title": "Registration of Certificate of Live Birth", "kind": "service",
    "site_url": "/services/registration-of-live-birth",
    "source_url": "https://carmonagov.net/portal/wp-content/uploads/2026/08/CITY-GOVERNMENT-OF-CARMONA_CC_2026.pdf#page=60",
    "source_label": "Citizen's Charter 2026, page 42", "date": "2026-11-08"
  }],
  "notices": [],
  "remaining": { "today": 19 }
}
```

- `kind` is `answer`, `clarify` (one follow-up question), `not_found`, or `out_of_scope`. For `not_found`, `text` is
  empty and the panel shows its own line. `not_found` and `out_of_scope` add `links` to the hotlines page and the
  city's website.
- `sources` come from `.kb/kb-index.json`. A source has `site_url` (a page on this site), `source_url` (the original
  document), or both. Sources with a page here come first, and `featured`, the link card shown above the answer, is
  the first of them, preferring a page about one thing (a service, an ordinance) over a list page. It is always
  source 1. `featured` is null when no cited source has a page here, and for anything but `answer`.
- The model only gives labels such as `[S2]`. Labels that were not sent are removed, an answer left with none becomes
  `not_found`, and any link the model writes is removed from the text.
- `notices` are codes the panel translates: `ordinance_may_have_changed`, `unreviewed_transcription`, `summary_only`,
  and `not_on_site_yet` (a charter service not yet described on this site).

## Limits and the zero budget

The account is on Workers Free, where every allowance is a hard stop. The Worker keeps its own counts below them as
well, in D1, and `CHAT_ENABLED` turns it all off without a deploy.

| Setting in `worker/config.ts` | Value | Protects |
|---|---|---|
| `PER_IP_PER_MINUTE` | 5 | Fairness. Also set in `wrangler.jsonc` |
| `PER_IP_PER_DAY` | 20 | Fairness |
| `SITE_PER_DAY` | 40 | Workers AI: 10,000 Neurons a day |
| `NEURONS_PER_DAY` | 8,000 | Workers AI: 10,000 Neurons a day, counted from each reply's tokens |
| `SEMANTIC_PER_MONTH` | 900 | AI Search: 1,000 semantic queries a month |
| `KEYWORD_PER_MONTH` | 900 | AI Search: 1,000 keyword queries a month |
| `QUESTION_MAX_CHARS`, `HISTORY_MAX_ITEMS` | 500, 6 | Model input, and so Neurons |
| `MAX_OUTPUT_TOKENS` | 400 | Model output: about 120 words |
| `SESSION_MINUTES` | 30 | |
| `CACHE_DAYS` | 30 | |

Daily counts reset at 00:00 UTC, as Cloudflare's do. Monthly counts reset on the first of the month, UTC. The
per-minute binding counts per Cloudflare location and is not exact, so the D1 counts are the hard limits.

`MODEL` is a placeholder until the test set picks one. `NEURON_RATES` holds the Neurons per million tokens from the
Workers AI pricing page, for counting.

### What is kept

| Table | Holds |
|---|---|
| `counters` | Counts by scope and day or month. An IP's daily count is keyed by SHA-256 of the IP, the date, and `IP_HASH_SALT`, so it cannot be linked across days |
| `answer_cache` | The reply to a first question, keyed by SHA-256 of the question, its language, and the index version. A reply that repeats any word of the question found in none of the passages, such as a name or a phone number, is not cached |
| `feedback` | Thumbs up and down, as counts by day and reply kind |

Each request logs one line: the route, the status, the error code, timings, the number of passages, and token counts.

## Bindings and secrets

| Name | Kind | Where |
|---|---|---|
| `ASSETS` | The site's static files | `wrangler.jsonc` |
| `AI` | Workers AI | `wrangler.jsonc` |
| `KB` | AI Search namespace `bettercarmona-kb`. The Worker opens the instance `KB_INSTANCE` (`worker/config.ts`) in it | `wrangler.jsonc`. Both must exist before a deploy |
| `DB` | D1 database `bettercarmona-chat`, tables in `worker/migrations/` | `wrangler.jsonc` |
| `PER_MINUTE` | Rate limiting, 5 per 60 seconds | `wrangler.jsonc` |
| `CHAT_ENABLED` | The on switch: `"true"` or anything else | Dashboard secret |
| `TURNSTILE_SECRET_KEY` | Turnstile's secret key | Dashboard secret |
| `SESSION_SECRET` | Signs sessions | Dashboard secret |
| `IP_HASH_SALT` | Salts IP hashes | Dashboard secret |

Apply the tables once, and after any new migration:

```bash
npx wrangler d1 migrations apply DB --remote
```

## Running it locally

```bash
cp .dev.vars.example .dev.vars   # once: Cloudflare's test keys and CHAT_ENABLED=true
npm run build                    # once, so dist/ exists for the static files
npm run dev:api                  # the Worker on http://localhost:8787: real search and model, local database
npm run dev:api:fixtures         # the same, with fixtures: nothing leaves this machine and nothing costs
npm run dev                      # the site on http://localhost:5132; /api goes to the Worker
```

`npm run dev:api` uses the real AI Search instance and Workers AI through your `wrangler login`, so each question
spends one search query and about 30 to 50 Neurons. `npm run dev:api:fixtures` uses the `dev` environment in
`wrangler.jsonc` and `worker/dev.ts`: search is a keyword match over `.kb/`, and the model returns a fixed answer citing
S1. The deployed Worker, `worker/index.ts`, carries none of the fixture documents.

With Cloudflare's test Turnstile secret, which `.dev.vars` sets, the session route accepts the dummy token, and
requests from `http://localhost` are allowed. A real secret allows neither:

```bash
curl -s -X POST localhost:8787/api/chat/session -H 'origin: http://localhost:5132' \
  -H 'content-type: application/json' -d '{"turnstile_token":"XXXX.DUMMY.TOKEN.XXXX"}'
```

## Keeping the knowledge current

```bash
npm run kb:update                  # fetch, transcribe up to 10, validate, build, sync, and test search
npm run kb:update -- --convert 0   # skip transcription
npm run kb:sync -- --dry-run       # what a sync would upload and delete
```

`kb:update` stops at the first step that fails and says what to do. It ends with one line, for example: "2 new
ordinance files written and need review. 3 documents uploaded, 0 deleted. Search found the right document for 5 of 5
test questions." See
`knowledge/README.md` for each step.

`kb:sync` and `kb:update` read `KB_ACCOUNT_ID`, `KB_API_TOKEN`, `KB_NAMESPACE`, and `KB_INSTANCE` from `.env` (see
`.env.example`). The token needs only AI Search Edit and AI Search Run. The names are not `CLOUDFLARE_*`, because
Wrangler reads those from `.env` as its own login, and this token cannot run `wrangler dev` or `wrangler deploy`.

How AI Search behaved when tested on 2026-11-14:

- An item's key is the uploaded file name, folders included, so `ordinances/514.md` in `.kb/` is the same key in the
  instance, in each search result's `item.key`, and in `kb-index.json`.
- Uploading the same name again replaces the item, keeping its id.
- The item's `checksum` is always "0", so `kb:sync` keeps its own hashes in `knowledge/sources/synced.json`.
- Indexing takes from seconds to a few minutes. An item can fail with a timeout on Cloudflare's side; the next sync
  uploads it again.
- While items are indexing, listed pages can shift, so `kb:sync` lists by modification time and checks the total.
- One hybrid search counts as one search request: 26 hybrid searches showed as "search 26" on the instance's Metrics
  page. The bill is the final word; check it monthly.

## The test set

`knowledge/eval/questions.json` holds the questions the assistant is tested on, in English, Tagalog, and Taglish, each
with the documents it must cite, the page it must lead with, and the facts its answer must contain, taken from the
knowledge base. `npm run kb:eval` runs them in two stages, through the Worker's own code:

```bash
npm run kb:eval -- --retrieval                    # search each question once and save the results (one search each)
npm run kb:eval -- --retrieval --refresh          # search again, after the documents or the glossary change
npm run kb:eval -- --answers --model @cf/google/gemma-4-26b-a4b-it   # answer from the saved results (Neurons only)
npm run kb:eval -- --answers --model NAME --only q01,q35 --budget 300   # a few questions
```

Search results don't change when only the model or the prompt changes, so the answers stage reuses them and costs no
searches. Every run prints how many searches and roughly how many Neurons it will use before it starts, and stops if
that is over `--budget` (Neurons) or `--max-searches`. The free allowances are 10,000 Neurons a day and 1,000 searches
a month; a full answers run is about 2,000 Neurons with Gemma and up to 6,500 with the larger models.

### Reading a report

Each run writes `knowledge/eval/reports/{date}-{model}.md` (or `-partial` for part of the set), with every answer in
full. The table at the top:

| Measure | Means |
|---|---|
| Pass rate by language | Questions whose reply kind, citations, featured page, facts, and notices were all as expected |
| Featured page as expected | How often the link card above the answer was the page the question names |
| **Safety** | Figures in an answer (amounts, phone numbers, years, names with a middle initial) that its cited passages don't contain. Must be zero |
| Refusals and not found | Questions the assistant must decline or say it can't find |
| Neurons per answer | What one answer costs against the 10,000 a day |

Under each failed question, "Why it failed" names what was missing. A miss in retrieval (the right document not
searched up) is fixed in the knowledge: a glossary entry, a keyword, or a document's shape. A miss in the answer is
fixed in the prompt or by the model.

### The rule for changes

A change to the model, the prompt, or the search settings ships only if, on the full set, the safety count is zero
and no language group's pass rate is lower than before. Run the full set before and after, and keep both reports.
`kb:update` ends by searching the five questions marked `smoke`, so a broken sync shows at once.

## Tests

`npm test` runs the Worker's tests (`worker/test/`) and the knowledge base's, with Node's test runner. They use the
fixtures and an in-memory store, so they cost nothing.
