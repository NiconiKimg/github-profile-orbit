import { ThemeColors, VisualizationTheme } from '../types.js';

export const DARK_THEME: ThemeColors = {
  bg: '#080C16',
  bgSecondary: '#0B132B',
  bgGradient: ['#060913', '#0B1329', '#070C1B'],
  cardBg: 'rgba(15, 23, 42, 0.72)',
  cardBorder: 'rgba(148, 163, 184, 0.14)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#38BDF8',
  accentGlow: 'rgba(56, 189, 248, 0.35)',
  orbitLine: 'rgba(148, 163, 184, 0.16)',
  constellationLine: 'rgba(96, 165, 250, 0.22)',
  gridLine: 'rgba(148, 163, 184, 0.08)',
  starDust: 'rgba(255, 255, 255, 0.75)',
  radarRing: 'rgba(56, 189, 248, 0.12)',
  badgeBg: 'rgba(30, 41, 59, 0.7)'
};

export const LIGHT_THEME: ThemeColors = {
  bg: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  bgGradient: ['#FFFFFF', '#F8FAFC', '#F1F5F9'],
  cardBg: 'rgba(248, 250, 252, 0.95)',
  cardBorder: 'rgba(203, 213, 225, 0.95)',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  accent: '#0284C7',
  accentGlow: 'rgba(2, 132, 199, 0.25)',
  orbitLine: 'rgba(100, 116, 139, 0.22)',
  constellationLine: 'rgba(2, 132, 199, 0.35)',
  gridLine: 'rgba(226, 232, 240, 0.85)',
  starDust: 'rgba(148, 163, 184, 0.55)',
  radarRing: 'rgba(2, 132, 199, 0.18)',
  badgeBg: '#F1F5F9'
};

export function getThemeColors(theme: VisualizationTheme): ThemeColors {
  if (theme === 'light') return LIGHT_THEME;
  return DARK_THEME; // Default to dark for 'dark' or 'auto' base
}

/**
 * Generate CSS rules for SVG embedding.
 * Supports auto light/dark detection via @media (prefers-color-scheme).
 */
export function generateThemeCss(theme: VisualizationTheme): string {
  if (theme === 'dark') {
    return `
      :root {
        --color-bg: ${DARK_THEME.bg};
        --color-bg-secondary: ${DARK_THEME.bgSecondary};
        --color-card-bg: ${DARK_THEME.cardBg};
        --color-card-border: ${DARK_THEME.cardBorder};
        --color-text-primary: ${DARK_THEME.textPrimary};
        --color-text-secondary: ${DARK_THEME.textSecondary};
        --color-text-muted: ${DARK_THEME.textMuted};
        --color-accent: ${DARK_THEME.accent};
        --color-accent-glow: ${DARK_THEME.accentGlow};
        --color-orbit-line: ${DARK_THEME.orbitLine};
        --color-constellation-line: ${DARK_THEME.constellationLine};
        --color-grid-line: ${DARK_THEME.gridLine};
        --color-star-dust: ${DARK_THEME.starDust};
        --color-radar-ring: ${DARK_THEME.radarRing};
        --color-badge-bg: ${DARK_THEME.badgeBg};
        --color-sun-core: #FFFFFF;
        --color-node-stroke: rgba(255, 255, 255, 0.4);
      }
    `;
  }

  if (theme === 'light') {
    return `
      :root {
        --color-bg: ${LIGHT_THEME.bg};
        --color-bg-secondary: ${LIGHT_THEME.bgSecondary};
        --color-card-bg: ${LIGHT_THEME.cardBg};
        --color-card-border: ${LIGHT_THEME.cardBorder};
        --color-text-primary: ${LIGHT_THEME.textPrimary};
        --color-text-secondary: ${LIGHT_THEME.textSecondary};
        --color-text-muted: ${LIGHT_THEME.textMuted};
        --color-accent: ${LIGHT_THEME.accent};
        --color-accent-glow: ${LIGHT_THEME.accentGlow};
        --color-orbit-line: ${LIGHT_THEME.orbitLine};
        --color-constellation-line: ${LIGHT_THEME.constellationLine};
        --color-grid-line: ${LIGHT_THEME.gridLine};
        --color-star-dust: ${LIGHT_THEME.starDust};
        --color-radar-ring: ${LIGHT_THEME.radarRing};
        --color-badge-bg: ${LIGHT_THEME.badgeBg};
        --color-sun-core: #F59E0B;
        --color-node-stroke: #FFFFFF;
      }
    `;
  }

  // Auto theme: default to dark, adapt on prefers-color-scheme: light
  return `
    :root {
      --color-bg: ${DARK_THEME.bg};
      --color-bg-secondary: ${DARK_THEME.bgSecondary};
      --color-card-bg: ${DARK_THEME.cardBg};
      --color-card-border: ${DARK_THEME.cardBorder};
      --color-text-primary: ${DARK_THEME.textPrimary};
      --color-text-secondary: ${DARK_THEME.textSecondary};
      --color-text-muted: ${DARK_THEME.textMuted};
      --color-accent: ${DARK_THEME.accent};
      --color-accent-glow: ${DARK_THEME.accentGlow};
      --color-orbit-line: ${DARK_THEME.orbitLine};
      --color-constellation-line: ${DARK_THEME.constellationLine};
      --color-grid-line: ${DARK_THEME.gridLine};
      --color-star-dust: ${DARK_THEME.starDust};
      --color-radar-ring: ${DARK_THEME.radarRing};
      --color-badge-bg: ${DARK_THEME.badgeBg};
      --color-sun-core: #FFFFFF;
      --color-node-stroke: rgba(255, 255, 255, 0.4);
    }

    @media (prefers-color-scheme: light) {
      :root {
        --color-bg: ${LIGHT_THEME.bg};
        --color-bg-secondary: ${LIGHT_THEME.bgSecondary};
        --color-card-bg: ${LIGHT_THEME.cardBg};
        --color-card-border: ${LIGHT_THEME.cardBorder};
        --color-text-primary: ${LIGHT_THEME.textPrimary};
        --color-text-secondary: ${LIGHT_THEME.textSecondary};
        --color-text-muted: ${LIGHT_THEME.textMuted};
        --color-accent: ${LIGHT_THEME.accent};
        --color-accent-glow: ${LIGHT_THEME.accentGlow};
        --color-orbit-line: ${LIGHT_THEME.orbitLine};
        --color-constellation-line: ${LIGHT_THEME.constellationLine};
        --color-grid-line: ${LIGHT_THEME.gridLine};
        --color-star-dust: ${LIGHT_THEME.starDust};
        --color-radar-ring: ${LIGHT_THEME.radarRing};
        --color-badge-bg: ${LIGHT_THEME.badgeBg};
        --color-sun-core: #F59E0B;
        --color-node-stroke: #FFFFFF;
      }
    }
  `;
}
