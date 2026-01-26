"use client";

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

type SocialAccount = {
  handle: string;
  last_post: string | null;
};

type Politician = {
  id: string;
  name: string;
  party: string | null;
  social: {
    x: string | null;
    bluesky: SocialAccount | null;
    mastodon: SocialAccount | null;
  };
};

const DATA_URL = "https://raw.githubusercontent.com/PierreMesure/politix-sweden/refs/heads/master/data.json";
const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;

function isActive(lastPost: string | null) {
  if (!lastPost) return false;
  const date = new Date(lastPost);
  const now = new Date();
  return (now.getTime() - date.getTime()) < FOUR_WEEKS_MS;
}

const PARTY_LOGOS: Record<string, string> = {
  "Centerpartiet": "/party_logos/c.png",
  "Kristdemokraterna": "/party_logos/kd.png",
  "Liberalerna": "/party_logos/l.png",
  "Moderaterna": "/party_logos/m.png",
  "Miljöpartiet": "/party_logos/mp.png",
  "Socialdemokraterna": "/party_logos/s.png",
  "Sverigedemokraterna": "/party_logos/sd.png",
  "Vänsterpartiet": "/party_logos/v.png",
};

function getMastodonUrl(handle: string) {
  // Handle format: @user@instance or user@instance
  const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
  const parts = cleanHandle.split('@');
  if (parts.length === 2) {
    const [user, instance] = parts;
    return `https://${instance}/@${user}`;
  }
  return null;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    x: true,
    bluesky: true,
    mastodon: true,
    none: true
  });

  function formatDate(dateStr: string | null) {
    if (!dateStr) return t('never');
    return new Date(dateStr).toLocaleDateString();
  }

  useEffect(() => {
    fetch(DATA_URL)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setError("Failed to load data.");
        setLoading(false);
      });
  }, []);

  const stats = useMemo(() => {
    const partyStats: Record<string, { total: number; x: number; bluesky: number; mastodon: number; activeBluesky: number; activeMastodon: number }> = {};

    data.forEach(p => {
      const party = p.party || t('table.unknownParty');
      if (!partyStats[party]) {
        partyStats[party] = { total: 0, x: 0, bluesky: 0, mastodon: 0, activeBluesky: 0, activeMastodon: 0 };
      }
      partyStats[party].total++;
      if (p.social.x) {
        partyStats[party].x++;
      }
      if (p.social.bluesky) {
        partyStats[party].bluesky++;
        if (isActive(p.social.bluesky.last_post)) partyStats[party].activeBluesky++;
      }
      if (p.social.mastodon) {
        partyStats[party].mastodon++;
        if (isActive(p.social.mastodon.last_post)) partyStats[party].activeMastodon++;
      }
    });

    return partyStats;
  }, [data]);

  const filteredPoliticians = useMemo(() => {
    return data.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const normalizedParty = p.party || t('table.unknownParty');
      const matchesParty = selectedParty ? normalizedParty === selectedParty : true;

      const hasX = p.social.x !== null;
      const hasBS = p.social.bluesky !== null;
      const hasMastodon = p.social.mastodon !== null;
      const hasNone = !hasX && !hasBS && !hasMastodon;

      const matchesFilters = (
        (hasX && filters.x) ||
        (hasBS && filters.bluesky) ||
        (hasMastodon && filters.mastodon) ||
        (hasNone && filters.none)
      );

      return matchesSearch && matchesParty && matchesFilters;
    }).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  }, [data, searchTerm, selectedParty, filters]);

  const parties = Object.keys(stats).sort();

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">{t('error')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('description')}
        </p>
      </header>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow border border-gray-200 dark:border-zinc-800 animate-pulse h-40"></div>
          ))
        ) : (
          parties.map(party => {
            const s = stats[party];
            const xPct = s.total ? ((s.x / s.total) * 100).toFixed(1) : "0.0";
            const blueskyPct = s.total ? ((s.bluesky / s.total) * 100).toFixed(1) : "0.0";
            const mastodonPct = s.total ? ((s.mastodon / s.total) * 100).toFixed(1) : "0.0";

            return (
              <div key={party} className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow border border-gray-200 dark:border-zinc-800 cursor-pointer hover:border-blue-500 transition-colors"
                   onClick={() => setSelectedParty(selectedParty === party ? null : party)}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    {PARTY_LOGOS[party] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={PARTY_LOGOS[party]} alt={party} className="w-8 h-8 object-contain" />
                    )}
                    <h3 className={`font-semibold ${selectedParty === party ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>{party}</h3>
                  </div>
                  <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-1 py-1 rounded text-gray-600 dark:text-gray-300">{s.total} {t('stats.members')}</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{t('table.x')}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200 text-xs">{s.x} ({xPct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                      <div className="bg-gray-900 dark:bg-gray-100 h-1.5 rounded-full" style={{ width: `${xPct}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{t('table.bluesky')}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200 text-xs">{s.bluesky} ({blueskyPct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${blueskyPct}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{t('table.mastodon')}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200 text-xs">{s.mastodon} ({mastodonPct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${mastodonPct}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-6 lg:items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full lg:w-auto">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="w-full p-2.5 pl-3 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={filters.x}
                onChange={(e) => setFilters(prev => ({ ...prev, x: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-800"
              />
              {t('filters.x')}
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={filters.bluesky}
                onChange={(e) => setFilters(prev => ({ ...prev, bluesky: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-800"
              />
              {t('filters.bluesky')}
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={filters.mastodon}
                onChange={(e) => setFilters(prev => ({ ...prev, mastodon: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-800"
              />
              {t('filters.mastodon')}
            </label>
            <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700 hidden md:block" />
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={filters.none}
                onChange={(e) => setFilters(prev => ({ ...prev, none: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-800"
              />
              {t('filters.noAccounts')}
            </label>
          </div>
        </div>

        {selectedParty && (
          <button
            onClick={() => setSelectedParty(null)}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-4 decoration-2"
          >
            {t('filters.clearParty')} ({selectedParty})
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-zinc-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
            <thead className="bg-gray-50 dark:bg-zinc-950">
              <tr>
                <th className="pl-2 pr-1 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.name')}</th>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.party')}</th>
                <th className="px-1 py-3 text-center lg:text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <span className="hidden lg:inline">{t('table.bluesky')}</span>
                  <div className="lg:hidden flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/service_logos/bluesky.svg" alt="Bluesky" className="w-5 h-5 opacity-70 dark:invert grayscale" />
                  </div>
                </th>
                <th className="px-1 py-3 text-center lg:text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <span className="hidden lg:inline">{t('table.mastodon')}</span>
                  <div className="lg:hidden flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/service_logos/mastodon.svg" alt="Mastodon" className="w-5 h-5 opacity-70 dark:invert grayscale" />
                  </div>
                </th>
                <th className="px-1 py-3 text-center lg:text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <span className="hidden lg:inline">{t('table.x')}</span>
                  <div className="lg:hidden flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/service_logos/x-twitter.svg" alt="X" className="w-5 h-5 opacity-70 dark:invert grayscale" />
                  </div>
                </th>
                <th className="pl-1 pr-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.edit')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-1 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div></td>
                    <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded-full"></div></td>
                    <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto lg:mx-0"></div></td>
                    <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto lg:mx-0"></div></td>
                    <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto lg:mx-0"></div></td>
                    <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded"></div></td>
                  </tr>
                ))
              ) : (
                filteredPoliticians.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <td className="pl-2 pr-1 py-4 text-sm font-medium text-gray-900 dark:text-white w-1/3 min-w-[120px] whitespace-normal break-words">
                      {p.name}
                    </td>
                    <td className="px-1 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 max-w-[80px] truncate">
                      {p.party && PARTY_LOGOS[p.party] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={PARTY_LOGOS[p.party]}
                          alt={p.party}
                          title={p.party}
                          className="w-6 h-6 object-contain"
                        />
                      ) : (
                        <span title={p.party || t('table.unknownParty')}>{p.party || t('table.unknownParty')}</span>
                      )}
                    </td>
                    <td className="px-1 py-4 whitespace-nowrap text-sm">
                      {p.social.bluesky ? (
                        <div className="flex flex-col items-center lg:items-start">
                          {/* Mobile: Icon */}
                          <a
                            href={`https://bsky.app/profile/${p.social.bluesky.handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="lg:hidden hover:opacity-80 transition-opacity"
                            title={`@${p.social.bluesky.handle}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/service_logos/bluesky.svg" alt="Bluesky" className="w-6 h-6 dark:invert" />
                          </a>
                          {/* Desktop: Handle */}
                          <a
                            href={`https://bsky.app/profile/${p.social.bluesky.handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden lg:block text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            @{p.social.bluesky.handle}
                          </a>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isActive(p.social.bluesky.last_post) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} title={isActive(p.social.bluesky.last_post) ? t('table.active') : t('table.inactive')}></span>
                            <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-500">{formatDate(p.social.bluesky.last_post)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-zinc-700 flex justify-center lg:justify-start">-</span>
                      )}
                    </td>
                    <td className="px-1 py-4 whitespace-nowrap text-sm">
                      {p.social.mastodon ? (
                        <div className="flex flex-col items-center lg:items-start">
                          {getMastodonUrl(p.social.mastodon.handle) ? (
                            <>
                              {/* Mobile: Icon */}
                              <a
                                href={getMastodonUrl(p.social.mastodon.handle)!}
                                target="_blank"
                                rel="noreferrer"
                                className="lg:hidden hover:opacity-80 transition-opacity"
                                title={p.social.mastodon.handle}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/service_logos/mastodon.svg" alt="Mastodon" className="w-6 h-6 dark:invert" />
                              </a>
                              {/* Desktop: Handle */}
                              <a
                                href={getMastodonUrl(p.social.mastodon.handle)!}
                                target="_blank"
                                rel="noreferrer"
                                className="hidden lg:block text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                {p.social.mastodon.handle}
                              </a>
                            </>
                          ) : (
                            <span className="text-gray-900 dark:text-gray-300" title={p.social.mastodon.handle}>?</span>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isActive(p.social.mastodon.last_post) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} title={isActive(p.social.mastodon.last_post) ? t('table.active') : t('table.inactive')}></span>
                            <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-500">{formatDate(p.social.mastodon.last_post)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-zinc-700 flex justify-center lg:justify-start">-</span>
                      )}
                    </td>
                    <td className="px-1 py-4 whitespace-nowrap text-sm">
                      {p.social.x ? (
                        <div className="flex justify-center lg:justify-start">
                          {/* Mobile: Icon */}
                          <a
                            href={`https://x.com/${p.social.x}`}
                            target="_blank"
                            rel="noreferrer"
                            className="lg:hidden hover:opacity-80 transition-opacity"
                            title={`@${p.social.x}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/service_logos/x-twitter.svg" alt="X (Twitter)" className="w-6 h-6 dark:invert" />
                          </a>
                          {/* Desktop: Handle */}
                          <a
                            href={`https://x.com/${p.social.x}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden lg:block text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            @{p.social.x}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-zinc-700 flex justify-center lg:justify-start">-</span>
                      )}
                    </td>
                    <td className="pl-1 pr-2 py-4 whitespace-nowrap text-sm">
                      <a
                        href={`https://www.wikidata.org/wiki/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-zinc-700 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                        title={t('table.editOnWikidata')}
                      >
                        <span className="hidden lg:inline">{t('table.editOnWikidata')}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 lg:hidden">
                          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredPoliticians.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('table.noResults')}
          </div>
        )}
      </div>
    </div>
  );
}