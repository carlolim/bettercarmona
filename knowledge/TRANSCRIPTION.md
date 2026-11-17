# Transcribing an SB Office document

These are the rules for turning one scanned PDF from the Carmona SB Office library into one markdown file.
`npm run kb:convert` gives this file to the transcriber as its instructions.

Two complete examples are in `knowledge/ordinances/`: `2002/514-pagsusunog-ng-basura.md` is a full transcription, and
`1994/23-annual-budget-1994.md` is a summary-only file. Match their shape.

Most documents get a full transcription. Categories listed under `summary_only` in
`knowledge/sources/priorities.json` get a summary-only file instead: see "Summary-only documents" below.

## The one rule

**Copy what is printed. Do not improve it.** A resident may be fined under this text. A wrong digit is worse than a gap.

## What you are given

- One PDF, read as page images. It has no text layer.
- Its entry from `knowledge/sources/sb-office.json`: the library id, the listed title, the category, both URLs, the
  file hash, and the date it was fetched.

## The body

1. **Word for word, in the language printed.** Keep the spelling, capitals, and punctuation, including old or unusual
   spellings such as "subali't" and "Pulisiya". Never translate the body.
2. **Join lines that the scan wraps.** A paragraph is one paragraph. Rejoin a word split by a hyphen at a line end only
   when it is plainly one word ("ari-arian" keeps its hyphen).
3. **Keep list labels exactly.** Older Filipino ordinances letter their lists a, b, k, d, e, g, h, i, l. That is the
   old alphabet, not an error. Write `- k.` and not `- c.`.
4. **Amounts and numbers get a second look.** After finishing a page, reread every peso amount, date, section number,
   distance, and period against the image. Where the document gives a number in words and in figures, both must agree.
   If they do not agree in the document, copy both as printed and count it as uncertain.
5. **Mark what you cannot read.** Use `[illegible]` for a word or passage you cannot read, and `[unclear: your best
   reading]` for one you can only partly read. Never guess silently. Count every mark in `transcription.uncertain`.
6. **Headings.**
   - `# ` for the document's own number line, as printed, including any spaces around a dash:
     `# KAUTUSAN BLG. 002 - 02`, `# ORDINANCE NO. 03-2024`.
   - `## ` for each section, as printed: `## SEKSIYON 4. KAPARUSAHAN.`, `## SECTION 5. PENALTY.`
   - `## Mga Sapagkat` or `## Whereas clauses` for the preamble. For an explanatory note, use its printed heading.
   - `## Mga Lagda` or `## Signatories` for the end block.
   Put the section's text under its heading, not on the heading line. Search splits the document by these headings, so
   every section needs one.
7. **Page markers.** Put `<!-- page N -->` at the start of each page, where N is the PDF page number, so an answer can
   say which page a rule is on.
8. **Leave these out:**
   - The names and signatures that run up the left margin of each page. They repeat the signatories.
   - Repeated page headers and page labels such as "p. 2, Kautusan 002-02".
   - Seals, logos, punch holes, and decorative rules.
   - Handwriting, except a handwritten date or number that completes a printed field.
9. **Keep these:**
   - The heading block and the "excerpt from the minutes" line on page 1.
   - The attendance lists, as a bullet list of name and position, joined by a comma, each in the capitals printed:
     `- KGG. HUBERTO A. HUGO, KONSEHAL`. The dot leaders between them are not copied.
   - The signatories at the end, as plain lines of role and name. Do not describe signatures.
   - A date stamp that gives the approval date, followed by `[stamp]`. A rubber stamp often prints a gap inside a
     number, as in "APR 2 9 2002": write the number whole, "APR 29 2002".
10. **Emphasis.** Italics as `*italics*` where the print clearly uses them for terms or citations. Skip bold, since
    most headings are bold.
11. **Tables.** A short table becomes a markdown table, cell by cell. A table too large or too faint to copy with
    confidence is not copied: write `[table not transcribed: one line saying what it holds, with its page range]` and
    count it as uncertain.
12. **Annexes.** Transcribe the ordinance itself. For an attached annex of more than two pages, such as a budget
    breakdown or a schedule of fees, write `[annex not transcribed: its title, with its page range]`. If the file
    refers to an annex that is not in the file, write `[annex not in this file: its title]`.
13. **No long dashes and no emoji**, in the body or the frontmatter. Where the print has a long dash, write a hyphen.
    This is the one change to punctuation that the site's rules require.

## The frontmatter

Fill every field. Use `null` where the document does not say, and never invent a value.

| Field | Rule |
|---|---|
| `sb_id` | From the manifest. |
| `kind` | `ordinance`, `appropriation-ordinance`, `resolution`, or `other`, from what the document calls itself. |
| `coverage` | `full` for a transcription, `summary` for a summary-only file. |
| `number_printed` | As printed on the document, such as "002-02". |
| `number_listed` | As the library lists it, such as "02-2002". From the manifest. |
| `year` | The year in the document's own number, where it has one: 1994 for "001-94". Otherwise the year it was enacted. |
| `title` | As printed, in sentence or title case instead of all capitals. Correct an obvious typo here, and list it under `corrections` as "printed -> written here", as `services.ts` does. The body keeps the typo. |
| `title_en` | An English translation of the title, only when the title is not in English. Otherwise leave it out. |
| `language` | `en`, `fil`, or `mixed`. |
| `issuing_body` | As printed: "Sangguniang Bayan ng Carmona", "Sangguniang Panlungsod". |
| `session` | The session named in the excerpt line, as printed. |
| `date_enacted` | The date of the session or of "PINAGTIBAY" or "ENACTED", as YYYY-MM-DD. |
| `date_approved` | The mayor's approval date, from the text or the stamp, as YYYY-MM-DD. |
| `introduced_by`, `committees` | Lists, when printed. Otherwise leave them out. |
| `category` | From the manifest. |
| `status` | Always `unverified`. Only the user changes this, and only with a source. |
| `summary_en`, `summary_fil` | Two to five plain sentences each, at most 90 words: what it requires or bans, who it applies to, the penalty with its exact amounts, and who enforces it. Only what the text says. Leave out detail a resident would not ask about. |
| `keywords_en`, `keywords_fil` | Six to ten each: the words a resident would type, not the words the ordinance uses. Include how someone would ask to report or complain, where that applies. |
| `source` | `page_url`, `file_url`, `sha256`, `pages`, and `fetched_at`, all from the manifest. |
| `key_facts` | Summary-only files only. See below. |
| `transcription` | `by`, `date`, `reviewed: false`, and `uncertain` as a count of the marks from rules 5, 11, and 12. |

The summaries and keywords are search aids. They are not part of the ordinance, and the assistant is told never to
quote them as the ordinance.

## Summary-only documents

For a document in a `summary_only` category, read the whole PDF but do not transcribe it. Write a file with the same
frontmatter, `coverage: summary`, and this body:

```
# {the document's own number line, as printed}

[summary only: the full text is not transcribed. See the scan.]
```

The rules that change:

1. **The summaries carry the content.** Two or three sentences each, in English and Filipino: what the document does,
   for what year or purpose, the total amount where it has one, and its dates. Nothing that is not printed in the
   document.
2. **`key_facts` holds every figure a reader might ask for**, each copied exactly as printed, with the page it is on:

   ```yaml
   key_facts:
     - label: "Total amount"
       value: "P35,270,478.51"
       page: 1
   ```

   For a budget: the year, the total, and each fund or office total that the ordinance's own text states. Do not copy
   an annex's tables. If the amounts are only in an annex, say so in a fact, as the example does.
3. **Amounts get the same second look** as in rule 4. Where words and figures disagree in the document, give both in
   the value and count it as uncertain.
4. **Unreadable figures are left out, not guessed.** Add a fact with the label and the value `[illegible]`, and count
   it as uncertain.
5. No page markers, no sections, and no signatories.

A summary-only file can be upgraded later: run the full transcription on it, and `coverage` becomes `full`.

## The file name

`knowledge/ordinances/{year}/{sb_id}-{slug}.md`, where the slug is two to five lowercase words from the title, joined
by hyphens, without accents: `2002/514-pagsusunog-ng-basura.md`.

## Before you finish

- For a full transcription: every `##` section in the document is in the file, in order, with nothing skipped, and
  the number of page markers equals `source.pages`, unless an annex was left out.
- For a summary-only file: every amount in the summaries is also in `key_facts`, with its page.
- Every amount, date, and section number was checked a second time.
- `transcription.uncertain` equals the number of marks in the body.
- The file has no long dashes and no emoji.
- You added nothing: no commentary, no explanation, no corrections.

## Reviewing a file (for the user)

Open the PDF and the markdown side by side and check, in this order: the number and dates in the frontmatter, every
amount and period in the penalty section, the section numbers, and anything marked unclear. Then read the summaries.
For a summary-only file, check each key fact against the page it names, then read the two summaries. That is all.
When it is right, set `reviewed: true`. An ordinance stays usable while unreviewed, but the assistant tells the reader
that the text is an unchecked transcription.
