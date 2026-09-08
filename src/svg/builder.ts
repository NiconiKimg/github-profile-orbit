import { ActionConfig, EcosystemData, VisualizationTheme } from '../types.js';
import { generateThemeCss } from '../theme/palettes.js';
import { escapeXml, formatCompactNumber } from './utils.js';

export interface SvgCanvasOptions {
  width: number;
  height: number;
  theme: VisualizationTheme;
  customTitle?: string;
}

/**
 * Standard SVG defs containing filters, gradients, and markers.
 */
export function getSharedSvgDefs(): string {
  return `
    <defs>
      <!-- Core Glow Filter -->
      <filter id="stellar-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <!-- Intense Nebula Glow Filter -->
      <filter id="nebula-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <!-- Soft Drop Shadow -->
      <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25" flood-color="#000000" />
      </filter>

      <!-- Cosmic Core Radial Gradient -->
      <radialGradient id="core-sun" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="var(--color-sun-core)" stop-opacity="1" />
        <stop offset="35%" stop-color="var(--color-accent)" stop-opacity="0.95" />
        <stop offset="70%" stop-color="#818CF8" stop-opacity="0.6" />
        <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0" />
      </radialGradient>

      <!-- Background Ambient Glow -->
      <radialGradient id="bg-nebula" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.12" />
        <stop offset="50%" stop-color="#6366F1" stop-opacity="0.05" />
        <stop offset="100%" stop-color="transparent" stop-opacity="0" />
      </radialGradient>

      <!-- Subtle Grid Pattern -->
      <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-grid-line)" stroke-width="0.75" />
      </pattern>
    </defs>
  `;
}

/**
 * Creates header banner containing identity, cosmic rank, and telemetry telemetry.
 */
export function renderHeader(
  data: EcosystemData,
  width: number,
  config: ActionConfig
): string {
  if (config.showHeader === false) return '';

  const { user, metrics } = data;
  const displayTitle = config.customTitle || `${user.name || user.login} // Ecosystem Overview`;
  const roleBadge = config.role || metrics.cosmicRank;

  return `
    <g class="header-group" transform="translate(32, 28)">
      <!-- Identity & Subtitle -->
      <text x="0" y="24" class="title-text">${escapeXml(displayTitle)}</text>
      <text x="0" y="44" class="subtitle-text">
        <tspan class="rank-badge">${escapeXml(roleBadge)}</tspan>
        <tspan class="bullet-sep"> • </tspan>
        <tspan>Primary: ${escapeXml(metrics.dominantLanguage)}</tspan>
        <tspan class="bullet-sep"> • </tspan>
        <tspan>${metrics.totalRepos} Repositories</tspan>
      </text>

      <!-- Metric Pills on the right (if enabled) -->
      ${
        config.showStats !== false
          ? `
      <g transform="translate(${width - 64 - 340}, 6)">
        <!-- Stars Pill -->
        <rect x="0" y="0" width="80" height="36" rx="8" class="metric-pill-bg" />
        <text x="40" y="16" text-anchor="middle" class="metric-label">STARS</text>
        <text x="40" y="30" text-anchor="middle" class="metric-val">★ ${formatCompactNumber(metrics.totalStars)}</text>

        <!-- Commits Pill -->
        <rect x="88" y="0" width="80" height="36" rx="8" class="metric-pill-bg" />
        <text x="128" y="16" text-anchor="middle" class="metric-label">COMMITS</text>
        <text x="128" y="30" text-anchor="middle" class="metric-val">⚡ ${formatCompactNumber(metrics.totalCommits)}</text>

        <!-- Forks Pill -->
        <rect x="176" y="0" width="76" height="36" rx="8" class="metric-pill-bg" />
        <text x="214" y="16" text-anchor="middle" class="metric-label">FORKS</text>
        <text x="214" y="30" text-anchor="middle" class="metric-val">⑂ ${formatCompactNumber(metrics.totalForks)}</text>

        <!-- Languages Pill -->
        <rect x="260" y="0" width="80" height="36" rx="8" class="metric-pill-bg" />
        <text x="300" y="16" text-anchor="middle" class="metric-label">LANGUAGES</text>
        <text x="300" y="30" text-anchor="middle" class="metric-val">❖ ${metrics.languages.length}</text>
      </g>
      `
          : ''
      }
    </g>
  `;
}

/**
 * Creates the bottom language spectrum bar and watermark.
 */
export function renderFooter(
  data: EcosystemData,
  width: number,
  yPos: number,
  config: ActionConfig
): string {
  if (config.showFooter === false) return '';

  const { metrics, generatedAt } = data;
  const topLangs = metrics.languages.slice(0, 5);
  const barWidth = width - 64;
  const barHeight = 6;

  let currentX = 32;
  let barRects = '';
  let legendItems = '';
  let legendX = 32;

  if (config.showLanguages !== false) {
    for (const lang of topLangs) {
      const segWidth = (lang.percentage / 100) * barWidth;
      if (segWidth > 1) {
        barRects += `<rect x="${currentX.toFixed(1)}" y="${yPos}" width="${segWidth.toFixed(1)}" height="${barHeight}" rx="2" fill="${escapeXml(lang.color)}" />`;
        currentX += segWidth + 1.5;
      }

      // Legend item
      legendItems += `
        <g transform="translate(${legendX.toFixed(1)}, ${yPos + 18})">
          <circle cx="4" cy="4" r="4" fill="${escapeXml(lang.color)}" />
          <text x="14" y="8" class="legend-text">${escapeXml(lang.name)} <tspan class="legend-pct">${lang.percentage}%</tspan></text>
        </g>
      `;
      legendX += Math.max(90, lang.name.length * 8 + 45);
    }
  }

  return `
    <g class="footer-group">
      <!-- Spectrum Bar -->
      ${barRects}

      <!-- Legend Items -->
      ${legendItems}

      <!-- Octo-Orbit Brand / Telemetry Timestamp on the right -->
      <g transform="translate(${width - 32}, ${yPos + 22})">
        <text x="0" y="0" text-anchor="end" class="watermark-text">
          ✦ github-profile-orbit • ${generatedAt}
        </text>
      </g>
    </g>
  `;
}

/**
 * Base document wrapper injecting CSS rules and SVG envelope.
 */
export function wrapSvgDocument(
  content: string,
  options: SvgCanvasOptions
): string {
  const { width, height, theme } = options;
  const themeCss = generateThemeCss(theme);
  const defs = getSharedSvgDefs();

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  viewBox="0 0 ${width} ${height}"
  width="100%"
  height="${height}"
  style="max-width: ${width}px; background-color: var(--color-bg); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 12px; overflow: hidden; border: 1px solid var(--color-card-border);"
>
  <style>
    ${themeCss}

    .title-text {
      font-size: 20px;
      font-weight: 700;
      fill: var(--color-text-primary);
      letter-spacing: -0.02em;
    }
    .subtitle-text {
      font-size: 12px;
      fill: var(--color-text-secondary);
      font-weight: 400;
    }
    .rank-badge {
      fill: var(--color-accent);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .bullet-sep {
      fill: var(--color-text-muted);
    }
    .metric-pill-bg {
      fill: var(--color-badge-bg);
      stroke: var(--color-card-border);
      stroke-width: 1;
    }
    .metric-label {
      font-size: 9px;
      font-weight: 600;
      fill: var(--color-text-muted);
      letter-spacing: 0.08em;
    }
    .metric-val {
      font-size: 11px;
      font-weight: 700;
      fill: var(--color-text-primary);
    }
    .legend-text {
      font-size: 11px;
      fill: var(--color-text-secondary);
      font-weight: 500;
    }
    .legend-pct {
      fill: var(--color-text-muted);
      font-size: 10px;
    }
    .watermark-text {
      font-size: 10px;
      fill: var(--color-text-muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: 0.04em;
    }
    .orbit-ring {
      fill: none;
      stroke: var(--color-orbit-line);
      stroke-width: 1;
    }
    .constellation-edge {
      stroke: var(--color-constellation-line);
      stroke-width: 1;
      stroke-dasharray: 2, 2;
    }
    .repo-label {
      font-size: 11px;
      font-weight: 600;
      fill: var(--color-text-primary);
    }
    .repo-sub {
      font-size: 9px;
      fill: var(--color-text-muted);
    }

    /* Keyframe Animations (Native SVG / CSS) */
    @keyframes comet-flight {
      0% {
        transform: translate(-140px, 30px) scale(0.6);
        opacity: 0;
      }
      5% {
        opacity: 0.95;
      }
      15% {
        transform: translate(960px, 290px) scale(1);
        opacity: 0;
      }
      100% {
        transform: translate(960px, 290px) scale(1);
        opacity: 0;
      }
    }

    @keyframes stellar-pulse {
      0%, 100% {
        opacity: 0.22;
        transform: scale(1);
      }
      50% {
        opacity: 0.55;
        transform: scale(1.15);
      }
    }

    @keyframes drift-float-a {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-5px) rotate(1.5deg);
      }
    }

    @keyframes drift-float-b {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(5px) rotate(-1.5deg);
      }
    }

    @keyframes twinkle-glow {
      0%, 100% {
        opacity: 0.25;
      }
      50% {
        opacity: 0.9;
      }
    }

    @keyframes ufo-cruise {
      0% {
        transform: translate(-90px, 110px) rotate(3deg);
        opacity: 0;
      }
      3% {
        opacity: 0.95;
      }
      25% {
        transform: translate(210px, 88px) rotate(-3deg);
      }
      50% {
        transform: translate(510px, 120px) rotate(3deg);
      }
      75% {
        transform: translate(810px, 90px) rotate(-2deg);
      }
      97% {
        opacity: 0.95;
      }
      100% {
        transform: translate(1030px, 112px) rotate(3deg);
        opacity: 0;
      }
    }

    @keyframes rocket-flight {
      0% {
        transform: translate(980px, 490px) rotate(-154deg) scale(0.48);
        opacity: 0;
      }
      3% {
        opacity: 0.75;
      }
      45% {
        transform: translate(-140px, -50px) rotate(-154deg) scale(0.48);
        opacity: 0.75;
      }
      46% {
        opacity: 0;
        transform: translate(-140px, -50px) rotate(-154deg) scale(0.48);
      }
      100% {
        opacity: 0;
        transform: translate(-140px, -50px) rotate(-154deg) scale(0.48);
      }
    }

    @keyframes satellite-orbit {
      0% {
        transform: translate(-90px, 185px) rotate(14deg) scale(0.55);
        opacity: 0;
      }
      3% {
        opacity: 0.82;
      }
      96% {
        opacity: 0.82;
      }
      100% {
        transform: translate(1010px, 255px) rotate(5deg) scale(0.55);
        opacity: 0;
      }
    }

    .ufo-scout {
      opacity: 0;
      pointer-events: none;
      animation: ufo-cruise 12s linear infinite;
    }

    .spaceship-scout {
      opacity: 0;
      pointer-events: none;
      animation: rocket-flight 22s linear infinite;
    }

    .satellite-probe {
      opacity: 0;
      pointer-events: none;
      animation: satellite-orbit 16s linear infinite;
    }

    .comet-object {
      opacity: 0;
      pointer-events: none;
      animation: comet-flight 14s cubic-bezier(0.2, 0.7, 0.4, 1) infinite 6s;
    }

    .pulsar-glow {
      transform-origin: center;
      transform-box: fill-box;
      animation: stellar-pulse 4s ease-in-out infinite;
    }

    .drift-node-a {
      transform-origin: center;
      transform-box: fill-box;
      animation: drift-float-a 8s ease-in-out infinite;
    }

    .drift-node-b {
      transform-origin: center;
      transform-box: fill-box;
      animation: drift-float-b 10s ease-in-out infinite;
    }

    .star-twinkle-1 {
      animation: twinkle-glow 3.5s ease-in-out infinite;
    }

    .star-twinkle-2 {
      animation: twinkle-glow 5s ease-in-out infinite 2s;
    }
  </style>

  ${defs}

  <!-- Ambient Space Background Layer -->
  <rect width="${width}" height="${height}" fill="var(--color-bg)" />
  <rect width="${width}" height="${height}" fill="url(#bg-nebula)" />
  <rect width="${width}" height="${height}" fill="url(#grid-pattern)" opacity="0.6" />

  ${content}
</svg>
  `.trim();
}
