/**
 * Unsolved Puzzles - Voting via GitHub Issues Reactions
 *
 * Each finding card maps to a GitHub Issue (by title match).
 * All GitHub reaction types are supported — only reactions with
 * count > 0 are displayed.
 * A "Discuss" link takes users to the issue to vote/comment.
 *
 * Zero backend required — uses the public GitHub API.
 */
(function () {
  const REPO_OWNER = "unsolved-puzzles";
  const REPO_NAME = "unsolved-puzzles";
  const LABEL = "finding";
  const API_BASE = "https://api.github.com";

  // All GitHub reaction types mapped to emoji
  const REACTION_MAP = [
    { key: "+1",      emoji: "👍" },
    { key: "-1",      emoji: "👎" },
    { key: "laugh",   emoji: "😄" },
    { key: "hooray",  emoji: "🎉" },
    { key: "confused", emoji: "😕" },
    { key: "heart",   emoji: "❤️" },
    { key: "rocket",  emoji: "🚀" },
    { key: "eyes",    emoji: "👀" },
  ];

  // Cache fetched issues in sessionStorage to reduce API calls
  const CACHE_KEY = "up_issues_cache";
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const cards = document.querySelectorAll(".finding-card");
    if (!cards.length) return;

    // Inject empty vote widgets into all cards (populated after fetch)
    cards.forEach((card) => {
      const meta = card.querySelector(".finding-card-meta");
      if (!meta) return;

      const widget = document.createElement("div");
      widget.className = "vote-widget";
      meta.parentNode.insertBefore(widget, meta.nextSibling);
    });

    // Fetch issues and map to cards
    const issues = await fetchIssues();
    if (!issues) return;

    cards.forEach((card) => {
      const title = card.querySelector("h3")?.textContent?.trim();
      if (!title) return;

      // Issue titles are prefixed "Game - Page - Card Title"
      // Match by checking if issue title ends with the card title
      const titleLower = title.toLowerCase();
      const issue = issues.find(
        (i) => {
          const it = i.title.trim().toLowerCase();
          return it === titleLower || it.endsWith(" - " + titleLower);
        }
      );
      if (!issue) return;

      const widget = card.querySelector(".vote-widget");
      if (!widget) return;

      // Build only reactions with count > 0
      const reactionSpans = REACTION_MAP
        .filter((r) => issue.reactions[r.key] > 0)
        .map(
          (r) =>
            '<span class="vote-reaction">' +
            r.emoji +
            '<span class="vote-count">' + issue.reactions[r.key] + "</span>" +
            "</span>"
        );

      widget.innerHTML =
        (reactionSpans.length
          ? '<span class="vote-reactions">' + reactionSpans.join("") + "</span>"
          : "") +
        '<a class="vote-discuss-link" href="' + issue.html_url + '" target="_blank" rel="noopener">Discuss on GitHub</a>';
    });
  }

  async function fetchIssues() {
    // Check cache
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.data;
      }
    } catch (e) {}

    // Fetch all issues with the finding label (paginated, up to 200)
    try {
      let allIssues = [];
      for (let page = 1; page <= 2; page++) {
        const url =
          `${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues` +
          `?labels=${LABEL}&state=open&per_page=100&page=${page}`;
        const res = await fetch(url, {
          headers: { Accept: "application/vnd.github.squirrel-girl-preview+json" },
        });

        if (!res.ok) return null;

        const data = await res.json();
        allIssues = allIssues.concat(data);
        if (data.length < 100) break;
      }

      // Cache
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: Date.now(), data: allIssues })
      );

      return allIssues;
    } catch (e) {
      return null;
    }
  }
})();
