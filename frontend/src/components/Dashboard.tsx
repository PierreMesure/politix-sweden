"use client";

import { useState, useMemo } from 'react';
import rawData from '../data.json';

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

const DATA = rawData as Politician[];

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;

function isActive(lastPost: string | null) {
  if (!lastPost) return false;
  const date = new Date(lastPost);
  const now = new Date();
  return (now.getTime() - date.getTime()) < FOUR_WEEKS_MS;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString();
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    x: true,
    bluesky: true,
    mastodon: true,
    none: true
  });

  const stats = useMemo(() => {
    const partyStats: Record<string, { total: number; x: number; bluesky: number; mastodon: number; activeBluesky: number; activeMastodon: number }> = {};

    DATA.forEach(p => {
      const party = p.party || "Unknown";
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
  }, []);

  const filteredPoliticians = useMemo(() => {
    return DATA.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const normalizedParty = p.party || "Unknown";
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
    });
  }, [searchTerm, selectedParty, filters]);

  const parties = Object.keys(stats).sort();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Is your MP on X (and Bluesky, Mastodon...)?</h1>
        <p className="text-gray-500 dark:text-gray-400">
          This little dashboard lists the Swedish member of parliaments and displays their accounts on X, Bluesky and Mastodon. When possible, it also fetches the date of the latest post to see if the account is active. The data might not be exhaustive as the social media account information is fetched from Wikidata (Wikipedia's database). If you find an error or a missing account, please click "Edit on Wikidata” to fix it.
        </p>
      </header>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parties.map(party => {
          const s = stats[party];
          const xPct = ((s.x / s.total) * 100).toFixed(1);
          const blueskyPct = ((s.bluesky / s.total) * 100).toFixed(1);
          const mastodonPct = ((s.mastodon / s.total) * 100).toFixed(1);

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
                <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">{s.total} members</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">X (Twitter)</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200 text-xs">{s.x} ({xPct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                    <div className="bg-gray-900 dark:bg-gray-100 h-1.5 rounded-full" style={{ width: `${xPct}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Bluesky</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200 text-xs">{s.bluesky} ({blueskyPct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${blueskyPct}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Mastodon</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200 text-xs">{s.mastodon} ({mastodonPct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${mastodonPct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search politician..."
            className="w-full sm:w-80 p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.x}
                onChange={(e) => setFilters(prev => ({ ...prev, x: e.target.checked }))}
                className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-900"
              />
              X
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.bluesky}
                onChange={(e) => setFilters(prev => ({ ...prev, bluesky: e.target.checked }))}
                className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-900"
              />
              Bluesky
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.mastodon}
                onChange={(e) => setFilters(prev => ({ ...prev, mastodon: e.target.checked }))}
                className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-900"
              />
              Mastodon
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer border-l pl-4 border-gray-200 dark:border-zinc-800">
              <input
                type="checkbox"
                checked={filters.none}
                onChange={(e) => setFilters(prev => ({ ...prev, none: e.target.checked }))}
                className="rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 dark:bg-zinc-900"
              />
              No accounts
            </label>
          </div>
        </div>

        {selectedParty && (
          <button
            onClick={() => setSelectedParty(null)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear Party Filter ({selectedParty})
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-zinc-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
            <thead className="bg-gray-50 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Party</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bluesky</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mastodon</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">X (Twitter)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
              {filteredPoliticians.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {p.name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {p.party && PARTY_LOGOS[p.party] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={PARTY_LOGOS[p.party]}
                        alt={p.party}
                        title={p.party}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <span>{p.party}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {p.social.bluesky ? (
                      <div className="flex flex-col">
                        <a href={`https://bsky.app/profile/${p.social.bluesky.handle}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                          @{p.social.bluesky.handle}
                        </a>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full ${isActive(p.social.bluesky.last_post) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">{formatDate(p.social.bluesky.last_post)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {p.social.mastodon ? (
                      <div className="flex flex-col">
                        {getMastodonUrl(p.social.mastodon.handle) ? (
                          <a href={getMastodonUrl(p.social.mastodon.handle)!} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                            {p.social.mastodon.handle}
                          </a>
                        ) : (
                          <span className="text-gray-900 dark:text-gray-300">{p.social.mastodon.handle}</span>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full ${isActive(p.social.mastodon.last_post) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">{formatDate(p.social.mastodon.last_post)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {p.social.x ? (
                      <a href={`https://x.com/${p.social.x}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                        @{p.social.x}
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <a
                      href={`https://www.wikidata.org/wiki/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-zinc-700 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Edit on Wikidata
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPoliticians.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No politicians found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
