import json
import requests
import time
from SPARQLWrapper import SPARQLWrapper, JSON

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
        elif len(parts) == 3: # @user@instance format
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
    sparql = SPARQLWrapper("https://query.wikidata.org/sparql", agent="Politix/0.1 (https://github.com/PierreMesure/politix-new)")
    query = """
    SELECT ?mp ?mpLabel ?partyLabel ?x ?ig ?bluesky ?mastodon ?truth WHERE {
      SERVICE wikibase:label { bd:serviceParam wikibase:language "sv,en". }
      ?mp wdt:P31 wd:Q5;
        p:P39 ?statement.
      ?statement ps:P39 wd:Q10655178.
      FILTER(NOT EXISTS { ?statement pq:P582 ?endTime. })
      OPTIONAL {
        ?mp p:P102 ?partyStatement.
        ?partyStatement ps:P102 ?party.
        FILTER(NOT EXISTS { ?partyStatement pq:P582 ?partyEndDate. })
      }
      OPTIONAL { ?mp wdt:P2002 ?x. }
      OPTIONAL { ?mp wdt:P2003 ?ig. }
      OPTIONAL { ?mp wdt:P12361 ?bluesky. }
      OPTIONAL { ?mp wdt:P4033 ?mastodon. }
      OPTIONAL { ?mp wdt:P10858 ?truth. }
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
                "x": result["x"]["value"] if "x" in result else None,
                "bluesky": {"handle": result["bluesky"]["value"], "last_post": None} if "bluesky" in result else None,
                "mastodon": {"handle": result["mastodon"]["value"], "last_post": None} if "mastodon" in result else None,
            }
        }
        politicians.append(politician)
    return politicians

def main():
    print("Fetching politicians from Wikidata...")
    politicians = get_politicians()
    print(f"Found {len(politicians)} politicians.")
    
    for i, p in enumerate(politicians):
        name = p["name"]
        if p["social"]["bluesky"]:
            print(f"[{i+1}/{len(politicians)}] Fetching Bluesky for {name}...")
            p["social"]["bluesky"]["last_post"] = get_bluesky_last_post(p["social"]["bluesky"]["handle"])
            time.sleep(0.1) # Be nice
            
        if p["social"]["mastodon"]:
            print(f"[{i+1}/{len(politicians)}] Fetching Mastodon for {name}...")
            p["social"]["mastodon"]["last_post"] = get_mastodon_last_post(p["social"]["mastodon"]["handle"])
            time.sleep(0.1) # Be nice
            
    print("Saving to data.json...")
    with open("data.json", "w") as f:
        json.dump(politicians, f, indent=2, ensure_ascii=False)
    print("Done!")

if __name__ == "__main__":
    main()
