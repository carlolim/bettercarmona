# Knowledge

Public documents about the City of Carmona, gathered so they can be searched and cited. Every file here records where
its content came from.

## The SB Office ordinance library

The Sangguniang Panlungsod office publishes its ordinances in an online library at
`http://122.54.120.194:888/sboffice/index.php/knowledge_base`. It has 27 categories, and each item is one page with a
title, a short description, and a scanned PDF.

| Path | Holds | Committed |
|---|---|---|
| `sources/sb-office.json` | One entry per library item, sorted by library id | Yes |
| `sources/priorities.json` | The order to transcribe categories in, and which get a summary only | Yes |
| `raw/{id}.pdf` | The downloaded files | No |
| `raw/pages/view-{id}.html` | The item pages as last read | No |

The library id (`sb_id`) is the stable key. The number in the title (`number_listed`) is kept as listed, and it can
differ from the number printed on the document.

Each entry has a `state`:

| State | Meaning |
|---|---|
| `listed` | The page was read, the file is not downloaded yet |
| `downloaded` | The file is in `raw/` and its hash is recorded |
| `transcribed` | The full text is in `ordinances/` |
| `summarized` | A summary with key figures is in `ordinances/` |
| `missing-file` | The page has no file, or the file is not on the server |
| `changed` | The file's hash differs from the one recorded. It needs transcribing again |

Entries are never deleted. An item that leaves the library keeps its entry and gains `removed_at`.

## Commands

```bash
npm run kb:fetch                  # read the library and download new files
npm run kb:fetch -- --refresh     # re-read every page and file, and mark changed files
npm run kb:fetch -- --sweep       # also try every id from 1 up, to check the category pages
npm run kb:fetch -- --ids 23,514  # only these items
npm run kb:status                 # counts per category
npm run kb:test                   # test the page parser against scripts/kb/fixtures/
```

`kb:fetch` reads the front page and the 27 category pages, then each item page not yet in the manifest, then each
file not yet in `raw/` or whose copy does not match the recorded hash. A second run downloads nothing. On a fresh
clone it downloads every file the manifest lists, without reading the item pages again.

The library runs on a small government server, so `kb:fetch` sends one request at a time, at least 1.5 seconds apart,
with the User-Agent `BetterCarmona/1.0 (+https://bettercarmona.org/about)`. A failed request is retried three times
with a growing delay. It stops after five failures in a row, and at once on HTTP 429. The manifest is saved after
every item, so a stopped run picks up where it left off.
