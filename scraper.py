import json
import requests
import time
import asyncio
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from twikit import Client
from SPARQLWrapper import SPARQLWrapper, JSON

load_dotenv()

X_USERNAME = os.getenv("X_USERNAME")
X_EMAIL = os.getenv("X_EMAIL")
X_PASSWORD = os.getenv("X_PASSWORD")

async def get_x_client():
    if os.getenv("GITHUB_ACTIONS") == "true":
        print("Running in GitHub Actions, skipping X client initialization to avoid blocks.")
        return None

    if not X_USERNAME or not X_EMAIL or not X_PASSWORD:
        print("X credentials missing in .env")
        return None

    client = Client('en-US')
    cookies_path = 'cookies.json'

    try:
        if os.path.exists(cookies_path):
            with open(cookies_path, 'r') as f:
                data = json.load(f)
            if isinstance(data, list):
                cookies = {c['name']: c['value'] for c in data}
                with open(cookies_path, 'w') as f:
                    json.dump(cookies, f)
            client.load_cookies(cookies_path)
        else:
            await client.login(
                auth_info_1=X_USERNAME,
                auth_info_2=X_EMAIL,
                password=X_PASSWORD
            )
            client.save_cookies(cookies_path)
        return client
    except Exception as e:
        print(f"Error authenticating with X: {e}")
        return None

async def get_x_last_post(client, handle):
    if not client:
        return None
    try:
        try:
            user = await client.get_user_by_screen_name(handle)
        except Exception as e:
            err_msg = str(e).lower()
            if '404' in err_msg or 'not found' in err_msg or 'does not exist' in err_msg:
                return "closed"
            raise e

        if not user:
            return "closed"

        tasks = [
            client.get_user_tweets(user.id, 'Tweets', count=5),
            client.get_user_tweets(user.id, 'Replies', count=5)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_tweets = []
        for res in results:
            if res and not isinstance(res, Exception):
                all_tweets.extend(list(res))

        if all_tweets:
            def parse_date(date_str):
                try:
                    return datetime.strptime(date_str, '%a %b %d %H:%M:%S %z %Y')
                except Exception:
                    return None

            epoch_start = datetime(1970, 1, 1, tzinfo=timezone.utc)
            all_tweets.sort(key=lambda t: parse_date(t.created_at) or epoch_start, reverse=True)

            latest_tweet = all_tweets[0]
            dt = parse_date(latest_tweet.created_at)
            if dt:
                return dt.isoformat()
            return latest_tweet.created_at
    except Exception as e:
        print(f"Error fetching X for {handle}: {e}")
        if '404' in str(e):
            return "closed"
    return None

def get_bluesky_last_post(handle):
    try:
        url = f"https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor={handle}&limit=1"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            feed = data.get("feed", [])
            if feed:
                return feed[0]["post"]["indexedAt"]
    except Exception as e:
        print(f"Error fetching Bluesky for {handle}: {e}")
    return None

def get_mastodon_last_post(handle):
    try:
        if "@" not in handle:
            return None

        parts = handle.split("@")
        if len(parts) == 2:
            user, instance = parts
        elif len(parts) == 3:
            _, user, instance = parts
        else:
            return None

        lookup_url = f"https://{instance}/api/v1/accounts/lookup?acct={user}"
        response = requests.get(lookup_url, timeout=10)
        if response.status_code == 200:
            account_id = response.json().get("id")
            if account_id:
                statuses_url = f"https://{instance}/api/v1/accounts/{account_id}/statuses?limit=1"
                status_response = requests.get(statuses_url, timeout=10)
                if status_response.status_code == 200:
                    statuses = status_response.json()
                    if statuses:
                        return statuses[0]["created_at"]
    except Exception as e:
        print(f"Error fetching Mastodon for {handle}: {e}")
    return None

def get_politicians():
    sparql = SPARQLWrapper(
        "https://query.wikidata.org/sparql",
        agent="Politix/0.1 (https://github.com/PierreMesure/politix-new)",
    )
    with open("query.sparql", "r") as f:
        query = f.read()
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()

    politicians = []
    seen_ids = set()

    for result in results["results"]["bindings"]:
        p_id = result["mp"]["value"].split("/")[-1]
        if p_id in seen_ids:
            continue
        seen_ids.add(p_id)

        politician = {
            "id": p_id,
            "name": result["mpLabel"]["value"],
            "party": result["partyLabel"]["value"] if "partyLabel" in result else None,
            "last_check": None,
            "social": {
                "x": {
                    "handle": result["x"]["value"],
                    "last_post": "closed" if "xEnd" in result else None
                } if "x" in result else None,
                "bluesky": {
                    "handle": result["bluesky"]["value"],
                    "last_post": "closed" if "bskyEnd" in result else None
                } if "bluesky" in result else None,
                "mastodon": {
                    "handle": result["mastodon"]["value"],
                    "last_post": "closed" if "mastEnd" in result else None
                } if "mastodon" in result else None,
            },
        }
        politicians.append(politician)
    return politicians

def calculate_stats(politicians):
    def empty_stats():
        return {"active": 0, "inactive": 0, "closed": 0, "none": 0, "total": 0}

    def get_platform_stats(subset):
        res = {
            "all": empty_stats(),
            "x": empty_stats(),
            "bluesky": empty_stats(),
            "mastodon": empty_stats()
        }

        FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000
        now = datetime.now(timezone.utc)

        def is_active(last_post_iso):
            if not last_post_iso or last_post_iso == "closed":
                return False
            try:
                dt = datetime.fromisoformat(last_post_iso.replace('Z', '+00:00'))
                return (now - dt).total_seconds() * 1000 < FOUR_WEEKS_MS
            except Exception:
                return False

        for p in subset:
            res["all"]["total"] += 1
            for plat in ["x", "bluesky", "mastodon"]:
                res[plat]["total"] += 1

            any_active = False
            any_inactive = False
            any_closed = False

            for plat in ["x", "bluesky", "mastodon"]:
                data = p["social"][plat]
                if not data:
                    res[plat]["none"] += 1
                elif data["last_post"] == "closed":
                    res[plat]["closed"] += 1
                    any_closed = True
                elif is_active(data["last_post"]):
                    res[plat]["active"] += 1
                    any_active = True
                else:
                    res[plat]["inactive"] += 1
                    any_inactive = True

            if any_active:
                res["all"]["active"] += 1
            elif any_inactive:
                res["all"]["inactive"] += 1
            elif any_closed:
                res["all"]["closed"] += 1
            else:
                res["all"]["none"] += 1

        return res

    stats = {
        "global": get_platform_stats(politicians),
        "parties": {}
    }

    parties = set(p["party"] for p in politicians if p["party"])
    for party in parties:
        party_politicians = [p for p in politicians if p["party"] == party]
        stats["parties"][party] = get_platform_stats(party_politicians)

    return stats

def load_existing_data(file_path):
    if os.path.exists(file_path):
        try:
            with open(file_path, "r") as f:
                return {p["id"]: p for p in json.load(f)}
        except Exception as e:
            print(f"Could not load {file_path}: {e}")
    return {}

def save_data(politicians, stats, data_file="data.json", stats_file="stats.json"):
    with open(data_file, "w") as f:
        json.dump(politicians, f, indent=2, ensure_ascii=False)
    with open(stats_file, "w") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

def should_skip(p, now):
    if not p.get("last_check"):
        return False
    try:
        last_check_dt = datetime.fromisoformat(p["last_check"])
        if (now - last_check_dt).days < 30:
            is_stale = True
            has_social = False
            for plat_data in p["social"].values():
                if not plat_data:
                    continue
                has_social = True
                lp = plat_data.get("last_post")
                if lp == "closed":
                    continue
                if lp is None:
                    is_stale = False
                    break
                lp_dt = datetime.fromisoformat(lp.replace("Z", "+00:00"))
                if (now - lp_dt).days <= 365:
                    is_stale = False
                    break
            return has_social and is_stale
    except Exception as e:
        print(f"Error checking skip condition for {p['name']}: {e}")
    return False

async def update_politician_social(p, i, total, x_client):
    name = p["name"]
    updated = False

    # X
    if p["social"]["x"] and x_client and p["social"]["x"]["last_post"] != "closed":
        handle = p["social"]["x"]["handle"]
        print(f"[{i + 1}/{total}] Fetching X for {name} (@{handle})...")
        last_post = await get_x_last_post(x_client, handle)
        print(f"   -> X Result: {last_post}")
        p["social"]["x"]["last_post"] = last_post
        updated = True
        await asyncio.sleep(1)

    # Bluesky
    if p["social"]["bluesky"] and p["social"]["bluesky"]["last_post"] != "closed":
        print(f"[{i + 1}/{total}] Fetching Bluesky for {name}...")
        p["social"]["bluesky"]["last_post"] = get_bluesky_last_post(p["social"]["bluesky"]["handle"])
        updated = True
        time.sleep(0.1)

    # Mastodon
    if p["social"]["mastodon"] and p["social"]["mastodon"]["last_post"] != "closed":
        print(f"[{i + 1}/{total}] Fetching Mastodon for {name}...")
        p["social"]["mastodon"]["last_post"] = get_mastodon_last_post(p["social"]["mastodon"]["handle"])
        updated = True
        time.sleep(0.1)
    
    return updated

async def main():
    print("Fetching politicians from Wikidata...")
    politicians = get_politicians()
    print(f"Found {len(politicians)} politicians.")

    old_data = load_existing_data("data.json")

    for p in politicians:
        if p["id"] in old_data:
            old_p = old_data[p["id"]]
            p["last_check"] = old_p.get("last_check")
            for platform in ["x", "bluesky", "mastodon"]:
                if p["social"][platform] and old_p["social"].get(platform):
                    old_plat = old_p["social"][platform]
                    if p["social"][platform]["handle"] == old_plat["handle"]:
                        p["social"][platform]["last_post"] = old_plat.get("last_post")

    x_client = await get_x_client()
    if not x_client:
        print("Warning: Could not initialize X client. X data will not be updated.")

    now = datetime.now(timezone.utc)
    for i, p in enumerate(politicians):
        if should_skip(p, now):
            print(f"[{i + 1}/{len(politicians)}] Skipping {p['name']} (stale and checked recently)")
            continue

        if await update_politician_social(p, i, len(politicians), x_client):
            p["last_check"] = now.isoformat()
            save_data(politicians, calculate_stats(politicians))

    print("Sorting politicians...")
    politicians.sort(key=lambda x: x["name"])
    save_data(politicians, calculate_stats(politicians))
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())