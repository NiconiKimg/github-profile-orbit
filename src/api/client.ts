import * as github from '@actions/github';
import { USER_ECOSYSTEM_QUERY } from './queries.js';
import { RawGraphQLResponse } from '../data/normalizer.js';
import { RawRepoItem } from '../data/filter.js';
import { getLanguageColor } from '../theme/languages.js';

const KNOWN_EXTERNAL_CACHE: Record<string, any> = {
  'upskill-team/back-end-dsw': {
    name: 'Back-End-DSW',
    primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
    languages: { edges: [{ size: 68000, node: { name: 'TypeScript', color: '#3178C6' } }] },
    stargazerCount: 4,
    forkCount: 1,
    authorshipRatio: 0.65
  },
  'upskill-team/front-end-dsw': {
    name: 'Front-End-DSW',
    primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
    languages: { edges: [{ size: 72000, node: { name: 'TypeScript', color: '#3178C6' } }] },
    stargazerCount: 4,
    forkCount: 1,
    authorshipRatio: 0.70
  },
  'sigma-la/front-end-sigma-la': {
    name: 'Front-End-SIGMA-LA',
    primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
    languages: { edges: [{ size: 54000, node: { name: 'TypeScript', color: '#3178C6' } }] },
    stargazerCount: 2,
    forkCount: 0,
    authorshipRatio: 0.60
  },
  'sigma-la/back-end-sigma-la': {
    name: 'Back-End-SIGMA-LA',
    primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
    languages: { edges: [{ size: 61000, node: { name: 'TypeScript', color: '#3178C6' } }] },
    stargazerCount: 3,
    forkCount: 0,
    authorshipRatio: 0.60
  },
  'frasquito3/pedemontedigitaltwin_v2': {
    name: 'PedemonteDigitalTwin_v2',
    primaryLanguage: { name: 'C#', color: '#10B981' },
    languages: { edges: [{ size: 85000, node: { name: 'C#', color: '#10B981' } }] },
    stargazerCount: 3,
    forkCount: 0,
    authorshipRatio: 0.95
  },
  'lucatvl/hyperparameters-optimization': {
    name: 'Hyperparameters-Optimization',
    primaryLanguage: { name: 'Python', color: '#F59E0B' },
    languages: { edges: [{ size: 45000, node: { name: 'Python', color: '#F59E0B' } }] },
    stargazerCount: 2,
    forkCount: 0,
    authorshipRatio: 0.50
  }
};

export async function fetchPublicExternalRepository(
  owner: string,
  repo: string,
  username: string,
  token?: string
): Promise<RawRepoItem | null> {
  const headers: Record<string, string> = {
    'User-Agent': 'octo-orbit-visualizer',
    Accept: 'application/vnd.github.v3+json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const cacheKey = `${owner}/${repo}`.toLowerCase();

  try {
    const repoRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { headers }
    );
    if (!repoRes.ok) {
      if (repoRes.status === 403 || repoRes.status === 429) {
        console.warn(`[octo-orbit] External repo ${owner}/${repo}: GitHub API rate limit reached. Using fallback cache if available.`);
        const cached = KNOWN_EXTERNAL_CACHE[cacheKey];
        if (cached) {
          return {
            id: `ext-${owner}-${repo}`,
            name: cached.name,
            nameWithOwner: `${owner}/${repo}`,
            isFork: false,
            isArchived: false,
            isPrivate: false,
            stargazerCount: cached.stargazerCount || 0,
            forkCount: cached.forkCount || 0,
            pushedAt: new Date().toISOString(),
            description: null,
            primaryLanguage: cached.primaryLanguage,
            languages: cached.languages || { edges: [] },
            repositoryTopics: { nodes: [] },
            authorshipRatio: cached.authorshipRatio || 0.6,
            isExternal: true
          };
        }
      }
      return null;
    }
    const repoData = await repoRes.json();
    if (repoData.private) return null; // strictly public

    let rawLangs: Record<string, number> = {};
    try {
      const langRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
        { headers }
      );
      if (langRes.ok) {
        rawLangs = await langRes.json();
      }
    } catch {
      // Continue with empty
    }

    let userAdditions = 0;
    let repoTotalAdditions = 0;
    let userCommits = 0;
    let repoTotalCommits = 0;

    try {
      const contribRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stats/contributors`,
        { headers }
      );
      if (contribRes.ok) {
        const contribData = await contribRes.json();
        if (Array.isArray(contribData)) {
          for (const c of contribData) {
            const isTargetUser = c.author?.login?.toLowerCase() === username.toLowerCase();
            repoTotalCommits += c.total || 0;
            if (isTargetUser) {
              userCommits += c.total || 0;
            }
            if (Array.isArray(c.weeks)) {
              for (const w of c.weeks) {
                repoTotalAdditions += (w.a || 0);
                if (isTargetUser) {
                  userAdditions += (w.a || 0);
                }
              }
            }
          }
        }
      }
    } catch {
      // Fallback
    }

    let authorshipRatio = 1.0;
    if (repoTotalAdditions > 0) {
      authorshipRatio = Number((userAdditions / repoTotalAdditions).toFixed(4));
    } else if (repoTotalCommits > 0) {
      authorshipRatio = Number((userCommits / repoTotalCommits).toFixed(4));
    } else {
      authorshipRatio = 1.0;
    }
    authorshipRatio = Math.max(0, Math.min(1.0, authorshipRatio));

    const edges = Object.entries(rawLangs).map(([name, bytes]) => ({
      size: bytes,
      node: {
        name,
        color: getLanguageColor(name)
      }
    }));

    const primaryLangName = edges.length > 0 ? edges[0].node.name : repoData.language || null;
    const primaryColor = primaryLangName ? getLanguageColor(primaryLangName) : '#64748B';

    return {
      id: String(repoData.id),
      name: repoData.name,
      nameWithOwner: repoData.full_name || `${owner}/${repo}`,
      isFork: Boolean(repoData.fork),
      isArchived: Boolean(repoData.archived),
      isPrivate: false,
      stargazerCount: repoData.stargazers_count || 0,
      forkCount: repoData.forks_count || 0,
      pushedAt: repoData.pushed_at || new Date().toISOString(),
      description: repoData.description || null,
      primaryLanguage: primaryLangName ? { name: primaryLangName, color: primaryColor } : null,
      languages: { edges },
      repositoryTopics: {
        nodes: (repoData.topics || []).map((t: string) => ({ topic: { name: t } }))
      },
      authorshipRatio,
      isExternal: true
    };
  } catch {
    return null;
  }
}

export async function fetchPublicRestEcosystem(
  username: string,
  externalRepos?: string[]
): Promise<RawGraphQLResponse> {
  const headers: Record<string, string> = {
    'User-Agent': 'octo-orbit-visualizer',
    Accept: 'application/vnd.github.v3+json'
  };

  // Fetch user profile
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
  if (!userRes.ok) {
    throw new Error(`GitHub user "${username}" returned HTTP ${userRes.status}: ${userRes.statusText}`);
  }
  const u = await userRes.json();

  // Fetch user repositories
  const reposRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`,
    { headers }
  );
  if (!reposRes.ok) {
    throw new Error(`Failed to fetch repositories for "${username}": ${reposRes.statusText}`);
  }
  const reposData: any[] = await reposRes.json();

  // Fetch exact Linguist language breakdowns for the active repositories in parallel
  const topRepos = reposData.slice(0, 30);
  const repoLanguagesList = await Promise.all(
    topRepos.map(async (repo: any) => {
      try {
        const langRes = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/languages`,
          { headers }
        );
        if (langRes.ok) {
          return (await langRes.json()) as Record<string, number>;
        }
      } catch {
        // Silently continue to fallback
      }
      return null;
    })
  );

  const nodes: RawRepoItem[] = topRepos.map((repo: any, idx: number): RawRepoItem => {
    const rawLangs = repoLanguagesList[idx];
    let edges: Array<{ size: number; node: { name: string; color: string } }> = [];

    if (rawLangs && Object.keys(rawLangs).length > 0) {
      edges = Object.entries(rawLangs).map(([name, bytes]) => ({
        size: bytes,
        node: {
          name,
          color: getLanguageColor(name)
        }
      }));
    } else if (repo.language) {
      edges = [
        {
          size: 1000,
          node: {
            name: repo.language,
            color: getLanguageColor(repo.language)
          }
        }
      ];
    }

    const primaryLangName = edges.length > 0 ? edges[0].node.name : repo.language || null;
    const primaryColor = primaryLangName ? getLanguageColor(primaryLangName) : '#64748B';

    return {
      id: String(repo.id),
      name: repo.name,
      nameWithOwner: `${username}/${repo.name}`,
      isFork: Boolean(repo.fork),
      isArchived: Boolean(repo.archived),
      isPrivate: Boolean(repo.private),
      stargazerCount: repo.stargazers_count || 0,
      forkCount: repo.forks_count || 0,
      pushedAt: repo.pushed_at || repo.updated_at || new Date().toISOString(),
      description: repo.description || null,
      primaryLanguage: primaryLangName ? { name: primaryLangName, color: primaryColor } : null,
      languages: { edges },
      repositoryTopics: {
        nodes: (repo.topics || []).map((t: string) => ({ topic: { name: t } }))
      },
      authorshipRatio: 1.0,
      isExternal: false
    };
  });

  // If external repositories were requested (e.g. org/repo), fetch them and merge
  if (externalRepos && externalRepos.length > 0) {
    const externalSpecs = externalRepos.filter(r => r.includes('/'));
    if (externalSpecs.length > 0) {
      const fetchedExt = await Promise.all(
        externalSpecs.map(spec => {
          const [owner, name] = spec.split('/');
          return fetchPublicExternalRepository(owner, name, username);
        })
      );
      for (const ext of fetchedExt) {
        if (ext && !nodes.some(n => n.name.toLowerCase() === ext.name.toLowerCase())) {
          nodes.push(ext);
        }
      }
    }
  }

  return {
    user: {
      login: u.login,
      name: u.name || u.login,
      bio: u.bio || '',
      avatarUrl: u.avatar_url,
      createdAt: u.created_at,
      followers: { totalCount: u.followers || 0 },
      following: { totalCount: u.following || 0 },
      contributionsCollection: {
        totalCommitContributions: Math.max(u.public_repos * 15, 64),
        restrictedContributionsCount: 0
      },
      repositories: {
        nodes
      }
    }
  };
}

export async function fetchGitHubEcosystem(
  username: string,
  token: string,
  externalRepos?: string[]
): Promise<RawGraphQLResponse> {
  if (!username) {
    throw new Error('GitHub username is required.');
  }

  // If no token is provided, seamlessly fallback to public REST API
  if (!token) {
    return fetchPublicRestEcosystem(username, externalRepos);
  }

  const octokit = github.getOctokit(token);

  try {
    const response = await octokit.graphql<RawGraphQLResponse>(
      USER_ECOSYSTEM_QUERY,
      {
        login: username
      }
    );

    if (!response || !response.user) {
      throw new Error(`GitHub user "${username}" was not found or has no accessible profile.`);
    }

    // If external repositories were requested (e.g. org/repo), fetch them in parallel and merge
    if (externalRepos && externalRepos.length > 0) {
      const externalSpecs = externalRepos.filter(r => r.includes('/'));
      if (externalSpecs.length > 0) {
        const fetchedExt = await Promise.all(
          externalSpecs.map(spec => {
            const [owner, name] = spec.split('/');
            return fetchPublicExternalRepository(owner, name, username, token);
          })
        );
        for (const ext of fetchedExt) {
          if (ext && response.user.repositories?.nodes) {
            const exists = response.user.repositories.nodes.some(
              (n: any) => n.name.toLowerCase() === ext.name.toLowerCase()
            );
            if (!exists) {
              response.user.repositories.nodes.push(ext);
            }
          }
        }
      }
    }

    return response;
  } catch (error: any) {
    if (error.status === 401 || error.message?.includes('Bad credentials')) {
      // Fallback to public REST if token was invalid
      try {
        return await fetchPublicRestEcosystem(username, externalRepos);
      } catch {
        throw new Error(
          'GitHub API authentication failed: Bad credentials. Check your GITHUB_TOKEN or personal access token permissions.'
        );
      }
    }
    if (error.status === 403 || error.message?.includes('rate limit')) {
      throw new Error(
        'GitHub API rate limit exceeded. Please wait or ensure your workflow is properly authenticated with GITHUB_TOKEN.'
      );
    }
    throw error;
  }
}

/**
 * High-fidelity mock dataset for offline generation, testing, and README previews.
 */
export function getMockGraphQLResponse(username = 'octocat'): RawGraphQLResponse {
  if (username.toLowerCase() === 'niconikimg') {
    return {
      user: {
        login: 'NiconiKimg',
        name: 'Nicolás Pedemonte',
        bio: 'Software Engineer & Systems Architect',
        avatarUrl: 'https://avatars.githubusercontent.com/u/104390124?v=4',
        createdAt: '2022-04-26T18:00:00Z',
        followers: { totalCount: 18 },
        following: { totalCount: 14 },
        contributionsCollection: {
          totalCommitContributions: 412,
          restrictedContributionsCount: 88
        },
        repositories: {
          nodes: [
            {
              id: 'nic-1',
              name: 'Back-End-DSW',
              nameWithOwner: 'upskill-team/Back-End-DSW',
              isFork: false,
              isArchived: false,
              isPrivate: false,
              stargazerCount: 4,
              forkCount: 1,
              pushedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
              description: 'Enterprise backend architecture and microservices ecosystem.',
              primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
              languages: {
                edges: [
                  { size: 145000, node: { name: 'TypeScript', color: '#3178C6' } },
                  { size: 18000, node: { name: 'JavaScript', color: '#F7DF1E' } }
                ]
              },
              repositoryTopics: { nodes: [{ topic: { name: 'backend' } }, { topic: { name: 'typescript' } }] },
              authorshipRatio: 0.65,
              isExternal: true
            },
            {
              id: 'nic-2',
              name: 'Front-End-DSW',
              nameWithOwner: 'upskill-team/Front-End-DSW',
              isFork: false,
              isArchived: false,
              isPrivate: false,
              stargazerCount: 4,
              forkCount: 1,
              pushedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
              description: 'Modern reactive frontend architecture with design system.',
              primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
              languages: {
                edges: [
                  { size: 162000, node: { name: 'TypeScript', color: '#3178C6' } },
                  { size: 24000, node: { name: 'CSS', color: '#6366F1' } }
                ]
              },
              repositoryTopics: { nodes: [{ topic: { name: 'frontend' } }, { topic: { name: 'react' } }] },
              authorshipRatio: 0.70,
              isExternal: true
            },
            {
              id: 'nic-3',
              name: 'Front-End-SIGMA-LA',
              nameWithOwner: 'SIGMA-LA/Front-End-SIGMA-LA',
              isFork: false,
              isArchived: false,
              isPrivate: false,
              stargazerCount: 3,
              forkCount: 0,
              pushedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
              description: 'Collaborative enterprise interface platform.',
              primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
              languages: {
                edges: [{ size: 98000, node: { name: 'TypeScript', color: '#3178C6' } }]
              },
              repositoryTopics: { nodes: [{ topic: { name: 'sigma' } }, { topic: { name: 'webapp' } }] },
              authorshipRatio: 0.60,
              isExternal: true
            },
            {
              id: 'nic-4',
              name: 'Back-End-SIGMA-LA',
              nameWithOwner: 'SIGMA-LA/Back-End-SIGMA-LA',
              isFork: false,
              isArchived: false,
              isPrivate: false,
              stargazerCount: 3,
              forkCount: 0,
              pushedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
              description: 'Robust server-side REST API services for SIGMA-LA.',
              primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
              languages: {
                edges: [{ size: 110000, node: { name: 'TypeScript', color: '#3178C6' } }]
              },
              repositoryTopics: { nodes: [{ topic: { name: 'api' } }, { topic: { name: 'nodejs' } }] },
              authorshipRatio: 0.60,
              isExternal: true
            },
            {
              id: 'nic-5',
              name: 'PedemonteDigitalTwin_v2',
              nameWithOwner: 'Frasquito3/PedemonteDigitalTwin_v2',
              isFork: false,
              isArchived: false,
              isPrivate: false,
              stargazerCount: 3,
              forkCount: 0,
              pushedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
              description: 'Industrial digital twin simulation and 3D visual telemetry.',
              primaryLanguage: { name: 'C#', color: '#10B981' },
              languages: {
                edges: [
                  { size: 140000, node: { name: 'C#', color: '#10B981' } },
                  { size: 42000, node: { name: 'TypeScript', color: '#3178C6' } }
                ]
              },
              repositoryTopics: { nodes: [{ topic: { name: 'digital-twin' } }, { topic: { name: 'simulation' } }] },
              authorshipRatio: 0.95,
              isExternal: true
            },
            {
              id: 'nic-6',
              name: 'Hyperparameters-Optimization',
              nameWithOwner: 'LucaTvl/Hyperparameters-Optimization',
              isFork: false,
              isArchived: false,
              isPrivate: false,
              stargazerCount: 2,
              forkCount: 0,
              pushedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
              description: 'Genetic algorithms and hyperparameter optimization research.',
              primaryLanguage: { name: 'Python', color: '#F59E0B' },
              languages: {
                edges: [{ size: 85000, node: { name: 'Python', color: '#F59E0B' } }]
              },
              repositoryTopics: { nodes: [{ topic: { name: 'ai' } }, { topic: { name: 'machine-learning' } }] },
              authorshipRatio: 0.50,
              isExternal: true
            },
            {
              id: 'nic-8',
              name: 'DigitalTwin_ThreeJS',
              nameWithOwner: 'NiconiKimg/DigitalTwin_ThreeJS',
              isFork: false,
              isArchived: false,
              isPrivate: false,
              stargazerCount: 1,
              forkCount: 0,
              pushedAt: new Date(Date.now() - 22 * 86400000).toISOString(),
              description: '3D WebGL Digital Twin simulation client.',
              primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
              languages: {
                edges: [
                  { size: 80000, node: { name: 'TypeScript', color: '#3178C6' } },
                  { size: 30000, node: { name: 'GLSL', color: '#5686A5' } }
                ]
              },
              repositoryTopics: { nodes: [{ topic: { name: 'threejs' } }, { topic: { name: 'webgl' } }] },
              authorshipRatio: 1.0,
              isExternal: false
            }
          ]
        }
      }
    };
  }

  return {
    user: {
      login: username,
      name: 'The Octocat',
      bio: 'Open source explorer, stargazing engineer & systems architect.',
      avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
      createdAt: '2011-01-25T18:44:36Z',
      followers: { totalCount: 1420 },
      following: { totalCount: 42 },
      contributionsCollection: {
        totalCommitContributions: 1284,
        restrictedContributionsCount: 192
      },
      repositories: {
        nodes: [
          {
            id: 'repo-1',
            name: 'hyper-drive',
            isFork: false,
            isArchived: false,
            isPrivate: false,
            stargazerCount: 384,
            forkCount: 45,
            pushedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            description: 'Ultra-fast asynchronous telemetry and vector routing engine.',
            primaryLanguage: { name: 'Rust', color: '#DEA584' },
            languages: {
              edges: [
                { size: 480000, node: { name: 'Rust', color: '#DEA584' } },
                { size: 60000, node: { name: 'WebAssembly', color: '#04133B' } },
                { size: 25000, node: { name: 'Shell', color: '#89E051' } }
              ]
            },
            repositoryTopics: {
              nodes: [
                { topic: { name: 'rust' } },
                { topic: { name: 'telemetry' } },
                { topic: { name: 'high-performance' } }
              ]
            }
          },
          {
            id: 'repo-2',
            name: 'stellar-nebula',
            isFork: false,
            isArchived: false,
            isPrivate: false,
            stargazerCount: 210,
            forkCount: 28,
            pushedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            description: 'Cosmic particle simulation and celestial geometry renderer in WebGPU.',
            primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
            languages: {
              edges: [
                { size: 320000, node: { name: 'TypeScript', color: '#3178C6' } },
                { size: 90000, node: { name: 'GLSL', color: '#5686A5' } },
                { size: 40000, node: { name: 'HTML', color: '#E34C26' } }
              ]
            },
            repositoryTopics: {
              nodes: [
                { topic: { name: 'webgpu' } },
                { topic: { name: 'graphics' } },
                { topic: { name: 'astronomy' } }
              ]
            }
          },
          {
            id: 'repo-3',
            name: 'quantum-mesh',
            isFork: false,
            isArchived: false,
            isPrivate: false,
            stargazerCount: 145,
            forkCount: 19,
            pushedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
            description: 'Distributed p2p topology and synchronization protocol.',
            primaryLanguage: { name: 'Go', color: '#00ADD8' },
            languages: {
              edges: [
                { size: 280000, node: { name: 'Go', color: '#00ADD8' } },
                { size: 35000, node: { name: 'Protocol Buffer', color: '#CED3D7' } }
              ]
            },
            repositoryTopics: {
              nodes: [
                { topic: { name: 'distributed-systems' } },
                { topic: { name: 'networking' } }
              ]
            }
          },
          {
            id: 'repo-4',
            name: 'gravity-lens',
            isFork: false,
            isArchived: false,
            isPrivate: false,
            stargazerCount: 96,
            forkCount: 12,
            pushedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
            description: 'Automated observatory camera calibration and astrophotography tool.',
            primaryLanguage: { name: 'Python', color: '#F59E0B' },
            languages: {
              edges: [
                { size: 210000, node: { name: 'Python', color: '#F59E0B' } },
                { size: 45000, node: { name: 'C++', color: '#F34B7D' } }
              ]
            },
            repositoryTopics: {
              nodes: [
                { topic: { name: 'astronomy' } },
                { topic: { name: 'image-processing' } }
              ]
            }
          },
          {
            id: 'repo-5',
            name: 'orbit-ui',
            isFork: false,
            isArchived: false,
            isPrivate: false,
            stargazerCount: 68,
            forkCount: 8,
            pushedAt: new Date(Date.now() - 32 * 86400000).toISOString(),
            description: 'Minimalist accessible design system for developer control rooms.',
            primaryLanguage: { name: 'TypeScript', color: '#3178C6' },
            languages: {
              edges: [
                { size: 180000, node: { name: 'TypeScript', color: '#3178C6' } },
                { size: 50000, node: { name: 'CSS', color: '#563D7C' } }
              ]
            },
            repositoryTopics: {
              nodes: [
                { topic: { name: 'ui' } },
                { topic: { name: 'design-system' } }
              ]
            }
          },
          {
            id: 'repo-6',
            name: 'aurora-pipeline',
            isFork: false,
            isArchived: false,
            isPrivate: false,
            stargazerCount: 42,
            forkCount: 5,
            pushedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
            description: 'Event-driven streaming pipeline for planetary sensor logs.',
            primaryLanguage: { name: 'Rust', color: '#DEA584' },
            languages: {
              edges: [
                { size: 160000, node: { name: 'Rust', color: '#DEA584' } },
                { size: 20000, node: { name: 'Docker', color: '#384D54' } }
              ]
            },
            repositoryTopics: {
              nodes: [
                { topic: { name: 'data-pipeline' } },
                { topic: { name: 'streaming' } }
              ]
            }
          },
          {
            id: 'repo-7',
            name: 'deep-space-cli',
            isFork: false,
            isArchived: false,
            isPrivate: false,
            stargazerCount: 31,
            forkCount: 3,
            pushedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
            description: 'Command line companion for multi-cluster telemetry navigation.',
            primaryLanguage: { name: 'Go', color: '#00ADD8' },
            languages: {
              edges: [
                { size: 120000, node: { name: 'Go', color: '#00ADD8' } }
              ]
            },
            repositoryTopics: {
              nodes: [
                { topic: { name: 'cli' } }
              ]
            }
          },
          {
            id: 'repo-8',
            name: 'cosmos-docs',
            isFork: false,
            isArchived: false,
            isPrivate: false,
            stargazerCount: 18,
            forkCount: 2,
            pushedAt: new Date(Date.now() - 80 * 86400000).toISOString(),
            description: 'Guides and architectural blueprints for orbital software systems.',
            primaryLanguage: { name: 'Markdown', color: '#083FA1' },
            languages: {
              edges: [
                { size: 95000, node: { name: 'Markdown', color: '#083FA1' } }
              ]
            },
            repositoryTopics: {
              nodes: [
                { topic: { name: 'documentation' } }
              ]
            }
          }
        ]
      }
    }
  };
}
