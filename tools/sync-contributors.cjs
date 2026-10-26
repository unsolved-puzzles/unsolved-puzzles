#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const GRAPHQL_QUERY = `{
  repository(owner: "unsolved-puzzles", name: "unsolved-puzzles") {
    issues(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        author { login }
        comments(first: 50) {
          nodes { author { login } }
        }
        reactions(first: 50) {
          nodes { user { login } }
        }
      }
    }
    discussions(first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        author { login }
        comments(first: 50) {
          nodes { author { login } }
        }
        reactions(first: 50) {
          nodes { user { login } }
        }
      }
    }
  }
}`;

function canSafelyStage(git, file) {
    try {
        const unstaged = git('diff', '--name-only', '--', file).toString('utf8').trim();
        const staged = git('diff', '--cached', '--name-only', '--', file).toString('utf8').trim();
        return !(unstaged && staged);
    } catch (_) {
        return true;
    }
}

function main() {
    const stageChanges = process.argv.includes('--staged');
    const root = path.resolve(__dirname, '..');
    const git = (...args) => execFileSync('git', ['-C', root, ...args], { maxBuffer: 32 * 1024 * 1024 });

    let raw;
    try {
        raw = execFileSync('gh', ['api', 'graphql', '--input', '-'], {
            input: JSON.stringify({ query: GRAPHQL_QUERY }),
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch (_) {
        console.log('[pre-commit] GitHub API unavailable, skipping contributor update');
        return;
    }

    const { data } = JSON.parse(raw);
    const repo = data && data.repository;
    if (!repo) return;

    const contributorsPath = path.join(root, 'CONTRIBUTORS');
    const indexPath = path.join(root, 'index.html');

    const existingContributors = fs.existsSync(contributorsPath)
        ? fs.readFileSync(contributorsPath, 'utf8').split(/\r?\n/).filter(Boolean)
        : [];
    const logins = new Set(existingContributors);

    for (const col of [repo.issues.nodes || [], repo.discussions.nodes || []]) {
        for (const item of col) {
            if (item.author && item.author.login) logins.add(item.author.login);
            for (const c of (item.comments && item.comments.nodes) || []) {
                if (c.author && c.author.login) logins.add(c.author.login);
            }
            for (const r of (item.reactions && item.reactions.nodes) || []) {
                if (r.user && r.user.login) logins.add(r.user.login);
            }
        }
    }

    const sortedLogins = [...logins].sort();
    const newContributorsContent = sortedLogins.join('\n') + '\n';
    const humanCount = sortedLogins.filter(l => l !== 'github-actions').length;

    const filesToStage = [];

    if (!stageChanges || canSafelyStage(git, 'CONTRIBUTORS')) {
        const prev = fs.existsSync(contributorsPath) ? fs.readFileSync(contributorsPath, 'utf8') : '';
        if (prev.replace(/\r\n/g, '\n') !== newContributorsContent) {
            fs.writeFileSync(contributorsPath, newContributorsContent, 'utf8');
            filesToStage.push('CONTRIBUTORS');
        }
    }

    if (!stageChanges || canSafelyStage(git, 'index.html')) {
        const indexHtml = fs.readFileSync(indexPath, 'utf8');
        const updatedIndex = indexHtml.replace(
            /(<span class="stat-number" id="stat-contributors">)\d+(<\/span>)/,
            `$1${humanCount}$2`
        );
        if (updatedIndex !== indexHtml) {
            fs.writeFileSync(indexPath, updatedIndex, 'utf8');
            filesToStage.push('index.html');
            console.log(`[pre-commit] Updating contributor count to ${humanCount}`);
        }
    }

    if (stageChanges && filesToStage.length > 0) {
        git('add', '--', ...filesToStage);
    }
}

if (require.main === module) main();
