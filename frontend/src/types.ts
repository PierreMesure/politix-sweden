export type SocialAccount = {
  handle: string;
  last_post: string | null;
};

export type Politician = {
  id: string;
  name: string;
  party: string | null;
  social: {
    x: SocialAccount | null;
    bluesky: SocialAccount | null;
    mastodon: SocialAccount | null;
  };
};

export type Platform = 'all' | 'x' | 'bluesky' | 'mastodon';

export type StatusStats = {
  active: number;
  inactive: number;
  closed: number;
  none: number;
  total: number;
};

export type DashboardStatsData = Record<Platform, StatusStats>;
