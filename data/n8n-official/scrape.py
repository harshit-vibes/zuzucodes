#!/usr/bin/env python3
"""Scrape n8n course documentation and save as markdown files."""

import requests
from bs4 import BeautifulSoup
from pathlib import Path
import json
import time

BASE_URL = "https://docs.n8n.io/courses"
OUTPUT_DIR = Path(__file__).parent

# Course structure
CHAPTERS = {
    "level-one": [
        ("chapter-1", "chapter-1/"),
        ("chapter-2", "chapter-2/"),
        ("chapter-3", "chapter-3/"),
        ("chapter-4", "chapter-4/"),
        ("chapter-5-1", "chapter-5/chapter-5.1/"),
        ("chapter-5-2", "chapter-5/chapter-5.2/"),
        ("chapter-5-3", "chapter-5/chapter-5.3/"),
        ("chapter-5-4", "chapter-5/chapter-5.4/"),
        ("chapter-5-5", "chapter-5/chapter-5.5/"),
        ("chapter-5-6", "chapter-5/chapter-5.6/"),
        ("chapter-5-7", "chapter-5/chapter-5.7/"),
        ("chapter-5-8", "chapter-5/chapter-5.8/"),
        ("chapter-6", "chapter-6/"),
        ("chapter-7", "chapter-7/"),
    ],
    "level-two": [
        ("chapter-1", "chapter-1/"),
        ("chapter-2", "chapter-2/"),
        ("chapter-3", "chapter-3/"),
        ("chapter-4", "chapter-4/"),
        ("chapter-5-0", "chapter-5/chapter-5.0/"),
        ("chapter-5-1", "chapter-5/chapter-5.1/"),
        ("chapter-5-2", "chapter-5/chapter-5.2/"),
        ("chapter-5-3", "chapter-5/chapter-5.3/"),
        ("chapter-6", "chapter-6/"),
    ],
}


def fetch_page(url: str) -> str:
    """Fetch page content."""
    headers = {"User-Agent": "Mozilla/5.0 (educational scraper)"}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.text


def extract_content(html: str) -> str:
    """Extract main content as markdown-ish text."""
    soup = BeautifulSoup(html, "html.parser")

    # Find main content area
    main = soup.find("main") or soup.find("article") or soup.find(class_="content")
    if not main:
        main = soup.body

    # Remove nav, sidebar, footer
    for tag in main.find_all(["nav", "aside", "footer", "script", "style"]):
        tag.decompose()

    # Extract text with basic structure
    lines = []
    for elem in main.find_all(["h1", "h2", "h3", "h4", "p", "li", "pre", "code"]):
        text = elem.get_text(strip=True)
        if not text:
            continue

        if elem.name == "h1":
            lines.append(f"# {text}\n")
        elif elem.name == "h2":
            lines.append(f"\n## {text}\n")
        elif elem.name == "h3":
            lines.append(f"\n### {text}\n")
        elif elem.name == "h4":
            lines.append(f"\n#### {text}\n")
        elif elem.name == "li":
            lines.append(f"- {text}")
        elif elem.name in ("pre", "code") and len(text) > 50:
            lines.append(f"\n```\n{text}\n```\n")
        else:
            lines.append(text)

    return "\n".join(lines)


def scrape_all():
    """Scrape all chapters."""
    structure = {"levels": {}}

    for level, chapters in CHAPTERS.items():
        level_dir = OUTPUT_DIR / level
        level_dir.mkdir(exist_ok=True)
        structure["levels"][level] = []

        for filename, path in chapters:
            url = f"{BASE_URL}/{level}/{path}"
            output_file = level_dir / f"{filename}.md"

            print(f"Fetching: {url}")
            try:
                html = fetch_page(url)
                content = extract_content(html)
                output_file.write_text(content)
                structure["levels"][level].append({"file": filename, "url": url})
                print(f"  Saved: {output_file.name}")
            except Exception as e:
                print(f"  Error: {e}")

            time.sleep(0.5)  # Be polite

    # Save structure
    (OUTPUT_DIR / "structure.json").write_text(json.dumps(structure, indent=2))
    print("\nDone! Structure saved to structure.json")


if __name__ == "__main__":
    scrape_all()
