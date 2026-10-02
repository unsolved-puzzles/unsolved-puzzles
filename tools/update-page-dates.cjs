const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const dataPages = {
    'assets/data/changelog.json': 'index.html',
    'roles.json': 'index.html',
    'assets/data/room-coordinate-lookup.v1.json': 'blue-prince/true-draft.html',
};

function editorialBody(html) {
    const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    assert(body, 'Page must have a body');
    return body[1]
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<(script|style|canvas)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<p class="page-updated">[\s\S]*?<\/p>/g, '')
        .replace(/<img\b[^>]*class="[^"]*\bgame-hero-img\b[^"]*"[^>]*>/g, '');
}

function contentFingerprint(html) {
    const body = editorialBody(html);
    const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const attributes = [...body.matchAll(/<[^>]+>/g)].flatMap(([tag]) =>
        [...tag.matchAll(/\b(href|src|alt|data-status|data-issue|data-explains)="([^"]*)"/g)]
            .map(([, name, value]) => [name, value]).sort(([left], [right]) => left.localeCompare(right)));
    return JSON.stringify([text, attributes]);
}

function jsonFingerprint(json) {
    function sorted(value) {
        if (Array.isArray(value)) return value.map(sorted);
        if (value !== null && typeof value === 'object') {
            return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
        }
        return value;
    }
    return JSON.stringify(sorted(JSON.parse(json)));
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function updateHtmlDate(html, date) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    const parsed = new Date(`${date}T00:00:00Z`);
    assert.equal(parsed.toISOString().slice(0, 10), date);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(blocks.length, 1, 'Add one page metadata block before enabling date updates');
    const schema = JSON.parse(blocks[0][1]);
    assert.equal(typeof schema.dateModified, 'string', 'Page metadata needs dateModified');
    assert.equal(typeof schema.url, 'string', 'Page metadata needs its canonical URL');
    const dates = [...html.matchAll(/<p class="page-updated">Last updated: <time datetime="([^"]+)">[^<]+<\/time><\/p>/g)];
    assert.equal(dates.length, 1, 'Add one visible footer date before enabling date updates');
    const label = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(parsed);
    html = html.replace(blocks[0][0], blocks[0][0].replace(
        /"dateModified"\s*:\s*"[^"]+"/, `"dateModified": "${date}"`));
    html = html.replace(dates[0][0], `<p class="page-updated">Last updated: <time datetime="${date}">${label}</time></p>`);
    return { html, url: schema.url };
}

function updateSitemapDates(sitemap, dates) {
    const found = new Set();
    const updated = sitemap.replace(/(<loc>([^<]+)<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/g,
        (match, before, url, after) => {
            if (!dates.has(url)) return match;
            assert(!found.has(url), `Duplicate sitemap entry: ${url}`);
            found.add(url);
            return `${before}${dates.get(url)}${after}`;
        });
    for (const url of dates.keys()) assert(found.has(url), `Add this page to sitemap.xml: ${url}`);
    return updated;
}

function stageSafeContents(staged, working, edited, file) {
    const normalized = text => text.replace(/\r\n/g, '\n');
    assert.equal(normalized(working), normalized(staged),
        `Cannot update partially staged ${file}. Fully stage it or update its dates manually before retrying.`);
    return working.includes('\r\n') ? normalized(edited).replace(/\n/g, '\r\n') : normalized(edited);
}

function updatedPages(changed, pages, readBefore, readStaged, root) {
    const targets = new Set();
    for (const file of changed) {
        if (file.endsWith('.html')) {
            const before = readBefore(file);
            if (before === null || contentFingerprint(before.toString('utf8')) !== contentFingerprint(readStaged(file).toString('utf8'))) {
                targets.add(file);
            }
        } else if (dataPages[file]) {
            const before = readBefore(file);
            if (before === null || jsonFingerprint(before.toString('utf8')) !== jsonFingerprint(readStaged(file).toString('utf8'))) {
                targets.add(dataPages[file]);
            }
        }
    }
    const changedAssets = new Set(changed.filter(file => file.startsWith('assets/img/')));
    if (changedAssets.size) {
        for (const file of pages) {
            const body = editorialBody(readStaged(file).toString('utf8'));
            for (const [, source] of body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
                if (/^(?:https?:|data:|\/\/)/.test(source)) continue;
                const resource = path.relative(root, path.resolve(root, path.dirname(file), ...source.split('/')))
                    .split(path.sep).join('/');
                if (changedAssets.has(resource)) {
                    const before = readBefore(resource);
                    if (before === null || !before.equals(readStaged(resource))) targets.add(file);
                }
            }
        }
    }
    return targets;
}

function main() {
    assert.deepEqual(process.argv.slice(2), ['--staged'], 'Usage: node tools/update-page-dates.cjs --staged');
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const git = (...args) => execFileSync('git', ['-C', root, ...args], { maxBuffer: 32 * 1024 * 1024 });
    const names = buffer => buffer.toString('utf8').split('\0').filter(Boolean);
    const changed = names(git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'));
    const pages = names(git('ls-files', '-z', '--', '*.html'));
    const previous = new Set(names(git('ls-tree', '-r', '--name-only', '-z', 'HEAD')));
    const readBefore = file => previous.has(file) ? git('show', `HEAD:${file}`) : null;
    const readStaged = file => git('show', `:${file}`);
    const targets = updatedPages(changed, pages, readBefore, readStaged, root);
    if (!targets.size) {
        console.log('Page dates unchanged: no substantive staged content changes.');
        return;
    }
    const date = localDate();
    const edits = new Map();
    const sitemapDates = new Map();
    for (const file of targets) {
        const updated = updateHtmlDate(readStaged(file).toString('utf8'), date);
        edits.set(file, updated.html);
        sitemapDates.set(updated.url, date);
    }
    edits.set('sitemap.xml', updateSitemapDates(readStaged('sitemap.xml').toString('utf8'), sitemapDates));
    for (const [file, edited] of edits) {
        const working = fs.readFileSync(path.join(root, ...file.split('/')), 'utf8');
        edits.set(file, stageSafeContents(readStaged(file).toString('utf8'), working, edited, file));
    }
    for (const [file, contents] of edits) fs.writeFileSync(path.join(root, ...file.split('/')), contents);
    git('add', '--', ...edits.keys());
    console.log(`Updated ${targets.size} page date(s) and sitemap.xml to ${date}.`);
}

module.exports = { contentFingerprint, jsonFingerprint, localDate, updateHtmlDate, updateSitemapDates, updatedPages, stageSafeContents };
if (require.main === module) main();
