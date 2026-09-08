import { describe, it, expect } from 'vitest';
import {
  aggregateLanguages,
  aggregateTopics,
  assignOrbitTier,
  calculateActivityScore,
  calculateDaysAgo,
  calculateGravityRadius,
  determineCosmicRank
} from '../src/data/analytics.js';
import { NormalizedRepo } from '../src/types.js';

describe('Analytics and Cosmic Metric Computations', () => {
  it('calculates days ago correctly', () => {
    const base = new Date('2026-09-08T12:00:00Z');
    expect(calculateDaysAgo('2026-09-08T00:00:00Z', base)).toBe(0);
    expect(calculateDaysAgo('2026-09-01T12:00:00Z', base)).toBe(7);
    expect(calculateDaysAgo('invalid-date', base)).toBe(999);
  });

  it('calculates activity score with recency, star and fork boost', () => {
    const recentScore = calculateActivityScore(3, 50, 10);
    const oldScore = calculateActivityScore(400, 0, 0);
    expect(recentScore).toBeGreaterThan(oldScore);
    expect(recentScore).toBeLessThanOrEqual(100);
    expect(oldScore).toBeGreaterThanOrEqual(0);
  });

  it('clamps gravity radius within reasonable visual bounds', () => {
    const smallRadius = calculateGravityRadius(0, 0);
    const hugeRadius = calculateGravityRadius(50000, 100);
    expect(smallRadius).toBeGreaterThanOrEqual(5.5);
    expect(hugeRadius).toBeLessThanOrEqual(20);
  });

  it('assigns orbit tiers accurately', () => {
    expect(assignOrbitTier(80, 0, 10)).toBe(1);
    expect(assignOrbitTier(50, 2, 10)).toBe(2);
    expect(assignOrbitTier(25, 5, 10)).toBe(3);
    expect(assignOrbitTier(5, 9, 10)).toBe(4);
  });

  it('determines cosmic ranks progressively', () => {
    expect(determineCosmicRank(2, 50, 5)).toBe('Software Contributor');
    expect(determineCosmicRank(30, 2000, 500)).toBe('Principal Engineer');
  });

  it('aggregates language distributions and computes percentages', () => {
    const sampleRepos: NormalizedRepo[] = [
      {
        id: 'r1',
        name: 'repo1',
        owner: 'user',
        description: '',
        isFork: false,
        isArchived: false,
        stars: 10,
        forks: 2,
        primaryLanguage: 'TypeScript',
        primaryColor: '#3178C6',
        languages: [
          { name: 'TypeScript', color: '#3178C6', bytes: 75000, percentage: 75 },
          { name: 'HTML', color: '#E34C26', bytes: 25000, percentage: 25 }
        ],
        topics: ['web', 'frontend'],
        pushedAt: '2026-09-01T00:00:00Z',
        pushedDaysAgo: 7,
        activityScore: 80,
        gravityRadius: 10,
        orbitTier: 1,
        resonanceCluster: 'TypeScript'
      },
      {
        id: 'r2',
        name: 'repo2',
        owner: 'user',
        description: '',
        isFork: false,
        isArchived: false,
        stars: 5,
        forks: 1,
        primaryLanguage: 'TypeScript',
        primaryColor: '#3178C6',
        languages: [
          { name: 'TypeScript', color: '#3178C6', bytes: 50000, percentage: 100 }
        ],
        topics: ['web', 'backend'],
        pushedAt: '2026-09-01T00:00:00Z',
        pushedDaysAgo: 7,
        activityScore: 70,
        gravityRadius: 9,
        orbitTier: 2,
        resonanceCluster: 'TypeScript'
      }
    ];

    const aggregated = aggregateLanguages(sampleRepos);
    expect(aggregated.length).toBe(2);
    expect(aggregated[0].name).toBe('TypeScript');
    expect(aggregated[0].bytes).toBe(125000);
    expect(aggregated[0].percentage).toBe(83.3);
    expect(aggregated[0].repoCount).toBe(2);

    const topics = aggregateTopics(sampleRepos);
    expect(topics.find(t => t.topic === 'web')?.count).toBe(2);
    expect(topics.find(t => t.topic === 'frontend')?.count).toBe(1);
  });
});
