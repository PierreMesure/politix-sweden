"use client";

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Politician, Platform } from '../types';
import { DATA_URL } from '../utils';
import DashboardStats from './DashboardStats';
import DashboardFilters from './DashboardFilters';
import PoliticianTable from './PoliticianTable';

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Controls
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>('all');

  useEffect(() => {
    console.log("Fetching data from:", DATA_URL);
    fetch(DATA_URL)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.json();
      })
      .then(json => {
        console.log("Data loaded, count:", json.length);
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setError("Failed to load data.");
        setLoading(false);
      });
  }, []);

  const parties = useMemo(() => {
    const s = new Set<string>();
    const unknownLabel = t('table.unknownParty');
    data.forEach(p => s.add(p.party || unknownLabel));
    return Array.from(s).sort((a, b) => {
      if (a === unknownLabel) return 1;
      if (b === unknownLabel) return -1;
      return a.localeCompare(b, 'sv');
    });
  }, [data, t]);

  // 1. Filter by Party (Base for Stats & Chart)
  const filteredByParty = useMemo(() => {
    return data.filter(p => {
      const normalizedParty = p.party || t('table.unknownParty');
      return selectedParty ? normalizedParty === selectedParty : true;
    });
  }, [data, selectedParty, t]);

  // 2. Calculate Stats based on Party Selection
  const stats = useMemo(() => {
    const result = { total: 0, x: 0, bluesky: 0, mastodon: 0, all: 0 };
    
    filteredByParty.forEach(p => {
      result.total++;
      let hasAny = false;
      if (p.social.x) { result.x++; hasAny = true; }
      if (p.social.bluesky) { result.bluesky++; hasAny = true; }
      if (p.social.mastodon) { result.mastodon++; hasAny = true; }
      if (hasAny) result.all++;
    });

    return result;
  }, [filteredByParty]);

  const activeCount = stats[activePlatform];
  const inactiveCount = stats.total - activeCount;

  // 3. Filter for Table (Platform & Search)
  const filteredPoliticians = useMemo(() => {
    return filteredByParty.filter(p => {
      // Search
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Platform Filter
      let matchesPlatform = true;
      if (activePlatform === 'x') matchesPlatform = !!p.social.x;
      else if (activePlatform === 'bluesky') matchesPlatform = !!p.social.bluesky;
      else if (activePlatform === 'mastodon') matchesPlatform = !!p.social.mastodon;
      // 'all' shows everyone (no filter), consistent with "Overview"
      
      return matchesSearch && matchesPlatform;
    }).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  }, [filteredByParty, searchTerm, activePlatform]);

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
        loading={loading}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
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
        loading={loading}
        activePlatform={activePlatform}
      />
    </div>
  );
}