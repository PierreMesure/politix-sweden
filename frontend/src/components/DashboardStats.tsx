import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import ParliamentChart from './ParliamentChart';
import { PARTY_LOGOS } from '../utils';
import { Platform, StatusStats, DashboardStatsData } from '../types';

interface DashboardStatsProps {
  loading: boolean;
  currentStats: StatusStats;
  activePlatform: Platform;
  setActivePlatform: (platform: Platform) => void;
  stats: DashboardStatsData;
  parties: string[];
  selectedParty: string | null;
  setSelectedParty: (party: string | null) => void;
}

const STATUS_COLORS = {
  active: "bg-[#10b981]",   // Green
  inactive: "bg-[#f59e0b]", // Orange
  closed: "bg-[#ef4444]",   // Red
  none: "bg-[#9ca3af]",     // Gray
};

export default function DashboardStats({
  loading,
  currentStats,
  activePlatform,
  setActivePlatform,
  stats,
  parties,
  selectedParty,
  setSelectedParty,
}: DashboardStatsProps) {
  const { t } = useTranslation();

  const getPercentage = (value: number) => {
    if (!currentStats || currentStats.total === 0) return "0.0";
    return ((value / currentStats.total) * 100).toFixed(1);
  };

  const platforms: Platform[] = ['all', 'x', 'bluesky', 'mastodon'];

  const visibleProgressBars = activePlatform === 'all' 
    ? ['all'] as const 
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
              stats={currentStats} 
              platform={activePlatform} 
            />
          )}
          <div className="mt-4 text-center">
            {!loading && (
              <>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {currentStats.active + currentStats.inactive} <span className="text-lg font-normal text-gray-500 dark:text-gray-400">/ {currentStats.total}</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {activePlatform === 'all' 
                    ? t('stats.activeMembers')
                    : `${t(`table.${activePlatform}`)} ${t('stats.members')}`
                  }
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Breakdown Progress Bar */}
      <div className="max-w-xl mx-auto w-full">
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm animate-pulse h-24"></div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {activePlatform === 'all' ? t('table.total') : t(`table.${activePlatform}`)}
              </h3>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-4">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS.active}`}></span>
                  {t('table.active')}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS.inactive}`}></span>
                  {t('table.inactive')}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS.closed}`}></span>
                  {t('table.closed')}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS.none}`}></span>
                  {t('filters.noAccounts')}
                </span>
              </div>
            </div>

            <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-4 overflow-hidden flex">
              <div 
                className={`${STATUS_COLORS.active} h-full transition-all duration-500`} 
                style={{ width: `${getPercentage(currentStats.active)}%` }}
                title={`${t('table.active')}: ${currentStats.active}`}
              ></div>
              <div 
                className={`${STATUS_COLORS.inactive} h-full transition-all duration-500`} 
                style={{ width: `${getPercentage(currentStats.inactive)}%` }}
                title={`${t('table.inactive')}: ${currentStats.inactive}`}
              ></div>
              <div 
                className={`${STATUS_COLORS.closed} h-full transition-all duration-500`} 
                style={{ width: `${getPercentage(currentStats.closed)}%` }}
                title={`${t('table.closed')}: ${currentStats.closed}`}
              ></div>
              <div 
                className={`${STATUS_COLORS.none} h-full transition-all duration-500`} 
                style={{ width: `${getPercentage(currentStats.none)}%` }}
                title={`${t('filters.noAccounts')}: ${currentStats.none}`}
              ></div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {getPercentage(currentStats.active)}%
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t('table.active')}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {getPercentage(currentStats.inactive)}%
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t('table.inactive')}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {getPercentage(currentStats.closed)}%
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t('table.closed')}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {getPercentage(currentStats.none)}%
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t('filters.noAccounts')}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Party Filters */}
      <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-24 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full animate-pulse"></div>
          ))
        ) : (
          <>
            {/* Individual Parties */}
            {parties.flatMap(party => {
              const isUnknown = party === t('table.unknownParty');
              
              const elements = [];
              
              // If we are about to render the 'Unknown' party, insert coalitions first
              if (isUnknown) {
                elements.push(
                  <button
                    key="tido"
                    onClick={() => setSelectedParty(selectedParty === 'tido' ? null : 'tido')}
                    className={`px-4 py-2 rounded-full border transition-all text-sm font-medium ${
                      selectedParty === 'tido'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t('filters.tido')}
                  </button>
                );
                elements.push(
                  <button
                    key="opposition"
                    onClick={() => setSelectedParty(selectedParty === 'opposition' ? null : 'opposition')}
                    className={`px-4 py-2 rounded-full border transition-all text-sm font-medium ${
                      selectedParty === 'opposition'
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t('filters.opposition')}
                  </button>
                );
              }

              elements.push(
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
              );
              
              return elements;
            })}
          </>
        )}
      </div>
    </section>
  );
}
