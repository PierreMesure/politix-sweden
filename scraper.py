import json
import requests
import time
import asyncio
import os
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
        # Get user by screen name
        try:
            user = await client.get_user_by_screen_name(handle)
        except Exception as e:
            err_msg = str(e).lower()
            if '404' in err_msg or 'not found' in err_msg or 'does not exist' in err_msg:
                return "closed"
            raise e

        if not user:
            return "closed"
        
        # Get latest tweets and replies to find the absolute latest activity
        # 'Tweets' include original tweets and retweets
        # 'Replies' include replies
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
            # Twikit Tweet.created_at format: 'Tue Jan 27 11:22:00 +0000 2026'
            from datetime import datetime, timezone
            
            # Helper to parse twikit date
            def parse_date(date_str):
                try:
                    return datetime.strptime(date_str, '%a %b %d %H:%M:%S %z %Y')
                except Exception:
                    return None

            # Sort all fetched tweets by date descending
            # We use a very old date with UTC timezone as fallback
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
        elif len(parts) == 3:  # @user@instance format
            _, user, instance = parts
        else:
            return None

        # Step 1: Lookup account ID
        lookup_url = f"https://{instance}/api/v1/accounts/lookup?acct={user}"
        response = requests.get(lookup_url, timeout=10)
        if response.status_code == 200:
            account_id = response.json().get("id")
            if account_id:
                # Step 2: Get statuses
                statuses_url = (
                    f"https://{instance}/api/v1/accounts/{account_id}/statuses?limit=1"
                )
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
    query = """
    SELECT ?mp ?mpLabel ?partyLabel ?x ?ig ?bluesky ?mastodon ?truth WHERE {
        SERVICE wikibase:label { bd:serviceParam wikibase:language "sv,en". }

        ?mp wdt:P31 wd:Q5;
            p:P39 ?statement.
        ?statement ps:P39 wd:Q10655178.
        FILTER NOT EXISTS { ?statement pq:P582 ?endTime. }

        OPTIONAL {
            ?mp p:P102 ?partyStatement.
            ?partyStatement ps:P102 ?party.
            FILTER(NOT EXISTS { ?partyStatement pq:P582 ?partyEndDate. })
        }

        OPTIONAL {
            ?mp p:P2002 ?xStmt.
            ?xStmt ps:P2002 ?x.
            FILTER NOT EXISTS { ?xStmt pq:P582 ?xEnd. }
        }

        OPTIONAL {
            ?mp p:P12361 ?bskyStmt.
            ?bskyStmt ps:P12361 ?bluesky.
            FILTER NOT EXISTS { ?bskyStmt pq:P582 ?bskyEnd. }
        }

        OPTIONAL {
            ?mp p:P2003 ?igStmt.
            ?igStmt ps:P2003 ?ig.
            FILTER NOT EXISTS { ?igStmt pq:P582 ?igEnd. }
        }

        OPTIONAL {
            ?mp p:P4033 ?mastStmt.
            ?mastStmt ps:P4033 ?mastodon.
            FILTER NOT EXISTS { ?mastStmt pq:P582 ?mastEnd. }
        }

        OPTIONAL {
            ?mp p:P10858 ?truthStmt.
            ?truthStmt ps:P10858 ?truth.
            FILTER NOT EXISTS { ?truthStmt pq:P582 ?truthEnd. }
        }
    }
    """
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
            "social": {
                "x": {"handle": result["x"]["value"], "last_post": None}
                if "x" in result
                else None,
                "bluesky": {"handle": result["bluesky"]["value"], "last_post": None}
                if "bluesky" in result
                else None,
                "mastodon": {"handle": result["mastodon"]["value"], "last_post": None}
                if "mastodon" in result
                else None,
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
        
        from datetime import datetime, timezone
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
            res["x"]["total"] += 1
            res["bluesky"]["total"] += 1
            res["mastodon"]["total"] += 1

            any_active = False
            any_inactive = False
            any_closed = False

            # X
            x = p["social"]["x"]
            if not x:
                res["x"]["none"] += 1
            elif x["last_post"] == "closed":
                res["x"]["closed"] += 1
                any_closed = True
            elif is_active(x["last_post"]):
                res["x"]["active"] += 1
                any_active = True
            else:
                res["x"]["inactive"] += 1
                any_inactive = True

            # Bluesky
            bsky = p["social"]["bluesky"]
            if not bsky:
                res["bluesky"]["none"] += 1
            elif bsky["last_post"] == "closed":
                res["bluesky"]["closed"] += 1
                any_closed = True
            elif is_active(bsky["last_post"]):
                res["bluesky"]["active"] += 1
                any_active = True
            else:
                res["bluesky"]["inactive"] += 1
                any_inactive = True

            # Mastodon
            mast = p["social"]["mastodon"]
            if not mast:
                res["mastodon"]["none"] += 1
            elif mast["last_post"] == "closed":
                res["mastodon"]["closed"] += 1
                any_closed = True
            elif is_active(mast["last_post"]):
                res["mastodon"]["active"] += 1
                any_active = True
            else:
                res["mastodon"]["inactive"] += 1
                any_inactive = True

            if any_active: res["all"]["active"] += 1
            elif any_inactive: res["all"]["inactive"] += 1
            elif any_closed: res["all"]["closed"] += 1
            else: res["all"]["none"] += 1

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


async def main():
    print("Fetching politicians from Wikidata...")
    politicians = get_politicians()
    print(f"Found {len(politicians)} politicians.")

    x_client = await get_x_client()
    if not x_client:
        print("Warning: Could not initialize X client. X data will not be updated.")

    for i, p in enumerate(politicians):
        name = p["name"]
        updated = False
        
        if p["social"]["x"] and x_client:
            handle = p["social"]["x"]["handle"]
            print(f"[{i + 1}/{len(politicians)}] Fetching X for {name} (@{handle})...")
            last_post = await get_x_last_post(x_client, handle)
            print(f"   -> X Result: {last_post}")
            p["social"]["x"]["last_post"] = last_post
            updated = True
            await asyncio.sleep(1)  # Be extra nice to X

        if p["social"]["bluesky"]:
            print(f"[{i + 1}/{len(politicians)}] Fetching Bluesky for {name}...")
            p["social"]["bluesky"]["last_post"] = get_bluesky_last_post(
                p["social"]["bluesky"]["handle"]
            )
            updated = True
            time.sleep(0.1)  # Be nice

        if p["social"]["mastodon"]:
            print(f"[{i + 1}/{len(politicians)}] Fetching Mastodon for {name}...")
            p["social"]["mastodon"]["last_post"] = get_mastodon_last_post(
                p["social"]["mastodon"]["handle"]
            )
            updated = True
            time.sleep(0.1)  # Be nice

        # Incremental save to keep progress
        if updated:
            with open("data.json", "w") as f:
                json.dump(politicians, f, indent=2, ensure_ascii=False)
            
            # Update stats incrementally as well
            stats = calculate_stats(politicians)
            with open("stats.json", "w") as f:
                json.dump(stats, f, indent=2, ensure_ascii=False)

    print("Sorting politicians...")
    politicians.sort(key=lambda x: x["name"])

    print("Saving to data.json...")
    with open("data.json", "w") as f:
        json.dump(politicians, f, indent=2, ensure_ascii=False)
    
    print("Saving final stats...")
    stats = calculate_stats(politicians)
    with open("stats.json", "w") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
