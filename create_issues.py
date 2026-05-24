"""
Create GitHub Issues for finding cards, theory items, or puzzle cards.

Usage:
    python create_issues.py --type finding [--dry-run]
    python create_issues.py --type theory [--dry-run] [--only "Theory Title"]
    python create_issues.py --type puzzle [--dry-run]

Reads token from .env file (unsolved_puzzle_voting_github_token).
Deduplicates by title (state=all), so safe to re-run.
Puzzle issues encourage reactions for prioritisation.

Requires: pip install requests
"""
import argparse
import os
import re
import glob
import time
import requests

REPO_OWNER = "unsolved-puzzles"
REPO_NAME = "unsolved-puzzles"
API = "https://api.github.com"

LABELS = {
    "finding": {
        "name": "finding",
        "color": "d4af37",
        "description": "Sticky note thread - vote with reactions",
    },
    "theory": {
        "name": "theory",
        "color": "8e44ad",
        "description": "Theory thread - vote with reactions",
    },
    "puzzle": {
        "name": "puzzle",
        "color": "0075ca",
        "description": "Puzzle priority vote - reactions only",
    },
}


def slug_to_label(slug):
    """Convert a path slug like 'blue-prince/music-room' to 'Blue Prince - Music Room'."""
    parts = slug.replace("\\", "/").replace(".html", "").split("/")
    return " - ".join(part.replace("-", " ").title() for part in parts)


def get_cards(issue_type):
    """Extract finding cards, theory items, or puzzle cards."""
    items = []
    script_dir = os.path.dirname(os.path.abspath(__file__))

    if issue_type == "puzzle":
        index_pages = sorted(
            glob.glob(os.path.join(script_dir, "blue-prince/index.html"))
            + glob.glob(os.path.join(script_dir, "noita/index.html"))
        )
        for path in index_pages:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            game_dir = os.path.basename(os.path.dirname(path))
            game_name = game_dir.replace("-", " ").title()
            card_sections = re.split(
                r'(?=<(?:a|div)[^>]*class="game-card[\s"])', content
            )
            for section in card_sections:
                if "game-card-cta" in section:
                    continue
                if "badge-upcoming" in section:
                    continue
                href_match = re.search(r'href="([^"]+\.html)"', section)
                if not href_match:
                    continue
                m = re.search(
                    r'<h3 class="game-card-title">(.*?)</h3>\s*'
                    r'<p class="game-card-desc">(.*?)</p>',
                    section,
                    re.DOTALL,
                )
                if not m:
                    continue
                title_clean = re.sub(r"<[^>]+>", "", m.group(1)).strip()
                desc = re.sub(r"<[^>]+>", "", m.group(2)).strip()
                page_path = f"{game_dir}/{href_match.group(1).replace('.html', '')}"
                items.append({
                    "page": page_path,
                    "title": f"{game_name} - {title_clean}",
                    "card_title": title_clean,
                    "description": desc,
                })
        return items

    pages = sorted(
        glob.glob(os.path.join(script_dir, "blue-prince/*.html"))
        + glob.glob(os.path.join(script_dir, "noita/*.html"))
    )

    for path in pages:
        if "index" in path:
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        page_path = os.path.relpath(path, script_dir).replace("\\", "/").replace(".html", "")
        prefix = slug_to_label(page_path)

        if issue_type == "finding":
            matches = re.findall(
                r'<div class="finding-card"[^>]*>.*?<h3>(.*?)</h3>\s*<p>(.*?)</p>',
                content,
                re.DOTALL,
            )
            # Skip cards that already link to a specific issue
            pinned = set()
            for m in re.finditer(r'<div class="finding-card"[^>]*data-issue="(\d+)"[^>]*>.*?<h3>(.*?)</h3>', content, re.DOTALL):
                pinned.add(m.group(2).strip())
            for title, desc in matches:
                if title.strip() in pinned:
                    continue
                items.append({
                    "page": page_path,
                    "title": f"{prefix} - {title.strip()}",
                    "card_title": title.strip(),
                    "description": re.sub(r"<[^>]+>", "", desc.strip()),
                })

        elif issue_type == "theory":
            matches = re.findall(
                r'<div class="theory-item"[^>]*>.*?'
                r'<h3 class="theory-title">(.*?)</h3>\s*'
                r'<p class="theory-desc">(.*?)</p>',
                content,
                re.DOTALL,
            )
            # Skip items that already link to a specific issue
            pinned = set()
            for m in re.finditer(r'<div class="theory-item"[^>]*data-issue="(\d+)"[^>]*>.*?<h3 class="theory-title">(.*?)</h3>', content, re.DOTALL):
                pinned.add(m.group(2).strip())
            for title, desc in matches:
                if title.strip() in pinned:
                    continue
                items.append({
                    "page": page_path,
                    "title": f"{prefix} - {title.strip()}",
                    "card_title": title.strip(),
                    "description": re.sub(r"<[^>]+>", "", desc.strip()),
                })

    return items


def ensure_label(session, issue_type):
    """Create the label if it doesn't exist."""
    label_info = LABELS[issue_type]
    url = f"{API}/repos/{REPO_OWNER}/{REPO_NAME}/labels/{label_info['name']}"
    res = session.get(url)
    if res.status_code == 404:
        print(f"Creating label '{label_info['name']}'...")
        session.post(
            f"{API}/repos/{REPO_OWNER}/{REPO_NAME}/labels",
            json={
                "name": label_info["name"],
                "color": label_info["color"],
                "description": label_info["description"],
            },
        )
    else:
        print(f"Label '{label_info['name']}' already exists.")


def create_issues(session, items, issue_type, dry_run=False):
    """Create one issue per item."""
    label_name = LABELS[issue_type]["name"]

    # Check existing issues to avoid duplicates
    existing = set()
    page = 1
    while True:
        res = session.get(
            f"{API}/repos/{REPO_OWNER}/{REPO_NAME}/issues",
            params={"labels": label_name, "state": "all", "per_page": 100, "page": page},
        )
        issues = res.json()
        if not issues:
            break
        for issue in issues:
            existing.add(issue["title"].strip().lower())
        page += 1

    print(f"Found {len(existing)} existing {issue_type} issues.")

    created = 0
    skipped = 0
    for item in items:
        if item["title"].lower() in existing:
            skipped += 1
            continue

        if issue_type == "finding":
            body = (
                f"**Page:** [{item['page']}](https://unsolved-puzzles.github.io/unsolved-puzzles/{item['page']}.html)\n"
                f"**Finding:** {item['card_title']}\n"
                f"**Description:** {item['description']}\n\n"
                f"---\n\n"
                f"React with \U0001F44D or \U0001F44E to vote on this finding.\n"
                f"Comment below to discuss."
            )
        elif issue_type == "theory":
            body = (
                f"**Page:** [{item['page']}](https://unsolved-puzzles.github.io/unsolved-puzzles/{item['page']}.html)\n"
                f"**Theory:** {item['card_title']}\n"
                f"**Description:** {item['description']}\n\n"
                f"---\n\n"
                f"React with \U0001F44D if you think this theory is promising, "
                f"\U0001F44E if you think it's unlikely.\n"
                f"Comment below to discuss evidence for or against."
            )
        else:  # puzzle
            body = (
                f"**Page:** [{item['page']}](https://unsolved-puzzles.github.io/unsolved-puzzles/{item['page']}.html)\n"
                f"**Puzzle:** {item['card_title']}\n"
                f"**Description:** {item['description']}\n\n"
                f"---\n\n"
                f"React with \U0001F44D or \U0001F44E to help prioritize this puzzle.\n"
                f"Comment below to discuss."
            )

        if dry_run:
            print(f"  [DRY RUN] Would create: {item['title']}")
            created += 1
            continue

        res = session.post(
            f"{API}/repos/{REPO_OWNER}/{REPO_NAME}/issues",
            json={
                "title": item["title"],
                "body": body,
                "labels": [label_name],
            },
        )

        if res.status_code == 201:
            issue_number = res.json()["number"]
            print(f"  Created #{issue_number}: {item['title']}")
            created += 1
        else:
            print(f"  ERROR ({res.status_code}): {item['title']} - {res.text[:100]}")

        # Rate limit: GitHub allows 30 requests/min for issue creation
        time.sleep(2.5)

    print(f"\nDone: {created} created, {skipped} skipped (already exist).")


def load_token():
    """Read token from .env file."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("unsolved_puzzle_voting_github_token"):
                value = line.split("=", 1)[1].strip().strip("'\"")
                return value
    raise ValueError("Token not found in .env")


def main():
    parser = argparse.ArgumentParser(description="Create GitHub issues for finding cards or theory items")
    parser.add_argument("--type", choices=["finding", "theory", "puzzle"], required=True, help="Type of issues to create")
    parser.add_argument("--dry-run", action="store_true", help="Preview without creating")
    parser.add_argument("--only", type=str, help="Only create issue for this exact card/theory title (substring match)")
    args = parser.parse_args()

    token = load_token()

    session = requests.Session()
    session.headers.update({
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "unsolved-puzzles-issue-creator",
    })

    items = get_cards(args.type)
    print(f"Found {len(items)} {args.type} items across all pages.\n")

    if args.only:
        items = [i for i in items if args.only.lower() in i["card_title"].lower()]
        if not items:
            print(f"No {args.type} matching '{args.only}' found.")
            return
        print(f"Filtered to {len(items)} item(s) matching '{args.only}'.\n")

    if not args.dry_run:
        ensure_label(session, args.type)

    create_issues(session, items, args.type, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
