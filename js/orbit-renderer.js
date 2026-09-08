"use strict";
(() => {
  // src/data/filter.ts
  function patternToRegex(pattern) {
    const trimmed = pattern.trim().toLowerCase();
    const escaped = trimmed.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`, "i");
  }
  function matchesPatterns(repoName, patterns) {
    if (!patterns || patterns.length === 0) return false;
    const name = repoName.toLowerCase().trim();
    for (const pattern of patterns) {
      const p = pattern.trim();
      if (!p) continue;
      if (name === p.toLowerCase()) return true;
      if (p.includes("*") || p.includes("?")) {
        const regex = patternToRegex(p);
        if (regex.test(name)) return true;
      }
    }
    return false;
  }
  function filterRepositories(repos, config) {
    const {
      excludeRepositories = [],
      includeRepositories = [],
      includeForks = false,
      includeArchived = false
    } = config;
    return repos.filter((repo) => {
      if (repo.isPrivate) {
        return false;
      }
      if (repo.isFork && !includeForks) {
        return false;
      }
      if (repo.isArchived && !includeArchived) {
        return false;
      }
      if (includeRepositories.length > 0) {
        const hasLocalPatterns = includeRepositories.some((p) => !p.includes("/") && p !== "*");
        const hasWildcard = includeRepositories.includes("*");
        if (!repo.isExternal) {
          if (hasLocalPatterns && !hasWildcard) {
            const isExplicitlyIncluded = matchesPatterns(repo.name, includeRepositories);
            if (!isExplicitlyIncluded) {
              return false;
            }
          }
        } else {
          const isExplicitlyIncluded = matchesPatterns(repo.name, includeRepositories) || (repo.nameWithOwner ? matchesPatterns(repo.nameWithOwner, includeRepositories) : false);
          if (!isExplicitlyIncluded) {
            return false;
          }
        }
      }
      if (excludeRepositories.length > 0) {
        const isExcluded = matchesPatterns(repo.name, excludeRepositories) || (repo.nameWithOwner ? matchesPatterns(repo.nameWithOwner, excludeRepositories) : false);
        if (isExcluded) {
          return false;
        }
      }
      return true;
    });
  }

  // src/data/analytics.ts
  function calculateDaysAgo(isoDate, baseDate = /* @__PURE__ */ new Date()) {
    if (!isoDate) return 999;
    const target = new Date(isoDate);
    if (isNaN(target.getTime())) return 999;
    const diffMs = baseDate.getTime() - target.getTime();
    return Math.max(0, Math.floor(diffMs / (1e3 * 60 * 60 * 24)));
  }
  function calculateActivityScore(pushedDaysAgo, stars, forks) {
    let recencyScore = 0;
    if (pushedDaysAgo <= 7) {
      recencyScore = 60;
    } else if (pushedDaysAgo <= 30) {
      recencyScore = 45;
    } else if (pushedDaysAgo <= 90) {
      recencyScore = 30;
    } else if (pushedDaysAgo <= 180) {
      recencyScore = 18;
    } else if (pushedDaysAgo <= 365) {
      recencyScore = 10;
    } else {
      recencyScore = 4;
    }
    const starScore = Math.min(25, Math.round(Math.log10(stars + 1) * 8));
    const forkScore = Math.min(15, Math.round(Math.log10(forks + 1) * 6));
    return Math.min(100, recencyScore + starScore + forkScore);
  }
  function calculateGravityRadius(stars, activityScore) {
    const base = 5.5;
    const starWeight = Math.min(10, Math.log2(stars + 1) * 1.8);
    const activityWeight = activityScore / 100 * 4.5;
    return Math.min(20, Math.max(5.5, Number((base + starWeight + activityWeight).toFixed(1))));
  }
  function assignOrbitTier(activityScore, index, total) {
    if (activityScore >= 65 || index === 0) return 1;
    if (activityScore >= 40 || index < Math.ceil(total * 0.35)) return 2;
    if (activityScore >= 20 || index < Math.ceil(total * 0.7)) return 3;
    return 4;
  }
  function determineCosmicRank(totalRepos, totalCommits, totalStars) {
    const composite = totalRepos * 2 + Math.min(100, Math.floor(totalCommits / 10)) + totalStars * 3;
    if (composite >= 250) return "Principal Engineer";
    if (composite >= 140) return "Senior Developer";
    if (composite >= 80) return "Active Contributor";
    if (composite >= 35) return "Software Developer";
    return "Software Contributor";
  }
  function aggregateLanguages(repos) {
    const langMap = /* @__PURE__ */ new Map();
    for (const repo of repos) {
      if (repo.languages && repo.languages.length > 0) {
        for (const lang of repo.languages) {
          if (!lang.name || lang.bytes <= 0) continue;
          const existing = langMap.get(lang.name) || {
            color: lang.color || "#64748B",
            bytes: 0,
            count: 0
          };
          existing.bytes += lang.bytes;
          existing.count += 1;
          if (lang.color && lang.color !== "#94A3B8") existing.color = lang.color;
          langMap.set(lang.name, existing);
        }
      } else if (repo.primaryLanguage && repo.primaryLanguage !== "Markdown" && repo.primaryLanguage !== "Other") {
        const existing = langMap.get(repo.primaryLanguage) || {
          color: repo.primaryColor || "#64748B",
          bytes: 1,
          count: 0
        };
        existing.count += 1;
        langMap.set(repo.primaryLanguage, existing);
      }
    }
    const totalBytes = Array.from(langMap.values()).reduce((sum, item) => sum + item.bytes, 0);
    const stats = Array.from(langMap.entries()).map(([name, data]) => ({
      name,
      color: data.color,
      bytes: data.bytes,
      percentage: totalBytes > 0 ? Number((data.bytes / totalBytes * 100).toFixed(1)) : 0,
      repoCount: data.count
    }));
    return stats.sort((a, b) => b.bytes - a.bytes);
  }
  function aggregateTopics(repos) {
    const topicMap = /* @__PURE__ */ new Map();
    for (const repo of repos) {
      for (const topic of repo.topics) {
        const clean = topic.toLowerCase().trim();
        topicMap.set(clean, (topicMap.get(clean) || 0) + 1);
      }
    }
    const stats = Array.from(topicMap.entries()).map(([topic, count]) => ({
      topic,
      count
    }));
    return stats.sort((a, b) => b.count - a.count);
  }

  // src/data/normalizer.ts
  function normalizeEcosystemData(rawData, config, baseDate = /* @__PURE__ */ new Date()) {
    const rawUser = rawData.user;
    const user = {
      login: rawUser.login,
      name: rawUser.name || rawUser.login,
      bio: rawUser.bio || "",
      avatarUrl: rawUser.avatarUrl || "",
      followers: rawUser.followers?.totalCount || 0,
      following: rawUser.following?.totalCount || 0,
      createdAt: rawUser.createdAt,
      totalCommitContributions: rawUser.contributionsCollection?.totalCommitContributions || 0,
      restrictedContributionsCount: rawUser.contributionsCollection?.restrictedContributionsCount || 0
    };
    const rawRepos = rawUser.repositories?.nodes || [];
    const filtered = filterRepositories(rawRepos, config);
    const sortedRaw = [...filtered].sort((a, b) => {
      const scoreA = a.stargazerCount * 2 + new Date(a.pushedAt).getTime() / 1e10;
      const scoreB = b.stargazerCount * 2 + new Date(b.pushedAt).getTime() / 1e10;
      return scoreB - scoreA;
    });
    const activeSubset = sortedRaw.slice(0, config.maxRepositories || 25);
    const repositories = activeSubset.map((repo, idx) => {
      const pushedDaysAgo = calculateDaysAgo(repo.pushedAt, baseDate);
      const activityScore = calculateActivityScore(
        pushedDaysAgo,
        repo.stargazerCount,
        repo.forkCount
      );
      const authorshipRatio = repo.authorshipRatio !== void 0 ? repo.authorshipRatio : 1;
      const isExternal = Boolean(repo.isExternal || repo.nameWithOwner && !repo.nameWithOwner.startsWith(`${user.login}/`));
      const baseGravityRadius = calculateGravityRadius(repo.stargazerCount, activityScore);
      const gravityRadius = authorshipRatio < 0.99 ? Math.max(12, Math.round(baseGravityRadius * Math.sqrt(Math.max(0.2, authorshipRatio)))) : baseGravityRadius;
      const orbitTier = assignOrbitTier(activityScore, idx, activeSubset.length);
      const langEdges = repo.languages?.edges || [];
      const languages2 = langEdges.map((edge) => {
        const personalBytes = Math.round(edge.size * authorshipRatio);
        return {
          name: edge.node.name,
          color: edge.node.color || "#94A3B8",
          bytes: personalBytes,
          percentage: 0
        };
      });
      const totalBytes = languages2.reduce((acc, l) => acc + l.bytes, 0);
      for (const l of languages2) {
        l.percentage = totalBytes > 0 ? Number((l.bytes / totalBytes * 100).toFixed(1)) : 0;
      }
      const topics2 = (repo.repositoryTopics?.nodes || []).map((t) => t.topic.name);
      const primaryColor = repo.primaryLanguage?.color || (languages2.length > 0 ? languages2[0].color : "#38BDF8");
      const primaryLanguage = repo.primaryLanguage?.name || (languages2.length > 0 ? languages2[0].name : "Markdown");
      return {
        id: repo.id,
        name: repo.name,
        owner: repo.nameWithOwner ? repo.nameWithOwner.split("/")[0] : user.login,
        description: repo.description || "",
        isFork: repo.isFork,
        isArchived: repo.isArchived,
        stars: repo.stargazerCount,
        forks: repo.forkCount,
        primaryLanguage,
        primaryColor,
        languages: languages2,
        topics: topics2,
        pushedAt: repo.pushedAt,
        pushedDaysAgo,
        activityScore: Math.round(activityScore * Math.sqrt(Math.max(0.2, authorshipRatio))),
        gravityRadius,
        orbitTier,
        resonanceCluster: primaryLanguage,
        authorshipRatio,
        isExternal
      };
    });
    const totalStars = repositories.reduce((sum, r) => sum + r.stars, 0);
    const totalForks = repositories.reduce((sum, r) => sum + r.forks, 0);
    const languages = aggregateLanguages(repositories);
    const topics = aggregateTopics(repositories);
    const dominantLanguage = languages.length > 0 ? languages[0].name : "Universal";
    const totalCommits = user.totalCommitContributions + user.restrictedContributionsCount;
    const cosmicRank = determineCosmicRank(repositories.length, totalCommits, totalStars);
    let diversityIndex = 0;
    if (languages.length > 1) {
      const entropy = languages.reduce((acc, l) => {
        const p = l.percentage / 100;
        return p > 0 ? acc - p * Math.log2(p) : acc;
      }, 0);
      const maxEntropy = Math.log2(languages.length);
      diversityIndex = maxEntropy > 0 ? Math.round(entropy / maxEntropy * 100) : 0;
    }
    return {
      user,
      repositories,
      metrics: {
        totalRepos: repositories.length,
        totalStars,
        totalForks,
        totalCommits,
        languages,
        topics,
        dominantLanguage,
        cosmicRank,
        diversityIndex
      },
      generatedAt: baseDate.toISOString().split("T")[0]
    };
  }

  // src/theme/palettes.ts
  var DARK_THEME = {
    bg: "#080C16",
    bgSecondary: "#0B132B",
    bgGradient: ["#060913", "#0B1329", "#070C1B"],
    cardBg: "rgba(15, 23, 42, 0.72)",
    cardBorder: "rgba(148, 163, 184, 0.14)",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    accent: "#38BDF8",
    accentGlow: "rgba(56, 189, 248, 0.35)",
    orbitLine: "rgba(148, 163, 184, 0.16)",
    constellationLine: "rgba(96, 165, 250, 0.22)",
    gridLine: "rgba(148, 163, 184, 0.08)",
    starDust: "rgba(255, 255, 255, 0.75)",
    radarRing: "rgba(56, 189, 248, 0.12)",
    badgeBg: "rgba(30, 41, 59, 0.7)"
  };
  var LIGHT_THEME = {
    bg: "#FFFFFF",
    bgSecondary: "#F8FAFC",
    bgGradient: ["#FFFFFF", "#F8FAFC", "#F1F5F9"],
    cardBg: "rgba(248, 250, 252, 0.95)",
    cardBorder: "rgba(203, 213, 225, 0.95)",
    textPrimary: "#0F172A",
    textSecondary: "#334155",
    textMuted: "#64748B",
    accent: "#0284C7",
    accentGlow: "rgba(2, 132, 199, 0.25)",
    orbitLine: "rgba(100, 116, 139, 0.22)",
    constellationLine: "rgba(2, 132, 199, 0.35)",
    gridLine: "rgba(226, 232, 240, 0.85)",
    starDust: "rgba(148, 163, 184, 0.55)",
    radarRing: "rgba(2, 132, 199, 0.18)",
    badgeBg: "#F1F5F9"
  };
  function generateThemeCss(theme) {
    if (theme === "dark") {
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
    if (theme === "light") {
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

  // src/svg/utils.ts
  var SeededRandom = class {
    seed;
    constructor(seed = 42) {
      if (typeof seed === "string") {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
          hash = (hash << 5) - hash + seed.charCodeAt(i);
          hash |= 0;
        }
        this.seed = Math.abs(hash) || 123456789;
      } else {
        this.seed = Math.abs(seed) || 123456789;
      }
    }
    next() {
      this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
      return this.seed / 4294967296;
    }
    range(min, max) {
      return min + this.next() * (max - min);
    }
  };
  function escapeXml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function polarToCartesian(cx, cy, r, angleRad) {
    return {
      x: Number((cx + r * Math.cos(angleRad)).toFixed(2)),
      y: Number((cy + r * Math.sin(angleRad)).toFixed(2))
    };
  }
  function formatCompactNumber(num) {
    if (num >= 1e6) {
      return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return num.toString();
  }
  function truncate(str, maxLen) {
    if (!str) return "";
    return str.length > maxLen ? str.slice(0, maxLen - 1) + "\u2026" : str;
  }

  // src/svg/builder.ts
  function getSharedSvgDefs() {
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
  function renderHeader(data, width, config) {
    if (config.showHeader === false) return "";
    const { user, metrics } = data;
    const displayTitle = config.customTitle || `${user.name || user.login} // Ecosystem Overview`;
    const roleBadge = config.role || metrics.cosmicRank;
    return `
    <g class="header-group" transform="translate(32, 28)">
      <!-- Identity & Subtitle -->
      <text x="0" y="24" class="title-text">${escapeXml(displayTitle)}</text>
      <text x="0" y="44" class="subtitle-text">
        <tspan class="rank-badge">${escapeXml(roleBadge)}</tspan>
        <tspan class="bullet-sep"> \u2022 </tspan>
        <tspan>Primary: ${escapeXml(metrics.dominantLanguage)}</tspan>
        <tspan class="bullet-sep"> \u2022 </tspan>
        <tspan>${metrics.totalRepos} Repositories</tspan>
      </text>

      <!-- Metric Pills on the right (if enabled) -->
      ${config.showStats !== false ? `
      <g transform="translate(${width - 64 - 340}, 6)">
        <!-- Stars Pill -->
        <rect x="0" y="0" width="80" height="36" rx="8" class="metric-pill-bg" />
        <text x="40" y="16" text-anchor="middle" class="metric-label">STARS</text>
        <text x="40" y="30" text-anchor="middle" class="metric-val">\u2605 ${formatCompactNumber(metrics.totalStars)}</text>

        <!-- Commits Pill -->
        <rect x="88" y="0" width="80" height="36" rx="8" class="metric-pill-bg" />
        <text x="128" y="16" text-anchor="middle" class="metric-label">COMMITS</text>
        <text x="128" y="30" text-anchor="middle" class="metric-val">\u26A1 ${formatCompactNumber(metrics.totalCommits)}</text>

        <!-- Forks Pill -->
        <rect x="176" y="0" width="76" height="36" rx="8" class="metric-pill-bg" />
        <text x="214" y="16" text-anchor="middle" class="metric-label">FORKS</text>
        <text x="214" y="30" text-anchor="middle" class="metric-val">\u2442 ${formatCompactNumber(metrics.totalForks)}</text>

        <!-- Languages Pill -->
        <rect x="260" y="0" width="80" height="36" rx="8" class="metric-pill-bg" />
        <text x="300" y="16" text-anchor="middle" class="metric-label">LANGUAGES</text>
        <text x="300" y="30" text-anchor="middle" class="metric-val">\u2756 ${metrics.languages.length}</text>
      </g>
      ` : ""}
    </g>
  `;
  }
  function renderFooter(data, width, yPos, config) {
    if (config.showFooter === false) return "";
    const { metrics, generatedAt } = data;
    const topLangs = metrics.languages.slice(0, 5);
    const barWidth = width - 64;
    const barHeight = 6;
    let currentX = 32;
    let barRects = "";
    let legendItems = "";
    let legendX = 32;
    if (config.showLanguages !== false) {
      for (const lang of topLangs) {
        const segWidth = lang.percentage / 100 * barWidth;
        if (segWidth > 1) {
          barRects += `<rect x="${currentX.toFixed(1)}" y="${yPos}" width="${segWidth.toFixed(1)}" height="${barHeight}" rx="2" fill="${escapeXml(lang.color)}" />`;
          currentX += segWidth + 1.5;
        }
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
          \u2726 github-profile-orbit \u2022 ${generatedAt}
        </text>
      </g>
    </g>
  `;
  }
  function wrapSvgDocument(content, options) {
    const { width, height, theme } = options;
    const themeCss = generateThemeCss(theme);
    const defs = getSharedSvgDefs();
    return `
<svg
  xmlns="http://www.w3.org/2000/svg"
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

  // src/templates/space.ts
  var SpaceTemplate = class {
    render(data, config) {
      const width = 900;
      const height = 540;
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
      let starDust = '<g class="star-field" opacity="0.8">';
      for (let i = 0; i < 90; i++) {
        const sx = rng.range(20, width - 20).toFixed(1);
        const sy = rng.range(20, height - 40).toFixed(1);
        const sr = rng.range(0.6, 1.8).toFixed(1);
        const sop = rng.range(0.2, 0.85).toFixed(2);
        const twinkleClass = i % 7 === 0 ? 'class="star-twinkle-1"' : i % 11 === 0 ? 'class="star-twinkle-2"' : "";
        starDust += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="var(--color-star-dust)" opacity="${sop}" ${twinkleClass} />`;
      }
      for (let i = 0; i < 8; i++) {
        const tx = rng.range(40, width - 40);
        const ty = rng.range(40, height - 60);
        const tClass = i % 2 === 0 ? "star-twinkle-1" : "star-twinkle-2";
        starDust += `
        <g transform="translate(${tx.toFixed(1)}, ${ty.toFixed(1)})" opacity="0.4" class="${tClass}">
          <line x1="-4" y1="0" x2="4" y2="0" stroke="var(--color-star-dust)" stroke-width="0.75" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--color-star-dust)" stroke-width="0.75" />
        </g>
      `;
      }
      starDust += "</g>";
      const showAnims = config.showAnimations !== false;
      const comet = showAnims && config.showComet !== false ? `
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
    ` : "";
      const ufo = showAnims && config.showUfo !== false ? `
      <g class="ufo-scout" opacity="0">
        <ellipse cx="25" cy="12" rx="20" ry="5" fill="var(--color-accent)" opacity="0.35" filter="url(#stellar-glow)" />
        <ellipse cx="25" cy="12" rx="18" ry="4" fill="#0F172A" stroke="var(--color-accent)" stroke-width="0.75" />
        <path d="M 18 10 Q 25 3 32 10 Z" fill="url(#core-sun)" opacity="0.95" />
        <circle cx="17" cy="12.5" r="1.1" fill="#38BDF8" />
        <circle cx="25" cy="13" r="1.3" fill="#FBBF24" />
        <circle cx="33" cy="12.5" r="1.1" fill="#34D399" />
      </g>
    ` : "";
      const spaceship = showAnims && config.showSpaceship !== false ? `
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
    ` : "";
      const satellite = showAnims && config.showSatellite !== false ? `
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
    ` : "";
      const maxRepos = Math.min(10, config.maxRepositories || 10);
      const repos = data.repositories.slice(0, maxRepos);
      const langCounts = /* @__PURE__ */ new Map();
      for (const r of repos) {
        if (r.primaryLanguage) {
          langCounts.set(r.primaryLanguage, (langCounts.get(r.primaryLanguage) || 0) + 1);
        }
      }
      const orbitalRepos = [];
      const floatingRepos = [];
      for (const r of repos) {
        const isSharedLang = (langCounts.get(r.primaryLanguage) || 0) >= 2;
        const isProminent = r.stars > 0 || r.activityScore >= 45;
        if (isSharedLang || isProminent) {
          orbitalRepos.push(r);
        } else {
          floatingRepos.push(r);
        }
      }
      if (orbitalRepos.length === 0 && repos.length > 0) {
        orbitalRepos.push(repos[0]);
        floatingRepos.splice(0, 1);
      }
      const orbitRadii = [85, 145, 205];
      let orbitRings = "";
      const activeOrbitTiers = Math.min(3, Math.max(1, Math.ceil(orbitalRepos.length / 3)));
      if (config.showOrbits !== false) {
        orbitRings = '<g class="orbits">';
        for (let i = 0; i < activeOrbitTiers; i++) {
          const r = orbitRadii[i];
          const strokeDash = i % 2 === 1 ? 'stroke-dasharray="4, 4"' : "";
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
        orbitRings += "</g>";
      }
      const allPositions = [];
      const tierBuckets = [[], [], []];
      for (let i = 0; i < orbitalRepos.length; i++) {
        const bucketIdx = Math.min(activeOrbitTiers - 1, Math.floor(i / 3));
        tierBuckets[bucketIdx].push(orbitalRepos[i]);
      }
      const tierPhases = [0.4, Math.PI / 2 + 0.3, Math.PI / 3 + 0.8];
      for (let t = 0; t < activeOrbitTiers; t++) {
        const bRepos = tierBuckets[t];
        const orbitR = orbitRadii[t];
        const count = bRepos.length;
        const basePhase = tierPhases[t] ?? t * 1.1;
        for (let i = 0; i < count; i++) {
          const repo = bRepos[i];
          const angle = basePhase + i * 2 * Math.PI / (count || 1);
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
        const driftClass = i % 2 === 0 ? "drift-node-a" : "drift-node-b";
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
      for (let iter = 0; iter < 45; iter++) {
        for (const p of allPositions) {
          const sunDist = Math.hypot(p.x - cx, p.y - cy) || 1;
          if (sunDist < 78) {
            const push = 78 - sunDist;
            p.x = Number((p.x + (p.x - cx) / sunDist * push).toFixed(1));
            p.y = Number((p.y + (p.y - cy) / sunDist * push).toFixed(1));
          }
        }
        for (let i = 0; i < allPositions.length; i++) {
          for (let j = i + 1; j < allPositions.length; j++) {
            const p1 = allPositions[i];
            const p2 = allPositions[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
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
        for (const p of allPositions) {
          p.x = Math.max(90, Math.min(width - 95, p.x));
          p.y = Math.max(105, Math.min(height - 70, p.y));
        }
      }
      let constellationLines = "";
      if (config.showConstellations !== false) {
        constellationLines = '<g class="constellations" opacity="0.6">';
        for (let i = 0; i < allPositions.length; i++) {
          for (let j = i + 1; j < allPositions.length; j++) {
            const p1 = allPositions[i];
            const p2 = allPositions[j];
            if (!p1.isFloating && !p2.isFloating && p1.repo.primaryLanguage && p1.repo.primaryLanguage !== "Other" && p1.repo.primaryLanguage === p2.repo.primaryLanguage) {
              const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
              if (dist < 280) {
                const opacity = Math.max(0.15, (1 - dist / 280) * 0.5).toFixed(2);
                const strokeColor = p1.repo.primaryColor || "var(--color-constellation-line)";
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
        constellationLines += "</g>";
      }
      const avatarUrl = data.user.avatarUrl || "";
      const coreAvatarId = `core-avatar-clip-${cx}`;
      const coreAvatarSection = avatarUrl ? `
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
      ` : `
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
      let planetNodes = '<g class="planet-nodes">';
      for (const p of allPositions) {
        const repo = p.repo;
        const color = repo.primaryColor || "#64748B";
        const isHighActivity = repo.activityScore >= 50 || repo.stars > 0;
        const animGroupClass = p.isFloating ? p.driftClass || "" : "";
        let lx = p.x;
        let ly = p.y;
        let textAnchor = "start";
        if (p.isFloating) {
          lx = p.x;
          ly = p.y + p.r + 14;
          textAnchor = "middle";
        } else {
          const relAngle = Math.atan2(p.y - cy, p.x - cx);
          const cosA = Math.cos(relAngle);
          const sinA = Math.sin(relAngle);
          const radialOffset = p.r + 7;
          lx = p.x + cosA * radialOffset;
          ly = p.y + sinA * radialOffset + (sinA > 0 ? 5 : -1);
          textAnchor = cosA >= 0 ? "start" : "end";
        }
        planetNodes += `
        <g class="${animGroupClass}">
          <g transform="translate(${p.x}, ${p.y})">
            ${isHighActivity ? `<circle cx="0" cy="0" r="${p.r + 6}" fill="none" stroke="${escapeXml(color)}" stroke-width="0.8" opacity="0.45" filter="url(#stellar-glow)" class="pulsar-glow" />` : ""}
            ${p.isFloating ? `<circle cx="0" cy="0" r="${p.r + 3}" fill="none" stroke="var(--color-text-muted)" stroke-width="0.6" stroke-dasharray="2, 2" opacity="0.4" />` : ""}
            ${repo.isExternal ? `<circle cx="0" cy="0" r="${p.r + 4}" fill="none" stroke="var(--color-accent)" stroke-width="0.8" stroke-dasharray="3, 3" opacity="0.6" />` : ""}
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
              ${repo.stars > 0 ? `\u2605 ${repo.stars} \u2022 ` : ""}${escapeXml(repo.primaryLanguage || "Repository")}${repo.authorshipRatio !== void 0 && repo.authorshipRatio < 0.99 ? ` (${Math.round(repo.authorshipRatio * 100)}%)` : ""}
            </text>
          </g>
        </g>
      `;
      }
      planetNodes += "</g>";
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
  };

  // src/templates/landscape.ts
  var LandscapeTemplate = class {
    render(data, config) {
      const width = 900;
      const height = 540;
      const { metrics, repositories } = data;
      const topLangs = metrics.languages.slice(0, 6);
      const prominentRepos = repositories.slice(0, 8);
      let techBars = '<g class="tech-column" transform="translate(32, 90)">';
      techBars += `
      <text x="0" y="0" style="font-size: 11px; font-weight: 700; fill: var(--color-text-muted); letter-spacing: 0.08em;">
        SYSTEM COMPOSITION &amp; VELOCITY
      </text>
    `;
      let curY = 22;
      for (const lang of topLangs) {
        const barMaxW = 280;
        const barW = Math.max(4, lang.percentage / 100 * barMaxW);
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
        techBars += "</g></g>";
      }
      techBars += "</g>";
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
        const color = repo.primaryColor || "#38BDF8";
        const desc = truncate(repo.description || "No description provided.", 38);
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
            \u2605 ${formatCompactNumber(repo.stars)}  \u2442 ${formatCompactNumber(repo.forks)}
          </text>

          <!-- Description -->
          <text x="12" y="34" style="font-size: 9.5px; fill: var(--color-text-secondary);">
            ${escapeXml(desc)}
          </text>

          <!-- Language Pill & Activity Meter -->
          <g transform="translate(12, 46)">
            <circle cx="3" cy="7" r="3.5" fill="${escapeXml(color)}" />
            <text x="11" y="10" style="font-size: 9px; font-weight: 600; fill: var(--color-text-muted);">
              ${escapeXml(repo.primaryLanguage)}${repo.authorshipRatio !== void 0 && repo.authorshipRatio < 0.99 ? ` \u2022 ${Math.round(repo.authorshipRatio * 100)}% contrib` : ""}
            </text>

            <!-- Activity bar on right -->
            <g transform="translate(${cardW - 24 - 70}, 4)">
              <rect width="60" height="4" rx="2" fill="var(--color-badge-bg)" />
              <rect width="${(repo.activityScore / 100 * 60).toFixed(1)}" height="4" rx="2" fill="${escapeXml(color)}" />
            </g>
          </g>
        </g>
      `;
      }
      repoGrid += "</g>";
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
  };

  // src/templates/network.ts
  var NetworkTemplate = class {
    render(data, config) {
      const width = 900;
      const height = 540;
      const cx = 450;
      const cy = config.showHeader === false ? 270 : 280;
      const topLangs = data.metrics.languages.slice(0, 4);
      const repos = data.repositories.slice(0, 16);
      const nodes = [];
      const edges = [];
      const numHubs = Math.max(1, topLangs.length);
      const hubEllipseRx = numHubs <= 2 ? 220 : 250;
      const hubEllipseRy = numHubs <= 2 ? 110 : 130;
      const langToHub = /* @__PURE__ */ new Map();
      const hubToRepos = /* @__PURE__ */ new Map();
      for (let i = 0; i < topLangs.length; i++) {
        const lang = topLangs[i];
        const hubAngle = i * 2 * Math.PI / numHubs - Math.PI / 2;
        const hx = Math.round(cx + hubEllipseRx * Math.cos(hubAngle));
        const hy = Math.round(cy + hubEllipseRy * Math.sin(hubAngle));
        const hubNode = {
          id: `hub-${lang.name}`,
          label: lang.name,
          sub: `${lang.percentage}%`,
          type: "hub",
          color: lang.color || "#38BDF8",
          x: hx,
          y: hy,
          radius: 24,
          labelX: hx,
          labelY: hy,
          textAnchor: "middle"
        };
        nodes.push(hubNode);
        langToHub.set(lang.name, hubNode);
        hubToRepos.set(lang.name, []);
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          edges.push({
            from: nodes[i],
            to: nodes[j],
            color: "var(--color-constellation-line)",
            opacity: 0.35
          });
        }
      }
      const fallbackHub = nodes[0];
      const unassignedRepos = [];
      for (const repo of repos) {
        if (repo.primaryLanguage && hubToRepos.has(repo.primaryLanguage)) {
          hubToRepos.get(repo.primaryLanguage).push(repo);
        } else {
          unassignedRepos.push(repo);
        }
      }
      for (let i = 0; i < unassignedRepos.length; i++) {
        const targetHubLang = topLangs[i % topLangs.length]?.name;
        if (targetHubLang && hubToRepos.has(targetHubLang)) {
          hubToRepos.get(targetHubLang).push(unassignedRepos[i]);
        }
      }
      for (const [langName, hubRepos] of hubToRepos.entries()) {
        const hub = langToHub.get(langName) || fallbackHub;
        if (!hub) continue;
        const count = hubRepos.length;
        if (count === 0) continue;
        const baseOutwardAngle = Math.atan2(hub.y - cy, hub.x - cx);
        const arcSpread = count === 1 ? 0 : Math.min(Math.PI * 0.95, count * 0.45);
        const startAngle = baseOutwardAngle - arcSpread / 2;
        for (let i = 0; i < count; i++) {
          const repo = hubRepos[i];
          const step = count === 1 ? 0 : i / (count - 1) * arcSpread;
          const satAngle = startAngle + step;
          const satDist = i % 2 === 0 ? 70 : 100;
          const satX = Number((hub.x + satDist * Math.cos(satAngle)).toFixed(1));
          const satY = Number((hub.y + satDist * Math.sin(satAngle)).toFixed(1));
          const clampedX = Math.max(75, Math.min(width - 75, satX));
          const clampedY = Math.max(90, Math.min(height - 65, satY));
          const r = repo.gravityRadius * 0.75;
          const cosA = Math.cos(satAngle);
          const sinA = Math.sin(satAngle);
          const labelX = clampedX + cosA * (r + 7);
          const labelY = clampedY + sinA * (r + 7) + (sinA > 0 ? 5 : -1);
          const textAnchor = cosA >= 0 ? "start" : "end";
          const repoNode = {
            id: `repo-${repo.name}`,
            label: repo.name,
            sub: repo.stars > 0 ? `\u2605 ${formatCompactNumber(repo.stars)}` : repo.primaryLanguage || "Code",
            type: "repo",
            color: repo.primaryColor || "#94A3B8",
            x: clampedX,
            y: clampedY,
            radius: r,
            labelX,
            labelY,
            textAnchor,
            stars: repo.stars
          };
          nodes.push(repoNode);
          edges.push({
            from: repoNode,
            to: hub,
            color: repo.primaryColor || "var(--color-constellation-line)",
            opacity: 0.5
          });
          if (repo.languages && repo.languages.length > 1) {
            for (const secLang of repo.languages.slice(1, 2)) {
              const secHub = langToHub.get(secLang.name);
              if (secHub && secHub !== hub) {
                edges.push({
                  from: repoNode,
                  to: secHub,
                  color: "var(--color-constellation-line)",
                  opacity: 0.2
                });
              }
            }
          }
        }
      }
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
              if (n1.type === "repo") {
                n1.x -= nx * overlap;
                n1.y -= ny * overlap;
              }
              if (n2.type === "repo") {
                n2.x += nx * overlap;
                n2.y += ny * overlap;
              }
            }
          }
        }
        for (const n of nodes) {
          if (n.type === "repo") {
            n.x = Math.max(90, Math.min(width - 90, n.x));
            n.y = Math.max(115, Math.min(height - 75, n.y));
          }
        }
      }
      for (const node of nodes) {
        if (node.type === "repo") {
          const isRight = node.x >= cx;
          const isCenter = Math.abs(node.x - cx) < 65;
          if (isCenter) {
            node.labelX = node.x;
            node.labelY = node.y > cy ? node.y + node.radius + 12 : node.y - node.radius - 8;
            node.textAnchor = "middle";
          } else if (isRight) {
            node.labelX = node.x + node.radius + 7;
            node.labelY = node.y + 3;
            node.textAnchor = "start";
          } else {
            node.labelX = node.x - node.radius - 7;
            node.labelY = node.y + 3;
            node.textAnchor = "end";
          }
        }
      }
      let svgEdges = '<g class="network-edges">';
      for (const edge of edges) {
        const isHubEdge = edge.from.type === "hub" && edge.to.type === "hub";
        svgEdges += `
        <line
          x1="${edge.from.x}"
          y1="${edge.from.y}"
          x2="${edge.to.x}"
          y2="${edge.to.y}"
          stroke="${escapeXml(edge.color)}"
          stroke-width="${isHubEdge ? 1.5 : 0.8}"
          stroke-dasharray="${isHubEdge ? "3, 4" : edge.opacity <= 0.25 ? "2, 3" : "none"}"
          opacity="${edge.opacity.toFixed(2)}"
        />
      `;
      }
      svgEdges += "</g>";
      let svgNodes = '<g class="network-nodes">';
      for (const node of nodes) {
        const isHub = node.type === "hub";
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
      svgNodes += "</g>";
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
  };

  // src/templates/minimal.ts
  var MinimalTemplate = class {
    render(data, config) {
      const width = 900;
      const height = 300;
      const { user, metrics, repositories } = data;
      const topLangs = metrics.languages.slice(0, 5);
      const topRepos = repositories.slice(0, 3);
      const title = config.customTitle || `${user.name || user.login} // Ecosystem Telemetry`;
      const showHeader = config.showHeader !== false;
      const showFooter = config.showFooter !== false;
      const header = showHeader ? `
      <g transform="translate(32, 28)">
        <text x="0" y="20" style="font-size: 18px; font-weight: 700; fill: var(--color-text-primary); letter-spacing: -0.02em;">
          ${escapeXml(title)}
        </text>
        <text x="0" y="38" style="font-size: 11px; fill: var(--color-text-secondary); font-family: ui-monospace, monospace;">
          ROLE: <tspan style="fill: var(--color-accent); font-weight: 600;">${escapeXml(metrics.cosmicRank)}</tspan>
          <tspan style="fill: var(--color-text-muted);"> \u2022 </tspan>
          UPDATED: ${data.generatedAt}
        </text>
      </g>
    ` : "";
      const yShift = showHeader ? 0 : -50;
      const kpis = [
        { label: "TOTAL STARS", value: formatCompactNumber(metrics.totalStars), symbol: "\u2605" },
        { label: "ANNUAL COMMITS", value: formatCompactNumber(metrics.totalCommits), symbol: "\u26A1" },
        { label: "PUBLIC REPOSITORIES", value: metrics.totalRepos.toString(), symbol: "\u2756" },
        { label: "PRIMARY STACK", value: metrics.dominantLanguage, symbol: "\u25C6" }
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
      kpiCards += "</g>";
      let repoCards = `<g transform="translate(32, ${156 + yShift})">`;
      const repoW = 266;
      const repoH = 68;
      for (let i = 0; i < topRepos.length; i++) {
        const r = topRepos[i];
        const rx = i * (repoW + 18);
        repoCards += `
        <g transform="translate(${rx}, 0)">
          <rect width="${repoW}" height="${repoH}" rx="8" fill="var(--color-card-bg)" stroke="var(--color-card-border)" stroke-width="1" />
          <circle cx="16" cy="20" r="4" fill="${escapeXml(r.primaryColor || "#38BDF8")}" />
          <text x="26" y="24" style="font-size: 12px; font-weight: 700; fill: var(--color-text-primary);">
            ${escapeXml(truncate(r.name, 22))}
          </text>
          <text x="${repoW - 14}" y="24" text-anchor="end" style="font-size: 10px; font-weight: 600; fill: var(--color-text-muted);">
            \u2605 ${formatCompactNumber(r.stars)}
          </text>
          <text x="16" y="44" style="font-size: 9.5px; fill: var(--color-text-secondary);">
            ${escapeXml(truncate(r.description || "No description provided.", 36))}
          </text>
        </g>
      `;
      }
      repoCards += "</g>";
      let footerSection = "";
      if (showFooter) {
        const barW = width - 64;
        let curX = 32;
        let barRects = "";
        let legend = `<g transform="translate(32, ${268 + yShift})">`;
        let legX = 0;
        for (const l of topLangs) {
          const segW = l.percentage / 100 * barW;
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
        legend += "</g>";
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
  };

  // src/templates/index.ts
  var TEMPLATES = {
    space: new SpaceTemplate(),
    landscape: new LandscapeTemplate(),
    network: new NetworkTemplate(),
    minimal: new MinimalTemplate()
  };
  function getTemplateRenderer(name) {
    const normalized = (name || "space").toLowerCase().trim();
    const renderer = TEMPLATES[normalized];
    if (!renderer) {
      console.warn(`Template "${name}" not recognized. Falling back to "space" template.`);
      return TEMPLATES.space;
    }
    return renderer;
  }
  function renderVisualization(data, config) {
    const renderer = getTemplateRenderer(config.template);
    return renderer.render(data, config);
  }

  // src/theme/languages.ts
  var GITHUB_LANG_COLORS = {
    // PHP & Ecosystem
    php: "#4F5D95",
    blade: "#F05340",
    hack: "#878787",
    // JavaScript & TypeScript
    typescript: "#3178C6",
    javascript: "#F1E05A",
    jsx: "#F1E05A",
    tsx: "#3178C6",
    vue: "#41B883",
    svelte: "#FF3E00",
    astro: "#FF5D01",
    // Python
    python: "#3572A5",
    jupyter: "#DA5B0B",
    "jupyter notebook": "#DA5B0B",
    // Java, Kotlin & JVM
    java: "#B07219",
    kotlin: "#A97BFF",
    scala: "#C22D40",
    groovy: "#4298B8",
    clojure: "#DB5855",
    // C / C++ / C#
    "c#": "#178600",
    csharp: "#178600",
    "c++": "#F34B7D",
    cpp: "#F34B7D",
    c: "#555555",
    // Systems & Native
    rust: "#DEA584",
    go: "#00ADD8",
    zig: "#EC915C",
    nim: "#FFE953",
    d: "#BA595E",
    fortran: "#4D41B1",
    assembly: "#6E4C13",
    // Mobile
    swift: "#F05138",
    dart: "#00B4AB",
    "objective-c": "#438EFF",
    // Scripting, Shell & Automation
    shell: "#89E051",
    bash: "#89E051",
    powershell: "#012456",
    lua: "#000080",
    ruby: "#701516",
    perl: "#0298C3",
    awk: "#C30E9B",
    // Functional & Scientific
    elixir: "#6E4A7E",
    erlang: "#B83998",
    haskell: "#5E5086",
    ocaml: "#EF7A08",
    r: "#198CE7",
    julia: "#A270BA",
    matlab: "#E16737",
    // Web, Styles & Markup
    html: "#E34C26",
    css: "#563D7C",
    scss: "#C6538C",
    sass: "#A53B70",
    less: "#1D365D",
    markdown: "#0284C7",
    // Data, Config & DevOps
    sql: "#E38C00",
    plsql: "#DAD8D8",
    dockerfile: "#384D54",
    yaml: "#CB171E",
    json: "#292929",
    graphql: "#E10098",
    solidity: "#AA6746",
    tex: "#3D6117"
  };
  function getLanguageColor(langName) {
    if (!langName) return "#64748B";
    const clean = langName.toLowerCase().trim();
    return GITHUB_LANG_COLORS[clean] || "#64748B";
  }

  // src/browser.ts
  function generateOrbitSvg(user, repos, options) {
    const rawData = {
      user: {
        login: user.login,
        name: user.name || user.login,
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || `https://github.com/${user.login}.png`,
        followers: { totalCount: user.followersCount || 10 },
        following: { totalCount: 5 },
        createdAt: new Date(Date.now() - 365 * 24 * 3600 * 1e3 * 3).toISOString(),
        contributionsCollection: {
          totalCommitContributions: Math.max(120, repos.reduce((acc, r) => acc + (r.stargazerCount || 1) * 12, 0)),
          restrictedContributionsCount: 0
        },
        repositories: {
          nodes: repos
        }
      }
    };
    const config = {
      username: user.login,
      token: "",
      template: options.template,
      theme: options.theme,
      outputPath: "",
      role: options.role,
      excludeRepositories: options.excludeRepositories || [],
      includeForks: options.includeForks !== false,
      includeArchived: options.includeArchived === true,
      maxRepositories: 30,
      showHeader: options.showHeader !== false,
      showFooter: options.showFooter !== false,
      showStats: options.showStats !== false,
      showAnimations: options.showAnimations !== false,
      showOrbits: options.showOrbits !== false,
      showConstellations: options.showConstellations !== false,
      autoCommit: false,
      commitMessage: ""
    };
    const ecosystem = normalizeEcosystemData(rawData, config);
    return renderVisualization(ecosystem, config);
  }
  if (typeof window !== "undefined") {
    window.ProfileOrbitRenderer = {
      generateOrbitSvg,
      getLanguageColor,
      GITHUB_LANG_COLORS
    };
  }
})();
