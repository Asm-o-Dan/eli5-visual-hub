import os
import json

base_dir = r"C:\Users\DaniilTuT\Documents\antigravity\eli5-visual-hub"

# 1. index.html
index_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>ELI5 Visual Hub — Architectural Explainers</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(20, 28, 48, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(35, 48, 80, 0.85);
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.25);
      --accent-green: #34d399;
      --accent-purple: #a855f7;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: radial-gradient(circle at 50% 0%, #151f38 0%, var(--bg) 75%);
      color: var(--text);
      min-height: 100vh;
      padding: 20px 16px 60px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header { text-align: center; margin-bottom: 28px; padding-top: 10px; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid var(--accent);
      color: var(--accent);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: clamp(26px, 5vw, 36px);
      font-weight: 800;
      line-height: 1.15;
      background: linear-gradient(135deg, #ffffff 40%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    p.subtitle {
      color: var(--text-muted);
      font-size: 15px;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.5;
    }
    .search-box {
      margin: 22px auto 28px;
      position: relative;
    }
    .search-box input {
      width: 100%;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--card-border);
      padding: 14px 18px;
      border-radius: 14px;
      color: var(--text);
      font-size: 15px;
      outline: none;
      transition: all 0.2s;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .search-box input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    @media (min-width: 640px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 20px;
      backdrop-filter: blur(12px);
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    .card:hover, .card:active {
      transform: translateY(-2px);
      border-color: var(--accent);
      background: var(--card-hover);
      box-shadow: 0 10px 30px rgba(56, 189, 248, 0.15);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .category-pill {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-green);
      background: rgba(52, 211, 153, 0.12);
      padding: 3px 8px;
      border-radius: 6px;
    }
    .date {
      font-size: 12px;
      color: var(--text-muted);
    }
    .card h2 {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    .card p.desc {
      font-size: 13.5px;
      color: var(--text-muted);
      line-height: 1.45;
      margin-bottom: 16px;
      flex-grow: 1;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tag {
      font-size: 11px;
      padding: 2px 7px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      color: #cbd5e1;
    }
    .btn-open {
      margin-top: 14px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(56, 189, 248, 0.1);
      color: var(--accent);
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid rgba(56, 189, 248, 0.2);
    }
    footer {
      text-align: center;
      margin-top: 40px;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">🚀 ELI5 Visual Hub</div>
      <h1>Visual Explainers</h1>
      <p class="subtitle">Architecture, engineering breakthroughs & deep concepts distilled into zero-noise visual HTML artifacts.</p>
      
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="🔍 Search topics, concepts, tags..." oninput="filterTopics()">
      </div>
    </header>

    <div class="grid" id="topicsGrid">
      <!-- Dynamically filled or static fallback -->
    </div>

    <footer>
      ⚡ Powered by Antigravity &bull; Single-file Visual Artifacts &bull; Auto-deployed to GitHub Pages
    </footer>
  </div>

  <script>
    const staticTopics = [
      {
        "id": "anthropic-eli5-concept",
        "title": "Anthropic ELI5: HTML is the New Markdown",
        "description": "How single-file HTML artifacts with responsive SVG diagrams deliver instant clarity without text walls.",
        "category": "Architecture & AI",
        "tags": ["Anthropic", "Claude", "SVG", "ELI5"],
        "date": "2026-08-23",
        "file": "artifacts/anthropic-eli5-concept.html"
      }
    ];

    async function loadTopics() {
      let topics = staticTopics;
      try {
        const res = await fetch('data/topics.json');
        if (res.ok) {
          topics = await res.json();
        }
      } catch (e) {
        console.log('Using static fallback');
      }
      window.allTopics = topics;
      renderTopics(topics);
    }

    function renderTopics(topics) {
      const grid = document.getElementById('topicsGrid');
      if (!topics || topics.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color:#94a3b8; grid-column:1/-1;">No visual explainers found.</p>';
        return;
      }
      grid.innerHTML = topics.map(t => `
        <a class="card" href="${t.file}">
          <div>
            <div class="card-top">
              <span class="category-pill">${t.category || 'General'}</span>
              <span class="date">${t.date || ''}</span>
            </div>
            <h2>${t.title}</h2>
            <p class="desc">${t.description}</p>
          </div>
          <div>
            <div class="tags">
              ${(t.tags || []).map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
            <div class="btn-open">
              View Visual Artifact <span>&rarr;</span>
            </div>
          </div>
        </a>
      `).join('');
    }

    function filterTopics() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      if (!window.allTopics) return;
      const filtered = window.allTopics.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q))) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
      renderTopics(filtered);
    }

    loadTopics();
  </script>
</body>
</html>
"""

with open(os.path.join(base_dir, "index.html"), "w", encoding="utf-8") as f:
    f.write(index_html.strip() + "\n")

# 2. Sample Artifact: anthropic-eli5-concept.html
artifact_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>ELI5: Anthropic HTML Visual Explainer</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card: #131b2e;
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #38bdf8;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-yellow: #f59e0b;
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
      display: flex;
      align-items: center;
      gap: 4px;
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
    .box li {
      margin-bottom: 6px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
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
      display: flex;
      align-items: center;
      gap: 8px;
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
    .interactive-panel {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 16px;
      padding: 18px;
      margin-top: 24px;
    }
    .interactive-title {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }
    .interactive-text {
      font-size: 13.5px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .prompt-box {
      background: rgba(0,0,0,0.5);
      border: 1px dashed rgba(255,255,255,0.2);
      border-radius: 10px;
      padding: 12px;
      font-family: monospace;
      font-size: 12.5px;
      color: #38bdf8;
      margin-top: 10px;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="header-nav">
    <a href="../index.html" class="back-link">&larr; Back to Hub</a>
    <span class="badge">ELI5 Visual Spec</span>
  </div>

  <h1>Anthropic ELI5: HTML is the New Markdown</h1>
  <p class="lead">Why Claude engineers replaced text walls with Fisher-Price style visual interactive artifacts.</p>

  <!-- 1. The Conflict -->
  <div class="comparison-grid">
    <div class="box bad">
      <div class="box-title">❌ Old Way: Markdown Wall</div>
      <ul>
        <li>⛔ 2,000 words of dense text</li>
        <li>⛔ Mind wanders after 15 seconds</li>
        <li>⛔ Invisible bugs and architectural leaks</li>
        <li>⛔ No visual hierarchy or mental model</li>
      </ul>
    </div>
    <div class="box good">
      <div class="box-title">✅ New Way: ELI5 HTML Artifact</div>
      <ul>
        <li>⚡ 0.3-second visual grasp</li>
        <li>⚡ Pure SVG diagrams with color flows</li>
        <li>⚡ 4-6 bullet points of high-signal truth</li>
        <li>⚡ Mobile-first & interactive anywhere</li>
      </ul>
    </div>
  </div>

  <!-- 2. The Vector Diagram -->
  <div class="diagram-card">
    <h2>📐 The Mental Model Pipeline</h2>
    <svg viewBox="0 0 700 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Background Grid Subtlety -->
      <rect width="700" height="220" rx="12" fill="#0f1629"/>
      
      <!-- Node 1: Complex System -->
      <rect x="25" y="60" width="160" height="100" rx="10" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      <text x="105" y="95" fill="#f8fafc" font-size="14" font-weight="700" text-anchor="middle">Complex Code</text>
      <text x="105" y="115" fill="#94a3b8" font-size="11" text-anchor="middle">5k LOC / Architecture</text>
      <text x="105" y="135" fill="#ef4444" font-size="11" font-weight="600" text-anchor="middle">🔥 Cognitive Overload</text>

      <!-- Arrow 1 -->
      <path d="M195 110 H250" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="4 4"/>
      <polygon points="255,110 247,105 247,115" fill="#38bdf8"/>
      <text x="225" y="98" fill="#38bdf8" font-size="11" font-weight="700" text-anchor="middle">/eli5</text>

      <!-- Node 2: AI Agent Engine -->
      <rect x="265" y="45" width="170" height="130" rx="12" fill="#1e1b4b" stroke="#818cf8" stroke-width="2"/>
      <text x="350" y="80" fill="#c7d2fe" font-size="13" font-weight="700" text-anchor="middle">🤖 AI Distillation</text>
      <rect x="280" y="95" width="140" height="24" rx="6" fill="#312e81"/>
      <text x="350" y="111" fill="#a5b4fc" font-size="10.5" text-anchor="middle">Vectorize Logic (SVG)</text>
      <rect x="280" y="125" width="140" height="24" rx="6" fill="#312e81"/>
      <text x="350" y="141" fill="#a5b4fc" font-size="10.5" text-anchor="middle">Filter 90% Noise</text>

      <!-- Arrow 2 -->
      <path d="M445 110 H500" stroke="#34d399" stroke-width="2.5"/>
      <polygon points="505,110 497,105 497,115" fill="#34d399"/>
      <text x="475" y="98" fill="#34d399" font-size="11" font-weight="700" text-anchor="middle">Deploy</text>

      <!-- Node 3: Single-File HTML -->
      <rect x="515" y="60" width="160" height="100" rx="10" fill="#064e3b" stroke="#10b981" stroke-width="2"/>
      <text x="595" y="95" fill="#ecfdf5" font-size="14" font-weight="700" text-anchor="middle">Instant Mental Model</text>
      <text x="595" y="115" fill="#a7f3d0" font-size="11" text-anchor="middle">Clean Visual Artifact</text>
      <text x="595" y="135" fill="#34d399" font-size="11" font-weight="700" text-anchor="middle">📱 0.3s Clarity on Phone</text>
    </svg>

    <!-- 3 Pillars -->
    <div class="pillars-grid">
      <div class="pillar">
        <div class="pillar-num">01</div>
        <div class="pillar-title">Declarative SVG</div>
        <div class="pillar-desc">No external broken images. Pure vector renders crisp on any device.</div>
      </div>
      <div class="pillar">
        <div class="pillar-num">02</div>
        <div class="pillar-title">Few Words</div>
        <div class="pillar-desc">Only high-signal constraints, numbers, and direct conclusions.</div>
      </div>
      <div class="pillar">
        <div class="pillar-num">03</div>
        <div class="pillar-title">Mobile Ready</div>
        <div class="pillar-desc">Viewed seamlessly on your phone screen via GitHub Pages.</div>
      </div>
    </div>
  </div>

  <!-- Prompt Blueprint -->
  <div class="interactive-panel">
    <div class="interactive-title">🚀 The Production Prompt Template</div>
    <div class="interactive-text">Every time this skill triggers, it generates an artifact following this formula:</div>
    <div class="prompt-box">
      Explain like I know nothing about this topic, using a single-file self-contained HTML artifact with responsive SVG diagrams, color-coded components, and minimal text.
    </div>
  </div>
</body>
</html>
"""

os.makedirs(os.path.join(base_dir, "artifacts"), exist_ok=True)
with open(os.path.join(base_dir, "artifacts", "anthropic-eli5-concept.html"), "w", encoding="utf-8") as f:
    f.write(artifact_html.strip() + "\n")

# 3. scripts/publish.py
publish_py = """import os
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
        print(f"\\nSuccessfully pushed to GitHub!")
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
"""

os.makedirs(os.path.join(base_dir, "scripts"), exist_ok=True)
with open(os.path.join(base_dir, "scripts", "publish.py"), "w", encoding="utf-8") as f:
    f.write(publish_py.strip() + "\n")

# 4. README.md
readme = """# 🚀 ELI5 Visual Hub

Interactive, mobile-first architectural explainers and deep technical mental models distilled into single-file visual HTML artifacts with responsive SVG diagrams and minimal text.

Based on the Anthropic Claude Code philosophy (*"HTML is the new Markdown"*).

## 📱 Mobile Viewing
Access the live hub on your phone:
- **Hub:** `https://asm-o-dan.github.io/eli5-visual-hub/`
- **Artifacts:** `https://asm-o-dan.github.io/eli5-visual-hub/artifacts/<slug>.html`

## 🛠 How to Publish New Artifacts
```bash
python scripts/publish.py artifacts/my-topic.html --title "My Topic" --desc "What it explains" --category "Backend" --tags "C#,Qdrant,Kafka"
```
"""

with open(os.path.join(base_dir, "README.md"), "w", encoding="utf-8") as f:
    f.write(readme.strip() + "\n")

print("All repository files generated successfully!")
