import * as path from 'node:path';
import { getMockGraphQLResponse } from './api/client.js';
import { normalizeEcosystemData } from './data/normalizer.js';
import { renderVisualization } from './templates/index.js';
import { writeSvgIfChanged } from './git/committer.js';
import { ActionConfig, VisualizationTemplate, VisualizationTheme } from './types.js';

async function main() {
  const args = process.argv.slice(2);
  const isMock = args.includes('--mock');
  const isAll = args.includes('--all');

  const uIdx = args.indexOf('--username');
  const username = uIdx >= 0 && args[uIdx + 1] ? args[uIdx + 1] : 'octocat';

  console.log(`🌌 octo-orbit CLI Generator (Target: @${username})`);

  const incIdx = args.indexOf('--include');
  const includeRepositories = incIdx >= 0 && args[incIdx + 1]
    ? args[incIdx + 1]
        .split(',')
        .map(s => s.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, ''))
        .filter(Boolean)
    : undefined;

  const extIdx = args.indexOf('--external');
  const externalRepositories = extIdx >= 0 && args[extIdx + 1]
    ? args[extIdx + 1]
        .split(',')
        .map(s => s.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, ''))
        .filter(Boolean)
    : undefined;

  const exLangIdx = args.indexOf('--exclude-languages') >= 0 ? args.indexOf('--exclude-languages') : args.indexOf('--exclude-langs');
  const excludeLanguages = exLangIdx >= 0 && args[exLangIdx + 1]
    ? args[exLangIdx + 1].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const exRepoIdx = args.indexOf('--exclude-repositories') >= 0 ? args.indexOf('--exclude-repositories') : args.indexOf('--exclude');
  const excludeRepositories = exRepoIdx >= 0 && args[exRepoIdx + 1]
    ? args[exRepoIdx + 1].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  let rawData;
  if (isMock) {
    console.log('Using synthetic mock data...');
    rawData = getMockGraphQLResponse(username);
  } else {
    try {
      console.log(`Fetching live GitHub ecosystem for @${username}...`);
      const { fetchGitHubEcosystem } = await import('./api/client.js');
      rawData = await fetchGitHubEcosystem(username, process.env.GITHUB_TOKEN || '', externalRepositories);
    } catch (err: any) {
      console.warn(`Could not fetch live GitHub data: ${err.message}. Falling back to mock.`);
      rawData = getMockGraphQLResponse(username);
    }
  }

  if (rawData?.user?.avatarUrl && !rawData.user.avatarUrl.startsWith('data:')) {
    const { fetchAvatarAsDataUri } = await import('./api/client.js');
    rawData.user.avatarUrl = await fetchAvatarAsDataUri(rawData.user.avatarUrl, process.env.GITHUB_TOKEN);
  }

  const rIdx = args.indexOf('--role');
  const role = rIdx >= 0 && args[rIdx + 1] ? args[rIdx + 1] : undefined;

  const showHeader = !args.includes('--no-header');
  const showFooter = !args.includes('--no-footer');
  const showStats = !args.includes('--no-stats');
  const showConstellations = !args.includes('--no-constellations');
  const showOrbits = !args.includes('--no-orbits');
  const showAnimations = !args.includes('--no-animations');
  const showUfo = !args.includes('--no-ufo');
  const showSpaceship = !args.includes('--no-spaceship');
  const showSatellite = !args.includes('--no-satellite');
  const showComet = !args.includes('--no-comet');

  const baseConfig: ActionConfig = {
    username,
    token: '',
    template: 'space',
    theme: 'auto',
    outputPath: 'examples/github-cosmos.svg',
    excludeRepositories,
    excludeLanguages,
    includeRepositories,
    externalRepositories,
    includeForks: false,
    includeArchived: false,
    maxRepositories: 25,
    role,
    showHeader,
    showFooter,
    showStats,
    showLanguages: true,
    showActivity: true,
    showConstellations,
    showOrbits,
    showAnimations,
    showUfo,
    showSpaceship,
    showSatellite,
    showComet,
    autoCommit: false,
    commitMessage: ''
  };

  const ecosystem = normalizeEcosystemData(rawData, baseConfig);

  if (isAll) {
    console.log('Generating full suite of showcase assets for all templates and themes...');
    const templates: VisualizationTemplate[] = ['space', 'landscape', 'network', 'minimal'];
    const themes: VisualizationTheme[] = ['dark', 'light', 'auto'];

    for (const t of templates) {
      for (const th of themes) {
        const outPath = path.join('examples', `${t}-${th}.svg`);
        const config: ActionConfig = {
          ...baseConfig,
          template: t,
          theme: th,
          outputPath: outPath
        };
        const svg = renderVisualization(ecosystem, config);
        const res = writeSvgIfChanged(outPath, svg);
        console.log(`  ✓ Rendered [${t} | ${th}] -> ${res.filePath} (${res.reason})`);
      }
    }
    console.log('✨ All showcase examples generated in ./examples directory.');
  } else {
    const tIdx = args.indexOf('--template');
    const templateArg = (tIdx >= 0 && args[tIdx + 1] ? args[tIdx + 1] : 'space') as VisualizationTemplate;
    const thIdx = args.indexOf('--theme');
    const themeArg = (thIdx >= 0 && args[thIdx + 1] ? args[thIdx + 1] : 'auto') as VisualizationTheme;
    const oIdx = args.indexOf('--output');
    const outputArg = oIdx >= 0 && args[oIdx + 1] ? args[oIdx + 1] : `examples/${templateArg}-${themeArg}.svg`;

    const config: ActionConfig = {
      ...baseConfig,
      template: templateArg,
      theme: themeArg,
      outputPath: outputArg
    };

    const svg = renderVisualization(ecosystem, config);
    const res = writeSvgIfChanged(outputArg, svg);
    console.log(`✓ Rendered [${templateArg} | ${themeArg}] -> ${res.filePath} (${res.reason})`);
  }
}

main().catch(err => {
  console.error('CLI execution error:', err);
  process.exit(1);
});
