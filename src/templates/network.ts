import { ActionConfig, EcosystemData, NormalizedRepo } from '../types.js';
import { TemplateRenderer } from './base.js';
import { renderFooter, renderHeader, wrapSvgDocument } from '../svg/builder.js';
import { escapeXml, formatCompactNumber, truncate } from '../svg/utils.js';

interface NetworkNode {
  id: string;
  label: string;
  sub: string;
  type: 'hub' | 'repo';
  color: string;
  x: number;
  y: number;
  radius: number;
  labelX: number;
  labelY: number;
  textAnchor: string;
  stars?: number;
}

interface NetworkEdge {
  from: NetworkNode;
  to: NetworkNode;
  color: string;
  opacity: number;
}

export class NetworkTemplate implements TemplateRenderer {
  render(data: EcosystemData, config: ActionConfig): string {
    const width = 900;
    const height = 540;
    const cx = 450;
    const cy = config.showHeader === false ? 270 : 280;

    const topLangs = data.metrics.languages.slice(0, 4);
    const repos = data.repositories.slice(0, 16);

    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];

    // 1. Position Language Hubs along a wide ellipse centered at (cx, cy)
    const numHubs = Math.max(1, topLangs.length);
    const hubEllipseRx = numHubs <= 2 ? 220 : 250;
    const hubEllipseRy = numHubs <= 2 ? 110 : 130;

    const langToHub = new Map<string, NetworkNode>();
    const hubToRepos = new Map<string, NormalizedRepo[]>();

    for (let i = 0; i < topLangs.length; i++) {
      const lang = topLangs[i];
      const hubAngle = (i * 2 * Math.PI) / numHubs - Math.PI / 2;
      const hx = Math.round(cx + hubEllipseRx * Math.cos(hubAngle));
      const hy = Math.round(cy + hubEllipseRy * Math.sin(hubAngle));

      const hubNode: NetworkNode = {
        id: `hub-${lang.name}`,
        label: lang.name,
        sub: `${lang.percentage}%`,
        type: 'hub',
        color: lang.color || '#38BDF8',
        x: hx,
        y: hy,
        radius: 24,
        labelX: hx,
        labelY: hy,
        textAnchor: 'middle'
      };
      nodes.push(hubNode);
      langToHub.set(lang.name, hubNode);
      hubToRepos.set(lang.name, []);
    }

    // Connect Hubs together
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        edges.push({
          from: nodes[i],
          to: nodes[j],
          color: 'var(--color-constellation-line)',
          opacity: 0.35
        });
      }
    }

    // 2. Group repositories under their primary language hub (or fallback to top hub)
    const fallbackHub = nodes[0];
    const unassignedRepos: NormalizedRepo[] = [];

    for (const repo of repos) {
      if (repo.primaryLanguage && hubToRepos.has(repo.primaryLanguage)) {
        hubToRepos.get(repo.primaryLanguage)!.push(repo);
      } else {
        unassignedRepos.push(repo);
      }
    }

    // If there are unassigned repos, distribute them among hubs
    for (let i = 0; i < unassignedRepos.length; i++) {
      const targetHubLang = topLangs[i % topLangs.length]?.name;
      if (targetHubLang && hubToRepos.has(targetHubLang)) {
        hubToRepos.get(targetHubLang)!.push(unassignedRepos[i]);
      }
    }

    // 3. Position Repositories satellite to their hub facing outward from center
    for (const [langName, hubRepos] of hubToRepos.entries()) {
      const hub = langToHub.get(langName) || fallbackHub;
      if (!hub) continue;

      const count = hubRepos.length;
      if (count === 0) continue;

      // Base outward angle from center (cx, cy) toward hub (hub.x, hub.y)
      const baseOutwardAngle = Math.atan2(hub.y - cy, hub.x - cx);
      const arcSpread = count === 1 ? 0 : Math.min(Math.PI * 0.95, count * 0.45);
      const startAngle = baseOutwardAngle - arcSpread / 2;

      for (let i = 0; i < count; i++) {
        const repo = hubRepos[i];
        const step = count === 1 ? 0 : (i / (count - 1)) * arcSpread;
        const satAngle = startAngle + step;

        // Stagger distance: alternating 68px and 96px to prevent horizontal collision
        const satDist = i % 2 === 0 ? 70 : 100;
        const satX = Number((hub.x + satDist * Math.cos(satAngle)).toFixed(1));
        const satY = Number((hub.y + satDist * Math.sin(satAngle)).toFixed(1));

        // Safe margin clamping
        const clampedX = Math.max(75, Math.min(width - 75, satX));
        const clampedY = Math.max(90, Math.min(height - 65, satY));

        const r = repo.gravityRadius * 0.75;
        const cosA = Math.cos(satAngle);
        const sinA = Math.sin(satAngle);

        // Position label radially outward from the satellite node
        const labelX = clampedX + cosA * (r + 7);
        const labelY = clampedY + sinA * (r + 7) + (sinA > 0 ? 5 : -1);
        const textAnchor = cosA >= 0 ? 'start' : 'end';

        const repoNode: NetworkNode = {
          id: `repo-${repo.name}`,
          label: repo.name,
          sub: repo.stars > 0 ? `★ ${formatCompactNumber(repo.stars)}` : repo.primaryLanguage || 'Code',
          type: 'repo',
          color: repo.primaryColor || '#94A3B8',
          x: clampedX,
          y: clampedY,
          radius: r,
          labelX,
          labelY,
          textAnchor,
          stars: repo.stars
        };
        nodes.push(repoNode);

        // Edge to hub
        edges.push({
          from: repoNode,
          to: hub,
          color: repo.primaryColor || 'var(--color-constellation-line)',
          opacity: 0.5
        });

        // Secondary cross-edges if repo uses another language
        if (repo.languages && repo.languages.length > 1) {
          for (const secLang of repo.languages.slice(1, 2)) {
            const secHub = langToHub.get(secLang.name);
            if (secHub && secHub !== hub) {
              edges.push({
                from: repoNode,
                to: secHub,
                color: 'var(--color-constellation-line)',
                opacity: 0.2
              });
            }
          }
        }
      }
    }

    // 4. Force Relaxation Pass: Eliminate any remaining overlaps between nodes
    for (let iter = 0; iter < 40; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = n1.radius + n2.radius + 36;

          if (dist < minDist) {
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            if (n1.type === 'repo') {
              n1.x -= nx * overlap;
              n1.y -= ny * overlap;
            }
            if (n2.type === 'repo') {
              n2.x += nx * overlap;
              n2.y += ny * overlap;
            }
          }
        }
      }

      // Keep repo nodes strictly within comfortable canvas padding
      for (const n of nodes) {
        if (n.type === 'repo') {
          n.x = Math.max(90, Math.min(width - 90, n.x));
          n.y = Math.max(115, Math.min(height - 75, n.y));
        }
      }
    }

    // Re-calculate non-overlapping label coordinates after force settling
    for (const node of nodes) {
      if (node.type === 'repo') {
        const isRight = node.x >= cx;
        const isCenter = Math.abs(node.x - cx) < 65;

        if (isCenter) {
          node.labelX = node.x;
          node.labelY = node.y > cy ? node.y + node.radius + 12 : node.y - node.radius - 8;
          node.textAnchor = 'middle';
        } else if (isRight) {
          node.labelX = node.x + node.radius + 7;
          node.labelY = node.y + 3;
          node.textAnchor = 'start';
        } else {
          node.labelX = node.x - node.radius - 7;
          node.labelY = node.y + 3;
          node.textAnchor = 'end';
        }
      }
    }

    // 4. Render Edges
    let svgEdges = '<g class="network-edges">';
    for (const edge of edges) {
      const isHubEdge = edge.from.type === 'hub' && edge.to.type === 'hub';
      svgEdges += `
        <line
          x1="${edge.from.x}"
          y1="${edge.from.y}"
          x2="${edge.to.x}"
          y2="${edge.to.y}"
          stroke="${escapeXml(edge.color)}"
          stroke-width="${isHubEdge ? 1.5 : 0.8}"
          stroke-dasharray="${isHubEdge ? '3, 4' : (edge.opacity <= 0.25 ? '2, 3' : 'none')}"
          opacity="${edge.opacity.toFixed(2)}"
        />
      `;
    }
    svgEdges += '</g>';

    // 5. Render Nodes
    let svgNodes = '<g class="network-nodes">';
    for (const node of nodes) {
      const isHub = node.type === 'hub';

      if (isHub) {
        svgNodes += `
          <g transform="translate(${node.x}, ${node.y})">
            <!-- Hub Aura -->
            <circle cx="0" cy="0" r="${node.radius + 6}" fill="${escapeXml(node.color)}" opacity="0.2" filter="url(#stellar-glow)" class="pulsar-glow" />
            <!-- Hub Core -->
            <circle cx="0" cy="0" r="${node.radius}" fill="${escapeXml(node.color)}" />
            <circle cx="0" cy="0" r="${node.radius - 3}" fill="var(--color-card-bg)" />
            <!-- Text -->
            <text x="0" y="-1" text-anchor="middle" dominant-baseline="central" style="font-size: 10px; font-weight: 700; fill: var(--color-text-primary);">
              ${escapeXml(truncate(node.label, 9))}
            </text>
            <text x="0" y="11" text-anchor="middle" style="font-size: 8px; font-weight: 600; fill: var(--color-text-muted);">
              ${escapeXml(node.sub)}
            </text>
          </g>
        `;
      } else {
        svgNodes += `
          <g transform="translate(${node.x}, ${node.y})">
            <circle cx="0" cy="0" r="${node.radius + 2}" fill="${escapeXml(node.color)}" opacity="0.25" filter="url(#stellar-glow)" />
            <circle cx="0" cy="0" r="${node.radius}" fill="${escapeXml(node.color)}" />
            <circle cx="0" cy="0" r="${Math.max(1, node.radius * 0.35)}" fill="#FFFFFF" opacity="0.7" />
          </g>
          <!-- Typographic Label positioned outside node -->
          <g transform="translate(${node.labelX.toFixed(1)}, ${node.labelY.toFixed(1)})">
            <text
              x="0"
              y="0"
              text-anchor="${node.textAnchor}"
              class="repo-label"
            >
              ${escapeXml(truncate(node.label, 14))}
            </text>
            <text
              x="0"
              y="10"
              text-anchor="${node.textAnchor}"
              class="repo-sub"
            >
              ${escapeXml(node.sub)}
            </text>
          </g>
        `;
      }
    }
    svgNodes += '</g>';

    const headerGroup = renderHeader(data, width, config);
    const footerGroup = renderFooter(data, width, height - 38, config);

    const svgContent = `
      ${headerGroup}
      ${svgEdges}
      ${svgNodes}
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
