"use client";

import { useMemo } from 'react';
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

// Simple VNode serializer since vdom-to-html is failing with version mismatches
function serialize(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text; // Text node
  
  if (!node.tagName) return '';
  
  let props = '';
  if (node.properties) {
    for (let k in node.properties) {
      if (Object.prototype.hasOwnProperty.call(node.properties, k)) {
        // Map className to class for HTML/SVG output
        const attrName = k === 'className' ? 'class' : k;
        
        // Some properties might be objects (style), ignore for now if not string/number
        const val = node.properties[k];
        if (typeof val === 'string' || typeof val === 'number') {
             props += ` ${attrName}="${val}"`;
        }
      }
    }
  }
  
  let children = '';
  if (node.children && Array.isArray(node.children)) {
    children = node.children.map(serialize).join('');
  }
  
  return `<${node.tagName}${props}>${children}</${node.tagName}>`;
}

export default function ParliamentChart({ activeCount, inactiveCount, platform }: ParliamentChartProps) {
  
  // Dynamic styles for the fill colors
  const activeColor = PLATFORM_COLORS[platform];
  const inactiveColor = "#d4d4d8"; // zinc-300

  const svgHtml = useMemo(() => {
    // Ensure counts are non-negative integers
    const active = Math.max(0, Math.floor(activeCount));
    const inactive = Math.max(0, Math.floor(inactiveCount));
    
    if (active + inactive === 0) return "";

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

    // Generate the VNode
    const svgVNode = parliamentSvg(parties, true); 
    const html = serialize(svgVNode);
    return html;
  }, [activeCount, inactiveCount, activeColor, inactiveColor]);

  if (!svgHtml) return null;

  return (
    <div className="w-full flex justify-center">
      <div 
        className="w-full max-w-lg aspect-[2/1] parliament-chart text-black dark:text-white [&>svg]:w-full [&>svg]:h-full [&_circle]:stroke-black/10 dark:[&_circle]:stroke-white/10 [&_circle]:stroke-[0.1px]"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    </div>
  );
}