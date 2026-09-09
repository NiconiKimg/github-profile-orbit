import { ActionConfig, EcosystemData, LanguageStat, NormalizedRepo } from '../types.js';
import { TemplateRenderer } from './base.js';
import { renderFooter, renderHeader, wrapSvgDocument } from '../svg/builder.js';
import { escapeXml, formatCompactNumber, truncate } from '../svg/utils.js';
import { matchesPatterns } from '../data/filter.js';

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
  dashed?: boolean;
}

export class NetworkTemplate implements TemplateRenderer {
  render(data: EcosystemData, config: ActionConfig): string {
    const width = 900;
    const height = 540;
    const cx = 450;
    const cy = config.showHeader === false ? 270 : 280;

    const maxRepos = Math.min(20, config.maxRepositories || 20);
    const repos = data.repositories.slice(0, maxRepos);

    const excludePatterns = config.excludeLanguages || [];

    // 1. Gather all active languages across metrics and displayed repos (excluding unwanted languages)
    let activeLangs: LanguageStat[] = (data.metrics.languages || []).filter(
      l => !matchesPatterns(l.name, excludePatterns)
    );

    const seenLangs = new Set(activeLangs.map(l => l.name.toLowerCase()));
    for (const repo of repos) {
      for (const lang of repo.languages || []) {
        if (lang.name && !seenLangs.has(lang.name.toLowerCase()) && !matchesPatterns(lang.name, excludePatterns)) {
          seenLangs.add(lang.name.toLowerCase());
          activeLangs.push({
            name: lang.name,
            color: lang.color || '#38BDF8',
            bytes: lang.bytes || 1,
            percentage: 1,
            repoCount: 1
          });
        }
      }
    }

    if (activeLangs.length === 0) {
      activeLangs = [
        {
          name: 'Repositories',
          color: '#38BDF8',
          bytes: 1,
          percentage: 100,
          repoCount: repos.length
        }
      ];
    }

    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];

    // 2. Position Language Hubs along an adaptive elliptical perimeter
    const numHubs = activeLangs.length;
    let hubEllipseRx = 250;
    let hubEllipseRy = 125;

    if (numHubs <= 3) {
      hubEllipseRx = 230;
      hubEllipseRy = 115;
    } else if (numHubs <= 6) {
      hubEllipseRx = 265;
      hubEllipseRy = 132;
    } else if (numHubs <= 9) {
      hubEllipseRx = 290;
      hubEllipseRy = 145;
    } else {
      hubEllipseRx = 310;
      hubEllipseRy = 155;
    }

    const langToHub = new Map<string, NetworkNode>();

    for (let i = 0; i < numHubs; i++) {
      const lang = activeLangs[i];
      const hubAngle = (i * 2 * Math.PI) / numHubs - Math.PI / 2;
      const hx = Math.round(cx + hubEllipseRx * Math.cos(hubAngle));
      const hy = Math.round(cy + hubEllipseRy * Math.sin(hubAngle));

      const hr = Math.max(20, Math.min(27, 19 + Math.sqrt(lang.percentage || 1) * 1.3));
      const safeId = lang.name.toLowerCase().replace(/#/g, 'sharp').replace(/\+/g, 'plus').replace(/[^a-z0-9_-]/g, '-');

      const hubNode: NetworkNode = {
        id: `hub-${safeId}`,
        label: lang.name,
        sub: `${lang.percentage}%`,
        type: 'hub',
        color: lang.color || '#38BDF8',
        x: hx,
        y: hy,
        radius: hr,
        labelX: hx,
        labelY: hy,
        textAnchor: 'middle'
      };
      nodes.push(hubNode);
      langToHub.set(lang.name.toLowerCase(), hubNode);
    }

    // 3. Subtle Constellation Edges between Hubs that co-occur in the same repositories
    const coOccurringPairs = new Set<string>();
    for (const repo of repos) {
      const rLangs = (repo.languages || []).filter(l => langToHub.has(l.name.toLowerCase()));
      for (let a = 0; a < rLangs.length; a++) {
        for (let b = a + 1; b < rLangs.length; b++) {
          const k = [rLangs[a].name.toLowerCase(), rLangs[b].name.toLowerCase()].sort().join('::');
          coOccurringPairs.add(k);
        }
      }
    }

    if (coOccurringPairs.size > 0) {
      for (const pair of coOccurringPairs) {
        const [l1, l2] = pair.split('::');
        const h1 = langToHub.get(l1);
        const h2 = langToHub.get(l2);
        if (h1 && h2) {
          edges.push({
            from: h1,
            to: h2,
            color: 'var(--color-constellation-line)',
            opacity: 0.22,
            dashed: true
          });
        }
      }
    } else {
      // Connect hubs along a perimeter ring
      for (let i = 0; i < numHubs; i++) {
        const next = (i + 1) % numHubs;
        if (next !== i) {
          edges.push({
            from: nodes[i],
            to: nodes[next],
            color: 'var(--color-constellation-line)',
            opacity: 0.2,
            dashed: true
          });
        }
      }
    }

    // 4. Position Repositories and create multi-language connections
    const singleLangCounts = new Map<string, number>();

    for (let repoIdx = 0; repoIdx < repos.length; repoIdx++) {
      const repo = repos[repoIdx];

      // All non-excluded languages this repo uses
      let repoLangs = (repo.languages || []).filter(
        l => langToHub.has(l.name.toLowerCase()) && !matchesPatterns(l.name, excludePatterns)
      );

      // Fallback to primaryLanguage if repo.languages was empty
      if (
        repoLangs.length === 0 &&
        repo.primaryLanguage &&
        langToHub.has(repo.primaryLanguage.toLowerCase()) &&
        !matchesPatterns(repo.primaryLanguage, excludePatterns)
      ) {
        repoLangs = [
          {
            name: repo.primaryLanguage,
            color: repo.primaryColor || '#38BDF8',
            bytes: 1,
            percentage: 100
          }
        ];
      }

      let initX = cx;
      let initY = cy;

      if (repoLangs.length >= 2) {
        // Multi-language: Place at weighted barycenter of connected language hubs
        let totalW = 0;
        let bx = 0;
        let by = 0;
        for (const l of repoLangs) {
          const hub = langToHub.get(l.name.toLowerCase())!;
          const w = Math.max(10, l.bytes);
          bx += hub.x * w;
          by += hub.y * w;
          totalW += w;
        }
        initX = bx / totalW;
        initY = by / totalW;

        // Slight deterministic dispersion so identical stacks don't stack directly
        const seed = repoIdx * 2.3 + (repo.name.charCodeAt(0) % 7);
        initX += Math.sin(seed) * 26;
        initY += Math.cos(seed) * 26;
      } else if (repoLangs.length === 1) {
        // Single language: Place in fan / satellite around its hub with ample clearance
        const hub = langToHub.get(repoLangs[0].name.toLowerCase())!;
        const count = singleLangCounts.get(hub.id) || 0;
        singleLangCounts.set(hub.id, count + 1);

        const angleToCenter = Math.atan2(cy - hub.y, cx - hub.x);
        const arcStep = (count % 2 === 0 ? 1 : -1) * (0.36 + Math.floor(count / 2) * 0.44);
        const satAngle = angleToCenter + arcStep;
        // Ample clearance from hub (88px to 132px)
        const satDist = 88 + (count % 3) * 22;

        initX = hub.x + Math.cos(satAngle) * satDist;
        initY = hub.y + Math.sin(satAngle) * satDist;
      } else {
        // Repos without hub match: distribute around center
        const fallbackAngle = (repoIdx * 2 * Math.PI) / Math.max(1, repos.length);
        initX = cx + Math.cos(fallbackAngle) * 95;
        initY = cy + Math.sin(fallbackAngle) * 60;
      }

      const clampedX = Math.max(90, Math.min(width - 90, initX));
      const clampedY = Math.max(105, Math.min(height - 70, initY));
      const r = repo.gravityRadius * 0.75;

      const repoNode: NetworkNode = {
        id: `repo-${repo.name}`,
        label: repo.name,
        sub: repo.stars > 0 ? `★ ${formatCompactNumber(repo.stars)}` : repo.primaryLanguage || 'Code',
        type: 'repo',
        color: repo.primaryColor || '#94A3B8',
        x: Number(clampedX.toFixed(1)),
        y: Number(clampedY.toFixed(1)),
        radius: r,
        labelX: clampedX,
        labelY: clampedY,
        textAnchor: clampedX >= cx ? 'start' : 'end',
        stars: repo.stars
      };
      nodes.push(repoNode);

      // Traza conexiones reales del repo hacia CADA UNO de los lenguajes que utiliza
      for (const l of repoLangs) {
        const hub = langToHub.get(l.name.toLowerCase());
        if (!hub) continue;
        const isPrimary = repo.primaryLanguage && l.name.toLowerCase() === repo.primaryLanguage.toLowerCase();
        edges.push({
          from: repoNode,
          to: hub,
          color: l.color || hub.color || repo.primaryColor || 'var(--color-constellation-line)',
          opacity: isPrimary ? 0.55 : 0.25,
          dashed: !isPrimary
        });
      }
    }

    // 5. Rigorous Multi-Layer Anti-Collision Pass (Eliminates overlaps between hubs, repos & labels)
    // 5.0 Hub-to-hub anti-collision to ensure language hubs never overlap
    for (let iter = 0; iter < 25; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const h1 = nodes[i];
          const h2 = nodes[j];
          if (h1.type !== 'hub' || h2.type !== 'hub') continue;
          const dx = h2.x - h1.x;
          const dy = h2.y - h1.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minHubHubDist = h1.radius + h2.radius + 32;

          if (dist < minHubHubDist) {
            const push = (minHubHubDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            h1.x -= nx * push;
            h1.y -= ny * push;
            h2.x += nx * push;
            h2.y += ny * push;
          }
        }
      }
      for (const h of nodes) {
        if (h.type === 'hub') {
          h.x = Math.max(50, Math.min(width - 50, h.x));
          h.y = Math.max(85, Math.min(height - 65, h.y));
          h.labelX = h.x;
          h.labelY = h.y;
        }
      }
    }

    // 5.1 Repos relaxation: Hard exclusion zone from hubs + Rectangular label bounding box
    for (let iter = 0; iter < 70; iter++) {
      // Repel all repos strongly away from language hubs (disc + label clearance)
      for (const repoNode of nodes) {
        if (repoNode.type !== 'repo') continue;
        for (const hubNode of nodes) {
          if (hubNode.type !== 'hub') continue;
          const dx = repoNode.x - hubNode.x;
          const dy = repoNode.y - hubNode.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minHubDist = hubNode.radius + repoNode.radius + 60;

          if (dist < minHubDist) {
            const push = minHubDist - dist;
            repoNode.x += (dx / dist) * push * 0.88;
            repoNode.y += (dy / dist) * push * 0.88;
          }
        }
      }

      // Inter-repo anti-collision with rectangular typographic label bounding box
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          if (n1.type !== 'repo' || n2.type !== 'repo') continue;

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Generous bounding box clearance for labels (~80px horizontal, ~32px vertical)
          const reqDx = n1.radius + n2.radius + 80;
          const reqDy = n1.radius + n2.radius + 32;

          if (absDx < reqDx && absDy < reqDy) {
            const overlapX = (reqDx - absDx) * (dx < 0 ? -1 : 1) * 0.48;
            const overlapY = (reqDy - absDy) * (dy < 0 ? -1 : 1) * 0.48;

            n1.x -= overlapX;
            n1.y -= overlapY;
            n2.x += overlapX;
            n2.y += overlapY;
          }
        }
      }

      // Radial push from dead center (cx, cy) to distribute evenly
      for (const n of nodes) {
        if (n.type === 'repo') {
          const cDist = Math.hypot(n.x - cx, n.y - cy) || 1;
          if (cDist < 58) {
            const push = (58 - cDist) * 0.3;
            n.x += ((n.x - cx) / cDist) * push;
            n.y += ((n.y - cy) / cDist) * push;
          }
        }
      }

      // Viewport boundary clamping with label margin
      for (const n of nodes) {
        if (n.type === 'repo') {
          n.x = Math.max(90, Math.min(width - 90, n.x));
          n.y = Math.max(105, Math.min(height - 70, n.y));
        }
      }
    }

    // Helper: Test if a label bounding box overlaps any hub or other repo
    const checkLabelOverlap = (
      lx: number,
      ly: number,
      anchor: 'start' | 'end' | 'middle',
      labelLen: number,
      ownerNode: NetworkNode
    ): number => {
      const w = Math.min(90, Math.max(40, labelLen * 6.6));
      let left = lx;
      let right = lx + w;
      if (anchor === 'end') {
        left = lx - w;
        right = lx;
      } else if (anchor === 'middle') {
        left = lx - w / 2;
        right = lx + w / 2;
      }
      const top = ly - 10;
      const bottom = ly + 14;

      let score = 0;
      for (const other of nodes) {
        if (other === ownerNode) continue;
        const oRadius = other.radius + 6;
        // AABB check against circle
        const closestX = Math.max(left, Math.min(right, other.x));
        const closestY = Math.max(top, Math.min(bottom, other.y));
        const d = Math.hypot(closestX - other.x, closestY - other.y);
        if (d < oRadius) {
          score += (oRadius - d);
        }
      }
      return score;
    };

    // 6. Calculate Typographic Label coordinates with intelligent orientation & zero overlap
    for (const node of nodes) {
      if (node.type === 'repo') {
        const candidatePositions: Array<{
          labelX: number;
          labelY: number;
          textAnchor: 'start' | 'end' | 'middle';
          score: number;
        }> = [];

        // Candidates:
        // A) To the right (text-anchor="start")
        const rightPos = {
          labelX: Number((node.x + node.radius + 7).toFixed(1)),
          labelY: Number((node.y + 3).toFixed(1)),
          textAnchor: 'start' as const,
          score: 0
        };
        rightPos.score = checkLabelOverlap(rightPos.labelX, rightPos.labelY, 'start', node.label.length, node);
        candidatePositions.push(rightPos);

        // B) To the left (text-anchor="end")
        const leftPos = {
          labelX: Number((node.x - node.radius - 7).toFixed(1)),
          labelY: Number((node.y + 3).toFixed(1)),
          textAnchor: 'end' as const,
          score: 0
        };
        leftPos.score = checkLabelOverlap(leftPos.labelX, leftPos.labelY, 'end', node.label.length, node);
        candidatePositions.push(leftPos);

        // C) Below (text-anchor="middle")
        const belowPos = {
          labelX: Number(node.x.toFixed(1)),
          labelY: Number((node.y + node.radius + 13).toFixed(1)),
          textAnchor: 'middle' as const,
          score: 0
        };
        belowPos.score = checkLabelOverlap(belowPos.labelX, belowPos.labelY, 'middle', node.label.length, node);
        candidatePositions.push(belowPos);

        // D) Above (text-anchor="middle")
        const abovePos = {
          labelX: Number(node.x.toFixed(1)),
          labelY: Number((node.y - node.radius - 8).toFixed(1)),
          textAnchor: 'middle' as const,
          score: 0
        };
        abovePos.score = checkLabelOverlap(abovePos.labelX, abovePos.labelY, 'middle', node.label.length, node);
        candidatePositions.push(abovePos);

        // Preference bias according to position relative to center cx
        if (node.x >= cx) {
          rightPos.score -= 0.5; // Slightly prefer outward
        } else {
          leftPos.score -= 0.5;
        }

        // Sort by lowest collision score
        candidatePositions.sort((a, b) => a.score - b.score);
        const best = candidatePositions[0];

        node.labelX = best.labelX;
        node.labelY = best.labelY;
        node.textAnchor = best.textAnchor;
      }
    }

    // 7. Render Edges
    let svgEdges = '<g class="network-edges">';
    for (const edge of edges) {
      const isHubEdge = edge.from.type === 'hub' && edge.to.type === 'hub';
      const dashArray = isHubEdge ? '3, 4' : (edge.dashed ? '2, 3' : 'none');
      svgEdges += `
        <line
          x1="${edge.from.x}"
          y1="${edge.from.y}"
          x2="${edge.to.x}"
          y2="${edge.to.y}"
          stroke="${escapeXml(edge.color)}"
          stroke-width="${isHubEdge ? 1.4 : 0.85}"
          stroke-dasharray="${dashArray}"
          opacity="${edge.opacity.toFixed(2)}"
        />
      `;
    }
    svgEdges += '</g>';

    // 8. Render Nodes
    let svgNodes = '<g class="network-nodes">';
    for (const node of nodes) {
      const isHub = node.type === 'hub';

      if (isHub) {
        const labelFontSize = node.label.length > 8 ? 8.5 : 10;
        svgNodes += `
          <g id="${escapeXml(node.id)}" class="network-hub" transform="translate(${node.x}, ${node.y})">
            <!-- Hub Aura -->
            <circle cx="0" cy="0" r="${node.radius + 6}" fill="${escapeXml(node.color)}" opacity="0.2" filter="url(#stellar-glow)" class="pulsar-glow" />
            <!-- Hub Core -->
            <circle cx="0" cy="0" r="${node.radius}" fill="${escapeXml(node.color)}" />
            <circle cx="0" cy="0" r="${node.radius - 3}" fill="var(--color-card-bg)" />
            <!-- Text -->
            <text x="0" y="-1" text-anchor="middle" dominant-baseline="central" style="font-size: ${labelFontSize}px; font-weight: 700; fill: var(--color-text-primary);">
              ${escapeXml(truncate(node.label, 12))}
            </text>
            <text x="0" y="11" text-anchor="middle" style="font-size: 8px; font-weight: 600; fill: var(--color-text-muted);">
              ${escapeXml(node.sub)}
            </text>
          </g>
        `;
      } else {
        svgNodes += `
          <g id="${escapeXml(node.id)}" class="network-repo">
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
                ${escapeXml(truncate(node.label, 15))}
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
