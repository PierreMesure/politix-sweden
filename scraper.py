import json
import csv
import requests
import time
import asyncio
import os
from datetime import datetime, timezone
from twscrape import API, gather
from SPARQLWrapper import SPARQLWrapper, JSON


async def get_x_client():
    if os.getenv("GITHUB_ACTIONS") == "true":
        print("Running in GitHub Actions, skipping X client initialization.")
        return None

    client = API("accounts.db", raise_when_no_account=True, wait_timeout=30)
    if not any(account["active"] for account in await client.pool.accounts_info()):
        print("No active X accounts. Add cookies with: uv run twscrape add_cookie ACCOUNT")
        return None
    return client


async def get_x_last_post(client, handle):
    if not client:
        return None
    try:
        user = await client.user_by_login(handle)
        if not user:
            return "closed"

        if getattr(user, "protected", False):
            return "protected"

        tweets = await gather(client.user_tweets_and_replies(user.id, limit=5))
        if tweets:
            return max(tweet.date for tweet in tweets).isoformat()
    except Exception as e:
        print(f"Error fetching X for {handle}: {e}")
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


def get_politicians(query_file="query.sparql"):
    sparql = SPARQLWrapper(
        "https://query.wikidata.org/sparql",
        agent="Politix/0.1 (https://github.com/PierreMesure/politix-sweden)",
    )
    with open(query_file, "r") as f:
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
                "party": result["partyLabel"]["value"]
                if "partyLabel" in result
                else None,
                "last_check": None,
                "social": {"x": None, "bluesky": None, "mastodon": None},
            }

        p = politicians_map[p_id]

        def update_platform(platform, handle_key, end_key):
            if handle_key in result:
                handle = result[handle_key]["value"]
                is_closed = end_key in result

                existing = p["social"][platform]
                # If we don't have a handle yet, or if the current one is active while existing is closed, update.
                if not existing or (
                    not is_closed and existing["last_post"] == "closed"
                ):
                    p["social"][platform] = {
                        "handle": handle,
                        "last_post": "closed" if is_closed else None,
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
            "mastodon": empty_stats(),
        }

        NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
        now = datetime.now(timezone.utc)

        def is_active(last_post_iso):
            if (
                not last_post_iso
                or last_post_iso == "closed"
                or last_post_iso == "protected"
            ):
                return False
            try:
                dt = datetime.fromisoformat(last_post_iso.replace("Z", "+00:00"))
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

    stats = {"global": get_platform_stats(politicians), "parties": {}}

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


def save_to_csv(politicians, csv_file):
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "id",
                "name",
                "party",
                "last_check",
                "x_handle",
                "x_last_post",
                "bluesky_handle",
                "bluesky_last_post",
                "mastodon_handle",
                "mastodon_last_post",
            ]
        )
        for p in politicians:
            row = [
                p["id"],
                p["name"],
                p["party"],
                p["last_check"],
            ]
            for platform in ["x", "bluesky", "mastodon"]:
                social = p["social"].get(platform)
                if social:
                    row.extend([social.get("handle"), social.get("last_post")])
                else:
                    row.extend([None, None])
            writer.writerow(row)


def save_data(politicians, stats, data_file, stats_file):
    with open(data_file, "w") as f:
        json.dump(politicians, f, indent=2, ensure_ascii=False)
    with open(stats_file, "w") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    # Save CSV
    csv_file = os.path.splitext(data_file)[0] + ".csv"
    save_to_csv(politicians, csv_file)


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
                print(
                    f"[{p['name']}] Stale account (last post > 1 year ago) and checked recently (< 30 days ago). Skipping."
                )
                return True
        return False
    except Exception as e:
        print(f"Error checking skip condition for {p['name']}: {e}")
    return False


async def update_politician_social(p, i, total, x_client):
    name = p["name"]
    updated = False

    # X
    if p["social"]["x"] and x_client and p["social"]["x"]["last_post"] != "closed":
        handle = p["social"]["x"]["handle"]
        print(
            f"[{i + 1}/{total}] Fetching X for {name} (@{handle})..."
        )
        last_post = await get_x_last_post(x_client, handle)
        print(f"   -> X Result: {last_post}")
        if last_post is not None:
            p["social"]["x"]["last_post"] = last_post
            updated = True

    # Bluesky
    if p["social"]["bluesky"] and p["social"]["bluesky"]["last_post"] != "closed":
        print(f"[{i + 1}/{total}] Fetching Bluesky for {name}...")
        p["social"]["bluesky"]["last_post"] = get_bluesky_last_post(
            p["social"]["bluesky"]["handle"]
        )
        updated = True
        time.sleep(0.1)

    # Mastodon
    if p["social"]["mastodon"] and p["social"]["mastodon"]["last_post"] != "closed":
        print(f"[{i + 1}/{total}] Fetching Mastodon for {name}...")
        p["social"]["mastodon"]["last_post"] = get_mastodon_last_post(
            p["social"]["mastodon"]["handle"]
        )
        updated = True
        time.sleep(0.1)

    return updated


async def run_scraper(country, name, x_client):
    query_file = f"queries/{country}/{name}.sparql"
    data_file = f"data/{country}/{name}.json"
    stats_file = f"data/{country}/{name}_stats.json"

    frontend_data_dir = f"frontend/public/data/{country}"
    os.makedirs(frontend_data_dir, exist_ok=True)
    frontend_data_file = f"{frontend_data_dir}/{name}.json"
    frontend_stats_file = f"{frontend_data_dir}/{name}_stats.json"

    print(f"Fetching politicians using {query_file}...")
    politicians = get_politicians(query_file)
    print(f"Found {len(politicians)} politicians.")

    old_data = load_existing_data(data_file)

    for p in politicians:
        if p["id"] in old_data:
            old_p = old_data[p["id"]]
            p["last_check"] = old_p.get("last_check")
            for platform in ["x", "bluesky", "mastodon"]:
                if p["social"][platform] and old_p["social"].get(platform):
                    old_plat = old_p["social"][platform]
                    if p["social"][platform]["handle"] == old_plat["handle"]:
                        p["social"][platform]["last_post"] = old_plat.get("last_post")

    now = datetime.now(timezone.utc)
    for i, p in enumerate(politicians):
        if should_skip(p, now):
            print(
                f"[{i + 1}/{len(politicians)}] Skipping {p['name']} (stale and checked recently)"
            )
            continue

        if await update_politician_social(p, i, len(politicians), x_client):
            p["last_check"] = now.isoformat()
            stats = calculate_stats(politicians)
            save_data(politicians, stats, data_file, stats_file)
            save_data(politicians, stats, frontend_data_file, frontend_stats_file)

    print("Sorting politicians...")
    politicians.sort(key=lambda x: x["name"])
    stats = calculate_stats(politicians)
    save_data(politicians, stats, data_file, stats_file)
    save_data(politicians, stats, frontend_data_file, frontend_stats_file)
    print(f"Done processing {data_file}!")


async def main():
    x_client = await get_x_client()
    if not x_client:
        print("Warning: No X accounts available. X data will not be updated.")

    # Run for Sweden
    country = "sweden"
    for name in ["riksdagen", "regeringen", "departement", "myndigheter"]:
        if os.path.exists(f"queries/{country}/{name}.sparql"):
            await run_scraper(country, name, x_client)

    # Run for Denmark
    country = "denmark"
    for name in ["folketinget"]:
        if os.path.exists(f"queries/{country}/{name}.sparql"):
            await run_scraper(country, name, x_client)


if __name__ == "__main__":
    asyncio.run(main())
