import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from twscrape.accounts_pool import NoAccountError

from scraper import get_x_client, get_x_last_post, update_politician_social


async def timeline(dates):
    for date in dates:
        yield SimpleNamespace(date=date)


class XScraperTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.client = SimpleNamespace(
            user_by_login=AsyncMock(return_value=SimpleNamespace(id=123, protected=False)),
            user_tweets_and_replies=Mock(return_value=timeline([])),
        )

    async def test_latest_date_including_replies_and_out_of_order_pinned_posts(self):
        dates = [
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            datetime(2026, 11, 9, tzinfo=timezone.utc),
            datetime(2026, 11, 8, tzinfo=timezone.utc),
        ]
        self.client.user_tweets_and_replies.return_value = timeline(dates)
        self.assertEqual(await get_x_last_post(self.client, "example"), dates[1].isoformat())

    async def test_missing_user_is_closed(self):
        self.client.user_by_login.return_value = None
        self.assertEqual(await get_x_last_post(self.client, "example"), "closed")

    async def test_protected_user_does_not_fetch_timeline(self):
        self.client.user_by_login.return_value.protected = True
        self.assertEqual(await get_x_last_post(self.client, "example"), "protected")
        self.client.user_tweets_and_replies.assert_not_called()

    async def test_empty_timeline_has_unknown_activity(self):
        self.assertIsNone(await get_x_last_post(self.client, "example"))

    async def test_endpoint_404_does_not_mark_user_closed(self):
        self.client.user_by_login.side_effect = RuntimeError("404 endpoint unavailable")
        self.assertIsNone(await get_x_last_post(self.client, "example"))

    async def test_no_available_account_does_not_mark_user_closed(self):
        self.client.user_by_login.side_effect = NoAccountError("No account available")
        self.assertIsNone(await get_x_last_post(self.client, "example"))

    async def test_timeline_failure_has_unknown_activity(self):
        async def failed_timeline(*args, **kwargs):
            yield SimpleNamespace(date=datetime(2026, 11, 9, tzinfo=timezone.utc))
            raise RuntimeError("Temporary X failure")

        self.client.user_tweets_and_replies = failed_timeline
        self.assertIsNone(await get_x_last_post(self.client, "example"))

    async def test_missing_client_has_unknown_activity(self):
        self.assertIsNone(await get_x_last_post(None, "example"))

    async def test_failed_refresh_preserves_previous_activity(self):
        politician = {
            "name": "Example",
            "social": {
                "x": {"handle": "example", "last_post": "2026-11-01T00:00:00+00:00"},
                "bluesky": None,
                "mastodon": None,
            },
        }
        self.client.user_by_login.side_effect = NoAccountError("No account available")
        self.assertFalse(await update_politician_social(politician, 0, 1, self.client))
        self.assertEqual(politician["social"]["x"]["last_post"], "2026-11-01T00:00:00+00:00")

    async def test_successful_refresh_saves_activity(self):
        latest = datetime(2026, 11, 9, tzinfo=timezone.utc)
        self.client.user_tweets_and_replies.return_value = timeline([latest])
        politician = {
            "name": "Example",
            "social": {
                "x": {"handle": "example", "last_post": None},
                "bluesky": None,
                "mastodon": None,
            },
        }
        self.assertTrue(await update_politician_social(politician, 0, 1, self.client))
        self.assertEqual(politician["social"]["x"]["last_post"], latest.isoformat())

    @patch.dict("os.environ", {"GITHUB_ACTIONS": "true"})
    @patch("scraper.API")
    async def test_github_actions_skips_x(self, api):
        self.assertIsNone(await get_x_client())
        api.assert_not_called()

    @patch.dict("os.environ", {"GITHUB_ACTIONS": "false"})
    @patch("scraper.API")
    async def test_no_active_accounts_skips_x(self, api):
        api.return_value.pool.accounts_info = AsyncMock(return_value=[{"active": False}])
        self.assertIsNone(await get_x_client())

    @patch.dict("os.environ", {"GITHUB_ACTIONS": "false"})
    @patch("scraper.API")
    async def test_uses_one_pool_with_bounded_wait_and_explicit_exhaustion(self, api):
        api.return_value.pool.accounts_info = AsyncMock(return_value=[{"active": True}])
        self.assertIs(await get_x_client(), api.return_value)
        api.assert_called_once_with("accounts.db", raise_when_no_account=True, wait_timeout=30)


if __name__ == "__main__":
    unittest.main()
