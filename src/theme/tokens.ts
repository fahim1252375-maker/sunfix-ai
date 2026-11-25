export const TOKENS = {
  // Surfaces & backgrounds
  ink: '#0E1A17',
  moss: '#15241F',
  mossRaised: '#1C2F28',
  mossDeep: '#0A1411',

  // Hairlines
  hairline: 'rgba(236, 229, 214, 0.10)',
  hairlineStrong: 'rgba(236, 229, 214, 0.18)',

  // Typography
  bone: '#F3EEE3',
  sage: '#9FB0A6',

  // Accents & semantics
  brass: '#D9A441',
  brassSoft: 'rgba(217, 164, 65, 0.14)',
  mint: '#8FD3B0',
  terracotta: '#E0715B',
  sky: '#6CC4C9', // Energy flow only — use sparingly
  amberWarn: '#E8B65A',

  // 3D scene material colors (derived from organic moss/brass/bone palette)
  scene: {
    skyBackdrop: '#0A1411',
    roofMembrane: '#16231F',
    parapetConcrete: '#263832',
    equipmentPad: '#20312B',
    aluminumFrame: '#A9B7AE',
    rackingSteel: '#586B62',
    cellBaseDark: '#10242A',
    cellBusbar: '#4B7D82',
    inverterChassis: '#1F332C',
    inverterHeatsink: '#6B7E74',
    batteryEnclosure: '#233830',
    hvacUnit: '#2D4039',
    utilityPole: '#544B3D',
    transformerBody: '#3C4D46',
    planterFoliage: '#3D614B',
    conduitNominal: '#355148',
    conduitFault: '#5A2B24',
  },
} as const;

export const CSS_VARS = {
  ink: 'var(--ink)',
  moss: 'var(--moss)',
  mossRaised: 'var(--moss-raised)',
  mossDeep: 'var(--moss-deep)',
  hairline: 'var(--hairline)',
  hairlineStrong: 'var(--hairline-strong)',
  bone: 'var(--bone)',
  sage: 'var(--sage)',
  brass: 'var(--brass)',
  brassSoft: 'var(--brass-soft)',
  mint: 'var(--mint)',
  terracotta: 'var(--terracotta)',
  sky: 'var(--sky)',
  amberWarn: 'var(--amber-warn)',
} as const;
