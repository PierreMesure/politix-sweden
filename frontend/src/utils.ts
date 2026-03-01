export const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const COUNTRY = process.env.NEXT_PUBLIC_COUNTRY || 'denmark';
export const CATEGORY = process.env.NEXT_PUBLIC_CATEGORY || 'folketinget';

export const LOCALE = COUNTRY === 'denmark' ? 'da' : (COUNTRY === 'sweden' ? 'sv' : 'en');
export const DATE_LOCALE = COUNTRY === 'sweden' ? 'sv-SE' : 'da-DK';

export const COALITIONS: Record<string, { group1: { id: string, parties: string[] }, group2: { id: string, parties: string[] } }> = {
  sweden: {
    group1: {
      id: 'tido',
      parties: ["Moderaterna", "Sverigedemokraterna", "Kristdemokraterna", "Liberalerna"]
    },
    group2: {
      id: 'opposition',
      parties: ["Socialdemokraterna", "Vänsterpartiet", "Miljöpartiet", "Centerpartiet"]
    }
  },
  denmark: {
    group1: {
      id: 'majority',
      parties: ["Socialdemokratiet", "Venstre", "Moderaterne"]
    },
    group2: {
      id: 'opposition',
      parties: ["Danmarksdemokraterne", "Socialistisk Folkeparti", "Liberal Alliance", "Det Konservative Folkeparti", "Enhedslisten", "Dansk Folkeparti", "Radikale Venstre", "Alternativet", "Borgernes Parti", "Nye Borgerlige", "Naleraq", "Inuit Ataqatigiit", "Sambandsflokkurin", "Javnaðarflokkurin"]
    }
  }
};

export function getDataUrl() {
  const path = `/data/${COUNTRY}/${CATEGORY}.json`;
  if (process.env.NODE_ENV === 'development') {
    return path;
  }
  return `https://raw.githubusercontent.com/PierreMesure/politix-new/refs/heads/master/frontend/public${path}`;
}

export function getCsvUrl() {
  const path = `/data/${COUNTRY}/${CATEGORY}.csv`;
  if (process.env.NODE_ENV === 'development') {
    return path;
  }
  return `https://raw.githubusercontent.com/PierreMesure/politix-new/refs/heads/master/frontend/public${path}`;
}

export function getStatsUrl() {
  const path = `/data/${COUNTRY}/${CATEGORY}_stats.json`;
  if (process.env.NODE_ENV === 'development') {
    return path;
  }
  return `https://raw.githubusercontent.com/PierreMesure/politix-new/refs/heads/master/frontend/public${path}`;
}

export const PARTY_LOGOS: Record<string, Record<string, string>> = {
  "sweden": {
    "Centerpartiet": "/party_logos/sweden/c.webp",
    "Kristdemokraterna": "/party_logos/sweden/kd.webp",
    "Liberalerna": "/party_logos/sweden/l.webp",
    "Moderaterna": "/party_logos/sweden/m.webp",
    "Miljöpartiet": "/party_logos/sweden/mp.webp",
    "Socialdemokraterna": "/party_logos/sweden/s.webp",
    "Sverigedemokraterna": "/party_logos/sweden/sd.webp",
    "Vänsterpartiet": "/party_logos/sweden/v.webp",
  },
  "denmark": {
    "Socialdemokratiet": "/party_logos/denmark/s.webp",
    "Venstre": "/party_logos/denmark/v.webp",
    "Danmarksdemokraterne": "/party_logos/denmark/dd.webp",
    "Socialistisk Folkeparti": "/party_logos/denmark/sf.webp",
    "Liberal Alliance": "/party_logos/denmark/la.webp",
    "Moderaterne": "/party_logos/denmark/m.webp",
    "Det Konservative Folkeparti": "/party_logos/denmark/k.webp",
    "Enhedslisten": "/party_logos/denmark/el.webp",
    "Dansk Folkeparti": "/party_logos/denmark/df.webp",
    "Radikale Venstre": "/party_logos/denmark/rv.webp",
    "Alternativet": "/party_logos/denmark/alt.webp",
    "Borgernes Parti": "/party_logos/denmark/bp.webp",
    "Nye Borgerlige": "/party_logos/denmark/nb.webp",
    "Naleraq": "/party_logos/denmark/n.webp",
    "Inuit Ataqatigiit": "/party_logos/denmark/ia.webp",
    "Sambandsflokkurin": "/party_logos/denmark/sb.webp",
    "Javnaðarflokkurin": "/party_logos/denmark/jf.webp"
  }
};

export function getPartyLogo(party: string | null): string | null {
  if (!party) return null;
  return PARTY_LOGOS[COUNTRY]?.[party] || null;
}

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
