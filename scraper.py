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

def get_x_credentials():
    accounts = []
    i = 1
    while True:
        user = os.getenv(f"X{i}_USERNAME")
        if not user:
            break
        accounts.append({
            "username": user,
            "email": os.getenv(f"X{i}_EMAIL"),
            "password": os.getenv(f"X{i}_PASSWORD")
        })
        i += 1
    return accounts

async def get_x_clients():
    if os.getenv("GITHUB_ACTIONS") == "true":
        print("Running in GitHub Actions, skipping X client initialization.")
        return []

    credentials = get_x_credentials()
    if not credentials:
        print("No X credentials found in .env (expected X1_USERNAME, X2_USERNAME...)")
        return []

    clients = []
    for idx, acc in enumerate(credentials):
        username = acc["username"]
        client = Client('en-US')
        cookies_path = f'cookies_{username}.json'
        
        # Compatibility: if old cookies.json exists and matches the first account, rename it
        if idx == 0 and os.path.exists('cookies.json') and not os.path.exists(cookies_path):
             os.rename('cookies.json', cookies_path)

        try:
            if os.path.exists(cookies_path):
                with open(cookies_path, 'r') as f:
                    cookies = json.load(f)
                # Handle old list format if necessary
                if isinstance(cookies, list):
                    cookies = {c['name']: c['value'] for c in cookies}
                    with open(cookies_path, 'w') as f:
                        json.dump(cookies, f)
                client.load_cookies(cookies_path)
                print(f"Loaded cookies for X account: {username}")
            else:
                print(f"Logging in to X account: {username}")
                await client.login(
                    auth_info_1=username,
                    auth_info_2=acc["email"],
                    password=acc["password"]
                )
                client.save_cookies(cookies_path)
            clients.append(client)
        except Exception as e:
            print(f"Error authenticating with X account {username}: {e}")
    
    return clients


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
        
        if getattr(user, 'protected', False):
            return "protected"

        # Get latest tweets and replies to find the absolute latest activity

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

    politicians_map = {}

    for result in results["results"]["bindings"]:
        p_id = result["mp"]["value"].split("/")[-1]
        
        if p_id not in politicians_map:
            politicians_map[p_id] = {
                "id": p_id,
                "name": result["mpLabel"]["value"],
                "party": result["partyLabel"]["value"] if "partyLabel" in result else None,
                "last_check": None,
                "social": {
                    "x": None,
                    "bluesky": None,
                    "mastodon": None
                },
            }
        
        p = politicians_map[p_id]

        def update_platform(platform, handle_key, end_key):
            if handle_key in result:
                handle = result[handle_key]["value"]
                is_closed = end_key in result
                
                existing = p["social"][platform]
                # If we don't have a handle yet, or if the current one is active while existing is closed, update.
                if not existing or (not is_closed and existing["last_post"] == "closed"):
                    p["social"][platform] = {
                        "handle": handle,
                        "last_post": "closed" if is_closed else None
                    }

        update_platform("x", "x", "xEnd")
        update_platform("bluesky", "bluesky", "bskyEnd")
        update_platform("mastodon", "mastodon", "mastEnd")

    return list(politicians_map.values())

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

        NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
        now = datetime.now(timezone.utc)

        def is_active(last_post_iso):
            if not last_post_iso or last_post_iso == "closed" or last_post_iso == "protected":
                return False
            try:
                dt = datetime.fromisoformat(last_post_iso.replace('Z', '+00:00'))
                return (now - dt).total_seconds() * 1000 < NINETY_DAYS_MS
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
            if has_social and is_stale:
                print(f"[{p['name']}] Stale account (last post > 1 year ago) and checked recently (< 30 days ago). Skipping.")
                return True
        return False
    except Exception as e:
        print(f"Error checking skip condition for {p['name']}: {e}")
    return False

async def update_politician_social(p, i, total, x_clients, x_client_index):
    name = p["name"]
    updated = False

    # X
    if p["social"]["x"] and x_clients and p["social"]["x"]["last_post"] != "closed":
        client = x_clients[x_client_index % len(x_clients)]
        handle = p["social"]["x"]["handle"]
        print(f"[{i + 1}/{total}] Fetching X for {name} (@{handle}) using account {x_client_index % len(x_clients) + 1}...")
        last_post = await get_x_last_post(client, handle)
        print(f"   -> X Result: {last_post}")
        p["social"]["x"]["last_post"] = last_post
        updated = True
        # Increment index for the next call outside
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

    x_clients = await get_x_clients()
    if not x_clients:
        print("Warning: No X clients available. X data will not be updated.")

    now = datetime.now(timezone.utc)
    x_client_index = 0
    for i, p in enumerate(politicians):
        if should_skip(p, now):
            print(f"[{i + 1}/{len(politicians)}] Skipping {p['name']} (stale and checked recently)")
            continue

        was_x_updated = p["social"]["x"] and x_clients and p["social"]["x"]["last_post"] != "closed"
        
        if await update_politician_social(p, i, len(politicians), x_clients, x_client_index):
            p["last_check"] = now.isoformat()
            save_data(politicians, calculate_stats(politicians))
            
            if was_x_updated:
                x_client_index += 1

    print("Sorting politicians...")
    politicians.sort(key=lambda x: x["name"])
    save_data(politicians, calculate_stats(politicians))
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
