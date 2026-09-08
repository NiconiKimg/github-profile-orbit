import { describe, it, expect } from 'vitest';
import { normalizeEcosystemData } from '../src/data/normalizer.js';
import { getMockGraphQLResponse } from '../src/api/client.js';
import { ActionConfig } from '../src/types.js';

describe('Data Normalizer', () => {
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

  it('transforms raw GraphQL payload into stable NormalizedEcosystem', () => {
    const raw = getMockGraphQLResponse('octocat');
    const result = normalizeEcosystemData(raw, baseConfig, new Date('2026-09-08T12:00:00Z'));

    expect(result.user.login).toBe('octocat');
    expect(result.user.followers).toBe(1420);
    expect(result.metrics.totalRepos).toBe(8);
    expect(result.metrics.totalStars).toBeGreaterThan(0);
    expect(result.metrics.languages.length).toBeGreaterThan(0);
    expect(result.repositories[0].name).toBeDefined();
    expect(result.repositories[0].activityScore).toBeGreaterThanOrEqual(0);
  });

  it('respects exclusion list and removes them from metrics and counts', () => {
    const raw = getMockGraphQLResponse('octocat');
    const config: ActionConfig = {
      ...baseConfig,
      excludeRepositories: ['hyper-drive', 'deep-space-cli']
    };
    const result = normalizeEcosystemData(raw, config, new Date('2026-09-08T12:00:00Z'));

    const repoNames = result.repositories.map(r => r.name);
    expect(repoNames).not.toContain('hyper-drive');
    expect(repoNames).not.toContain('deep-space-cli');
    expect(result.metrics.totalRepos).toBe(6);
  });

  it('calculates language diversity index correctly', () => {
    const raw = getMockGraphQLResponse('octocat');
    const result = normalizeEcosystemData(raw, baseConfig, new Date('2026-09-08T12:00:00Z'));
    expect(result.metrics.diversityIndex).toBeGreaterThan(0);
    expect(result.metrics.diversityIndex).toBeLessThanOrEqual(100);
  });

  it('correctly attributes proportional language bytes and scales radius for external repos', () => {
    const raw = getMockGraphQLResponse('octocat');
    raw.user.repositories.nodes.push({
      id: 'ext-1',
      name: 'transferred-repo',
      nameWithOwner: 'org/transferred-repo',
      isFork: false,
      isArchived: false,
      isPrivate: false,
      stargazerCount: 100,
      forkCount: 10,
      pushedAt: new Date('2026-09-08T12:00:00Z').toISOString(),
      primaryLanguage: { name: 'Rust', color: '#EF4444' },
      languages: {
        edges: [
          { size: 100000, node: { name: 'Rust', color: '#EF4444' } }
        ]
      },
      authorshipRatio: 0.5,
      isExternal: true
    });

    const result = normalizeEcosystemData(raw, baseConfig, new Date('2026-09-08T12:00:00Z'));
    const extRepo = result.repositories.find(r => r.name === 'transferred-repo');
    expect(extRepo).toBeDefined();
    expect(extRepo?.authorshipRatio).toBe(0.5);
    expect(extRepo?.isExternal).toBe(true);
    // Verify 50% of 100,000 bytes attributed = 50,000
    expect(extRepo?.languages[0].bytes).toBe(50000);
  });

  it('filters out languages specified in excludeLanguages from repos and ecosystem metrics', () => {
    const raw = getMockGraphQLResponse('octocat');
    const config: ActionConfig = {
      ...baseConfig,
      excludeLanguages: ['CSS', 'Shell', 'Docker*']
    };
    const result = normalizeEcosystemData(raw, config, new Date('2026-09-08T12:00:00Z'));

    const metricLangNames = result.metrics.languages.map(l => l.name.toLowerCase());
    expect(metricLangNames).not.toContain('css');
    expect(metricLangNames).not.toContain('shell');
    expect(metricLangNames).not.toContain('docker');

    for (const repo of result.repositories) {
      const repoLangs = repo.languages.map(l => l.name.toLowerCase());
      expect(repoLangs).not.toContain('css');
      expect(repoLangs).not.toContain('shell');
      expect(repoLangs).not.toContain('docker');
    }
  });
});

