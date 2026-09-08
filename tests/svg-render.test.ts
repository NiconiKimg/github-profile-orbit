import { describe, it, expect } from 'vitest';
import { getMockGraphQLResponse } from '../src/api/client.js';
import { normalizeEcosystemData } from '../src/data/normalizer.js';
import { renderVisualization } from '../src/templates/index.js';
import { ActionConfig, VisualizationTemplate } from '../src/types.js';

describe('SVG Render Engine & Templates', () => {
  const raw = getMockGraphQLResponse('octocat');
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

  const ecosystem = normalizeEcosystemData(raw, baseConfig, new Date('2026-09-08T12:00:00Z'));

  const templates: VisualizationTemplate[] = ['space', 'landscape', 'network', 'minimal'];

  for (const t of templates) {
    it(`renders valid SVG for "${t}" template`, () => {
      const config: ActionConfig = { ...baseConfig, template: t };
      const svg = renderVisualization(ecosystem, config);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox=');
    });

    it(`guarantees deterministic byte-for-byte output for "${t}"`, () => {
      const config: ActionConfig = { ...baseConfig, template: t };
      const svg1 = renderVisualization(ecosystem, config);
      const svg2 = renderVisualization(ecosystem, config);
      expect(svg1).toBe(svg2);
    });
  }

  it('injects @media (prefers-color-scheme: light) for auto theme', () => {
    const config: ActionConfig = { ...baseConfig, theme: 'auto' };
    const svg = renderVisualization(ecosystem, config);
    expect(svg).toContain('@media (prefers-color-scheme: light)');
  });

  it('injects light palette exclusively when theme is light', () => {
    const config: ActionConfig = { ...baseConfig, theme: 'light' };
    const svg = renderVisualization(ecosystem, config);
    expect(svg).toContain('--color-bg: #FFFFFF;');
    expect(svg).not.toContain('@media (prefers-color-scheme: light)');
  });

  it('injects dark palette exclusively when theme is dark', () => {
    const config: ActionConfig = { ...baseConfig, theme: 'dark' };
    const svg = renderVisualization(ecosystem, config);
    expect(svg).toContain('--color-bg: #080C16;');
    expect(svg).not.toContain('@media (prefers-color-scheme: light)');
  });

  it('safely escapes special XML characters in custom titles and repository names', () => {
    const customConfig: ActionConfig = {
      ...baseConfig,
      customTitle: '<Special & "Cosmic" Title>'
    };
    const svg = renderVisualization(ecosystem, customConfig);
    expect(svg).toContain('&lt;Special &amp; &quot;Cosmic&quot; Title&gt;');
    expect(svg).not.toContain('<Special & "Cosmic" Title>');
  });

  describe('Edge Cases & Boundary Conditions', () => {
    const emptyEcosystem = normalizeEcosystemData(
      {
        user: {
          login: 'ghost-user',
          name: null,
          bio: null,
          avatarUrl: '',
          createdAt: '2026-01-01T00:00:00Z',
          followers: { totalCount: 0 },
          following: { totalCount: 0 },
          contributionsCollection: { totalCommitContributions: 0, restrictedContributionsCount: 0 },
          repositories: { nodes: [] }
        }
      },
      baseConfig,
      new Date('2026-09-08T12:00:00Z')
    );

    for (const t of templates) {
      it(`renders valid SVG without NaN or crashes for empty user profile in "${t}"`, () => {
        const config: ActionConfig = { ...baseConfig, template: t };
        const svg = renderVisualization(emptyEcosystem, config);

        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
        expect(svg).not.toContain('NaN');
        expect(svg).not.toContain('undefined');
      });
    }

    it('caps Space template at maximum 10 celestial bodies', () => {
      const config: ActionConfig = { ...baseConfig, template: 'space', maxRepositories: 25 };
      const svg = renderVisualization(ecosystem, config);
      const planetMatches = svg.match(/class="repo-label"/g) || [];
      expect(planetMatches.length).toBeLessThanOrEqual(10);
    });

    it('respects showHeader and showFooter disabled flags', () => {
      const config: ActionConfig = {
        ...baseConfig,
        template: 'space',
        showHeader: false,
        showFooter: false
      };
      const svg = renderVisualization(ecosystem, config);
      expect(svg).not.toContain('class="header-group"');
      expect(svg).not.toContain('class="footer-group"');
    });

    it('disables animated background elements when showAnimations is false', () => {
      const config: ActionConfig = {
        ...baseConfig,
        template: 'space',
        showAnimations: false
      };
      const svg = renderVisualization(ecosystem, config);
      expect(svg).not.toContain('class="ufo-scout"');
      expect(svg).not.toContain('class="spaceship-scout"');
      expect(svg).not.toContain('class="satellite-probe"');
      expect(svg).not.toContain('class="comet-object"');
    });

    it('renders secondary language dashed connection in Network template', () => {
      const multiLangRaw: any = {
        user: {
          login: 'polyglot',
          name: 'Polyglot Dev',
          bio: null,
          avatarUrl: '',
          createdAt: '2026-01-01T00:00:00Z',
          followers: { totalCount: 10 },
          following: { totalCount: 10 },
          contributionsCollection: { totalCommitContributions: 100, restrictedContributionsCount: 0 },
          repositories: {
            nodes: [
              {
                id: '1',
                name: 'fullstack-app',
                isFork: false,
                isArchived: false,
                isPrivate: false,
                stargazerCount: 15,
                forkCount: 3,
                pushedAt: '2026-09-01T00:00:00Z',
                description: 'Dual-stack project',
                primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
                languages: {
                  edges: [
                    { size: 7000, node: { name: 'TypeScript', color: '#3178C6' } },
                    { size: 3000, node: { name: 'Python', color: '#F59E0B' } }
                  ]
                },
                repositoryTopics: { nodes: [] }
              },
              {
                id: '2',
                name: 'data-pipeline',
                isFork: false,
                isArchived: false,
                isPrivate: false,
                stargazerCount: 8,
                forkCount: 1,
                pushedAt: '2026-09-02T00:00:00Z',
                description: 'Python analytics',
                primaryLanguage: { name: 'Python', color: '#F59E0B' },
                languages: {
                  edges: [{ size: 10000, node: { name: 'Python', color: '#F59E0B' } }]
                },
                repositoryTopics: { nodes: [] }
              }
            ]
          }
        }
      };

      const polyglotEco = normalizeEcosystemData(multiLangRaw, baseConfig, new Date('2026-09-08T12:00:00Z'));
      const netSvg = renderVisualization(polyglotEco, { ...baseConfig, template: 'network' });
      // Verify secondary bridge dashed line exists
      expect(netSvg).toContain('stroke-dasharray="2, 3"');
    });

    it('gracefully handles repositories with null primary language and no bytes', () => {
      const nullLangRaw: any = {
        user: {
          login: 'docs-writer',
          name: 'Writer',
          bio: null,
          avatarUrl: '',
          createdAt: '2026-01-01T00:00:00Z',
          followers: { totalCount: 1 },
          following: { totalCount: 1 },
          contributionsCollection: { totalCommitContributions: 10, restrictedContributionsCount: 0 },
          repositories: {
            nodes: [
              {
                id: '1',
                name: 'plain-docs',
                isFork: false,
                isArchived: false,
                isPrivate: false,
                stargazerCount: 0,
                forkCount: 0,
                pushedAt: '2026-09-01T00:00:00Z',
                description: null,
                primaryLanguage: null,
                languages: { edges: [] },
                repositoryTopics: { nodes: [] }
              }
            ]
          }
        }
      };

      const docsEco = normalizeEcosystemData(nullLangRaw, baseConfig, new Date('2026-09-08T12:00:00Z'));
      const svg = renderVisualization(docsEco, { ...baseConfig, template: 'space' });
      expect(svg).toContain('plain-docs');
      expect(svg).not.toContain('NaN');
    });

    it('embeds avatar as self-contained Data URI with xlink compatibility in Space template', () => {
      const config: ActionConfig = { ...baseConfig, template: 'space' };
      const svg = renderVisualization(ecosystem, config);

      expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
      expect(svg).toContain('xlink:href="data:image/');
      expect(svg).toContain('href="data:image/');
      // Ensure no external avatar image URLs exist that could cause broken images
      expect(svg).not.toContain('href="https://avatars.githubusercontent.com');
      expect(svg).not.toContain('xlink:href="https://avatars.githubusercontent.com');
    });

    it('renders all active languages in Network template without 4-hub restriction', () => {
      const config: ActionConfig = { ...baseConfig, template: 'network' };
      const svg = renderVisualization(ecosystem, config);

      const hubMatches = svg.match(/id="hub-[^"]+"/g) || [];
      // Octocat ecosystem has 7+ active languages; ensure it's not restricted to 4
      expect(hubMatches.length).toBeGreaterThan(4);
      expect(svg).toContain('id="hub-rust"');
      expect(svg).toContain('id="hub-go"');
      expect(svg).toContain('id="hub-python"');
      expect(svg).toContain('id="hub-typescript"');
    });

    it('connects a repository to all of its languages in Network template', () => {
      const multiTechRaw: any = {
        user: {
          login: 'tri-stack-dev',
          name: 'Tri Stack',
          bio: null,
          avatarUrl: 'data:image/svg+xml;utf8,<svg></svg>',
          createdAt: '2026-01-01T00:00:00Z',
          followers: { totalCount: 5 },
          following: { totalCount: 5 },
          contributionsCollection: { totalCommitContributions: 50, restrictedContributionsCount: 0 },
          repositories: {
            nodes: [
              {
                id: 'tri-1',
                name: 'polyglot-platform',
                isFork: false,
                isArchived: false,
                isPrivate: false,
                stargazerCount: 20,
                forkCount: 2,
                pushedAt: '2026-09-01T00:00:00Z',
                description: 'Full tri-stack platform',
                primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
                languages: {
                  edges: [
                    { size: 50000, node: { name: 'TypeScript', color: '#3178C6' } },
                    { size: 30000, node: { name: 'Python', color: '#F59E0B' } },
                    { size: 20000, node: { name: 'C#', color: '#10B981' } }
                  ]
                },
                repositoryTopics: { nodes: [] }
              }
            ]
          }
        }
      };

      const triEco = normalizeEcosystemData(multiTechRaw, baseConfig, new Date('2026-09-08T12:00:00Z'));
      const netSvg = renderVisualization(triEco, { ...baseConfig, template: 'network' });

      // All 3 technology hubs must exist
      expect(netSvg).toContain('id="hub-typescript"');
      expect(netSvg).toContain('id="hub-python"');
      expect(netSvg).toContain('id="hub-csharp"');

      // The SVG should contain lines connecting repo to all 3 hubs
      // Lines connecting repo to hubs: 3 edges total
      const lineMatches = netSvg.match(/<line\s+x1=/g) || [];
      // At least 3 repo-to-hub lines
      expect(lineMatches.length).toBeGreaterThanOrEqual(3);
    });

    it('excludes specified languages from Network template hubs and edges', () => {
      const config: ActionConfig = {
        ...baseConfig,
        template: 'network',
        excludeLanguages: ['CSS', 'Shell', 'Docker*']
      };
      const svg = renderVisualization(ecosystem, config);

      expect(svg).not.toContain('id="hub-css"');
      expect(svg).not.toContain('id="hub-shell"');
      expect(svg).not.toContain('id="hub-docker"');
    });
  });
});

