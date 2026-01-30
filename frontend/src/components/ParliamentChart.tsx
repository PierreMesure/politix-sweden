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
function renderToReact(tagName: string, props: Record<string, any>, ...children: React.ReactNode[]): React.ReactNode {
  const { class: className, ...rest } = props || {};
  
  // Generate a stable key for circles (seats) using their coordinates
  const key = rest.key || (tagName === 'circle' ? `${rest.cx}-${rest.cy}` : undefined);

  return createElement(tagName, {
    ...rest,
    key,
    className: typeof className === 'string' ? className : undefined
  }, ...children);
}

export default function ParliamentChart({ stats, platform }: ParliamentChartProps) {

  const chart = useMemo(() => {
    if (!stats || stats.total <= 1) return null;

    // Helper to ensure we have a valid integer >= 0
    const sanitize = (val: any) => {
      const n = Math.floor(Number(val));
      return isNaN(n) ? 0 : Math.max(0, n);
    };

    const active = sanitize(stats.active);
    const inactive = sanitize(stats.inactive);
    const closed = sanitize(stats.closed);
    const none = sanitize(stats.none);

    if (active + inactive + closed + none === 0) return null;

    // Create the grouping object.
    // Some libraries fail if given 0 seats for a category, so we filter them out.
    const parties: Record<string, { seats: number; colour: string }> = {};
    
    if (active > 0) parties.active = { seats: active, colour: STATUS_COLORS.active };
    if (inactive > 0) parties.inactive = { seats: inactive, colour: STATUS_COLORS.inactive };
    if (closed > 0) parties.closed = { seats: closed, colour: STATUS_COLORS.closed };
    if (none > 0) parties.none = { seats: none, colour: STATUS_COLORS.none };

    // Final check to ensure we have at least one party with seats
    if (Object.keys(parties).length === 0) return null;

    try {
      return parliamentSvg(parties, {
        seatCount: false,
        hFunction: renderToReact
      });
    } catch (err) {
      console.error("parliament-svg error:", err, parties);
      return null;
    }
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
