export const DATA_URL = process.env.NODE_ENV === 'development' 
  ? "/data.json"
  : "https://raw.githubusercontent.com/PierreMesure/politix-sweden/refs/heads/master/data.json";

export const STATS_URL = process.env.NODE_ENV === 'development'
  ? "/stats.json"
  : "https://raw.githubusercontent.com/PierreMesure/politix-sweden/refs/heads/master/stats.json";

export const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;

export const PARTY_LOGOS: Record<string, string> = {
  "Centerpartiet": "/party_logos/c.png",
  "Kristdemokraterna": "/party_logos/kd.png",
  "Liberalerna": "/party_logos/l.png",
  "Moderaterna": "/party_logos/m.png",
  "Miljöpartiet": "/party_logos/mp.png",
  "Socialdemokraterna": "/party_logos/s.png",
  "Sverigedemokraterna": "/party_logos/sd.png",
  "Vänsterpartiet": "/party_logos/v.png",
};

export function isActive(lastPost: string | null) {
  if (!lastPost || lastPost === 'closed') return false;
  const date = new Date(lastPost);
  const now = new Date();
  return (now.getTime() - date.getTime()) < FOUR_WEEKS_MS;
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
