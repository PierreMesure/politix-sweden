"use client";

import { useMemo, createElement } from 'react';
import parliamentSvg from 'parliament-svg';
import { Platform } from '../types';

type ParliamentChartProps = {
  activeCount: number;
  inactiveCount: number;
  platform: Platform;
};

const PLATFORM_COLORS: Record<Platform, string> = {
  x: "currentColor",
  bluesky: "#0085ff",
  mastodon: "#6364ff",
  all: "#10b981", // Emerald 500
};

// React adapter for parliament-svg's hFunction
function renderToReact(tagName: string, props: Record<string, unknown>, ...children: React.ReactNode[]): React.ReactNode {
  const { class: className, ...rest } = props || {};

  return createElement(tagName, {
    ...rest,
    className: typeof className === 'string' ? className : undefined
  }, ...children);
}

export default function ParliamentChart({ activeCount, inactiveCount, platform }: ParliamentChartProps) {

  // Dynamic styles for the fill colors
  const activeColor = PLATFORM_COLORS[platform];
  const inactiveColor = "#d4d4d8"; // zinc-300

  const chart = useMemo(() => {
    // Ensure counts are non-negative integers
    const active = Math.max(0, Math.floor(activeCount));
    const inactive = Math.max(0, Math.floor(inactiveCount));

    if (active + inactive === 0) return null;

    // Create the grouping object. Keys become CSS classes.
    const parties = {
      "active": {
        seats: active,
        colour: activeColor
      },
      "inactive": {
        seats: inactive,
        colour: inactiveColor
      },
    };

    // Generate the React tree directly using hFunction
    return parliamentSvg(parties, {
      seatCount: false,
      hFunction: renderToReact
    });
  }, [activeCount, inactiveCount, activeColor, inactiveColor]);

  if (!chart) return null;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg aspect-[2/1] parliament-chart text-black dark:text-white [&>svg]:w-full [&>svg]:h-full [&_circle]:stroke-black/10 dark:[&_circle]:stroke-white/10 [&_circle]:stroke-[0.1px]">
        {chart}
      </div>
    </div>
  );
}
