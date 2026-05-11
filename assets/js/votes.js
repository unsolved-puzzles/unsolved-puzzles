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

    // Hide containers that will be reordered to prevent layout shift
    var rankedContainers = document.querySelectorAll(".games-grid, .findings-grid, .theories-section");
    rankedContainers.forEach(function (el) {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s ease";
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
      rankFindings();
    }

    // Map theory items to issues
    if (theoryIssues) {
      theoryItems.forEach((item) => {
        mapIssueToElement(item, ".theory-title", theoryIssues);
      });
      rankTheories();
    }

    // Map puzzle cards to issues
    if (puzzleIssues) {
      puzzleCards.forEach((card) => {
        mapIssueToElement(card, ".game-card-title", puzzleIssues, true);
      });
      rankPuzzles();
    }

    // Reveal containers after ranking
    rankedContainers.forEach(function (el) { el.style.opacity = "1"; });
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
    var commentBadge = '';
    if (issue.comments > 0) {
      commentBadge = '<span class="vote-reaction" title="' + issue.comments + ' comment' + (issue.comments === 1 ? '' : 's') + ' on GitHub">' +
        '💬<span class="vote-count">' + issue.comments + '</span></span>';
    }

    widget.innerHTML =
      (reactionSpans.length || commentBadge
        ? '<span class="vote-reactions">' + reactionSpans.join("") + commentBadge + "</span>"
        : "") +
      '<a class="vote-discuss-link" href="' + issue.html_url + '" target="_blank" rel="noopener"' + stopProp + '>' + linkText + '</a>';
  }

  // Status priority: confirmed > tentative > explained > debunked
  const STATUS_ORDER = { confirmed: 0, tentative: 1, explained: 2, debunked: 3 };

  // Theory rank priority: Established > Promising > Speculative
  const RANK_ORDER = { established: 0, promising: 1, speculative: 2 };

  function extractVoteStats(el) {
    const widget = el.querySelector(".vote-widget");
    let ups = 0, downs = 0, comments = 0;
    if (widget) {
      const reactions = widget.querySelectorAll(".vote-reaction");
      reactions.forEach((r) => {
        const text = r.textContent.trim();
        const count = parseInt(r.querySelector(".vote-count")?.textContent) || 0;
        if (text.startsWith("\uD83D\uDC4D")) ups = count;
        else if (text.startsWith("\uD83D\uDC4E")) downs = count;
        else if (text.startsWith("\uD83D\uDCAC")) comments = count;
      });
    }
    return { ups, downs, comments, score: ups - downs };
  }

  function rankFindings() {
    const grids = document.querySelectorAll(".findings-grid");
    grids.forEach((grid) => {
      const cards = Array.from(grid.querySelectorAll(".finding-card"));
      if (cards.length < 2) return;

      cards.forEach((card) => {
        const status = card.dataset.status || "tentative";
        const stats = extractVoteStats(card);
        card._sortStatus = STATUS_ORDER[status] ?? 1;
        card._sortScore = stats.score;
        card._sortComments = stats.comments;
      });

      cards.sort((a, b) => {
        if (a._sortStatus !== b._sortStatus) return a._sortStatus - b._sortStatus;
        if (a._sortScore !== b._sortScore) return b._sortScore - a._sortScore;
        return b._sortComments - a._sortComments;
      });

      // Re-append in sorted order (CTA card stays at end)
      const cta = grid.querySelector(".finding-card-cta");
      cards.forEach((card) => {
        if (!card.classList.contains("finding-card-cta")) grid.appendChild(card);
      });
      if (cta) grid.appendChild(cta);
    });
  }

  function rankTheories() {
    const sections = document.querySelectorAll(".theories-section");
    sections.forEach((section) => {
      const items = Array.from(section.querySelectorAll(".theory-item:not(.theory-item-cta)"));
      if (items.length < 2) return;

      items.forEach((item) => {
        const rankEl = item.querySelector(".theory-rank");
        const rankText = (rankEl?.textContent?.trim() || "speculative").toLowerCase();
        const stats = extractVoteStats(item);
        item._sortRank = RANK_ORDER[rankText] ?? 2;
        item._sortScore = stats.score;
        item._sortComments = stats.comments;
      });

      items.sort((a, b) => {
        if (a._sortRank !== b._sortRank) return a._sortRank - b._sortRank;
        if (a._sortScore !== b._sortScore) return b._sortScore - a._sortScore;
        return b._sortComments - a._sortComments;
      });

      // Re-append in sorted order (CTA stays at end)
      const cta = section.querySelector(".theory-item-cta");
      items.forEach((item) => section.appendChild(item));
      if (cta) section.appendChild(cta);
    });
  }

  // Puzzle status priority: Unsolved > Solved > Not Yet Implemented > Likely Red Herring
  const PUZZLE_STATUS_ORDER = { unsolved: 0, solved: 1, "not yet implemented": 2, "likely red herring": 3 };

  function rankPuzzles() {
    const grids = document.querySelectorAll(".games-grid");
    grids.forEach((grid) => {
      const cards = Array.from(grid.querySelectorAll(".game-card:not(.game-card-cta)"));
      if (cards.length < 2) return;

      cards.forEach((card) => {
        // Determine status from badge text
        const badge = card.querySelector(".badge");
        const badgeText = (badge?.textContent?.trim() || "unsolved").toLowerCase();
        card._sortStatus = PUZZLE_STATUS_ORDER[badgeText] ?? 0;

        // Extract votes from widget
        const widget = card.querySelector(".vote-widget");
        let ups = 0, downs = 0, maxOther = 0;
        if (widget) {
          const reactions = widget.querySelectorAll(".vote-reaction");
          reactions.forEach((r) => {
            const text = r.textContent.trim();
            const count = parseInt(r.querySelector(".vote-count")?.textContent) || 0;
            if (text.startsWith("\uD83D\uDC4D")) ups = count;
            else if (text.startsWith("\uD83D\uDC4E")) downs = count;
            else if (!text.startsWith("\uD83D\uDCAC")) {
              // Non-comment, non-vote reaction: track max
              if (count > maxOther) maxOther = count;
            }
          });
        }
        card._sortScore = ups - downs;
        card._sortMaxOther = maxOther;
      });

      cards.sort((a, b) => {
        if (a._sortStatus !== b._sortStatus) return a._sortStatus - b._sortStatus;
        if (a._sortScore !== b._sortScore) return b._sortScore - a._sortScore;
        return b._sortMaxOther - a._sortMaxOther;
      });

      // Re-append in sorted order (CTA stays at end)
      const cta = grid.querySelector(".game-card-cta");
      cards.forEach((card) => grid.appendChild(card));
      if (cta) grid.appendChild(cta);
    });
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
