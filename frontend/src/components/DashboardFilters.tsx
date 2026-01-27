import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Platform } from '../types';

interface DashboardFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedParty: string | null;
  setSelectedParty: (party: string | null) => void;
  activePlatform: Platform;
  setActivePlatform: (platform: Platform) => void;
}

export default function DashboardFilters({
  searchTerm,
  setSearchTerm,
  selectedParty,
  setSelectedParty,
  activePlatform,
  setActivePlatform,
}: DashboardFiltersProps) {
  const { t } = useTranslation();

  const hasFilters = selectedParty !== null || searchTerm !== "" || activePlatform !== 'all';

  const clearAll = () => {
    setSelectedParty(null);
    setSearchTerm("");
    setActivePlatform('all');
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
      <div className="relative w-full md:max-w-md">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          className="w-full p-2.5 pl-3 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-4 decoration-2 whitespace-nowrap"
        >
          {selectedParty && !searchTerm && activePlatform === 'all' 
            ? `${t('filters.clearParty')} (${selectedParty})`
            : t('filters.clearAll')
          }
        </button>
      )}
    </div>
  );
}