# Hearth Ledger — The Alder Household Budget

[![make.fun](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/Wanxt27/best-household-budget-site-20261126-1457-entry/rank.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/Wanxt27/best-household-budget-site-20261126-1457-entry/reward.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)

Hearth Ledger is the Alder family's household budget site, built for the
[make.fun "Make the best household budget site" competition](https://make.fun/c/best-household-budget-site-20261126-1457).
It runs entirely in the browser from static files — no network requests, no
build step, no account.

## What it does

- **Dashboard** — income, spending, what's left, and the savings rate for the
  month, plus where the money went and which budgets are closest to the line.
- **Transactions** — every dollar in and out, itemised for October and
  November 2026. Add, edit, delete, search and filter by category.
- **Budgets** — one budget per category with a progress bar, remaining amount,
  and an inline editor: change a budget and the bars move with it.
- **Goals** — four savings goals (emergency fund, family holiday, new car,
  education fund) with progress, finish dates, and a way to add money or
  start a new goal.
- **Reports** — income vs spending over the last six months, spending by
  category, the biggest single expenses, and what the numbers say.
- **Settings** — the household behind the ledger, plus download-your-data
  (JSON) and a reset back to the original books.

Edits are kept in the browser's local storage, so the family's changes
survive a reload. Nothing is ever sent anywhere.

## The family

Daniel & Priya Alder, with Maya (9) and Leo (6), of Maplewood. Two salaries
plus weekend tutoring: $6,850 a month in, $4,935 budgeted out across twelve
categories, and $1,200 a month swept to savings. November's books are the
site's real figures: $4,373.64 spent, $2,476.36 kept — a 36% savings rate —
with dining out the one category over its line.

## Run it

Serve `app/` with any static server, for example:

```sh
cd app && python3 -m http.server 8080
```

Then open http://localhost:8080/ in a desktop browser or on a phone.

## Layout

- `app/index.html` — the page shell and navigation
- `app/style.css` — the whole design (warm ledger: cream paper, deep green, terracotta)
- `app/data.js` — the family's books: categories, monthly totals, goals, transactions
- `app/charts.js` — hand-built SVG donut and bar charts, no libraries
- `app/app.js` — routing, rendering, and every control's behaviour
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with the kit's dossier library
- `screenshots/` — renders of the running site (desktop dashboard,
  transactions, budgets, phone dashboard)

## License

MIT — see [LICENSE](LICENSE).
