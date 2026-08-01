"""Generate Noita puzzle HTML pages from _draft-new-puzzles.json (mirrors cauldron.html)."""
import html
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
data = json.loads((HERE / "_draft-new-puzzles.json").read_text(encoding="utf-8"))

STATUS_ORDER = ["confirmed", "tentative", "debunked"]
RANK_CLASS = {"Established": "high", "Promising": "medium", "Speculative": "low"}
PAGE_STATUS = {"unsolved": ("unsolved", "Unsolved"), "debated": ("unsolved", "Debated"),
               "teaser": ("upcoming", "Teaser")}


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")


def et(s):  # escape element text
    return html.escape(str(s), quote=False)


def ea(s):  # escape attribute value
    return html.escape(str(s), quote=True)


def render_context(paras):
    out = []
    for i, p in enumerate(paras):
        mt = "" if i == 0 else ' style="margin-top: var(--space-md);"'
        out.append(f"            <p{mt}>{et(p)}</p>")
    return "\n".join(out)


def render_findings(slug, findings):
    cards = []
    for f in findings:
        st = f["status"]
        link = ""
        if f.get("link"):
            L = f["link"]
            link = (f' <a href="{ea(L["url"])}" target="_blank" '
                    f'title="{ea(L.get("title", "View full photo"))}">&#x1F4F7; {et(L.get("label", "Full photo"))}</a>')
        cards.append(f"""            <div class="finding-card" data-status="{ea(st)}" id="finding-{slugify(f['title'])}">
                <span class="finding-card-status {ea(st)}">{et(st.capitalize())}</span>
                <h3>{et(f['title'])}</h3>
                <p>{et(f['text'])}{link}</p>
                <div class="finding-card-meta">
                    <span>Source: {et(f.get('source', 'Unknown'))}</span>
                </div>
            </div>""")
    cta = """            <a href="https://github.com/unsolved-puzzles/unsolved-puzzles/issues/new?template=new-finding.yml" target="_blank" class="finding-card finding-card-cta">
                <h3>+ Submit a New Finding</h3>
                <p>Discovered something new? Report it here.</p>
            </a>"""
    return "\n".join(cards) + "\n" + cta


def render_filters(findings):
    present = [s for s in STATUS_ORDER if any(f["status"] == s for f in findings)]
    btns = ['            <button class="filter-btn active" data-filter="all">All Findings</button>']
    for s in present:
        btns.append(f'            <button class="filter-btn" data-filter="{s}">{s.capitalize()}</button>')
    return "\n".join(btns)


def render_theories(theories):
    items = []
    for t in theories:
        cls = RANK_CLASS.get(t["rank"], "low")
        explains = ",".join("finding-" + slugify(x) for x in t.get("explains", []))
        src = ""
        if t.get("source"):
            src = (f'\n            <span style="display:block; margin-top:0.6rem; '
                   f'color: var(--text-secondary); font-size: 0.82rem;">Source: {et(t["source"])}</span>')
        items.append(f"""        <div class="theory-item" data-explains="{ea(explains)}">
            <span class="theory-rank {cls}">{et(t['rank'])}</span>
            <h3 class="theory-title">{et(t['title'])}</h3>
            <p class="theory-desc">{et(t['desc'])}{src}</p>
        </div>""")
    cta = """        <a href="https://github.com/unsolved-puzzles/unsolved-puzzles/issues/new?template=new-theory.yml" target="_blank" class="theory-item theory-item-cta">
            <h3 class="theory-title">+ Submit a New Theory</h3>
            <p class="theory-desc">Have a theory or idea to test? Share it.</p>
        </a>"""
    return "\n".join(items) + "\n" + cta


TOOL_ICON = ('<svg class="resource-link-icon" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2">'
             '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
             '<line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>'
             '<line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>')


def render_tools(tools):
    cards = []
    for t in tools:
        author = ""
        if t.get("author"):
            date = f" &middot; {et(t['date'])}" if t.get("date") else ""
            author = f'\n                    <span class="resource-author"><strong>{et(t["author"])}</strong>{date}</span>'
        cards.append(f"""                <a href="{ea(t['url'])}" target="_blank" class="resource-link tool">
                    {TOOL_ICON}
                    <h4>{et(t['title'])}</h4>
                    <p>{et(t['desc'])}</p>{author}
                </a>""")
    cards.append("""                <a href="https://github.com/unsolved-puzzles/unsolved-puzzles/issues/new?template=community-resource.yml" target="_blank" class="resource-link resource-link-cta">
                    <h4>+ Share a Community Resource</h4>
                    <p>Know a tool, guide, dataset, or reference that helps? Submit it.</p>
                </a>""")
    return f"""    <section class="resources-section">
        <h2 class="section-title">Tools &amp; Guides</h2>
        <div class="resource-category">
            <div class="resource-category-header tool">
                <span class="resource-category-icon">&#x1F527;</span>
                <h3>Tools &amp; Guides</h3>
            </div>
            <div class="resource-category-items">
{chr(10).join(cards)}
            </div>
        </div>
    </section>
"""


def page_html(p):
    status_cls, status_txt = PAGE_STATUS.get(p["status"], ("unsolved", "Unsolved"))
    img_style = ""
    op = p.get("hero_object_position")
    opac = p.get("hero_opacity")
    decls = []
    if op:
        decls.append(f"object-position: {op};")
    if opac is not None:
        decls.append(f"opacity: {opac};")
    if decls:
        img_style = f' style="{ea(" ".join(decls))}"'
    fade_style = ""
    dim = p.get("hero_fade_dim")
    if dim is not None:
        a1, a2 = 0.15 * dim, 0.55 * dim
        fade_style = (f' style="background: linear-gradient(to bottom, '
                      f'rgba(15, 15, 26, {a1:.3f}) 0%, rgba(15, 15, 26, {a2:.3f}) 60%, '
                      f'var(--bg-primary) 100%);"')
    tools_section = render_tools(p["tools"]) if p.get("tools") else ""
    return f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{et(p['title'])} | Noita | Unsolved Puzzles</title>
    <meta name="description" content="{ea(p['subtitle'])}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/css/style.css?v=4">
</head>
<body class="votes-loading">
    <canvas id="game-atmosphere"></canvas>

    <!-- Hero Banner -->
    <div class="game-hero-banner">
        <img src="{ea(p['hero_image'])}" alt="{ea(p['title'])}" class="game-hero-img"{img_style}>
        <div class="game-hero-fade"{fade_style}></div>
    </div>

    <header class="site-header">
        <div class="header-inner">
            <a href="../" class="logo">
                <span class="logo-icon">🔍</span>
                <span class="logo-text">Unsolved Puzzles</span>
            </a>
            <nav class="header-nav">
                <a href="../">All Games</a>
                <a href="./">Noita</a>
                <a href="https://github.com/unsolved-puzzles/unsolved-puzzles/discussions" target="_blank">Discuss</a>
                <a href="https://github.com/unsolved-puzzles/unsolved-puzzles/blob/main/README.md" target="_blank">Help</a>
            </nav>
        </div>
    </header>

    <!-- Puzzle Header -->
    <section class="puzzle-header">
        <p class="puzzle-breadcrumb"><a href="../">Home</a> / <a href="./">Noita</a> / {et(p['title'])}</p>
        <h1 class="puzzle-title">{et(p['title'])}</h1>
        <p class="puzzle-subtitle">{et(p['subtitle'])}</p>
        <span class="puzzle-status {status_cls}">{et(status_txt)}</span>
    </section>

    <!-- Context -->
    <section class="findings-section">
        <h2 class="section-title">What We Know</h2>
        <div style="max-width: 700px; margin: 0 auto var(--space-xl); color: var(--text-secondary); font-size: 0.95rem; line-height: 1.8;">
{render_context(p['context'])}
        </div>

        <!-- Filters -->
        <div class="findings-filters">
{render_filters(p['findings'])}
        </div>

        <!-- Findings Grid -->
        <div class="findings-grid">
{render_findings(p['slug'], p['findings'])}
        </div>
    </section>

    <!-- Theories -->
    <section class="theories-section">
        <h2 class="section-title">Theories (Ranked)</h2>
{render_theories(p['theories'])}
    </section>

{tools_section}
    <!-- Discussion -->
    <section class="discussion-section">
        <h2 class="section-title">Discussion</h2>
        <p style="text-align: center; color: var(--text-secondary); margin-bottom: var(--space-lg);">
            Comments powered by <a href="https://giscus.app" target="_blank">giscus</a>. Uses GitHub Discussions.
        </p>
        <script src="https://giscus.app/client.js"
            data-repo="unsolved-puzzles/unsolved-puzzles"
            data-repo-id="R_kgDOSTBzlg"
            data-category="Announcements"
            data-category-id="DIC_kwDOSTBzls4C8Pva"
            data-mapping="pathname"
            data-strict="0"
            data-reactions-enabled="1"
            data-emit-metadata="0"
            data-input-position="top"
            data-theme="dark_dimmed"
            data-lang="en"
            data-loading="lazy"
            crossorigin="anonymous"
            async>
        </script>
    </section>

    <footer class="site-footer">
        <p>Built by the community. <a href="https://github.com/unsolved-puzzles/unsolved-puzzles">View on GitHub</a></p>
        <p class="footer-tagline">"Noita: the one who knows."</p>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>
    <script src="../assets/js/main.js?v=3"></script>
    <script src="../assets/js/votes.js?v=3"></script>
    <script src="../assets/js/red-strings.js?v=2"></script>
    <script src="../assets/js/noita-bg.js"></script>
</body>
</html>
"""


for p in data["puzzles"]:
    out = HERE / f"{p['slug']}.html"
    out.write_text(page_html(p), encoding="utf-8")
    print("wrote", out.name)
