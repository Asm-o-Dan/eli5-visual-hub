# -*- coding: utf-8 -*-
r"""
Ingest Lecture Script — Obsidian Vault to GitHub Pages ELI5 Visual Hub
Transforms or registers lectures from Obsidian reference notes
into production interactive modules in eli5-visual-hub and updates data/topics.json.
"""

import os
import sys
import re
import json
import argparse
import subprocess
from datetime import date

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_FILE = os.path.join(REPO_DIR, "data", "topics.json")
ARTIFACTS_DIR = os.path.join(REPO_DIR, "artifacts")

def parse_frontmatter(md_path):
    """Extract YAML frontmatter and H1 title from Markdown note."""
    if not os.path.exists(md_path):
        return {}
    
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    meta = {}
    fm_match = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if fm_match:
        yaml_text = fm_match.group(1)
        for line in yaml_text.splitlines():
            if ":" in line:
                key, val = line.split(":", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                meta[key] = val

    # H1 title
    h1_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if h1_match:
        meta["h1"] = h1_match.group(1).strip()
    
    return meta

def register_topic(slug, title, description, category="АиСД (3 курс)", tags=None, push=False):
    if tags is None:
        tags = ["АиСД", "Algorithms", "Data Structures", "Interactive", "Quiz"]
    elif isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    artifact_file = f"artifacts/{slug}.html"
    full_artifact_path = os.path.join(REPO_DIR, artifact_file)

    if not os.path.exists(full_artifact_path):
        print(f"Warning: Artifact file {full_artifact_path} does not exist yet!")

    # Read topics.json
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    topics = []
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                topics = json.load(f)
        except Exception:
            topics = []

    # Check if exists and update or insert at front
    existing = next((t for t in topics if t.get("id") == slug or t.get("file") == artifact_file), None)
    entry = {
        "id": slug,
        "title": title,
        "description": description,
        "category": category,
        "tags": tags,
        "date": str(date.today()),
        "file": artifact_file
    }

    if existing:
        topics.remove(existing)
    topics.insert(0, entry)

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(topics, f, indent=2, ensure_ascii=False)
    print(f"[OK] Updated {DATA_FILE} with '{title}' ({slug})")

    if push:
        try:
            print("[GIT] Staging and committing changes...")
            subprocess.run(["git", "add", "."], cwd=REPO_DIR, check=True)
            commit_msg = f"feat(aisd): add lecture {title} ({slug})"
            subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_DIR, check=True)
            print("[GIT] Pushing to origin main...")
            subprocess.run(["git", "push", "origin", "main"], cwd=REPO_DIR, check=True)
            print(f"\n[DEPLOYED] Live URL: https://asm-o-dan.github.io/eli5-visual-hub/{artifact_file}")
            print(f"[HUB URL]   Catalog:  https://asm-o-dan.github.io/eli5-visual-hub/")
        except subprocess.CalledProcessError as e:
            print(f"[GIT ERROR] Command failed: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest lecture notes from Obsidian to GitHub Pages hub")
    parser.add_argument("source", help="Path to markdown note in my-vault or slug name")
    parser.add_argument("--slug", help="HTML artifact slug (without .html)")
    parser.add_argument("--title", help="Custom title")
    parser.add_argument("--desc", help="Custom description")
    parser.add_argument("--category", default="АиСД (3 курс)", help="Category in hub")
    parser.add_argument("--tags", default="АиСД,Algorithms,Data Structures,Hash Tables,Interactive,Quiz", help="Comma-separated tags")
    parser.add_argument("--push", action="store_true", help="Automatically git commit and push to origin main")

    args = parser.parse_args()

    meta = {}
    if os.path.exists(args.source) and args.source.endswith(".md"):
        meta = parse_frontmatter(args.source)
        slug = args.slug or "aisd-lec1-hashing"
        title = args.title or meta.get("h1") or meta.get("aliases") or os.path.splitext(os.path.basename(args.source))[0]
        desc = args.desc or meta.get("description") or "Интерактивный конспект лекции с визуализацией и тестами."
    else:
        slug = args.slug or args.source
        title = args.title or slug
        desc = args.desc or "Интерактивный учебный модуль."

    register_topic(slug, title, desc, args.category, args.tags, args.push)
