"use client";

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Politician } from '../types';
import { DATA_URL } from '../utils';
import DashboardStats from './DashboardStats';
import DashboardFilters from './DashboardFilters';
import PoliticianTable from './PoliticianTable';

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [viewPlatform, setViewPlatform] = useState<'x' | 'bluesky' | 'mastodon'>('x');
  const [filters, setFilters] = useState({
    x: true,
    bluesky: true,
    mastodon: true,
    none: true
  });

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

  const stats = useMemo(() => {
    const global = { total: 0, x: 0, bluesky: 0, mastodon: 0 };
    
    data.forEach(p => {
      global.total++;
      if (p.social.x) global.x++;
      if (p.social.bluesky) global.bluesky++;
      if (p.social.mastodon) global.mastodon++;
    });

    return global;
  }, [data]);

  const activeCount = stats[viewPlatform];
  const inactiveCount = stats.total - activeCount;

  const parties = useMemo(() => {
    const s = new Set<string>();
    data.forEach(p => s.add(p.party || t('table.unknownParty')));
    return Array.from(s).sort();
  }, [data, t]);

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
  }, [data, searchTerm, selectedParty, filters, t]);

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
        viewPlatform={viewPlatform}
        setViewPlatform={setViewPlatform}
        stats={stats}
        parties={parties}
        selectedParty={selectedParty}
        setSelectedParty={setSelectedParty}
      />

      <DashboardFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        setFilters={setFilters}
        selectedParty={selectedParty}
        setSelectedParty={setSelectedParty}
      />

      <PoliticianTable 
        politicians={filteredPoliticians} 
        loading={loading} 
      />
    </div>
  );
}