import { ActionConfig, EcosystemData, NormalizedRepo } from '../types.js';
import { TemplateRenderer } from './base.js';
import { renderFooter, renderHeader, wrapSvgDocument } from '../svg/builder.js';
import { escapeXml, polarToCartesian, SeededRandom, truncate } from '../svg/utils.js';

interface PositionedRepo {
  repo: NormalizedRepo;
  x: number;
  y: number;
  r: number;
  isFloating: boolean; // true if floating freely in deep space
  orbitRadius?: number;
  angle: number;
  driftClass?: string;
}

export class SpaceTemplate implements TemplateRenderer {
  render(data: EcosystemData, config: ActionConfig): string {
    const width = 900;
    const height = 540;
    // Adjust vertical center if header or footer are disabled
    let cy = 280;
    if (config.showHeader === false && config.showFooter === false) {
      cy = 270;
    } else if (config.showHeader === false) {
      cy = 250;
    } else if (config.showFooter === false) {
      cy = 300;
    }
    const cx = 450;

    const rng = new SeededRandom(data.user.login);

    // Star field background
    let starDust = '<g class="star-field" opacity="0.8">';
    for (let i = 0; i < 90; i++) {
      const sx = rng.range(20, width - 20).toFixed(1);
      const sy = rng.range(20, height - 40).toFixed(1);
      const sr = rng.range(0.6, 1.8).toFixed(1);
      const sop = rng.range(0.2, 0.85).toFixed(2);
      const twinkleClass = i % 7 === 0 ? 'class="star-twinkle-1"' : i % 11 === 0 ? 'class="star-twinkle-2"' : '';
      starDust += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="var(--color-star-dust)" opacity="${sop}" ${twinkleClass} />`;
    }
    for (let i = 0; i < 8; i++) {
      const tx = rng.range(40, width - 40);
      const ty = rng.range(40, height - 60);
      const tClass = i % 2 === 0 ? 'star-twinkle-1' : 'star-twinkle-2';
      starDust += `
        <g transform="translate(${tx.toFixed(1)}, ${ty.toFixed(1)})" opacity="0.4" class="${tClass}">
          <line x1="-4" y1="0" x2="4" y2="0" stroke="var(--color-star-dust)" stroke-width="0.75" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--color-star-dust)" stroke-width="0.75" />
        </g>
      `;
    }
    starDust += '</g>';

    // Animated background objects (comet, ufo, spaceship, satellite)
    const showAnims = config.showAnimations !== false;

    const comet = (showAnims && config.showComet !== false)
      ? `
      <g class="comet-object" opacity="0.85">
        <defs>
          <linearGradient id="comet-tail" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0" />
            <stop offset="70%" stop-color="var(--color-accent)" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="1" />
          </linearGradient>
        </defs>
        <line x1="0" y1="0" x2="60" y2="18" stroke="url(#comet-tail)" stroke-width="2" stroke-linecap="round" />
        <circle cx="60" cy="18" r="3" fill="#FFFFFF" filter="url(#stellar-glow)" />
      </g>
    `
      : '';

    const ufo = (showAnims && config.showUfo !== false)
      ? `
      <g class="ufo-scout" opacity="0">
        <ellipse cx="25" cy="12" rx="20" ry="5" fill="var(--color-accent)" opacity="0.35" filter="url(#stellar-glow)" />
        <ellipse cx="25" cy="12" rx="18" ry="4" fill="#0F172A" stroke="var(--color-accent)" stroke-width="0.75" />
        <path d="M 18 10 Q 25 3 32 10 Z" fill="url(#core-sun)" opacity="0.95" />
        <circle cx="17" cy="12.5" r="1.1" fill="#38BDF8" />
        <circle cx="25" cy="13" r="1.3" fill="#FBBF24" />
        <circle cx="33" cy="12.5" r="1.1" fill="#34D399" />
      </g>
    `
      : '';

    const spaceship = (showAnims && config.showSpaceship !== false)
      ? `
      <g class="spaceship-scout" opacity="0">
        <polygon points="2,8 -24,5 -24,11" fill="#38BDF8" opacity="0.75" filter="url(#stellar-glow)" />
        <polygon points="2,8 -14,6 -14,10" fill="#FFFFFF" opacity="0.9" />
        <polygon points="2,14 -24,11 -24,17" fill="#38BDF8" opacity="0.75" filter="url(#stellar-glow)" />
        <polygon points="2,14 -14,12 -14,16" fill="#FFFFFF" opacity="0.9" />
        <polygon points="16,3 2,-4 -2,6" fill="#1E293B" stroke="#475569" stroke-width="0.6" />
        <polygon points="16,19 2,26 -2,16" fill="#1E293B" stroke="#475569" stroke-width="0.6" />
        <path d="M 38 11 L 18 5 L 0 6 L -2 11 L 0 16 L 18 17 Z" fill="#E2E8F0" stroke="#334155" stroke-width="0.8" />
        <line x1="14" y1="6" x2="14" y2="16" stroke="#94A3B8" stroke-width="0.5" />
        <line x1="24" y1="8" x2="24" y2="14" stroke="#94A3B8" stroke-width="0.5" />
        <polygon points="27,11 20,8.5 15,11 20,13.5" fill="#0284C7" stroke="#38BDF8" stroke-width="0.6" />
        <polygon points="25,11 21,9.5 18,11 21,12.5" fill="#BAE6FD" opacity="0.6" />
        <circle cx="2" cy="-4" r="1.2" fill="#EF4444" />
        <circle cx="2" cy="26" r="1.2" fill="#22C55E" />
        <circle cx="38" cy="11" r="1.2" fill="#FFFFFF" />
      </g>
    `
      : '';

    const satellite = (showAnims && config.showSatellite !== false)
      ? `
      <g class="satellite-probe" opacity="0">
        <path d="M -5 -7 Q 0 -15 5 -7" fill="none" stroke="#E2E8F0" stroke-width="1.4" />
        <line x1="0" y1="-11" x2="0" y2="-18" stroke="#94A3B8" stroke-width="0.8" />
        <circle cx="0" cy="-18" r="1.4" fill="#EF4444" />
        <line x1="-12" y1="0" x2="-8" y2="0" stroke="#94A3B8" stroke-width="1.2" />
        <rect x="-34" y="-7" width="22" height="14" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.7" />
        <line x1="-27" y1="-7" x2="-27" y2="7" stroke="#38BDF8" stroke-width="0.4" stroke-opacity="0.8" />
        <line x1="-20" y1="-7" x2="-20" y2="7" stroke="#38BDF8" stroke-width="0.4" stroke-opacity="0.8" />
        <line x1="-34" y1="0" x2="-12" y2="0" stroke="#38BDF8" stroke-width="0.4" stroke-opacity="0.8" />
        <line x1="8" y1="0" x2="12" y2="0" stroke="#94A3B8" stroke-width="1.2" />
        <rect x="12" y="-7" width="22" height="14" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.7" />
        <line x1="19" y1="-7" x2="19" y2="7" stroke="#38BDF8" stroke-width="0.4" stroke-opacity="0.8" />
        <line x1="26" y1="-7" x2="26" y2="7" stroke="#38BDF8" stroke-width="0.4" stroke-opacity="0.8" />
        <line x1="12" y1="0" x2="34" y2="0" stroke="#38BDF8" stroke-width="0.4" stroke-opacity="0.8" />
        <polygon points="-8,-6 8,-6 13,0 8,6 -8,6 -13,0" fill="#D97706" stroke="#F59E0B" stroke-width="0.8" />
        <polygon points="-6,-4 6,-4 10,0 6,4 -6,4 -10,0" fill="#F59E0B" opacity="0.9" />
        <circle cx="0" cy="6" r="2.2" fill="#0F172A" stroke="#94A3B8" stroke-width="0.6" />
        <circle cx="0" cy="6" r="1.1" fill="#38BDF8" />
      </g>
    `
      : '';

    // 3. Separate Repositories: Connected System vs Floating (Isolated)
    const maxRepos = Math.min(10, config.maxRepositories || 10);
    const repos = data.repositories.slice(0, maxRepos);

    // Count language occurrences to find shared technology clusters
    const langCounts = new Map<string, number>();
    for (const r of repos) {
      if (r.primaryLanguage) {
        langCounts.set(r.primaryLanguage, (langCounts.get(r.primaryLanguage) || 0) + 1);
      }
    }

    const orbitalRepos: NormalizedRepo[] = [];
    const floatingRepos: NormalizedRepo[] = [];

    for (const r of repos) {
      const isSharedLang = (langCounts.get(r.primaryLanguage) || 0) >= 2;
      const isProminent = r.stars > 0 || r.activityScore >= 45;

      // Connected system repos have either shared language partner or prominence
      if (isSharedLang || isProminent) {
        orbitalRepos.push(r);
      } else {
        // Isolated repos that float freely in deep space
        floatingRepos.push(r);
      }
    }

    // Ensure at least top repo sits in orbit if none were categorized as orbital
    if (orbitalRepos.length === 0 && repos.length > 0) {
      orbitalRepos.push(repos[0]);
      floatingRepos.splice(0, 1);
    }

    // 4. Concentric Orbit Rings for the orbital repos
    const orbitRadii = [85, 145, 205];
    let orbitRings = '';
    const activeOrbitTiers = Math.min(3, Math.max(1, Math.ceil(orbitalRepos.length / 3)));

    if (config.showOrbits !== false) {
      orbitRings = '<g class="orbits">';
      for (let i = 0; i < activeOrbitTiers; i++) {
        const r = orbitRadii[i];
        const strokeDash = i % 2 === 1 ? 'stroke-dasharray="4, 4"' : '';
        orbitRings += `
          <circle
            cx="${cx}"
            cy="${cy}"
            r="${r}"
            class="orbit-ring"
            ${strokeDash}
            opacity="${(0.5 - i * 0.1).toFixed(2)}"
          />
        `;
      }
      orbitRings += '</g>';
    }

    // 5. Position Connected Repos on Orbits
    const allPositions: PositionedRepo[] = [];
    const tierBuckets: NormalizedRepo[][] = [[], [], []];
    for (let i = 0; i < orbitalRepos.length; i++) {
      const bucketIdx = Math.min(activeOrbitTiers - 1, Math.floor(i / 3));
      tierBuckets[bucketIdx].push(orbitalRepos[i]);
    }

    const tierPhases = [0.4, Math.PI / 2 + 0.3, Math.PI / 3 + 0.8];
    for (let t = 0; t < activeOrbitTiers; t++) {
      const bRepos = tierBuckets[t];
      const orbitR = orbitRadii[t];
      const count = bRepos.length;
      const basePhase = tierPhases[t] ?? (t * 1.1);

      for (let i = 0; i < count; i++) {
        const repo = bRepos[i];
        const angle = basePhase + (i * 2 * Math.PI) / (count || 1);
        const pos = polarToCartesian(cx, cy, orbitR, angle);
        allPositions.push({
          repo,
          x: pos.x,
          y: pos.y,
          r: repo.gravityRadius,
          isFloating: false,
          orbitRadius: orbitR,
          angle
        });
      }
    }

    // 6. Position Floating Bodies in open perimeter quadrants
    const floatQuadrants = [
      { x: 125, y: 150 },
      { x: 775, y: 160 },
      { x: 135, y: 405 },
      { x: 765, y: 415 },
      { x: 450, y: 105 },
      { x: 450, y: 455 }
    ];

    for (let i = 0; i < floatingRepos.length; i++) {
      const repo = floatingRepos[i];
      const basePos = floatQuadrants[i % floatQuadrants.length];
      const jitterX = rng.range(-15, 15);
      const jitterY = rng.range(-12, 12);
      const driftClass = i % 2 === 0 ? 'drift-node-a' : 'drift-node-b';

      allPositions.push({
        repo,
        x: Number((basePos.x + jitterX).toFixed(1)),
        y: Number((basePos.y + jitterY).toFixed(1)),
        r: repo.gravityRadius * 0.9,
        isFloating: true,
        angle: 0,
        driftClass
      });
    }

    // 7. Iterative Anti-Collision Relaxation Pass
    for (let iter = 0; iter < 45; iter++) {
      // 7.1 Keep bodies clear of central star core
      for (const p of allPositions) {
        const sunDist = Math.hypot(p.x - cx, p.y - cy) || 1;
        if (sunDist < 78) {
          const push = 78 - sunDist;
          p.x = Number((p.x + ((p.x - cx) / sunDist) * push).toFixed(1));
          p.y = Number((p.y + ((p.y - cy) / sunDist) * push).toFixed(1));
        }
      }

      // 7.2 Inter-body anti-collision with horizontal clearance for typographic labels
      for (let i = 0; i < allPositions.length; i++) {
        for (let j = i + 1; j < allPositions.length; j++) {
          const p1 = allPositions[i];
          const p2 = allPositions[j];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Labels extend horizontally ~80px and vertically ~28px
          const reqDx = p1.r + p2.r + 76;
          const reqDy = p1.r + p2.r + 32;

          if (absDx < reqDx && absDy < reqDy) {
            const overlapX = (reqDx - absDx) * (dx < 0 ? -1 : 1) * 0.45;
            const overlapY = (reqDy - absDy) * (dy < 0 ? -1 : 1) * 0.45;

            p1.x = Number((p1.x - overlapX).toFixed(1));
            p1.y = Number((p1.y - overlapY).toFixed(1));
            p2.x = Number((p2.x + overlapX).toFixed(1));
            p2.y = Number((p2.y + overlapY).toFixed(1));
          }
        }
      }

      // 7.3 Keep bodies within viewport boundaries
      for (const p of allPositions) {
        p.x = Math.max(90, Math.min(width - 95, p.x));
        p.y = Math.max(105, Math.min(height - 70, p.y));
      }
    }

    // 8. Constellation Lines between connected orbital repos sharing language (if enabled)
    let constellationLines = '';
    if (config.showConstellations !== false) {
      constellationLines = '<g class="constellations" opacity="0.6">';
      for (let i = 0; i < allPositions.length; i++) {
        for (let j = i + 1; j < allPositions.length; j++) {
          const p1 = allPositions[i];
          const p2 = allPositions[j];
          // Only connect non-floating orbital repos that share a real programming language
          if (
            !p1.isFloating &&
            !p2.isFloating &&
            p1.repo.primaryLanguage &&
            p1.repo.primaryLanguage !== 'Other' &&
            p1.repo.primaryLanguage === p2.repo.primaryLanguage
          ) {
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (dist < 280) {
              const opacity = Math.max(0.15, (1 - dist / 280) * 0.5).toFixed(2);
              const strokeColor = p1.repo.primaryColor || 'var(--color-constellation-line)';
              constellationLines += `
                <line
                  x1="${p1.x}"
                  y1="${p1.y}"
                  x2="${p2.x}"
                  y2="${p2.y}"
                  stroke="${escapeXml(strokeColor)}"
                  stroke-width="0.8"
                  stroke-dasharray="2, 3"
                  opacity="${opacity}"
                />
              `;
            }
          }
        }
      }
      constellationLines += '</g>';
    }

    // 8. Central Singularity / Star Core (with user avatar or fallback text)
    const avatarUrl = data.user.avatarUrl || '';
    const coreAvatarId = `core-avatar-clip-${cx}`;
    const coreAvatarSection = avatarUrl
      ? `
        <defs>
          <clipPath id="${coreAvatarId}">
            <circle cx="0" cy="0" r="18" />
          </clipPath>
        </defs>
        <image
          href="${escapeXml(avatarUrl)}"
          x="-18"
          y="-18"
          width="36"
          height="36"
          clip-path="url(#${coreAvatarId})"
          preserveAspectRatio="xMidYMid slice"
        />
        <circle cx="0" cy="0" r="18" fill="none" stroke="var(--color-sun-core)" stroke-width="1.5" opacity="0.7" />
      `
      : `
        <circle cx="0" cy="0" r="18" fill="url(#core-sun)" />
        <circle cx="0" cy="0" r="13" fill="var(--color-sun-core)" opacity="0.95" />
        <text
          x="0"
          y="2"
          text-anchor="middle"
          dominant-baseline="central"
          style="font-size: 8px; font-weight: 800; fill: #0B132B; letter-spacing: 0.05em;"
        >
          CORE
        </text>
      `;
    const centralStar = `
      <g class="central-core" transform="translate(${cx}, ${cy})">
        <!-- Outer Gravitational Aura (Pulsating) -->
        <circle cx="0" cy="0" r="46" fill="url(#core-sun)" opacity="0.25" filter="url(#stellar-glow)" class="pulsar-glow" />
        <circle cx="0" cy="0" r="28" fill="url(#core-sun)" opacity="0.5" />
        <!-- Core Body -->
        ${coreAvatarSection}
      </g>
    `;

    // Celestial body nodes
    let planetNodes = '<g class="planet-nodes">';
    for (const p of allPositions) {
      const repo = p.repo;
      const color = repo.primaryColor || '#64748B';
      const isHighActivity = repo.activityScore >= 50 || repo.stars > 0;
      const animGroupClass = p.isFloating ? p.driftClass || '' : '';

      // Label positioning
      let lx = p.x;
      let ly = p.y;
      let textAnchor = 'start';

      if (p.isFloating) {
        lx = p.x;
        ly = p.y + p.r + 14;
        textAnchor = 'middle';
      } else {
        const relAngle = Math.atan2(p.y - cy, p.x - cx);
        const cosA = Math.cos(relAngle);
        const sinA = Math.sin(relAngle);
        const radialOffset = p.r + 7;
        lx = p.x + cosA * radialOffset;
        ly = p.y + sinA * radialOffset + (sinA > 0 ? 5 : -1);
        textAnchor = cosA >= 0 ? 'start' : 'end';
      }

      planetNodes += `
        <g class="${animGroupClass}">
          <g transform="translate(${p.x}, ${p.y})">
            ${
              isHighActivity
                ? `<circle cx="0" cy="0" r="${p.r + 6}" fill="none" stroke="${escapeXml(color)}" stroke-width="0.8" opacity="0.45" filter="url(#stellar-glow)" class="pulsar-glow" />`
                : ''
            }
            ${
              p.isFloating
                ? `<circle cx="0" cy="0" r="${p.r + 3}" fill="none" stroke="var(--color-text-muted)" stroke-width="0.6" stroke-dasharray="2, 2" opacity="0.4" />`
                : ''
            }
            ${
              repo.isExternal
                ? `<circle cx="0" cy="0" r="${p.r + 4}" fill="none" stroke="var(--color-accent)" stroke-width="0.8" stroke-dasharray="3, 3" opacity="0.6" />`
                : ''
            }
            <circle cx="0" cy="0" r="${p.r + 2}" fill="${escapeXml(color)}" opacity="0.25" filter="url(#stellar-glow)" />
            <circle cx="0" cy="0" r="${p.r}" fill="${escapeXml(color)}" />
            <circle cx="0" cy="0" r="${Math.max(1.5, p.r * 0.35)}" fill="#FFFFFF" opacity="0.6" />
          </g>

          <!-- Typographic Label -->
          <g transform="translate(${lx.toFixed(1)}, ${ly.toFixed(1)})">
            <text
              x="0"
              y="0"
              text-anchor="${textAnchor}"
              class="repo-label"
            >
              ${escapeXml(truncate(repo.name, 17))}
            </text>
            <text
              x="0"
              y="11"
              text-anchor="${textAnchor}"
              class="repo-sub"
            >
              ${repo.stars > 0 ? `★ ${repo.stars} • ` : ''}${escapeXml(repo.primaryLanguage || 'Repository')}${repo.authorshipRatio !== undefined && repo.authorshipRatio < 0.99 ? ` (${Math.round(repo.authorshipRatio * 100)}%)` : ''}
            </text>
          </g>
        </g>
      `;
    }
    planetNodes += '</g>';

    // Header & Footer
    const headerGroup = renderHeader(data, width, config);
    const footerGroup = renderFooter(data, width, height - 38, config);

    const svgContent = `
      ${headerGroup}
      ${starDust}
      ${comet}
      ${ufo}
      ${spaceship}
      ${satellite}
      ${orbitRings}
      ${constellationLines}
      ${centralStar}
      ${planetNodes}
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
