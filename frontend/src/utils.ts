export const DATA_URL = process.env.NODE_ENV === 'development' 
  ? "/data/riksdagen.json"
  : "https://raw.githubusercontent.com/PierreMesure/politix-sweden/refs/heads/master/data/riksdagen.json";

export const STATS_URL = process.env.NODE_ENV === 'development'
  ? "/data/riksdagen_stats.json"
  : "https://raw.githubusercontent.com/PierreMesure/politix-sweden/refs/heads/master/data/riksdagen_stats.json";

export const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const PARTY_LOGOS: Record<string, string> = {
  "Centerpartiet": "/party_logos/c.webp",
  "Kristdemokraterna": "/party_logos/kd.webp",
  "Liberalerna": "/party_logos/l.webp",
  "Moderaterna": "/party_logos/m.webp",
  "Miljöpartiet": "/party_logos/mp.webp",
  "Socialdemokraterna": "/party_logos/s.webp",
  "Sverigedemokraterna": "/party_logos/sd.webp",
  "Vänsterpartiet": "/party_logos/v.webp",
};

export function isActive(lastPost: string | null) {
  if (!lastPost || lastPost === 'closed' || lastPost === 'protected') return false;
  const date = new Date(lastPost);
  const now = new Date();
  return (now.getTime() - date.getTime()) < NINETY_DAYS_MS;
}

export function getMastodonUrl(handle: string) {
  // Handle format: @user@instance or user@instance
  const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
  const parts = cleanHandle.split('@');
  if (parts.length === 2) {
    const [user, instance] = parts;
    return `https://${instance}/@${user}`;
  }
  return null;
}
