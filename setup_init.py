import os
import json

base_dir = r"C:\Users\DaniilTuT\Documents\antigravity\eli5-visual-hub"

# 1. Workflow
wf_content = """name: Deploy GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
"""

os.makedirs(os.path.join(base_dir, ".github", "workflows"), exist_ok=True)
with open(os.path.join(base_dir, ".github", "workflows", "deploy-pages.yml"), "w", encoding="utf-8") as f:
    f.write(wf_content.strip() + "\n")

# 2. Initial Topics
topics = [
    {
        "id": "anthropic-eli5-concept",
        "title": "Anthropic ELI5: HTML is the New Markdown",
        "description": "How single-file HTML artifacts with responsive SVG diagrams deliver instant clarity without text walls.",
        "category": "Architecture & AI",
        "tags": ["Anthropic", "Claude", "SVG", "ELI5"],
        "date": "2026-08-23",
        "file": "artifacts/anthropic-eli5-concept.html"
    }
]

os.makedirs(os.path.join(base_dir, "data"), exist_ok=True)
with open(os.path.join(base_dir, "data", "topics.json"), "w", encoding="utf-8") as f:
    json.dump(topics, f, indent=2, ensure_ascii=False)

print("Workflow and topics initialized.")
