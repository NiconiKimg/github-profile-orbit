import { ActionConfig, EcosystemData } from '../types.js';
import { TemplateRenderer } from './base.js';
import { renderFooter, renderHeader, wrapSvgDocument } from '../svg/builder.js';
import { escapeXml, formatCompactNumber, truncate } from '../svg/utils.js';

export class LandscapeTemplate implements TemplateRenderer {
  render(data: EcosystemData, config: ActionConfig): string {
    const width = 900;
    const height = 540;

    const { metrics, repositories } = data;
    const topLangs = metrics.languages.slice(0, 6);
    const prominentRepos = repositories.slice(0, 8);

    // Left Column: Technology Spectrum & Domain Radar (Width: 320)
    let techBars = '<g class="tech-column" transform="translate(32, 90)">';
    techBars += `
      <text x="0" y="0" style="font-size: 11px; font-weight: 700; fill: var(--color-text-muted); letter-spacing: 0.08em;">
        SYSTEM COMPOSITION &amp; VELOCITY
      </text>
    `;

    let curY = 22;
    for (const lang of topLangs) {
      const barMaxW = 280;
      const barW = Math.max(4, (lang.percentage / 100) * barMaxW);

      techBars += `
        <g transform="translate(0, ${curY})">
          <circle cx="5" cy="5" r="4" fill="${escapeXml(lang.color)}" />
          <text x="16" y="9" style="font-size: 11px; font-weight: 600; fill: var(--color-text-primary);">
            ${escapeXml(lang.name)}
          </text>
          <text x="${barMaxW}" y="9" text-anchor="end" style="font-size: 10px; font-weight: 600; fill: var(--color-text-secondary);">
            ${lang.percentage}% <tspan style="fill: var(--color-text-muted); font-size: 9px;">(${lang.repoCount} repos)</tspan>
          </text>
          <!-- Track -->
          <rect x="0" y="16" width="${barMaxW}" height="6" rx="3" fill="var(--color-badge-bg)" />
          <!-- Fill -->
          <rect x="0" y="16" width="${barW.toFixed(1)}" height="6" rx="3" fill="${escapeXml(lang.color)}" />
        </g>
      `;
      curY += 36;
    }

    // Domain Tags / Topics Cloud inside left column
    if (metrics.topics.length > 0) {
      curY += 8;
      techBars += `
        <g transform="translate(0, ${curY})">
          <text x="0" y="0" style="font-size: 10px; font-weight: 700; fill: var(--color-text-muted); letter-spacing: 0.08em;">
            DOMAIN TOPICS
          </text>
          <g transform="translate(0, 10)">
      `;
      let tagX = 0;
      let tagY = 0;
      for (const t of metrics.topics.slice(0, 8)) {
        const tagText = `#${t.topic}`;
        const tagW = tagText.length * 6.5 + 14;
        if (tagX + tagW > 280) {
          tagX = 0;
          tagY += 22;
        }
        techBars += `
          <g transform="translate(${tagX}, ${tagY})">
            <rect width="${tagW}" height="18" rx="9" fill="var(--color-badge-bg)" stroke="var(--color-card-border)" stroke-width="1" />
            <text x="${tagW / 2}" y="12" text-anchor="middle" style="font-size: 9.5px; fill: var(--color-text-secondary); font-family: ui-monospace, monospace;">
              ${escapeXml(tagText)}
            </text>
          </g>
        `;
        tagX += tagW + 6;
      }
      techBars += '</g></g>';
    }
    techBars += '</g>';

    // Right Column: Architectural Grid of Repositories (Width: 500)
    let repoGrid = '<g class="repo-grid" transform="translate(360, 90)">';
    repoGrid += `
      <text x="0" y="0" style="font-size: 11px; font-weight: 700; fill: var(--color-text-muted); letter-spacing: 0.08em;">
        ACTIVE REPOSITORIES // TELEMETRY
      </text>
    `;

    const cardW = 244;
    const cardH = 74;
    for (let i = 0; i < prominentRepos.length; i++) {
      const repo = prominentRepos[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const rx = col * (cardW + 12);
      const ry = 18 + row * (cardH + 10);

      const color = repo.primaryColor || '#38BDF8';
      const desc = truncate(repo.description || 'No description provided.', 38);

      repoGrid += `
        <g transform="translate(${rx}, ${ry})">
          <!-- Card Container -->
          <rect
            width="${cardW}"
            height="${cardH}"
            rx="8"
            fill="var(--color-card-bg)"
            stroke="var(--color-card-border)"
            stroke-width="1"
          />

          <!-- Color Indicator Strip -->
          <rect x="0" y="8" width="3" height="${cardH - 16}" rx="1.5" fill="${escapeXml(color)}" />

          <!-- Repo Name -->
          <text x="12" y="18" style="font-size: 11px; font-weight: 700; fill: var(--color-text-primary);">
            ${escapeXml(truncate(repo.name, 18))}
          </text>

          <!-- Stars and Forks -->
          <text x="${cardW - 10}" y="18" text-anchor="end" style="font-size: 10px; font-weight: 600; fill: var(--color-text-muted);">
            ★ ${formatCompactNumber(repo.stars)}  ⑂ ${formatCompactNumber(repo.forks)}
          </text>

          <!-- Description -->
          <text x="12" y="34" style="font-size: 9.5px; fill: var(--color-text-secondary);">
            ${escapeXml(desc)}
          </text>

          <!-- Language Pill & Activity Meter -->
          <g transform="translate(12, 46)">
            <circle cx="3" cy="7" r="3.5" fill="${escapeXml(color)}" />
            <text x="11" y="10" style="font-size: 9px; font-weight: 600; fill: var(--color-text-muted);">
              ${escapeXml(repo.primaryLanguage)}${repo.authorshipRatio !== undefined && repo.authorshipRatio < 0.99 ? ` • ${Math.round(repo.authorshipRatio * 100)}% contrib` : ''}
            </text>

            <!-- Activity bar on right -->
            <g transform="translate(${cardW - 24 - 70}, 4)">
              <rect width="60" height="4" rx="2" fill="var(--color-badge-bg)" />
              <rect width="${((repo.activityScore / 100) * 60).toFixed(1)}" height="4" rx="2" fill="${escapeXml(color)}" />
            </g>
          </g>
        </g>
      `;
    }
    repoGrid += '</g>';

    const headerGroup = renderHeader(data, width, config);
    const footerGroup = renderFooter(data, width, height - 38, config);

    const svgContent = `
      ${headerGroup}
      ${techBars}
      ${repoGrid}
      ${footerGroup}
    `;

    return wrapSvgDocument(svgContent, {
      width,
      height,
      theme: config.theme,
      customTitle: config.customTitle
    });
  }
}
