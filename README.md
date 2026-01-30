# Politix-Sweden

Politix-Sweden is a tool designed to monitor and visualize the social media presence of high-ranking Swedish members of parliament (*Riksdagsledamöter*). It tracks activity across **X (formerly Twitter)**, **Bluesky**, and **Mastodon** to provide insights into how political communication is shifting across platforms.

The tool is inspired by a [similar initiative](https://politix.top/) by Maël Thomas in France and after getting started, I also discovered [leavex.eu](https://leavex.eu/) after I started, which has the explicit purpose of calling out politicians still on X.

The Swedish researcher Carl Heath has published [several articles](https://carlheath.se/tag/social-media/) on the risk of keeping the Swedish democratic debate on X and calls for politicians and journalists to exit the platform. The goal of Politix-Sweden is to accelerate this exit and to fuel the wider debate on where democratic debates happen in our digital society with quantitative data. Since it comes from Wikidata and has been thoroughly completed, it is available for anyone to reuse and I hope researchers and journalists find it interesting.

## Data & Provenance

### Where does the data come from?

- **Politician Metadata:** The list of politicians, their party affiliations, and social media handles are fetched directly from **Wikidata** using a SPARQL query.
- **Activity Data:** The "last post" dates are scraped or fetched via public APIs for each platform.
- **Accuracy:** Since handles are sourced from Wikidata, the data is only as accurate as its community-maintained source. Users are encouraged to click "Edit on Wikidata" in the dashboard to fix missing or incorrect information.

### Reusing `data.json`

The project exports a structured `data.json` file nightly. You are free to reuse this data for research or other visualizations.
- `id`: The Wikidata Q-identifier.
- `last_check`: ISO timestamp of the last time social data was successfully updated.
- `social`: Contains handles and `last_post` dates (ISO format, "closed", or "protected").

## Technical Usage

This project is a monorepo consisting of a Python scraper and a Next.js frontend.

### Prerequisites

- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [Node.js & npm](https://nodejs.org/)

### Scraper (Python)

The scraper manages its own virtual environment using `uv`.

1. **Setup:**

   ```bash
   uv sync
   ```

2. **Configuration:**
   Create a `.env` file in the root with your X credentials (if you intend to scrape X activity):

   ```env
   X1_USERNAME=your_username
   X1_EMAIL=your_email
   X1_PASSWORD=your_password
   ```

3. **Run:**

   ```bash
   uv run scraper.py
   ```

### Frontend (Next.js)

The frontend is located in the `frontend/` directory.

1. **Setup:**

   ```bash
   cd frontend
   npm install
   ```

2. **Run Development Server:**

   ```bash
   npm run dev
   ```

3. **Build Static Site:**

   ```bash
   npm run build
   ```

## License

Since the data is mostly from Wikidata, its license is CC0. Don't hesitate to link back to this project though.
The code source is under AGPLv3.
