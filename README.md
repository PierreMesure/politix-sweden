# Politix Sweden - Is your MP on X, Bluesky or Mastodon?

## Project Overview

Politix is a tool to track and visualize the social media presence of high-ranking politicians, starting with the Swedish Parliament (Riksdag). It monitors usage of X (formerly Twitter), Bluesky, and Mastodon.

## Architecture

### 1. Data Collection (Scraper)

The data is collected from Wikidata using a Python scraper run every night by a Github Action.

To run the scraper, you need `uv`:

```bash
uv venv
source .venv/bin/activate
uv pip install .

python run scraper.py
```

### 2. Frontend Application

The web application is located in the `frontend` folder and written with NextJS and TailwindCSS. It fetches the data directly from the Github repository.

You can run the web app in dev mode using:

```bash
cd frontend
npm i
npm run dev
```
