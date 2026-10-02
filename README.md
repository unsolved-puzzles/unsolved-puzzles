# 🔍 Unsolved Puzzles

A community investigation board for tracking hidden puzzles in games.  
Live site: **[unsolved-puzzles.github.io/unsolved-puzzles](https://unsolved-puzzles.github.io/unsolved-puzzles/)**

---

## How to Contribute

You don't need to be a programmer to help! You'll just need a free [GitHub account](https://github.com/signup).

### 🗳️ Vote & discuss

Every sticky note on the site shows **👍 / 👎** reaction counts and a **"Discuss on GitHub"** link.  
The counts are pulled live from GitHub. Click the link to add your reaction or join the conversation. You can also use the **comment section at the bottom of each puzzle page** for general discussion.

To report progress or update a finding's status, comment directly on its thread with a source link.

### 📝 Submit something new

Click **[New Issue](https://github.com/unsolved-puzzles/unsolved-puzzles/issues/new/choose)** and pick the right template:

| Template | When to use it |
|----------|---------------|
| 🔍 **New Finding** | You observed something verifiable in the game (for a puzzle already on the board) |
| 💡 **Theory** | You have a hypothesis about what a finding means, not proven yet |
| ❌ **Debunk** | You have evidence that a finding or theory is wrong |
| ✏️ **Suggest an Edit** | You want to correct or add something to an existing puzzle page |
| 📚 **Community Resource** | You want to share a tool, guide, dataset, or video that helps |
| 🧩 **New Puzzle** | You want to suggest an unsolved puzzle not yet tracked on the site |
| 🎮 **New Game** | You know a game with unsolved puzzles that should be added |
| 🐛 **Bug Report** | Something on the website is broken |
| ✨ **Feature Request** | You have an idea to improve the site |

Fill in the form and **include a source whenever possible** (Reddit thread, Discord message, screenshot, video).

> **Finding vs Theory — what's the difference?**  
> - *Finding:* "The boiler shows 15 panels in a loop" —> an observable fact  
> - *Theory:* "The panels encode Braille characters" —> an interpretation

---

## Maintaining page metadata

Enable automatic date updates for local commits once per clone:

```sh
git config core.hooksPath .githooks
```

The [pre-commit hook](.githooks/pre-commit) requires Node.js and synchronizes
the bottom-right **Last updated** date, JSON-LD `dateModified`, and
[sitemap](sitemap.xml) `lastmod` when staged page text, evidence links, finding
statuses, or content screenshots change. Updates to the Activity Log, roles,
and room-coordinate data refresh their consuming pages too. Dates use the
local commit day. Partially staged affected pages or sitemap edits must be fully
staged before the hook can safely update them.

Hooks are local: contributors must enable them, and edits made directly on
GitHub or with hooks bypassed still need manual date updates. New pages need
the existing date markup and a sitemap entry. Substantive changes to content
generated only by JavaScript also need a manual date update.

Formatting, favicon changes, live votes, and metadata-only edits do not make
the puzzle evidence newly reviewed. Existing dates were established from
content changes in Git history; publication dates are omitted where unverified.

Declare measured `width` and `height` attributes on images, preserving their
aspect ratios. The shared stylesheet keeps content images responsive and hero
images cropped. Generated avatars and enlarged lightbox images also declare
dimensions.

Every page uses the shared [magnifying-glass favicon](assets/img/favicon.png),
rendered from the same symbol as the header logo, with
[ICO variants](assets/img/favicon.ico) for 16, 32, and 48 pixel sizes.
When replacing the icon assets, bump their `?v=` references across every page
so browsers do not keep displaying a cached icon.

Validate metadata, sitemap dates, image dimensions, and icon assets with:

```sh
node --test tools/site-metadata.test.cjs tools/update-page-dates.test.cjs
```

---

*Made with ☕ by the community.*
