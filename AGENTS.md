# unsolved-puzzles: agent instructions

## Reviewing new issues and comments

When asked what to do with a new issue or comment, read the full submission,
its parent discussion, and the corresponding site finding or theory before
recommending an action. Check primary evidence when available (in-game
transcripts, screenshots, raw puzzle data, reproducible calculations), and
distinguish verified observations from proposed interpretations. Test the
reasoning independently: a plausible coincidence is not a confirmed solve,
and a flaw in one interpretation does not necessarily debunk a broader claim.
Do not automatically agree with either the submitter or the site.

Suggest an action and a brief reason for each submission: add or revise a
finding/theory, mark a specific claim explained or debunked when evidence
warrants it, request a source or clarification, reply without changing the
site, or take no further action. Include draft reply wording when useful.
Upvoting or downvoting the issue's finding/theory is also a valid response to
signal support or skepticism without changing the site's factual status.
Votes measure community opinion, not proof; do not cast reactions on the
owner's behalf unless asked.

Preserve the scope of the evidence. An unresolved theory is not debunked
merely because its proposed mechanism is weak. Conversely, do not retain an
obsolete "unresolved" claim when a documented explanation exists. If the
issue title, site card, and comment describe different claims, name the
difference explicitly before proposing a status change. Use `confirmed` for
verified observations, `tentative` for unverified claims, `explained` for real
observations whose purpose is known, and `debunked` for claims contradicted by
evidence. Keep issue bodies unchanged when editing site findings; the HTML is
the source of truth. Do not post issue comments by default for minor site
updates, but do so when explicitly asked. Follow any additional local site
conventions when available. Do not edit the site or post a public reply when
only an assessment was requested.

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
5. **A new community resource or media item is added.** A new video, tool, or
   guide added to a game index page (`contributions[]` entry with `kind: "Media"`).

### Schema (each element of `days[]`)
- `date`: `"YYYY-MM-DD"`.
- `milestone` (string, optional) + `milestone_links` `[{phrase, url}]` (optional).
- `pages` `[{game, name, url}]`: new puzzle pages.
- `contributions` `[{game, kind, puzzle, text, user, url}]`: `kind` is
  `Finding` | `Theory` | `Puzzle` | `Media`.
- `welcomes` `[{game, text, role, user, url}]`.

### Where each field comes from (read the page markup)
- `game`: folder -> display name (`noita` -> Noita, `blue-prince` -> Blue Prince).
- `name` / `puzzle`: page `<h1>` / `<title>` (strip the ` | Unsolved Puzzles` suffix).
- Finding: `div.finding-card[id^="finding-"]`; `text` = its `<h3>`; `user` =
  `.finding-card-meta` `Source: X`; also `data-status`, `data-issue`.
- Theory: `div.theory-item[id^="theory-"]` (exclude `.theory-item-cta`); `text` =
  `.theory-title`; `user` = author of the linked `data-issue` GitHub issue
  (theories have no Source line in the markup).
- Media: `a.resource-link` in game index; `text` = its `<h4>`; `user` = author
  `.resource-author strong`; `user_url` = author channel or profile URL (optional);
  `url` = resource link (the `puzzle` field is omitted for media).
- `url`: page path + `#<id>` for findings/theories; page path for pages/Puzzle;
  external URL for media.

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
