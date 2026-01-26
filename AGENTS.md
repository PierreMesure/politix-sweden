# Politix - System Design Document

## Project Overview
Politix is a tool to track and visualize the social media presence of high-ranking politicians, starting with the Swedish Parliament (Riksdag). It monitors usage of X (formerly Twitter), Bluesky, and Mastodon.

## Architecture
The project is a monorepo containing a Python-based scraper and a Next.js frontend.

### 1. Data Collection (Scraper)
- **Location:** Root directory (or `scraper/` folder).
- **Language:** Python.
- **Source:** Wikidata (via SPARQL).
- **Social Platforms:**
  - **X (Twitter):** Check for handle existence (no API access for activity stats).
  - **Bluesky:** Fetch handle and date of last post.
  - **Mastodon:** Fetch handle and date of last post.
- **Output:** `data.json` (overwritten nightly).
- **Automation:** GitHub Actions workflow running nightly at 2:31 AM.

### 2. Frontend Application
- **Location:** `frontend/` directory.
- **Framework:** Next.js (Static Site Generation).
- **Styling:** Tailwind CSS.
- **Data Source:** Imports `data.json` directly.
- **Key Features:**
  - List of politicians with social media status.
  - "Active" status calculation (e.g., active if posted within the last 4 weeks).
  - Aggregated statistics by party (e.g., "% of Party X on Bluesky").

## Data Model (Target JSON Structure)
```json
[
  {
    "id": "Q...",
    "name": "Politician Name",
    "party": "Party Name",
    "social": {
      "x": "handle", 
      "bluesky": { "handle": "handle.bsky.social", "last_post": "2025-01-01" },
      "mastodon": { "handle": "@user@instance", "last_post": "2025-01-02" }
    }
  }
]
```

## Next Steps
1. **Scaffold Project:** Initialize Next.js app and Python environment.
2. **Implement Scraper:** Write SPARQL query and platform integration logic.
3. **Build Frontend:** Create UI components and logic to parse `data.json`.
4. **Setup Automation:** Configure GitHub Actions.
