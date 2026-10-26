// Activity Log & Recent Discussions on the main page.
(function () {
  const mount = document.getElementById('changelog-timeline');
  const recentMount = document.getElementById('recent-discussions-list');

  const REPO_OWNER = 'unsolved-puzzles';
  const REPO_NAME = 'unsolved-puzzles';
  const OWNER_LOGIN = 'jewe6889';
  const CACHE_KEY = 'up_recent_discussions_v3';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const MAX_RECENT = 5;

  const SLUG_TO_PUZZLE = {
    'boiler-room': 'Boiler Room Panels',
    'bookshop-compartment': 'Bookshop Compartment',
    'castle-cloak-court': 'Castle, Court, Cloak',
    'directory-paintings': 'Directory Paintings',
    'does-it-never-end': 'Does It Never End?',
    'garage-acronym': 'Garage Acronym',
    'hand-statues': 'Hand Statues',
    'hidden-letters': 'Hidden Letters',
    'missing-i': "The Missing 'I'",
    'music-room': 'Music Room',
    'repeated-phrases': 'Repeated Phrases',
    'the-eclipse': 'The Eclipse',
    'these-vying-plans': 'These Vying Plans',
    'tomb-candles': 'Tomb Candles',
    'true-draft': 'True Draft',
    '34-orb-qr': 'The 34-Orb QR Code',
    'broken-monoliths': 'The Broken Monoliths',
    'cauldron': 'The Cauldron Room',
    'desert-ruins': 'The Desert Ruins Markings',
    'dollar-symbol': 'The Alchemy Symbol',
    'earthquake-circle': 'The Earthquake Circle',
    'eye-puzzle': 'The Eye Puzzle',
    'master-statues': 'The Master Statues',
    'microbiomes': 'Hills 2 & the Microbiomes',
    'music-animals': 'Music-Attracted Animals'
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));

  const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const fmtMonthYear = (iso) => {
    const [y, m] = iso.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric'
    });
  };

  const renderPage = (p) => `
    <li class="cl-page">
      <span class="cl-tag" data-game="${esc(p.game)}">${esc(p.game)}</span>
      <a href="${esc(p.url)}">${esc(p.name)}</a>
    </li>`;

  const renderContribution = (it) => {
    // A "Puzzle" contribution is a whole new page: link the puzzle name itself and
    // drop the redundant "New puzzle page" action text.
    const isExt = it.url && it.url.startsWith('http');
    const targetAttr = isExt ? ' target="_blank" rel="noopener"' : '';
    const userHref = it.user_url ? esc(it.user_url) : `https://github.com/${esc(it.user)}`;
    const gameTag = it.game
      ? `<span class="cl-tag" data-game="${esc(it.game)}">${esc(it.game)}</span>`
      : '';
    const userLink = it.user
      ? `<a class="cl-user" href="${userHref}" target="_blank" rel="noopener">${esc(it.user)}</a>`
      : '';
    let body;
    if (it.kind === 'Puzzle') {
      body = `<a class="cl-puzzle" href="${esc(it.url)}">${esc(it.puzzle)}</a>`;
    } else if (it.kind === 'Media' || it.kind === 'Feature' || !it.puzzle) {
      body = it.url
        ? `<a href="${esc(it.url)}"${targetAttr}>${esc(it.text)}</a>`
        : `<span>${esc(it.text)}</span>`;
    } else {
      body = `<span class="cl-puzzle">${esc(it.puzzle)}</span>
      &middot; <a href="${esc(it.url)}"${targetAttr}>${esc(it.text)}</a>`;
    }
    return `
    <li class="cl-item">
      ${gameTag}
      <span class="cl-kind" data-kind="${esc(it.kind)}">${esc(it.kind)}</span>
      ${body}
      ${userLink}
    </li>`;
  };

  const renderWelcome = (w) => `
    <div class="cl-welcome">
      <span class="cl-tag" data-game="${esc(w.game)}">${esc(w.game)}</span>
      <span class="cl-kind-job">Job</span>
      <span>${esc(w.text)} ${esc(w.role)}</span>
      <a class="cl-user" href="https://github.com/${esc(w.user)}" target="_blank" rel="noopener">${esc(w.user)}</a>
    </div>`;

  const renderDay = (day) => {
    let milestone = '';
    if (day.milestone) {
      let m = esc(day.milestone);
      (day.milestone_links || []).forEach((l) => {
        const ph = esc(l.phrase);
        m = m.replace(ph, `<a href="${esc(l.url)}" target="_blank" rel="noopener">${ph}</a>`);
      });
      milestone = `<div class="cl-summary">${m}</div>`;
    }
    const welcomes = (day.welcomes && day.welcomes.length)
      ? day.welcomes.map(renderWelcome).join('') : '';
    const pages = (day.pages && day.pages.length)
      ? `<ul class="cl-pages">${day.pages.map(renderPage).join('')}</ul>` : '';
    const contribs = (day.contributions && day.contributions.length)
      ? `<ul class="cl-items">${day.contributions.map(renderContribution).join('')}</ul>` : '';
    return `
      <div class="cl-day">
        <div class="cl-date">${esc(fmtDate(day.date))}</div>
        ${milestone}
        ${welcomes}
        ${pages}
        ${contribs}
      </div>`;
  };

  const renderRecentDiscussion = (it) => {
    const topic = it.cardTitle && it.cardTitle.toLowerCase() !== it.puzzle.toLowerCase()
      ? `${esc(it.puzzle)} &middot; ${esc(it.cardTitle)}`
      : esc(it.puzzle);
    return `
    <li class="cl-item rd-item">
      <div class="rd-item-top">
        <span class="cl-tag" data-game="${esc(it.game)}">${esc(it.game)}</span>
        <span class="cl-puzzle">${topic}</span>
        <a class="cl-user" href="https://github.com/${esc(it.user)}" target="_blank" rel="noopener">${esc(it.user)}</a>
      </div>
      <a class="rd-comment-link" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.text)}</a>
    </li>`;
  };

  const renderRecentDays = (items) => {
    const days = [];
    for (const it of items) {
      let day = days[days.length - 1];
      if (!day || day.date !== it.date) {
        day = { date: it.date, items: [] };
        days.push(day);
      }
      day.items.push(it);
    }
    return days.map((d) => `
      <div class="cl-day">
        <div class="cl-date">${esc(fmtDate(d.date))}</div>
        <ul class="cl-items">${d.items.map(renderRecentDiscussion).join('')}</ul>
      </div>`).join('');
  };

  function parseIssueMeta(issue) {
    if (!issue || issue.pull_request) return null;
    const title = (issue.title || '').trim();
    const body = issue.body || '';

    const pageMatch = body.match(/\*\*Page:\*\*\s*\[([a-z0-9-]+)\/([a-z0-9-]+)\]/i);
    if (pageMatch) {
      const game = pageMatch[1].toLowerCase() === 'noita' ? 'Noita' : 'Blue Prince';
      const slug = pageMatch[2].toLowerCase();
      const puzzle = SLUG_TO_PUZZLE[slug] || slug;
      const parts = title.split(' - ');
      let cardTitle = '';
      if (parts.length >= 3) {
        cardTitle = parts.slice(2).join(' - ').trim();
      } else if (parts.length === 2 && parts[1].includes(':')) {
        cardTitle = parts[1].split(':').slice(1).join(':').trim();
      }
      return { game, puzzle, cardTitle };
    }

    const titleMatch = title.match(/^(Blue Prince|Noita)\s+-\s+([^:-]+?)(?:\s+-\s+(.+)|:\s+(.+))?$/i);
    if (titleMatch) {
      const game = titleMatch[1];
      const rawPuzzle = titleMatch[2].trim();
      const cardTitle = (titleMatch[3] || titleMatch[4] || '').trim();
      return { game, puzzle: rawPuzzle, cardTitle };
    }

    const puzzleColonSection = body.match(/###\s*Puzzle\s+(Blue Prince|Noita)\s*:\s*([^\r\n]+)/i);
    if (puzzleColonSection) {
      return {
        game: puzzleColonSection[1].trim(),
        puzzle: puzzleColonSection[2].trim(),
        cardTitle: title
      };
    }

    const gameSection = body.match(/###\s*Game\s+([^\r\n]+)/i);
    const puzzleSection = body.match(/###\s*Puzzle\s+([^\r\n]+)/i);
    if (gameSection && puzzleSection) {
      return {
        game: gameSection[1].trim(),
        puzzle: puzzleSection[1].trim(),
        cardTitle: title
      };
    }
    return null;
  }

  function cleanCommentLine(raw) {
    return String(raw || '')
      .replace(/^[\s>#*-]+/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/(\*\*|__|\*|_|\`)/g, '')
      .replace(/\s*\([^)]{25,}\)\s*:?$/, '')
      .replace(/:\s*$/, '')
      .replace(/\u2014/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function summarizeComment(body, fallbackTitle) {
    const cleaned = String(body || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
    const lines = cleaned.split(/\r?\n/)
      .map(cleanCommentLine)
      .filter((l) => l && !/^(update|edit|note|you can assume[^\r\n]*)$/i.test(l));
    let line = lines[0] || fallbackTitle || 'New comment';
    if (line.length < 28 && lines[1]) {
      line = `${line}: ${lines[1]}`;
    }
    if (line.length > 115) {
      const cut = line.slice(0, 112).replace(/\s+\S*$/, '');
      line = (cut || line.slice(0, 112)) + '...';
    }
    return line || fallbackTitle || 'New comment';
  }

  async function fetchRecentDiscussions() {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL) return parsed.items;
      }
    } catch (_) {}

    const base = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
    const [commentsRes, issuesRes] = await Promise.all([
      fetch(`${base}/issues/comments?sort=created&direction=desc&per_page=30`),
      fetch(`${base}/issues?state=all&sort=updated&per_page=50`)
    ]);
    if (!commentsRes.ok || !issuesRes.ok) return [];

    const [comments, issues] = await Promise.all([commentsRes.json(), issuesRes.json()]);
    const issueMap = new Map(issues.map((i) => [i.url, i]));

    const items = [];
    for (const c of comments) {
      if (items.length >= MAX_RECENT) break;
      const user = c.user && c.user.login;
      if (!user || user === OWNER_LOGIN || (c.user && c.user.type === 'Bot')) continue;
      let issue = issueMap.get(c.issue_url);
      if (!issue && c.issue_url) {
        try {
          const r = await fetch(c.issue_url);
          if (r.ok) {
            issue = await r.json();
            issueMap.set(c.issue_url, issue);
          }
        } catch (_) {}
      }
      const meta = parseIssueMeta(issue);
      if (!meta) continue;
      items.push({
        date: String(c.created_at || '').slice(0, 10),
        game: meta.game,
        puzzle: meta.puzzle,
        cardTitle: meta.cardTitle,
        text: summarizeComment(c.body, meta.cardTitle),
        user,
        url: c.html_url
      });
    }

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
    } catch (_) {}
    return items;
  }

  if (mount) {
    fetch('assets/data/changelog.json', { cache: 'no-cache' })
      .then((r) => r.json())
      .then((data) => {
        mount.innerHTML = (data.days || []).map(renderDay).join('');
      })
      .catch(() => {
        mount.innerHTML = '<p class="cl-summary">Could not load the activity log.</p>';
      });
  }

  if (recentMount) {
    fetchRecentDiscussions()
      .then((items) => {
        if (items.length) {
          recentMount.innerHTML = renderRecentDays(items);
        } else {
          recentMount.innerHTML = '<p class="cl-summary">No recent community comments found.</p>';
        }
      })
      .catch(() => {
        recentMount.innerHTML = '<p class="cl-summary">Could not load recent discussions.</p>';
      });
  }
})();
