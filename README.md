# BetterCarmona

A citizen-first civic portal for the City of Carmona, Cavite, listed in the
[Better LGU Directory](https://lgu.bettergov.ph/).

BetterCarmona is independent and volunteer-run. It is not an official government website. The city's official
website is [carmonagov.net](https://carmonagov.net/portal/).

The site is built on the [BetterGov.ph transparency portal template](https://github.com/bettergovph/transparency-portal)
(MIT). Its budget pages show national budget lines that name Carmona, as published by the
[BetterGov.ph Budget API](https://budget.bettergov.ph/docs). They do not show the city's own budget, and the amounts
are as published, not spending.

## Run it locally

Needs Node `^20.19.0 || >=22.12.0`.

```bash
npm ci
npm run dev       # http://localhost:5132
```

| Command | What it does |
|---|---|
| `npm run lint` | Runs ESLint |
| `npm run build` | Type-checks and builds to `dist/` |
| `npm run check` | Counts every query in `portal.config.ts` against the live API |

`portal.config.ts` holds this site's name and budget scope.

## Get updates from the template

The template is tracked as a git remote, so its updates can be merged in:

```bash
git remote add upstream https://github.com/bettergovph/transparency-portal.git   # first time only
git fetch upstream
git merge upstream/main
```

## License

MIT, as in the template. See [LICENSE](LICENSE).
