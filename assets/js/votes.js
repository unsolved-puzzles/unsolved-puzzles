/**
 * Unsolved Puzzles - Voting via GitHub Issues Reactions
 *
 * Each finding card, theory item, and puzzle card maps to a GitHub Issue
 * (by title match). All GitHub reaction types are supported — only
 * reactions with count > 0 are displayed.
 * A "Discuss" / "Vote" link takes users to the issue.
 *
 * Zero backend required — uses the public GitHub API.
 */
(function () {
  const REPO_OWNER = "unsolved-puzzles";
  const REPO_NAME = "unsolved-puzzles";
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
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const findingCards = document.querySelectorAll(".finding-card");
    const theoryItems = document.querySelectorAll(".theory-item");
    const puzzleCards = document.querySelectorAll(".game-card:not(.game-card-cta)");
    if (!findingCards.length && !theoryItems.length && !puzzleCards.length) return;

    // Inject empty vote widgets into all finding cards
    findingCards.forEach((card) => {
      const meta = card.querySelector(".finding-card-meta");
      if (!meta) return;
      const widget = document.createElement("div");
      widget.className = "vote-widget";
      meta.parentNode.insertBefore(widget, meta.nextSibling);
    });

    // Inject empty vote widgets into all theory items
    theoryItems.forEach((item) => {
      const desc = item.querySelector(".theory-desc");
      if (!desc) return;
      const widget = document.createElement("div");
      widget.className = "vote-widget";
      desc.parentNode.insertBefore(widget, desc.nextSibling);
    });

    // Inject empty vote widgets into puzzle cards
    puzzleCards.forEach((card) => {
      const meta = card.querySelector(".game-card-meta");
      if (!meta) return;
      const widget = document.createElement("div");
      widget.className = "vote-widget";
      meta.parentNode.insertBefore(widget, meta.nextSibling);
    });

    // Fetch issues for all labels in parallel
    const [findingIssues, theoryIssues, puzzleIssues] = await Promise.all([
      findingCards.length ? fetchIssues("finding") : Promise.resolve([]),
      theoryItems.length ? fetchIssues("theory") : Promise.resolve([]),
      puzzleCards.length ? fetchIssues("puzzle") : Promise.resolve([]),
    ]);

    // Map finding cards to issues
    if (findingIssues) {
      findingCards.forEach((card) => {
        mapIssueToElement(card, "h3", findingIssues);
      });
    }

    // Map theory items to issues
    if (theoryIssues) {
      theoryItems.forEach((item) => {
        mapIssueToElement(item, ".theory-title", theoryIssues);
      });
    }

    // Map puzzle cards to issues
    if (puzzleIssues) {
      puzzleCards.forEach((card) => {
        mapIssueToElement(card, ".game-card-title", puzzleIssues, true);
      });
    }
  }

  function mapIssueToElement(el, titleSelector, issues, isPuzzle) {
    const titleEl = el.querySelector(titleSelector);
    const title = titleEl?.textContent?.trim();
    if (!title) return;

    const titleLower = title.toLowerCase();
    const issue = issues.find((i) => {
      const it = i.title.trim().toLowerCase();
      return it === titleLower || it.endsWith(" - " + titleLower);
    });
    if (!issue) return;

    const widget = el.querySelector(".vote-widget");
    if (!widget) return;

    const reactionSpans = REACTION_MAP
      .filter((r) => issue.reactions[r.key] > 0)
      .map(
        (r) =>
          '<span class="vote-reaction">' +
          r.emoji +
          '<span class="vote-count">' + issue.reactions[r.key] + "</span>" +
          "</span>"
      );

    var linkText = isPuzzle ? "Rank this Puzzle" : "Discuss on GitHub";
    var stopProp = isPuzzle ? ' onclick="event.stopPropagation()"' : '';

    widget.innerHTML =
      (reactionSpans.length
        ? '<span class="vote-reactions">' + reactionSpans.join("") + "</span>"
        : "") +
      '<a class="vote-discuss-link" href="' + issue.html_url + '" target="_blank" rel="noopener"' + stopProp + '>' + linkText + '</a>';
  }

  async function fetchIssues(label) {
    const cacheKey = "up_issues_" + label;

    // Check cache
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey));
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.data;
      }
    } catch (e) {}

    // Fetch all issues with the given label (paginated, up to 200)
    try {
      let allIssues = [];
      for (let page = 1; page <= 2; page++) {
        const url =
          `${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues` +
          `?labels=${label}&state=open&per_page=100&page=${page}`;
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
        cacheKey,
        JSON.stringify({ ts: Date.now(), data: allIssues })
      );

      return allIssues;
    } catch (e) {
      return null;
    }
  }
})();
