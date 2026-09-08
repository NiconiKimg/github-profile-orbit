import { NormalizedRepo, LanguageStat, TopicStat } from '../types.js';

export function calculateDaysAgo(isoDate: string, baseDate = new Date()): number {
  if (!isoDate) return 999;
  const target = new Date(isoDate);
  if (isNaN(target.getTime())) return 999;
  const diffMs = baseDate.getTime() - target.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates activity score (0 - 100) based on push recency, stars, and forks.
 */
export function calculateActivityScore(pushedDaysAgo: number, stars: number, forks: number): number {
  // Recency factor (up to 60 points)
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

  // Stargazer factor (up to 25 points, logarithmic)
  const starScore = Math.min(25, Math.round(Math.log10(stars + 1) * 8));

  // Fork factor (up to 15 points, logarithmic)
  const forkScore = Math.min(15, Math.round(Math.log10(forks + 1) * 6));

  return Math.min(100, recencyScore + starScore + forkScore);
}

/**
 * Calculates visual celestial radius (in SVG units, between 5 and 20).
 */
export function calculateGravityRadius(stars: number, activityScore: number): number {
  const base = 5.5;
  const starWeight = Math.min(10, Math.log2(stars + 1) * 1.8);
  const activityWeight = (activityScore / 100) * 4.5;
  return Math.min(20, Math.max(5.5, Number((base + starWeight + activityWeight).toFixed(1))));
}

/**
 * Assigns orbit tier based on activity and prominence (1 to 4).
 */
export function assignOrbitTier(activityScore: number, index: number, total: number): number {
  if (activityScore >= 65 || index === 0) return 1;
  if (activityScore >= 40 || index < Math.ceil(total * 0.35)) return 2;
  if (activityScore >= 20 || index < Math.ceil(total * 0.70)) return 3;
  return 4;
}

/**
 * Determines a formal technical role/badge based on activity metrics.
 */
export function determineCosmicRank(totalRepos: number, totalCommits: number, totalStars: number): string {
  const composite = totalRepos * 2 + Math.min(100, Math.floor(totalCommits / 10)) + totalStars * 3;
  if (composite >= 250) return 'Principal Engineer';
  if (composite >= 140) return 'Senior Developer';
  if (composite >= 80) return 'Active Contributor';
  if (composite >= 35) return 'Software Developer';
  return 'Software Contributor';
}

/**
 * Aggregates language distribution across repositories based on real Linguist bytes.
 */
export function aggregateLanguages(repos: NormalizedRepo[]): LanguageStat[] {
  const langMap = new Map<string, { color: string; bytes: number; count: number }>();

  for (const repo of repos) {
    if (repo.languages && repo.languages.length > 0) {
      for (const lang of repo.languages) {
        if (!lang.name || lang.bytes <= 0) continue;
        const existing = langMap.get(lang.name) || {
          color: lang.color || '#64748B',
          bytes: 0,
          count: 0
        };
        existing.bytes += lang.bytes;
        existing.count += 1;
        if (lang.color && lang.color !== '#94A3B8') existing.color = lang.color;
        langMap.set(lang.name, existing);
      }
    } else if (repo.primaryLanguage && repo.primaryLanguage !== 'Markdown' && repo.primaryLanguage !== 'Other') {
      const existing = langMap.get(repo.primaryLanguage) || {
        color: repo.primaryColor || '#64748B',
        bytes: 1,
        count: 0
      };
      existing.count += 1;
      langMap.set(repo.primaryLanguage, existing);
    }
  }

  const totalBytes = Array.from(langMap.values()).reduce((sum, item) => sum + item.bytes, 0);

  const stats: LanguageStat[] = Array.from(langMap.entries()).map(([name, data]) => ({
    name,
    color: data.color,
    bytes: data.bytes,
    percentage: totalBytes > 0 ? Number(((data.bytes / totalBytes) * 100).toFixed(1)) : 0,
    repoCount: data.count
  }));

  // Sort descending by bytes
  return stats.sort((a, b) => b.bytes - a.bytes);
}

/**
 * Aggregates topic frequencies across repositories.
 */
export function aggregateTopics(repos: NormalizedRepo[]): TopicStat[] {
  const topicMap = new Map<string, number>();

  for (const repo of repos) {
    for (const topic of repo.topics) {
      const clean = topic.toLowerCase().trim();
      topicMap.set(clean, (topicMap.get(clean) || 0) + 1);
    }
  }

  const stats: TopicStat[] = Array.from(topicMap.entries()).map(([topic, count]) => ({
    topic,
    count
  }));

  return stats.sort((a, b) => b.count - a.count);
}
