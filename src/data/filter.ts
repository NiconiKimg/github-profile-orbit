import { ActionConfig } from '../types.js';

export interface RawRepoItem {
  id: string;
  name: string;
  nameWithOwner?: string;
  isFork: boolean;
  isArchived: boolean;
  isPrivate?: boolean;
  stargazerCount: number;
  forkCount: number;
  pushedAt: string;
  description?: string | null;
  primaryLanguage?: {
    name: string;
    color: string;
  } | null;
  languages?: {
    edges: Array<{
      size: number;
      node: {
        name: string;
        color: string;
      };
    }>;
  };
  repositoryTopics?: {
    nodes: Array<{
      topic: {
        name: string;
      };
    }>;
  };
  authorshipRatio?: number;
  isExternal?: boolean;
}

/**
 * Converts a simple glob-like pattern (supporting * and ?) to a RegExp.
 */
function patternToRegex(pattern: string): RegExp {
  const trimmed = pattern.trim().toLowerCase();
  // Escape regex special chars except * and ?
  const escaped = trimmed
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Checks if a repository name matches any pattern in the list.
 */
export function matchesPatterns(repoName: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) return false;
  const name = repoName.toLowerCase().trim();

  for (const pattern of patterns) {
    const p = pattern.trim();
    if (!p) continue;

    // Check exact match first
    if (name === p.toLowerCase()) return true;

    // Check if wildcard pattern
    if (p.includes('*') || p.includes('?')) {
      const regex = patternToRegex(p);
      if (regex.test(name)) return true;
    }
  }

  return false;
}

/**
 * Filters raw repositories according to action configuration.
 * All exclusions happen before calculating metrics, languages, and layout.
 */
export function filterRepositories(
  repos: RawRepoItem[],
  config: ActionConfig
): RawRepoItem[] {
  const {
    excludeRepositories = [],
    includeRepositories = [],
    includeForks = false,
    includeArchived = false
  } = config;

  return repos.filter(repo => {
    // 1. Never include private repositories for safety
    if (repo.isPrivate) {
      return false;
    }

    // 2. Fork filter
    if (repo.isFork && !includeForks) {
      return false;
    }

    // 3. Archived filter
    if (repo.isArchived && !includeArchived) {
      return false;
    }

    // 4. Inclusions (if whitelist provided)
    if (includeRepositories.length > 0) {
      const hasLocalPatterns = includeRepositories.some(p => !p.includes('/') && p !== '*');
      const hasWildcard = includeRepositories.includes('*');

      if (!repo.isExternal) {
        // For own repositories: filter if specific local names were provided
        if (hasLocalPatterns && !hasWildcard) {
          const isExplicitlyIncluded = matchesPatterns(repo.name, includeRepositories);
          if (!isExplicitlyIncluded) {
            return false;
          }
        }
      } else {
        // For external repositories: must match requested external names
        const isExplicitlyIncluded =
          matchesPatterns(repo.name, includeRepositories) ||
          (repo.nameWithOwner ? matchesPatterns(repo.nameWithOwner, includeRepositories) : false);
        if (!isExplicitlyIncluded) {
          return false;
        }
      }
    }

    // 5. Exclusions (pattern or exact name match)
    if (excludeRepositories.length > 0) {
      const isExcluded =
        matchesPatterns(repo.name, excludeRepositories) ||
        (repo.nameWithOwner ? matchesPatterns(repo.nameWithOwner, excludeRepositories) : false);
      if (isExcluded) {
        return false;
      }
    }

    return true;
  });
}
