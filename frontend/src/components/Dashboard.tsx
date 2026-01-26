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

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

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
      const matchesParty = selectedParty ? p.party === selectedParty : true;
      return matchesSearch && matchesParty;
    });
  }, [searchTerm, selectedParty]);

  const parties = Object.keys(stats).sort();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Politix Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Monitoring social media presence of {DATA.length} politicians.
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
                <h3 className={`font-semibold ${selectedParty === party ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>{party}</h3>
                <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">{s.total} members</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">X (Twitter)</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">{s.x} ({xPct}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Bluesky</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">{s.bluesky} ({blueskyPct}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Mastodon</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">{s.mastodon} ({mastodonPct}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <input 
          type="text" 
          placeholder="Search politician..." 
          className="w-full sm:w-96 p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Party</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bluesky</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mastodon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">X (Twitter)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
              {filteredPoliticians.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {p.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {p.party}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {p.social.mastodon ? (
                      <div className="flex flex-col">
                         <span className="text-gray-900 dark:text-gray-300">{p.social.mastodon.handle}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full ${isActive(p.social.mastodon.last_post) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">{formatDate(p.social.mastodon.last_post)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {p.social.x ? (
                      <a href={`https://x.com/${p.social.x}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                        @{p.social.x}
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-zinc-600">-</span>
                    )}
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
