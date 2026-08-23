import os

skill_dir = r"C:\Users\DaniilTuT\.gemini\config\skills\eli5-visual-explainer"
repo_dir = r"C:\Users\DaniilTuT\Documents\antigravity\eli5-visual-hub"

# 1. Blueprint template
blueprint = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>{{TITLE}}</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card: #131b2e;
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #38bdf8;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-purple: #a855f7;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: var(--bg);
      color: var(--text);
      padding: 16px;
      max-width: 800px;
      margin: 0 auto 60px;
    }
    .header-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--card-border);
    }
    .back-link {
      color: var(--accent);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 3px 8px;
      border-radius: 999px;
    }
    h1 {
      font-size: clamp(22px, 5vw, 32px);
      font-weight: 800;
      margin-bottom: 8px;
      line-height: 1.2;
    }
    p.lead {
      color: var(--muted);
      font-size: 15px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      margin-bottom: 24px;
    }
    @media (min-width: 600px) {
      .comparison-grid { grid-template-columns: 1fr 1fr; }
    }
    .box {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 18px;
    }
    .box.bad {
      border-left: 4px solid var(--accent-red);
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, var(--card) 100%);
    }
    .box.good {
      border-left: 4px solid var(--accent-green);
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, var(--card) 100%);
    }
    .box-title {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .box ul {
      list-style: none;
      font-size: 13.5px;
      color: var(--muted);
      line-height: 1.6;
    }
    .diagram-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .diagram-card h2 {
      font-size: 17px;
      font-weight: 700;
      margin-bottom: 14px;
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .pillars-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-top: 20px;
    }
    @media (min-width: 600px) {
      .pillars-grid { grid-template-columns: repeat(3, 1fr); }
    }
    .pillar {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 14px;
      text-align: center;
    }
    .pillar-num {
      font-size: 20px;
      font-weight: 800;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .pillar-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .pillar-desc {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="header-nav">
    <a href="../index.html" class="back-link">&larr; Back to Hub</a>
    <span class="badge">{{CATEGORY}}</span>
  </div>

  <h1>{{TITLE}}</h1>
  <p class="lead">{{DESCRIPTION}}</p>

  {{CONTENT}}
</body>
</html>
"""

with open(os.path.join(skill_dir, "resources", "html_blueprint.html"), "w", encoding="utf-8") as f:
    f.write(blueprint.strip() + "\n")

# 2. scripts/publish_eli5.py
publish_script = r'''import os
import sys
import json
import subprocess
import shutil
import argparse
from datetime import date

HUB_REPO_DIR = r"C:\Users\DaniilTuT\Documents\antigravity\eli5-visual-hub"
DATA_FILE = os.path.join(HUB_REPO_DIR, "data", "topics.json")
ARTIFACTS_DIR = os.path.join(HUB_REPO_DIR, "artifacts")

def deploy_artifact(source_path, title, description, category="Architecture", tags="ELI5,Visual"):
    if not os.path.exists(source_path):
        print(f"Error: HTML artifact not found at {source_path}")
        sys.exit(1)

    filename = os.path.basename(source_path)
    slug = os.path.splitext(filename)[0]
    dest_path = os.path.join(ARTIFACTS_DIR, filename)

    # 1. Copy to hub artifacts directory
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    if os.path.abspath(source_path) != os.path.abspath(dest_path):
        shutil.copy2(source_path, dest_path)

    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    # 2. Update topics catalog
    topics = []
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                topics = json.load(f)
        except Exception:
            topics = []

    # Remove duplicate if re-publishing
    topics = [t for t in topics if t.get("id") != slug and t.get("file") != f"artifacts/{filename}"]
    topics.insert(0, {
        "id": slug,
        "title": title,
        "description": description,
        "category": category,
        "tags": tag_list,
        "date": str(date.today()),
        "file": f"artifacts/{filename}"
    })

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(topics, f, indent=2, ensure_ascii=False)

    # 3. Git commit & push
    try:
        subprocess.run(["git", "add", "."], cwd=HUB_REPO_DIR, check=True)
        commit_msg = f"feat(eli5): add {title} ({slug})"
        subprocess.run(["git", "commit", "-m", commit_msg], cwd=HUB_REPO_DIR, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=HUB_REPO_DIR, check=True)
        
        pages_url = f"https://asm-o-dan.github.io/eli5-visual-hub/artifacts/{filename}"
        hub_url = "https://asm-o-dan.github.io/eli5-visual-hub/"
        print(f"SUCCESS: Published to GitHub Pages!")
        print(f"Direct Mobile Link: {pages_url}")
        print(f"Hub Dashboard Link: {hub_url}")
        return pages_url
    except subprocess.CalledProcessError as e:
        print(f"Warning: Git push failed: {e}")
        return f"file:///{dest_path.replace(os.sep, '/')}"

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Publish ELI5 visual artifact to GitHub Pages hub")
    parser.add_argument("file", help="Path to HTML artifact")
    parser.add_argument("--title", required=True, help="Title of explainer")
    parser.add_argument("--desc", required=True, help="Short description")
    parser.add_argument("--category", default="Architecture", help="Category")
    parser.add_argument("--tags", default="ELI5,Visual", help="Tags comma-separated")
    args = parser.parse_args()

    deploy_artifact(args.file, args.title, args.desc, args.category, args.tags)
'''

with open(os.path.join(skill_dir, "scripts", "publish_eli5.py"), "w", encoding="utf-8") as f:
    f.write(publish_script.strip() + "\n")

# 3. SKILL.md
skill_md = r'''---
name: eli5-visual-explainer
description: >-
  Use when the user asks to explain a complex topic, codebase, architecture, incident,
  or concept using the /eli5 visual HTML artifact method. Generates a self-contained,
  mobile-first HTML page with SVG diagrams and minimal text, and automatically publishes
  it to the private GitHub Pages hub for mobile viewing.
version: 1.0.0
author: Asm'o'Dan
tags: [eli5, visual, html, architecture, diagrams, mobile, github-pages]
---

# ELI5 Visual Explainer & Mobile Pages Hub

## Overview
Automates the Anthropic Claude Code **"HTML is the new Markdown"** paradigm.
Translates complex engineering problems, architectures, post-mortems, or abstract concepts into a single-file, mobile-first HTML artifact with rich SVG flowcharts, high-contrast visual blocks, and minimal text, then instantly deploys it to the `eli5-visual-hub` on GitHub Pages for instant smartphone viewing.

## Prerequisites
- Local clone of hub repo at `C:\Users\DaniilTuT\Documents\antigravity\eli5-visual-hub`.
- Python 3.x available in PATH.
- Git configured with push access to `origin main`.

## The 0.3-Second & Fisher-Price Design Rules
Every generated HTML artifact MUST follow these rules:
1. **Self-Contained Single File**: HTML + inline CSS + inline SVG only. Zero external CDN or external image dependencies.
2. **0.3-Second Rule**: Clear visual hierarchy where the core mental model is graspable in under 1 second via SVG diagrams and color codes (Green = solution/valid, Red = failure/bug, Blue/Purple = engine/data flow).
3. **Few Words (High Signal)**: Maximum 4-6 concise bullet points per card. No walls of text.
4. **Mobile First**: Viewport meta tag `viewport-fit=cover`, scalable SVGs (`viewBox`), minimum 14px body text, responsive grid layout.

## Workflow

### 1. Structure the Mental Model
Extract:
- **The Core Conflict / Problem**: What failed, was slow, or was misunderstood.
- **The Architecture Flow**: 3-4 steps from input to output.
- **The 3 Key Takeaways**: High-signal pillars.

### 2. Generate the Single-File HTML Artifact
Write the HTML file to the hub repository artifacts directory:
`C:\Users\DaniilTuT\Documents\antigravity\eli5-visual-hub\artifacts\<slug>.html`

Include:
- Navigation bar with back link to `../index.html`.
- Conflict comparison grid (`.box.bad` vs `.box.good`).
- Inline `<svg>` diagram with labeled nodes, arrows, and glowing badges.
- 3 numbered pillars or interactive toggle cards.

### 3. Deploy to GitHub Pages Hub
Run the publish script:
```powershell
python "C:\Users\DaniilTuT\.gemini\config\skills\eli5-visual-explainer\scripts\publish_eli5.py" "C:\Users\DaniilTuT\Documents\antigravity\eli5-visual-hub\artifacts\<slug>.html" --title "<Title>" --desc "<1-sentence summary>" --category "<Category>" --tags "<tag1,tag2>"
```

### 4. Output Direct Mobile Link
Always present the user with:
1. **Direct Mobile Link**: `https://asm-o-dan.github.io/eli5-visual-hub/artifacts/<slug>.html`
2. **Main Hub Catalog Link**: `https://asm-o-dan.github.io/eli5-visual-hub/`
3. **Local File Link**: Clickable markdown link to the generated local HTML file.

## Verification
- Run the python publisher script; ensure exit code 0.
- Verify `data/topics.json` has the newly registered topic.
- Confirm `git push origin main` completed.
'''

with open(os.path.join(skill_dir, "SKILL.md"), "w", encoding="utf-8") as f:
    f.write(skill_md.strip() + "\n")

print("Skill eli5-visual-explainer successfully created!")
