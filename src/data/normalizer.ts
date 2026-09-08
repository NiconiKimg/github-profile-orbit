import {
  ActionConfig,
  EcosystemData,
  NormalizedRepo,
  RepoLanguage,
  UserSummary
} from '../types.js';
import { RawRepoItem, filterRepositories, matchesPatterns } from './filter.js';
import {
  aggregateLanguages,
  aggregateTopics,
  assignOrbitTier,
  calculateActivityScore,
  calculateDaysAgo,
  calculateGravityRadius,
  determineCosmicRank
} from './analytics.js';

export interface RawGraphQLResponse {
  user: {
    login: string;
    name?: string | null;
    bio?: string | null;
    avatarUrl: string;
    followers: { totalCount: number };
    following: { totalCount: number };
    createdAt: string;
    contributionsCollection?: {
      totalCommitContributions: number;
      restrictedContributionsCount: number;
    };
    repositories: {
      nodes: RawRepoItem[];
    };
  };
}

export function normalizeEcosystemData(
  rawData: RawGraphQLResponse,
  config: ActionConfig,
  baseDate = new Date()
): EcosystemData {
  const rawUser = rawData.user;

  const user: UserSummary = {
    login: rawUser.login,
    name: rawUser.name || rawUser.login,
    bio: rawUser.bio || '',
    avatarUrl: rawUser.avatarUrl || '',
    followers: rawUser.followers?.totalCount || 0,
    following: rawUser.following?.totalCount || 0,
    createdAt: rawUser.createdAt,
    totalCommitContributions:
      rawUser.contributionsCollection?.totalCommitContributions || 0,
    restrictedContributionsCount:
      rawUser.contributionsCollection?.restrictedContributionsCount || 0
  };

  // 1. Filter repositories according to exclusion, fork, and archived rules
  const rawRepos = rawUser.repositories?.nodes || [];
  const filtered = filterRepositories(rawRepos, config);

  // 2. Sort by combination of stars and recent activity before slicing
  const sortedRaw = [...filtered].sort((a, b) => {
    const scoreA = (a.stargazerCount * 2) + (new Date(a.pushedAt).getTime() / 1e10);
    const scoreB = (b.stargazerCount * 2) + (new Date(b.pushedAt).getTime() / 1e10);
    return scoreB - scoreA;
  });

  const activeSubset = sortedRaw.slice(0, config.maxRepositories || 25);

  // 3. Transform to NormalizedRepo
  const repositories: NormalizedRepo[] = activeSubset.map((repo, idx) => {
    const pushedDaysAgo = calculateDaysAgo(repo.pushedAt, baseDate);
    const activityScore = calculateActivityScore(
      pushedDaysAgo,
      repo.stargazerCount,
      repo.forkCount
    );
    const authorshipRatio = repo.authorshipRatio !== undefined ? repo.authorshipRatio : 1.0;
    const isExternal = Boolean(repo.isExternal || (repo.nameWithOwner && !repo.nameWithOwner.startsWith(`${user.login}/`)));

    const baseGravityRadius = calculateGravityRadius(repo.stargazerCount, activityScore);
    const gravityRadius = authorshipRatio < 0.99
      ? Math.max(12, Math.round(baseGravityRadius * Math.sqrt(Math.max(0.2, authorshipRatio))))
      : baseGravityRadius;
    const orbitTier = assignOrbitTier(activityScore, idx, activeSubset.length);

    // Extract languages and scale bytes by exact personal authorship ratio
    const langEdges = repo.languages?.edges || [];
    const rawLanguages: RepoLanguage[] = langEdges.map(edge => {
      const personalBytes = Math.round(edge.size * authorshipRatio);
      return {
        name: edge.node.name,
        color: edge.node.color || '#94A3B8',
        bytes: personalBytes,
        percentage: 0
      };
    });

    // Filter out languages matching excludeLanguages
    const excludeLangs = config.excludeLanguages || [];
    const languages = rawLanguages.filter(l => !matchesPatterns(l.name, excludeLangs));

    const totalBytes = languages.reduce((acc, l) => acc + l.bytes, 0);
    for (const l of languages) {
      l.percentage = totalBytes > 0 ? Number(((l.bytes / totalBytes) * 100).toFixed(1)) : 0;
    }

    // Extract topics
    const topics = (repo.repositoryTopics?.nodes || []).map(t => t.topic.name);

    let primaryLanguage = repo.primaryLanguage?.name;
    let primaryColor = repo.primaryLanguage?.color;

    if (primaryLanguage && matchesPatterns(primaryLanguage, excludeLangs)) {
      primaryLanguage = undefined;
      primaryColor = undefined;
    }

    if (!primaryLanguage) {
      primaryLanguage = languages.length > 0 ? languages[0].name : (rawLanguages.length > 0 ? 'Other' : 'Markdown');
      primaryColor = languages.length > 0 ? languages[0].color : '#64748B';
    }
    if (!primaryColor) {
      primaryColor = languages.length > 0 ? languages[0].color : '#64748B';
    }

    return {
      id: repo.id,
      name: repo.name,
      owner: repo.nameWithOwner ? repo.nameWithOwner.split('/')[0] : user.login,
      description: repo.description || '',
      isFork: repo.isFork,
      isArchived: repo.isArchived,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      primaryLanguage,
      primaryColor,
      languages,
      topics,
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

  // 4. Compute ecosystem aggregate metrics based strictly on filtered repos
  const totalStars = repositories.reduce((sum, r) => sum + r.stars, 0);
  const totalForks = repositories.reduce((sum, r) => sum + r.forks, 0);
  const languages = aggregateLanguages(repositories);
  const topics = aggregateTopics(repositories);
  const dominantLanguage = languages.length > 0 ? languages[0].name : 'Universal';
  const totalCommits =
    user.totalCommitContributions + user.restrictedContributionsCount;

  const cosmicRank = determineCosmicRank(repositories.length, totalCommits, totalStars);

  // Compute language diversity index (Shannon entropy approximation)
  let diversityIndex = 0;
  if (languages.length > 1) {
    const entropy = languages.reduce((acc, l) => {
      const p = l.percentage / 100;
      return p > 0 ? acc - p * Math.log2(p) : acc;
    }, 0);
    const maxEntropy = Math.log2(languages.length);
    diversityIndex = maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0;
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
    generatedAt: baseDate.toISOString().split('T')[0]
  };
}
