import { ActionConfig, EcosystemData } from '../types.js';
import { TemplateRenderer } from './base.js';
import { wrapSvgDocument } from '../svg/builder.js';
import { escapeXml, formatCompactNumber, truncate } from '../svg/utils.js';

export class MinimalTemplate implements TemplateRenderer {
  render(data: EcosystemData, config: ActionConfig): string {
    const width = 900;
    const height = 300;
    const { user, metrics, repositories } = data;

    const topLangs = metrics.languages.slice(0, 5);
    const topRepos = repositories.slice(0, 3);
    const title = config.customTitle || `${user.name || user.login} // Ecosystem Telemetry`;

    // 1. Sleek Minimal Header
    const showHeader = config.showHeader !== false;
    const showFooter = config.showFooter !== false;

    const header = showHeader
      ? `
      <g transform="translate(32, 28)">
        <text x="0" y="20" style="font-size: 18px; font-weight: 700; fill: var(--color-text-primary); letter-spacing: -0.02em;">
          ${escapeXml(title)}
        </text>
        <text x="0" y="38" style="font-size: 11px; fill: var(--color-text-secondary); font-family: ui-monospace, monospace;">
          ROLE: <tspan style="fill: var(--color-accent); font-weight: 600;">${escapeXml(metrics.cosmicRank)}</tspan>
          <tspan style="fill: var(--color-text-muted);"> • </tspan>
          UPDATED: ${data.generatedAt}
        </text>
      </g>
    `
      : '';

    const yShift = showHeader ? 0 : -50;

    // 2. Metrics Strip: 4 clean KPI cards
    const kpis = [
      { label: 'TOTAL STARS', value: formatCompactNumber(metrics.totalStars), symbol: '★' },
      { label: 'ANNUAL COMMITS', value: formatCompactNumber(metrics.totalCommits), symbol: '⚡' },
      { label: 'PUBLIC REPOSITORIES', value: metrics.totalRepos.toString(), symbol: '❖' },
      { label: 'PRIMARY STACK', value: metrics.dominantLanguage, symbol: '◆' }
    ];

    const kpiW = 195;
    const kpiH = 58;
    let kpiCards = `<g transform="translate(32, ${80 + yShift})">`;
    for (let i = 0; i < kpis.length; i++) {
      const kpi = kpis[i];
      const kx = i * (kpiW + 18);
      kpiCards += `
        <g transform="translate(${kx}, 0)">
          <rect width="${kpiW}" height="${kpiH}" rx="8" fill="var(--color-card-bg)" stroke="var(--color-card-border)" stroke-width="1" />
          <text x="14" y="20" style="font-size: 9px; font-weight: 600; fill: var(--color-text-muted); letter-spacing: 0.08em;">
            ${escapeXml(kpi.label)}
          </text>
          <text x="14" y="44" style="font-size: 18px; font-weight: 700; fill: var(--color-text-primary);">
            <tspan style="fill: var(--color-accent); font-size: 14px;">${kpi.symbol} </tspan>${escapeXml(kpi.value)}
          </text>
        </g>
      `;
    }
    kpiCards += '</g>';

    // 3. Top 3 Flagship Repositories in a Row
    let repoCards = `<g transform="translate(32, ${156 + yShift})">`;
    const repoW = 266;
    const repoH = 68;
    for (let i = 0; i < topRepos.length; i++) {
      const r = topRepos[i];
      const rx = i * (repoW + 18);
      repoCards += `
        <g transform="translate(${rx}, 0)">
          <rect width="${repoW}" height="${repoH}" rx="8" fill="var(--color-card-bg)" stroke="var(--color-card-border)" stroke-width="1" />
          <circle cx="16" cy="20" r="4" fill="${escapeXml(r.primaryColor || '#38BDF8')}" />
          <text x="26" y="24" style="font-size: 12px; font-weight: 700; fill: var(--color-text-primary);">
            ${escapeXml(truncate(r.name, 22))}
          </text>
          <text x="${repoW - 14}" y="24" text-anchor="end" style="font-size: 10px; font-weight: 600; fill: var(--color-text-muted);">
            ★ ${formatCompactNumber(r.stars)}
          </text>
          <text x="16" y="44" style="font-size: 9.5px; fill: var(--color-text-secondary);">
            ${escapeXml(truncate(r.description || 'No description provided.', 36))}
          </text>
        </g>
      `;
    }
    repoCards += '</g>';

    // 4. Clean Bottom Language Bar
    let footerSection = '';
    if (showFooter) {
      const barW = width - 64;
      let curX = 32;
      let barRects = '';
      let legend = `<g transform="translate(32, ${268 + yShift})">`;
      let legX = 0;

      for (const l of topLangs) {
        const segW = (l.percentage / 100) * barW;
        if (segW > 1) {
          barRects += `<rect x="${curX.toFixed(1)}" y="${244 + yShift}" width="${segW.toFixed(1)}" height="5" rx="2" fill="${escapeXml(l.color)}" />`;
          curX += segW + 1.5;
        }
        legend += `
          <g transform="translate(${legX}, 0)">
            <circle cx="4" cy="4" r="3.5" fill="${escapeXml(l.color)}" />
            <text x="12" y="7" style="font-size: 10px; font-weight: 500; fill: var(--color-text-secondary);">
              ${escapeXml(l.name)} <tspan style="fill: var(--color-text-muted); font-size: 9px;">${l.percentage}%</tspan>
            </text>
          </g>
        `;
        legX += Math.max(80, l.name.length * 7 + 40);
      }
      legend += '</g>';

      const brand = `
        <text x="${width - 32}" y="${275 + yShift}" text-anchor="end" style="font-size: 9.5px; fill: var(--color-text-muted); font-family: ui-monospace, monospace;">
          github-profile-orbit // minimal
        </text>
      `;

      footerSection = `${barRects}${legend}${brand}`;
    }

    const svgContent = `
      ${header}
      ${kpiCards}
      ${repoCards}
      ${footerSection}
    `;

    return wrapSvgDocument(svgContent, {
      width,
      height,
      theme: config.theme,
      customTitle: config.customTitle
    });
  }
}
