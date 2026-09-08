import { describe, it, expect } from 'vitest';
import { filterRepositories, matchesPatterns, RawRepoItem } from '../src/data/filter.js';
import { ActionConfig } from '../src/types.js';

const mockRepos: RawRepoItem[] = [
  {
    id: '1',
    name: 'space-core',
    isFork: false,
    isArchived: false,
    isPrivate: false,
    stargazerCount: 100,
    forkCount: 10,
    pushedAt: '2026-09-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'experimental-lab',
    isFork: false,
    isArchived: false,
    isPrivate: false,
    stargazerCount: 5,
    forkCount: 1,
    pushedAt: '2026-08-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'upstream-fork',
    isFork: true,
    isArchived: false,
    isPrivate: false,
    stargazerCount: 50,
    forkCount: 5,
    pushedAt: '2026-08-15T00:00:00Z'
  },
  {
    id: '4',
    name: 'legacy-archive',
    isFork: false,
    isArchived: true,
    isPrivate: false,
    stargazerCount: 20,
    forkCount: 2,
    pushedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: '5',
    name: 'private-secret',
    isFork: false,
    isArchived: false,
    isPrivate: true,
    stargazerCount: 0,
    forkCount: 0,
    pushedAt: '2026-09-01T00:00:00Z'
  }
];

const baseConfig: ActionConfig = {
  username: 'octocat',
  token: '',
  template: 'space',
  theme: 'auto',
  outputPath: '',
  excludeRepositories: [],
  includeForks: false,
  includeArchived: false,
  maxRepositories: 25,
  showStats: true,
  showLanguages: true,
  showActivity: true,
  autoCommit: false,
  commitMessage: ''
};

describe('Repository Filtering Engine', () => {
  it('matches wildcard patterns correctly', () => {
    expect(matchesPatterns('test-repo', ['test-*'])).toBe(true);
    expect(matchesPatterns('my-repo-test', ['*-test'])).toBe(true);
    expect(matchesPatterns('demo', ['demo'])).toBe(true);
    expect(matchesPatterns('Demo-Case', ['demo-case'])).toBe(true);
    expect(matchesPatterns('prod-repo', ['test-*'])).toBe(false);
  });

  it('excludes private repositories strictly for safety', () => {
    const filtered = filterRepositories(mockRepos, baseConfig);
    const names = filtered.map(r => r.name);
    expect(names).not.toContain('private-secret');
  });

  it('filters out forks and archives by default', () => {
    const filtered = filterRepositories(mockRepos, baseConfig);
    const names = filtered.map(r => r.name);
    expect(names).toEqual(['space-core', 'experimental-lab']);
    expect(names).not.toContain('upstream-fork');
    expect(names).not.toContain('legacy-archive');
  });

  it('allows forks when includeForks is true', () => {
    const config = { ...baseConfig, includeForks: true };
    const filtered = filterRepositories(mockRepos, config);
    const names = filtered.map(r => r.name);
    expect(names).toContain('upstream-fork');
  });

  it('allows archives when includeArchived is true', () => {
    const config = { ...baseConfig, includeArchived: true };
    const filtered = filterRepositories(mockRepos, config);
    const names = filtered.map(r => r.name);
    expect(names).toContain('legacy-archive');
  });

  it('excludes specified repositories by exact name and glob wildcard', () => {
    const config: ActionConfig = {
      ...baseConfig,
      excludeRepositories: ['space-core', 'experimental-*']
    };
    const filtered = filterRepositories(mockRepos, config);
    expect(filtered.length).toBe(0);
  });

  it('respects whitelist when includeRepositories is provided', () => {
    const config: ActionConfig = {
      ...baseConfig,
      includeRepositories: ['space-core']
    };
    const filtered = filterRepositories(mockRepos, config);
    expect(filtered.map(r => r.name)).toEqual(['space-core']);
  });

  it('handles user with exclusively forks when includeForks is false', () => {
    const forksOnly: RawRepoItem[] = [
      { id: '1', name: 'fork-1', isFork: true, isArchived: false, isPrivate: false, stargazerCount: 1, forkCount: 0, pushedAt: '2026-09-01T00:00:00Z' },
      { id: '2', name: 'fork-2', isFork: true, isArchived: false, isPrivate: false, stargazerCount: 5, forkCount: 0, pushedAt: '2026-09-01T00:00:00Z' }
    ];
    const filtered = filterRepositories(forksOnly, baseConfig);
    expect(filtered).toHaveLength(0);
  });

  it('handles empty input repository list without errors', () => {
    const filtered = filterRepositories([], baseConfig);
    expect(filtered).toEqual([]);
  });
});
