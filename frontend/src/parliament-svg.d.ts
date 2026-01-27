declare module 'parliament-svg' {
  const parliamentSvg: (
    parties: Record<string, { seats: number; colour: string }>,
    seatCount?: boolean
  ) => any;
  export default parliamentSvg;
}
