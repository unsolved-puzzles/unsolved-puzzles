const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const base = new URL('https://unsolved-puzzles.github.io/unsolved-puzzles/');

function htmlFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        if (entry.name.startsWith('.')) return [];
        if (entry.isDirectory()) return htmlFiles(file);
        return entry.name.endsWith('.html') ? [file] : [];
    });
}

function attribute(tag, name) {
    const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
    assert(match, `Missing ${name}: ${tag}`);
    return match[1];
}

function localResource(url) {
    assert.equal(url.origin, base.origin);
    assert(url.pathname.startsWith(base.pathname));
    return path.join(root, ...decodeURIComponent(url.pathname.slice(base.pathname.length)).split('/'));
}

function imageSize(buffer) {
    if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
    }
    assert.equal(buffer.readUInt16BE(0), 0xffd8, 'Expected PNG or JPEG');
    let offset = 2;
    const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    while (offset < buffer.length) {
        assert.equal(buffer[offset++], 0xff, 'Invalid JPEG marker');
        while (buffer[offset] === 0xff) offset++;
        const marker = buffer[offset++];
        assert(marker !== 0xda && marker !== 0xd9, 'JPEG dimensions not found');
        const length = buffer.readUInt16BE(offset);
        if (frameMarkers.has(marker)) {
            return [buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3)];
        }
        offset += length;
    }
    assert.fail('JPEG dimensions not found');
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapEntries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];
const sitemapDates = new Map(sitemapEntries.map(match => [match[1], match[2]]));
const files = htmlFiles(root);
const urls = new Set();
const iconVersions = new Set();

for (const file of files) {
    const relative = path.relative(root, file);
    test(`${relative}: dates, schema, icons and image dimensions`, () => {
        const html = fs.readFileSync(file, 'utf8');
        const route = relative.split(path.sep).join('/').replace(/index\.html$/, '');
        const expectedUrl = new URL(route, base);
        urls.add(expectedUrl.href);
        const canonical = html.match(/<link rel="canonical"[^>]*>/);
        assert(canonical, 'Missing canonical');
        assert.equal(attribute(canonical[0], 'href'), expectedUrl.href);

        const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
        assert.equal(blocks.length, 1, 'Expected one page metadata block');
        const schema = JSON.parse(blocks[0][1]);
        assert.equal(schema['@context'], 'https://schema.org');
        assert.equal(schema['@type'], path.basename(file) === 'index.html' ? 'CollectionPage' : 'WebPage');
        assert.equal(schema.url, expectedUrl.href);
        const heading = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        assert(heading, 'Missing H1');
        assert.equal(schema.name, heading[1].replaceAll('&amp;', '&'));
        assert.match(schema.dateModified, /^\d{4}-\d{2}-\d{2}$/);
        const date = new Date(`${schema.dateModified}T00:00:00Z`);
        assert.equal(date.toISOString().slice(0, 10), schema.dateModified);
        assert(date.getTime() <= Date.now(), 'Update date is in the future');
        const visible = html.match(/<p class="page-updated">Last updated: <time datetime="([^"]+)">([^<]+)<\/time><\/p>/);
        assert(visible, 'Missing visible update date');
        assert.equal([...html.matchAll(/class="page-updated"/g)].length, 1);
        const footer = html.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/);
        assert(footer && footer[1].includes(visible[0]), 'Update date must appear in the footer');
        assert.equal(visible[1], schema.dateModified);
        assert.equal(visible[2], new Intl.DateTimeFormat('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
        }).format(date));
        assert.equal(sitemapDates.get(expectedUrl.href), schema.dateModified);

        const icons = [...html.matchAll(/<link rel="icon"[^>]*>/g)];
        assert.equal(icons.length, 2, 'Expected shared PNG and ICO icons');
        for (const [tag] of icons) {
            const iconUrl = new URL(attribute(tag, 'href'), expectedUrl);
            const version = iconUrl.searchParams.get('v');
            assert.match(version || '', /^[1-9]\d*$/, 'Icon URL needs a cache version');
            iconVersions.add(version);
            const icon = localResource(iconUrl);
            assert(fs.existsSync(icon), `Missing icon: ${icon}`);
            assert(['favicon.png', 'favicon.ico'].includes(path.basename(icon)));
            if (icon.endsWith('.png')) {
                assert.equal(attribute(tag, 'sizes'), '32x32');
                assert.deepEqual(imageSize(fs.readFileSync(icon)), [32, 32]);
            }
        }

        for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
            const size = ['width', 'height'].map(name => {
                const value = attribute(tag, name);
                assert.match(value, /^[1-9]\d*$/, `Invalid ${name}: ${tag}`);
                return Number(value);
            });
            const source = attribute(tag, 'src');
            if (source === 'https://github.com/${a.username}.png?size=32') {
                assert.deepEqual(size, [22, 22]);
            } else {
                const url = new URL(source, expectedUrl);
                if (url.origin === base.origin) {
                    assert.deepEqual(size, imageSize(fs.readFileSync(localResource(url))), source);
                } else if (url.hostname === 'blueprince.wiki.gg') {
                    assert.deepEqual(size, [512, 512], 'Browser-verified Room Directory size');
                } else {
                    assert.fail(`Verify dimensions for external image: ${source}`);
                }
            }
        }
    });
}

test('sitemap covers every page exactly once', () => {
    assert(files.length > 0);
    assert.equal(sitemapEntries.length, sitemapDates.size, 'Duplicate sitemap URL');
    assert.deepEqual([...sitemapDates.keys()].sort(), [...urls].sort());
});

test('all pages use the same favicon cache version', () => {
    assert.equal(iconVersions.size, 1);
});

test('ICO variants contain valid PNG images matching their directory dimensions', () => {
    const buffer = fs.readFileSync(path.join(root, 'assets', 'img', 'favicon.ico'));
    assert.equal(buffer.readUInt16LE(0), 0);
    assert.equal(buffer.readUInt16LE(2), 1);
    const count = buffer.readUInt16LE(4);
    assert.equal(count, 3);
    const sizes = [];
    for (let index = 0; index < count; index++) {
        const entry = 6 + 16 * index;
        const width = buffer[entry] || 256;
        const height = buffer[entry + 1] || 256;
        const length = buffer.readUInt32LE(entry + 8);
        const offset = buffer.readUInt32LE(entry + 12);
        assert(offset >= 6 + 16 * count && offset + length <= buffer.length);
        assert.deepEqual(imageSize(buffer.subarray(offset, offset + length)), [width, height]);
        sizes.push(width);
    }
    assert.deepEqual(sizes, [16, 32, 48]);
});
