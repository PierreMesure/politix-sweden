import React from 'react';

declare module 'parliament-svg' {
  interface Options {
    seatCount?: boolean;
    hFunction?: (tagName: string, props: Record<string, unknown>, ...children: React.ReactNode[]) => React.ReactNode;
  }

  const parliamentSvg: (
    parties: Record<string, { seats: number; colour: string }>,
    options?: boolean | Options
  ) => React.ReactNode;
  export default parliamentSvg;
}
