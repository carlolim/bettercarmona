/**
 * This portal's configuration: the only file a fork needs to edit.
 * What each field means: src/config.ts. Check it against the live API with
 * `npm run check`.
 */
import { defineConfig } from './src/config';

export default defineConfig({
  id: 'carmona-cavite',
  kind: 'city',
  name: 'BetterCarmona',
  shortName: 'Carmona',
  operator: { name: '@carlolim', url: 'https://github.com/carlolim' },
  logo: '/brand/bettercarmona-logo.svg',
  siteUrl: 'https://bettercarmona.org',
  buildYourOwnStrip: false,
  scope: {
    places: [{ label: 'Carmona City', q: 'Carmona City', region: 'IV-A' }],
  },
  reporting: { enabled: false },
});
