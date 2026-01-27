export type SocialAccount = {
  handle: string;
  last_post: string | null;
};

export type Politician = {
  id: string;
  name: string;
  party: string | null;
  social: {
    x: string | null;
    bluesky: SocialAccount | null;
    mastodon: SocialAccount | null;
  };
};

export type Platform = 'all' | 'x' | 'bluesky' | 'mastodon';