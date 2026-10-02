const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { contentFingerprint, jsonFingerprint, localDate, updateHtmlDate, updateSitemapDates, updatedPages, stageSafeContents } = require('./update-page-dates.cjs');

const root = path.resolve(__dirname, '..');
const page = 'blue-prince/bookshop-compartment.html';
const original = fs.readFileSync(path.join(root, ...page.split('/')), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

test('styling, dates, dimensions, icons, scripts and formatting do not refresh content dates', () => {
    const changed = original.replace('style.css?v=8', 'style.css?v=99')
        .replace('main.js?v=5', 'main.js?v=99')
        .replace('width="1913"', 'width="2000"')
        .replace('class="puzzle-title"', 'class="puzzle-title new-style"')
        .replace('favicon.png', 'new-favicon.png')
        .replace('<h1', '<!-- Layout change -->\n<h1');
    const updated = updateHtmlDate(changed, '2026-10-02').html;
    assert.equal(contentFingerprint(original), contentFingerprint(updated));
});

test('substantive text, evidence links and finding statuses refresh dates', () => {
    for (const changed of [
        original.replace('A modeled space hides', 'A hidden space lies'),
        original.replace('data-status="confirmed"', 'data-status="tentative"'),
        original.replace('href="https://github.com/unsolved-puzzles/unsolved-puzzles/discussions"', 'href="https://github.com/unsolved-puzzles/unsolved-puzzles/issues"'),
    ]) {
        assert.notEqual(changed, original);
        assert.notEqual(contentFingerprint(original), contentFingerprint(changed));
    }
});

test('visible date, structured date and sitemap stay synchronized without changing content', () => {
    const date = '2026-10-02';
    const updated = updateHtmlDate(original, date);
    assert(updated.html.includes(`datetime="${date}">2 October 2026`));
    assert(updated.html.includes(`"dateModified": "${date}"`));
    assert.equal(contentFingerprint(updated.html), contentFingerprint(original));
    const xml = updateSitemapDates(sitemap, new Map([[updated.url, date]]));
    assert(xml.includes(`<loc>${updated.url}</loc>\n    <lastmod>${date}</lastmod>`) ||
        xml.includes(`<loc>${updated.url}</loc>\r\n    <lastmod>${date}</lastmod>`));
    assert.throws(() => updateSitemapDates(sitemap, new Map([['https://example.invalid/missing', date]])));
    assert.throws(() => updateHtmlDate(original, '2026-02-30'));
});

test('JSON key ordering and whitespace are ignored, but maintained data changes count', () => {
    assert.equal(jsonFingerprint('{"a":1,"b":{"c":2}}'), jsonFingerprint('{ "b": { "c": 2 }, "a": 1 }'));
    assert.notEqual(jsonFingerprint('{"a":[1,2]}'), jsonFingerprint('{"a":[2,1]}'));
    assert.equal(localDate(new Date(2026, 0, 3, 12)), '2026-01-03');
});

test('fully staged CRLF files preserve their line endings; partial staging is rejected', () => {
    assert.equal(stageSafeContents('before\n', 'before\r\n', 'after\n', 'page.html'), 'after\r\n');
    assert.equal(stageSafeContents('before\n', 'before\n', 'after\n', 'page.html'), 'after\n');
    assert.throws(() => stageSafeContents('staged\n', 'unstaged\n', 'edited\n', 'page.html'), /partially staged/);
});

test('staged content and shared data update only their affected pages', () => {
    const before = new Map([[page, Buffer.from(original)], ['index.html', Buffer.from(original)],
        ['assets/data/changelog.json', Buffer.from('{"days":[]}')],
        ['roles.json', Buffer.from('{}')],
        ['assets/data/room-coordinate-lookup.v1.json', Buffer.from('{}')]]);
    const staged = new Map(before);
    staged.set(page, Buffer.from(original.replace('A modeled space hides', 'A hidden space lies')));
    const readBefore = file => before.get(file) || null;
    const readStaged = file => {
        assert(staged.has(file), file);
        return staged.get(file);
    };
    assert.deepEqual([...updatedPages([page], [page], readBefore, readStaged, root)], [page]);
    staged.set('assets/data/changelog.json', Buffer.from('{"days":[{"date":"2026-10-02"}]}'));
    assert.deepEqual([...updatedPages(['assets/data/changelog.json'], [page], readBefore, readStaged, root)], ['index.html']);
    staged.set('roles.json', Buffer.from('{"role":"claimed"}'));
    assert.deepEqual([...updatedPages(['roles.json'], [page], readBefore, readStaged, root)], ['index.html']);
    staged.set('assets/data/room-coordinate-lookup.v1.json', Buffer.from('{"room":"changed"}'));
    assert.deepEqual([...updatedPages(['assets/data/room-coordinate-lookup.v1.json'], [page], readBefore, readStaged, root)], ['blue-prince/true-draft.html']);
});

test('changed content screenshots refresh their pages, but decorative hero assets do not', () => {
    const screenshot = 'assets/img/blue-prince-bookshop-compartment-seam.png';
    const hero = 'assets/img/blue-prince-hero-banner.png';
    const readBefore = file => file === page ? Buffer.from(original) : Buffer.from('before');
    const readStaged = file => file === page ? Buffer.from(original) : Buffer.from('after');
    assert.deepEqual([...updatedPages([screenshot], [page], readBefore, readStaged, root)], [page]);
    assert.deepEqual([...updatedPages([hero], [page], readBefore, readStaged, root)], []);
});
