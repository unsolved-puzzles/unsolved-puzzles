// Activity Log: render the day-grouped changelog on the main page.
(function () {
  const mount = document.getElementById('changelog-timeline');
  if (!mount) return;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));

  const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
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
    const body = (it.kind === 'Puzzle')
      ? `<a class="cl-puzzle" href="${esc(it.url)}">${esc(it.puzzle)}</a>`
      : `<span class="cl-puzzle">${esc(it.puzzle)}</span>
      &middot; <a href="${esc(it.url)}">${esc(it.text)}</a>`;
    return `
    <li class="cl-item">
      <span class="cl-tag" data-game="${esc(it.game)}">${esc(it.game)}</span>
      <span class="cl-kind" data-kind="${esc(it.kind)}">${esc(it.kind)}</span>
      ${body}
      <a class="cl-user" href="https://github.com/${esc(it.user)}" target="_blank" rel="noopener">${esc(it.user)}</a>
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

  fetch('assets/data/changelog.json', { cache: 'no-cache' })
    .then((r) => r.json())
    .then((data) => {
      mount.innerHTML = (data.days || []).map(renderDay).join('');
    })
    .catch(() => {
      mount.innerHTML = '<p class="cl-summary">Could not load the activity log.</p>';
    });
})();
