import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface Filters {
  x: boolean;
  bluesky: boolean;
  mastodon: boolean;
  none: boolean;
}

interface DashboardFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  selectedParty: string | null;
  setSelectedParty: (party: string | null) => void;
}

export default function DashboardFilters({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  selectedParty,
  setSelectedParty,
}: DashboardFiltersProps) {
  const { t } = useTranslation();

  return (
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
  );
}
