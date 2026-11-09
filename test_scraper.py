import asyncio
from scraper import get_x_client, get_x_last_post


async def test_handles():
    handles = [
        "Vlker",
        "aanstrell",
        "AdamMarttinen",
        "jorgen_berglund",
        "kasirga_kadir",
    ]

    print("Initializing X account pool...")
    client = await get_x_client()

    if not client:
        print("Error: No active X accounts. Run: uv run twscrape add_cookie ACCOUNT")
        return

    print(f"Testing {len(handles)} handles...\n")

    for handle in handles:
        print(f"Fetching last post for @{handle}...")
        try:
            last_post = await get_x_last_post(client, handle)
            print(f"  -> Result: {last_post}")
        except Exception as e:
            print(f"  -> Failed: {e}")
        print("-" * 20)


if __name__ == "__main__":
    asyncio.run(test_handles())
