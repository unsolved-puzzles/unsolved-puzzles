# unsolved-puzzles: agent instructions

## Activity Log / changelog (`assets/data/changelog.json`)

Keep the homepage Activity Log current. When a pushed change matches a trigger
below, add or merge an entry into `assets/data/changelog.json` under today's
date (group by date; merge into an existing same-day block rather than making a
second one). This is done as part of the normal edit/commit flow, not a GitHub
Action.

### When to add an entry (and only then)
1. **A contribution goes live from someone other than the repo owner
   (`jewe6889`).** A new Finding or Theory added to an existing puzzle page.
   Owner-authored findings/theories do NOT go on the changelog.
2. **A new puzzle page is published.** Always logged, regardless of author.
3. **Someone takes a job** (accepts a community role). Add a `welcomes[]` entry
   **manually**: the role name and discussion/issue URL are not in the code, so
   ask the owner for them before adding.
4. **A milestone** (major site/tooling update). Manual decision by the owner. If
   you think a change is big enough to be a milestone, ASK the owner first; never
   add milestones unprompted.

### Schema (each element of `days[]`)
- `date`: `"YYYY-MM-DD"`.
- `milestone` (string, optional) + `milestone_links` `[{phrase, url}]` (optional).
- `pages` `[{game, name, url}]`: new puzzle pages.
- `contributions` `[{game, kind, puzzle, text, user, url}]`: `kind` is
  `Finding` | `Theory` | `Puzzle`.
- `welcomes` `[{game, text, role, user, url}]`.

### Where each field comes from (read the page markup)
- `game`: folder -> display name (`noita` -> Noita, `blue-prince` -> Blue Prince).
- `name` / `puzzle`: page `<h1>` / `<title>` (strip the ` | Unsolved Puzzles` suffix).
- Finding: `div.finding-card[id^="finding-"]`; `text` = its `<h3>`; `user` =
  `.finding-card-meta` `Source: X`; also `data-status`, `data-issue`.
- Theory: `div.theory-item[id^="theory-"]` (exclude `.theory-item-cta`); `text` =
  `.theory-title`; `user` = author of the linked `data-issue` GitHub issue
  (theories have no Source line in the markup).
- `url`: page path + `#<id>` for findings/theories; page path for pages/Puzzle.

### Rules
- Idempotent: never add an id already present (dedupe by `url#id`); only append
  what is new since the last changelog update.
- Only game folders count (`blue-prince`, `noita`, ...); ignore `index`, `about`,
  tools, `404`.
- Exclude CTA cards (the `+ Submit a Finding/Theory` links).
- New page authored by the owner -> `pages[]`. New page credited to a
  contributor -> `contributions[]` with `kind: "Puzzle"`.

### Rendering notes (`assets/js/changelog.js`)
- A `Puzzle` contribution links the puzzle NAME itself and shows no
  "New puzzle page" text. Findings/Theories render `puzzle name` then
  `· <text link>`.
- Bump the `changelog.js?v=` / `changelog.css?v=` query in `index.html` when
  editing those files so browsers pick up the change.
