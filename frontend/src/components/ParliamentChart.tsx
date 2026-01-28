"use client";

import { useMemo, createElement } from 'react';
import parliamentSvg from 'parliament-svg';
import { Platform, StatusStats } from '../types';

type ParliamentChartProps = {
  stats: StatusStats;
  platform: Platform;
};

const PLATFORM_COLORS: Record<Platform, string> = {
  x: "currentColor",
  bluesky: "#0085ff",
  mastodon: "#6364ff",
  all: "#10b981", // Emerald 500
};

const STATUS_COLORS = {
  active: "#10b981",   // Green
  inactive: "#f59e0b", // Orange
  closed: "#ef4444",   // Red
  none: "#9ca3af",     // Gray
};

// React adapter for parliament-svg's hFunction
function renderToReact(tagName: string, props: Record<string, unknown>, ...children: React.ReactNode[]): React.ReactNode {
  const { class: className, ...rest } = props || {};

  return createElement(tagName, {
    ...rest,
    className: typeof className === 'string' ? className : undefined
  }, ...children);
}

export default function ParliamentChart({ stats, platform }: ParliamentChartProps) {

  const chart = useMemo(() => {
    if (stats.total === 0) return null;

    // Create the grouping object. Keys become CSS classes.
    const parties = {
      "active": {
        seats: stats.active,
        colour: STATUS_COLORS.active
      },
      "inactive": {
        seats: stats.inactive,
        colour: STATUS_COLORS.inactive
      },
      "closed": {
        seats: stats.closed,
        colour: STATUS_COLORS.closed
      },
      "none": {
        seats: stats.none,
        colour: STATUS_COLORS.none
      },
    };

    // Generate the React tree directly using hFunction
    return parliamentSvg(parties, {
      seatCount: false,
      hFunction: renderToReact
    });
  }, [stats]);

  if (!chart) return null;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg aspect-[2/1] parliament-chart text-black dark:text-white [&>svg]:w-full [&>svg]:h-full [&_circle]:stroke-black/10 dark:[&_circle]:stroke-white/10 [&_circle]:stroke-[0.1px]">
        {chart}
      </div>
    </div>
  );
}
