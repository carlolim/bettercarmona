/**
 * Fails the build when a service in src/community/data/services.ts lacks what a reader needs to check
 * it: a charter page, a dated source, requirements, steps, and a total. Also run on its own:
 *
 *   npx tsx scripts/services-check.ts
 */
import { argv, exit } from 'node:process';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';
import type { Requirement, Service, ServiceCategory } from '../src/community/data/services.ts';

/** The charter's last printed page: 622 PDF pages, less the 18 before page 1. */
const LAST_PAGE = 604;
const LONG_DASH = /[\u2013\u2014]/;

export function serviceProblems(services: Service[], categories: ServiceCategory[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const s of services) {
    const at = `service "${s.id}"`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) problems.push(`${at}: id must be lowercase words joined by hyphens`);
    if (ids.has(s.id)) problems.push(`${at}: id is used twice`);
    ids.add(s.id);
    if (!categories.some((c) => c.id === s.category)) problems.push(`${at}: no category "${s.category}"`);

    const { source, pages } = s;
    if (!source?.title || !source.publisher || !source.edition) problems.push(`${at}: source needs a title, publisher, and edition`);
    if (!source?.url?.startsWith('https://')) problems.push(`${at}: source needs an https URL`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source?.recordedAt ?? '')) problems.push(`${at}: source needs recordedAt as YYYY-MM-DD`);
    const [first, last] = pages ?? [];
    if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > LAST_PAGE) {
      problems.push(`${at}: pages must be printed charter pages, first to last, within 1-${LAST_PAGE}`);
    }

    for (const field of ['title', 'description', 'office', 'classification', 'transactionType'] as const) {
      if (!s[field]?.trim()) problems.push(`${at}: ${field} is empty`);
    }
    if (!s.whoMayAvail.length) problems.push(`${at}: whoMayAvail is empty`);
    if (!s.requirements.length) problems.push(`${at}: no requirements`);
    if (!s.steps.length) problems.push(`${at}: no steps`);
    s.steps.forEach((step, i) => {
      if (!step.rows.length) problems.push(`${at}: step ${i + 1} has no rows`);
      step.rows.forEach((r, j) => {
        if (!r.action && !r.fee && !r.time) problems.push(`${at}: step ${i + 1}, row ${j + 1} is empty`);
      });
    });
    if (!s.total?.time.length) problems.push(`${at}: the total needs a processing time`);
    for (const c of s.caveats ?? []) if (!c.en.trim()) problems.push(`${at}: a caveat has no English text`);

    for (const text of strings(s)) {
      if (LONG_DASH.test(text)) problems.push(`${at}: write long dashes as hyphens: "${text}"`);
    }
  }
  for (const c of categories) {
    if (!services.some((s) => s.category === c.id)) problems.push(`category "${c.id}" has no services`);
  }
  return problems;
}

function* strings(value: unknown): Generator<string> {
  if (typeof value === 'string') yield value;
  else if (Array.isArray(value)) for (const v of value) yield* strings(v);
  else if (value && typeof value === 'object') for (const v of Object.values(value as Record<string, Requirement>)) yield* strings(v);
}

async function load(): Promise<string[]> {
  const { SERVICES, SERVICE_CATEGORIES } = await import('../src/community/data/services.ts');
  return serviceProblems(SERVICES, SERVICE_CATEGORIES);
}

export function servicesCheck(): Plugin {
  return {
    name: 'services-check',
    async buildStart() {
      const problems = await load();
      if (problems.length) this.error(`Services data:\n  ${problems.join('\n  ')}`);
    },
  };
}

if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  load().then((problems) => {
    for (const p of problems) console.log(`problem: ${p}`);
    if (problems.length) exit(1);
    console.log('Services data OK');
  });
}
