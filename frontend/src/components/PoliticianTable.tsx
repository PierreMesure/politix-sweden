import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Politician, Platform } from '../types';
import { PARTY_LOGOS, isActive, getMastodonUrl } from '../utils';

interface PoliticianTableProps {
  politicians: Politician[];
  loading: boolean;
  activePlatform: Platform;
}

export default function PoliticianTable({ politicians, loading, activePlatform }: PoliticianTableProps) {
  const { t } = useTranslation();

  function formatDate(dateStr: string | null) {
    if (!dateStr) return t('table.never');
    if (dateStr === 'closed') return t('table.closed');
    if (dateStr === 'protected') return t('table.protected');
    return new Date(dateStr).toLocaleDateString();
  }

  const showX = activePlatform === 'all' || activePlatform === 'x';
  const showBluesky = activePlatform === 'all' || activePlatform === 'bluesky';
  const showMastodon = activePlatform === 'all' || activePlatform === 'mastodon';

  return (
    <div className="bg-white dark:bg-zinc-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
          <thead className="bg-gray-50 dark:bg-zinc-950">
            <tr>
              <th className="pl-2 pr-1 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.name')}</th>
              <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.party')}</th>

              {showBluesky && (
                <th className="px-1 py-3 text-center lg:text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <span className="hidden lg:inline">{t('table.bluesky')}</span>
                  <div className="lg:hidden flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/service_logos/bluesky.svg" alt="Bluesky" className="w-5 h-5 opacity-70 dark:invert" />
                  </div>
                </th>
              )}

              {showMastodon && (
                <th className="px-1 py-3 text-center lg:text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <span className="hidden lg:inline">{t('table.mastodon')}</span>
                  <div className="lg:hidden flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/service_logos/mastodon.svg" alt="Mastodon" className="w-5 h-5 opacity-70 dark:invert" />
                  </div>
                </th>
              )}

              {showX && (
                <th className="px-1 py-3 text-center lg:text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <span className="hidden lg:inline">{t('table.x')}</span>
                  <div className="lg:hidden flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/service_logos/x.svg" alt="X" className="w-5 h-5 opacity-70 dark:invert" />
                  </div>
                </th>
              )}

              <th className="pl-1 pr-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('table.edit')}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-1 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div></td>
                  <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded-full"></div></td>
                  {showBluesky && <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto lg:mx-0"></div></td>}
                  {showMastodon && <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto lg:mx-0"></div></td>}
                  {showX && <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-6 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto lg:mx-0"></div></td>}
                  <td className="px-1 py-4 whitespace-nowrap"><div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded"></div></td>
                </tr>
              ))
            ) : (
              politicians.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                  <td className="pl-2 pr-1 py-4 text-sm font-medium text-gray-900 dark:text-white w-1/3 min-w-[120px] whitespace-normal break-words">
                    {p.name}
                  </td>
                  <td className="px-1 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 max-w-[80px] truncate">
                    {p.party && PARTY_LOGOS[p.party] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={PARTY_LOGOS[p.party]}
                        alt={p.party}
                        title={p.party}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <span title={p.party || t('table.unknownParty')}>{p.party || t('table.unknownParty')}</span>
                    )}
                  </td>

                  {showBluesky && (
                    <td className="px-1 py-4 whitespace-nowrap text-sm">
                      {p.social.bluesky ? (
                        <div className="flex flex-col items-center lg:items-start">
                          {/* Mobile: Icon */}
                          <a
                            href={`https://bsky.app/profile/${p.social.bluesky.handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="lg:hidden hover:opacity-80 transition-opacity"
                            title={`@${p.social.bluesky.handle}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/service_logos/bluesky.svg" alt="Bluesky" className="w-6 h-6 dark:invert" />
                          </a>
                          {/* Desktop: Handle */}
                          <a
                            href={`https://bsky.app/profile/${p.social.bluesky.handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden lg:block text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            @{p.social.bluesky.handle}
                          </a>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isActive(p.social.bluesky.last_post) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} title={isActive(p.social.bluesky.last_post) ? t('table.active') : t('table.inactive')}></span>
                            <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-500">{formatDate(p.social.bluesky.last_post)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-zinc-700 flex justify-center lg:justify-start">-</span>
                      )}
                    </td>
                  )}

                  {showMastodon && (
                    <td className="px-1 py-4 whitespace-nowrap text-sm">
                      {p.social.mastodon ? (
                        <div className="flex flex-col items-center lg:items-start">
                          {getMastodonUrl(p.social.mastodon.handle) ? (
                            <>
                              {/* Mobile: Icon */}
                              <a
                                href={getMastodonUrl(p.social.mastodon.handle)!}
                                target="_blank"
                                rel="noreferrer"
                                className="lg:hidden hover:opacity-80 transition-opacity"
                                title={p.social.mastodon.handle}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/service_logos/mastodon.svg" alt="Mastodon" className="w-6 h-6 dark:invert" />
                              </a>
                              {/* Desktop: Handle */}
                              <a
                                href={getMastodonUrl(p.social.mastodon.handle)!}
                                target="_blank"
                                rel="noreferrer"
                                className="hidden lg:block text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                {p.social.mastodon.handle}
                              </a>
                            </>
                          ) : (
                            <span className="text-gray-900 dark:text-gray-300" title={p.social.mastodon.handle}>?</span>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isActive(p.social.mastodon.last_post) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} title={isActive(p.social.mastodon.last_post) ? t('table.active') : t('table.inactive')}></span>
                            <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-500">{formatDate(p.social.mastodon.last_post)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-zinc-700 flex justify-center lg:justify-start">-</span>
                      )}
                    </td>
                  )}

                  {showX && (
                    <td className="px-1 py-4 whitespace-nowrap text-sm">
                      {p.social.x ? (
                        <div className="flex flex-col items-center lg:items-start">
                          {/* Mobile: Icon */}
                          <a
                            href={`https://x.com/${p.social.x.handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="lg:hidden hover:opacity-80 transition-opacity"
                            title={`@${p.social.x.handle}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/service_logos/x.svg" alt="X (Twitter)" className="w-6 h-6 dark:invert" />
                          </a>
                          {/* Desktop: Handle */}
                          <a
                            href={`https://x.com/${p.social.x.handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden lg:block text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            @{p.social.x.handle}
                          </a>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isActive(p.social.x.last_post) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} title={isActive(p.social.x.last_post) ? t('table.active') : t('table.inactive')}></span>
                            <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-500">{formatDate(p.social.x.last_post)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-zinc-700 flex justify-center lg:justify-start">-</span>
                      )}
                    </td>
                  )}

                  <td className="pl-1 pr-2 py-4 whitespace-nowrap text-sm">
                    <a
                      href={`https://www.wikidata.org/wiki/${p.id}#P2002`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-zinc-700 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                      title={t('table.editOnWikidata')}
                    >
                      <span className="hidden lg:inline">{t('table.editOnWikidata')}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/edit.svg" alt="" className="w-4 h-4 lg:hidden dark:invert opacity-70" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && politicians.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          {t('table.noResults')}
        </div>
      )}
    </div>
  );
}
