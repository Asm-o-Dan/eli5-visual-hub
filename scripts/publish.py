import os
import sys
import json
import subprocess
import shutil
import argparse
from datetime import date

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_FILE = os.path.join(REPO_DIR, "data", "topics.json")
ARTIFACTS_DIR = os.path.join(REPO_DIR, "artifacts")
INDEX_FILE = os.path.join(REPO_DIR, "index.html")

def publish(file_path, title, description, category="Architecture", tags=None):
    if tags is None:
        tags = ["ELI5", "Visual"]
    elif isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    if not os.path.exists(file_path):
        print(f"Error: Source file {file_path} not found.")
        sys.exit(1)

    filename = os.path.basename(file_path)
    slug = os.path.splitext(filename)[0]
    dest_path = os.path.join(ARTIFACTS_DIR, filename)

    # Copy if different path
    if os.path.abspath(file_path) != os.path.abspath(dest_path):
        shutil.copy2(file_path, dest_path)
        print(f"Copied {file_path} -> {dest_path}")

    # Update topics.json
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    topics = []
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                topics = json.load(f)
        except Exception:
            topics = []

    # Check if entry exists and update, or prepend
    existing = next((t for t in topics if t.get("id") == slug or t.get("file") == f"artifacts/{filename}"), None)
    entry = {
        "id": slug,
        "title": title,
        "description": description,
        "category": category,
        "tags": tags,
        "date": str(date.today()),
        "file": f"artifacts/{filename}"
    }

    if existing:
        topics.remove(existing)
    topics.insert(0, entry)

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(topics, f, indent=2, ensure_ascii=False)
    print(f"Updated {DATA_FILE}")

    # Git commit & push
    try:
        subprocess.run(["git", "add", "."], cwd=REPO_DIR, check=True)
        commit_msg = f"feat(eli5): add {title} ({slug})"
        subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_DIR, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=REPO_DIR, check=True)
        print(f"\nSuccessfully pushed to GitHub!")
        print(f"Artifact file: artifacts/{filename}")
        print(f"GitHub Pages URL: https://asm-o-dan.github.io/eli5-visual-hub/artifacts/{filename}")
        print(f"Main Hub URL:     https://asm-o-dan.github.io/eli5-visual-hub/")
    except subprocess.CalledProcessError as e:
        print(f"Warning: Git command failed: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Publish an ELI5 HTML visual artifact to GitHub Pages hub")
    parser.add_argument("file", help="Path to HTML artifact")
    parser.add_argument("--title", required=True, help="Title of the visual explainer")
    parser.add_argument("--desc", required=True, help="Short description (1-2 sentences)")
    parser.add_argument("--category", default="Architecture", help="Category (e.g. Data Pipelines, AI, Backend)")
    parser.add_argument("--tags", default="ELI5,Visual", help="Comma-separated tags")

    args = parser.parse_args()
    publish(args.file, args.title, args.desc, args.category, args.tags)
