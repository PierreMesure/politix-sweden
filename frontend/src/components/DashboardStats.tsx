import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import ParliamentChart from './ParliamentChart';
import { PARTY_LOGOS } from '../utils';
import { Platform } from '../types';

interface DashboardStatsProps {
  loading: boolean;
  activeCount: number;
  inactiveCount: number;
  activePlatform: Platform;
  setActivePlatform: (platform: Platform) => void;
  stats: { total: number; x: number; bluesky: number; mastodon: number; all: number };
  parties: string[];
  selectedParty: string | null;
  setSelectedParty: (party: string | null) => void;
}

export default function DashboardStats({
  loading,
  activeCount,
  inactiveCount,
  activePlatform,
  setActivePlatform,
  stats,
  parties,
  selectedParty,
  setSelectedParty,
}: DashboardStatsProps) {
  const { t } = useTranslation();

  const platforms: Platform[] = ['all', 'x', 'bluesky', 'mastodon'];

  const visibleProgressBars = activePlatform === 'all' 
    ? ['x', 'bluesky', 'mastodon'] as const 
    : [activePlatform] as const;

  return (
    <section className="space-y-8">
      <div className="flex flex-col items-center gap-6">
        {/* View Selector */}
        <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activePlatform === p 
                  ? 'bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {p !== 'all' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={`/service_logos/${p}.svg`} 
                  alt={p} 
                  className="w-4 h-4 dark:invert opacity-80" 
                />
              )}
              {p === 'all' ? t('table.total') : t(`table.${p}`)}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="w-full max-w-2xl flex flex-col items-center">
          {loading ? (
            <div className="w-full aspect-[2/1] bg-gray-100 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
          ) : (
            <ParliamentChart 
              activeCount={activeCount} 
              inactiveCount={inactiveCount} 
              platform={activePlatform} 
            />
          )}
          <div className="mt-4 text-center">
            {!loading && (
              <>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {activeCount} <span className="text-lg font-normal text-gray-500 dark:text-gray-400">/ {stats.total}</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {activePlatform === 'all' 
                    ? t('stats.activeMembers')
                    : `${t(`filters.${activePlatform === 'x' ? 'x' : activePlatform}`)} ${t('stats.members')}`
                  }
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Global Progress Bars */}
      <div className={`grid gap-6 mx-auto transition-all ${
        activePlatform === 'all' 
          ? 'grid-cols-1 md:grid-cols-3 max-w-4xl' 
          : 'grid-cols-1 max-w-md'
      }`}>
        {loading ? (
          Array.from({ length: activePlatform === 'all' ? 3 : 1 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm animate-pulse h-20"></div>
          ))
        ) : (
          visibleProgressBars.map((p) => {
            // Safe access since we know p is one of the keys
            const count = stats[p as 'x' | 'bluesky' | 'mastodon'];
            const pct = stats.total ? ((count / stats.total) * 100).toFixed(1) : "0.0";
            const color = p === 'x' ? 'bg-black dark:bg-white' : p === 'bluesky' ? 'bg-blue-500' : 'bg-purple-500';
            
            return (
              <div key={p} className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`/service_logos/${p}.svg`} 
                      alt={p} 
                      className="w-4 h-4 dark:invert opacity-80" 
                    />
                    {t(`table.${p}`)}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{pct}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Party Filters */}
      <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-24 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full animate-pulse"></div>
          ))
        ) : (
          parties.map(party => (
            <button
              key={party}
              onClick={() => setSelectedParty(selectedParty === party ? null : party)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
                selectedParty === party 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300' 
                  : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {PARTY_LOGOS[party] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={PARTY_LOGOS[party]} alt={party} className="w-6 h-6 object-contain" />
              )}
              <span className="text-sm font-medium">{party}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
