"use client";

import { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Politician, Platform, DashboardStatsData, StatusStats, StatsData } from '../types';
import { DATA_URL, STATS_URL, isActive } from '../utils';
import DashboardStats from './DashboardStats';
import DashboardFilters from './DashboardFilters';
import PoliticianTable from './PoliticianTable';

const TIDO_PARTIES = ["Moderaterna", "Sverigedemokraterna", "Kristdemokraterna", "Liberalerna"];
const OPPOSITION_PARTIES = ["Socialdemokraterna", "Vänsterpartiet", "Miljöpartiet", "Centerpartiet"];

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<Politician[]>([]);
  const [precomputedStats, setPrecomputedStats] = useState<StatsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controls
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>('all');

  // Deferred values for smoother filtering
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredActivePlatform = useDeferredValue(activePlatform);

  useEffect(() => {
    // Fetch Stats
    fetch(STATS_URL)
      .then(res => res.ok ? res.json() : null)
      .then(stats => {
        if (stats) setPrecomputedStats(stats);
        setStatsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setStatsLoading(false);
      });

    // Fetch Data
    fetch(DATA_URL)
      .then(async res => {
        if (!res.ok) throw new Error("Failed to fetch data");
        const jsonData = await res.json();
        // Pre-sort by name once to avoid sorting in every memo
        jsonData.sort((a: Politician, b: Politician) => a.name.localeCompare(b.name, 'sv'));
        setData(jsonData);
        setDataLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setError("Failed to load data.");
        setDataLoading(false);
      });
  }, []);

  const parties = useMemo(() => {
    const s = new Set<string>();
    const unknownLabel = t('table.unknownParty');

    // If we have data, use it as primary source
    if (data.length > 0) {
      data.forEach(p => s.add(p.party || unknownLabel));
    } else if (precomputedStats) {
      // Fallback to stats if data isn't here yet
      Object.keys(precomputedStats.parties).forEach(p => s.add(p));
    }

    return Array.from(s).sort((a, b) => {
      if (a === unknownLabel) return 1;
      if (b === unknownLabel) return -1;
      return a.localeCompare(b, 'sv');
    });
  }, [data, precomputedStats, t]);

  // 1. Filter by Party (Base for Stats & Chart)
  const filteredByParty = useMemo(() => {
    return data.filter(p => {
      const normalizedParty = p.party || t('table.unknownParty');
      if (selectedParty === 'tido') return TIDO_PARTIES.includes(normalizedParty);
      if (selectedParty === 'opposition') return OPPOSITION_PARTIES.includes(normalizedParty);
      return selectedParty ? normalizedParty === selectedParty : true;
    });
  }, [data, selectedParty, t]);

  // 2. Calculate Stats based on Party Selection & Search
  const stats = useMemo((): DashboardStatsData => {
    // If we have a search term, we MUST recalculate locally
    // Otherwise, if we have precomputed stats, use them!
    if (!searchTerm && precomputedStats) {
      if (!selectedParty) return precomputedStats.global;
      if (precomputedStats.parties[selectedParty]) return precomputedStats.parties[selectedParty];
    }

    const empty = (): StatusStats => ({ active: 0, inactive: 0, closed: 0, none: 0, total: 0 });
    const res: DashboardStatsData = {
      all: empty(),
      x: empty(),
      bluesky: empty(),
      mastodon: empty(),
    };

    const targetData = searchTerm ? filteredByParty.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) : filteredByParty;

    targetData.forEach(p => {
      res.all.total++;
      res.x.total++;
      res.bluesky.total++;
      res.mastodon.total++;

      let anyActive = false;
      let anyInactive = false;
      let anyClosed = false;

      // X
      if (!p.social.x) { res.x.none++; }
      else if (p.social.x.last_post === 'closed') { res.x.closed++; anyClosed = true; }
      else if (isActive(p.social.x.last_post)) { res.x.active++; anyActive = true; }
      else { res.x.inactive++; anyInactive = true; }

      // Bluesky
      if (!p.social.bluesky) { res.bluesky.none++; }
      else if (p.social.bluesky.last_post === 'closed') { res.bluesky.closed++; anyClosed = true; }
      else if (isActive(p.social.bluesky.last_post)) { res.bluesky.active++; anyActive = true; }
      else { res.bluesky.inactive++; anyInactive = true; }

      // Mastodon
      if (!p.social.mastodon) { res.mastodon.none++; }
      else if (p.social.mastodon.last_post === 'closed') { res.mastodon.closed++; anyClosed = true; }
      else if (isActive(p.social.mastodon.last_post)) { res.mastodon.active++; anyActive = true; }
      else { res.mastodon.inactive++; anyInactive = true; }

      if (anyActive) res.all.active++;
      else if (anyInactive) res.all.inactive++;
      else if (anyClosed) res.all.closed++;
      else res.all.none++;
    });

    return res;
  }, [filteredByParty, searchTerm, precomputedStats, selectedParty]);

  const currentStats = stats[activePlatform];

  // 3. Filter for Table (Platform & Search)
  // Use deferred values for filtering the table so the rest of the UI stays responsive
  const filteredPoliticians = useMemo(() => {
    return filteredByParty.filter(p => {
      // Search
      const matchesSearch = p.name.toLowerCase().includes(deferredSearchTerm.toLowerCase());

      // Platform Filter
      let matchesPlatform = true;
      if (deferredActivePlatform === 'x') matchesPlatform = !!p.social.x;
      else if (deferredActivePlatform === 'bluesky') matchesPlatform = !!p.social.bluesky;
      else if (deferredActivePlatform === 'mastodon') matchesPlatform = !!p.social.mastodon;

      return matchesSearch && matchesPlatform;
    });
    // Sorting removed here because data is pre-sorted in useEffect
  }, [filteredByParty, deferredSearchTerm, deferredActivePlatform]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">{t('error')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-8 flex-grow w-full">
        <header className="space-y-4 px-1 md:px-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">
              politiX
            </h1>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-gray-100">{t('title')}</h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t('description').split('{carl}').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <a
                      href="https://carlheath.se/tag/social-media/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Carl Heath
                    </a>
                  )}
                </span>
              ))}
            </p>
          </div>
        </header>

        <DashboardStats
          loading={statsLoading}
          currentStats={currentStats}
          activePlatform={activePlatform}
          setActivePlatform={setActivePlatform}
          stats={stats}
          parties={parties}
          selectedParty={selectedParty}
          setSelectedParty={setSelectedParty}
        />

        <div className="space-y-4">
          <DashboardFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedParty={selectedParty}
            setSelectedParty={setSelectedParty}
            activePlatform={activePlatform}
            setActivePlatform={setActivePlatform}
          />
          <p className="text-xs text-center text-gray-400 dark:text-gray-500 px-4">
            {t('wikidataNote')}
          </p>
        </div>

        <PoliticianTable
          politicians={filteredPoliticians}
          loading={dataLoading}
          activePlatform={activePlatform}
        />
      </div>

      <footer className="mt-12 py-8 border-t border-gray-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('footer').split(/({pierre}|{github})/).map((part, i) => {
              if (part === '{pierre}') {
                return (
                  <a key={i} href="https://pierre.mesu.re" target="_blank" rel="noreferrer" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    Pierre Mesure
                  </a>
                );
              }
              if (part === '{github}') {
                return (
                  <a key={i} href="https://github.com/PierreMesure/politix-sweden" target="_blank" rel="noreferrer" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {t('githubLinkText')}
                  </a>
                );
              }
              return part;
            })}
          </p>
        </div>
      </footer>
    </div>
  );
}
