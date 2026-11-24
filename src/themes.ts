/**
 * Festive modes. Each one swaps the colors, the postcard badges and the
 * floating decorations. Names and taglines live in i18n under `themes.<id>`.
 */

export type ParticleMotion = 'fall' | 'spin' | 'rise' | 'twinkle' | 'sway' | 'groove' | 'wiggle';

export interface ThemeDefinition {
  id: ThemeId;
  icon: string;
  /** Emoji that float around the screen; empty means no decorations at all. */
  particles: string[];
  motion: ParticleMotion;
  /** Emoji shown in the postcard corners; null keeps the original artwork. */
  badges: [string, string] | null;
}

export const THEME_IDS = [
  'classic',
  'jewish',
  'hindu',
  'christian',
  'muslim',
  'buddhist',
  'zoroastrian',
  'rastafarian',
  'pastafarian',
  'atheist',
] as const;

export type ThemeId = typeof THEME_IDS[number];

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  classic: {
    id: 'classic',
    icon: '🎅',
    particles: [],
    motion: 'fall',
    badges: null,
  },
  jewish: {
    id: 'jewish',
    icon: '🕎',
    particles: ['🕎', '✡️', '🍩', '🥔', '🕯️', '🥯', '🍲', '🫖'],
    motion: 'spin',
    badges: ['🕎', '🍩'],
  },
  hindu: {
    id: 'hindu',
    icon: '🪔',
    particles: ['🪔', '🌼', '✨', '🎆', '🎇', '🍬', '🥭', '🪔', '💃'],
    motion: 'rise',
    badges: ['🪔', '🌼'],
  },
  christian: {
    id: 'christian',
    icon: '⭐',
    particles: ['⭐', '🔔', '🎄', '👼', '🎅', '🧦', '🦌', '🍪', '🧶', '⛄'],
    motion: 'sway',
    badges: ['⭐', '🔔'],
  },
  muslim: {
    id: 'muslim',
    icon: '🌙',
    particles: ['🌙', '⭐', '🏮', '✨', '🍬', '🌟', '🥟', '🍚', '🫖'],
    motion: 'twinkle',
    badges: ['🌙', '🏮'],
  },
  buddhist: {
    id: 'buddhist',
    icon: '🪷',
    particles: ['🪷', '🏮', '🕊️', '🌸', '🧘', '☸️', '🍵', '🔔'],
    motion: 'rise',
    badges: ['🪷', '🏮'],
  },
  zoroastrian: {
    id: 'zoroastrian',
    icon: '🔥',
    particles: ['🔥', '🌱', '🐟', '🍎', '🪞', '🥚', '🍬', '🔥', '🌷'],
    motion: 'rise',
    badges: ['🔥', '🌱'],
  },
  rastafarian: {
    id: 'rastafarian',
    icon: '🦁',
    particles: ['🦁', '🥁', '🎶', '❤️', '💛', '💚', '🎸', '🥥', '🌴'],
    motion: 'groove',
    badges: ['🦁', '🥁'],
  },
  pastafarian: {
    id: 'pastafarian',
    icon: '🍝',
    particles: ['🍝', '🧆', '🏴‍☠️', '🦜', '🍺', '🧀', '🍜', '☠️', '🌋', '🍝'],
    motion: 'wiggle',
    badges: ['🍝', '🏴‍☠️'],
  },
  atheist: {
    id: 'atheist',
    icon: '▫️',
    particles: [],
    motion: 'fall',
    badges: null,
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as ReadonlyArray<string>).includes(value);
}
