import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Platform } from '../types';
import { DATA_URL, CSV_URL } from '../utils';

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
  const [showDownload, setShowDownload] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (downloadRef.current && !downloadRef.current.contains(event.target as Node)) {
        setShowDownload(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPartyLabel = (party: string) => {
    if (party === 'tido') return t('filters.tido');
    if (party === 'opposition') return t('filters.opposition');
    return party;
  };

  const hasFilters = searchTerm !== '' || selectedParty !== null || activePlatform !== 'all';

  const clearAll = () => {
    setSearchTerm('');
    setSelectedParty(null);
    setActivePlatform('all');
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
      <div className="relative flex-grow w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          className="w-full p-2.5 pl-10 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-4 decoration-2 whitespace-nowrap"
          >
            {selectedParty && !searchTerm && activePlatform === 'all'
              ? `${t('filters.clearParty')} (${getPartyLabel(selectedParty)})`
              : t('filters.clearAll')
            }
          </button>
        )}

        <div className="relative" ref={downloadRef}>
          <button
            onClick={() => setShowDownload(!showDownload)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
            title={t('filters.download')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span className="hidden sm:inline">{t('filters.download')}</span>
          </button>

          {showDownload && (
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-gray-200 dark:border-zinc-700 z-10 overflow-hidden">
              <a
                href={DATA_URL}
                download
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                JSON
              </a>
              <a
                href={CSV_URL}
                download
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                CSV
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
