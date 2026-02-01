import asyncio
from scraper import get_x_clients, get_x_last_post


async def test_handles():
    handles = [
        "Vlker",
        "aanstrell",
        "AdamMarttinen",
        "jorgen_berglund",
        "kasirga_kadir",
    ]

    print("Initializing X clients...")
    clients = await get_x_clients()

    if not clients:
        print("Error: No X clients available. Check your .env file.")
        return

    print(f"Found {len(clients)} accounts.")
    print(f"Testing {len(handles)} handles...\n")

    for i, handle in enumerate(handles):
        client_idx = i % len(clients)
        print(f"Fetching last post for @{handle} using account {client_idx + 1}...")
        try:
            last_post = await get_x_last_post(clients[client_idx], handle)
            print(f"  -> Result: {last_post}")
        except Exception as e:
            print(f"  -> Failed: {e}")
        print("-" * 20)


if __name__ == "__main__":
    asyncio.run(test_handles())
