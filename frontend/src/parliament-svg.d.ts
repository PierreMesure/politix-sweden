declare module 'parliament-svg' {
  import { ReactNode } from 'react';

  interface Options {
    seatCount?: boolean;
    hFunction?: (tagName: string, props: Record<string, unknown>, ...children: ReactNode[]) => ReactNode;
  }

  const parliamentSvg: (
    parties: Record<string, { seats: number; colour: string }>,
    options?: boolean | Options
  ) => ReactNode;
  export default parliamentSvg;
}
