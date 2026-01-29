"use client";

import { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Politician, Platform, DashboardStatsData, StatusStats, StatsData } from '../types';
import { DATA_URL, STATS_URL, isActive } from '../utils';
import DashboardStats from './DashboardStats';
import DashboardFilters from './DashboardFilters';
import PoliticianTable from './PoliticianTable';

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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('description')}
        </p>
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

      <DashboardFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedParty={selectedParty}
        setSelectedParty={setSelectedParty}
        activePlatform={activePlatform}
        setActivePlatform={setActivePlatform}
      />

      <PoliticianTable
        politicians={filteredPoliticians}
        loading={dataLoading}
        activePlatform={activePlatform}
      />
    </div>
  );
}
