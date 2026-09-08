import * as core from '@actions/core';
import { loadConfig } from './config.js';
import { fetchGitHubEcosystem, getMockGraphQLResponse } from './api/client.js';
import { normalizeEcosystemData } from './data/normalizer.js';
import { renderVisualization } from './templates/index.js';
import { autoCommitFiles, writeSvgIfChanged } from './git/committer.js';

export async function run(): Promise<void> {
  try {
    core.info('🚀 Initializing octo-orbit GitHub Ecosystem Visualizer...');
    const config = loadConfig();

    if (!config.username) {
      throw new Error(
        'Missing required parameter: "username". Please provide your GitHub username.'
      );
    }

    core.info(`Target identity: @${config.username}`);
    core.info(`Selected template: "${config.template}" | Theme: "${config.theme}"`);

    // Fetch raw GitHub ecosystem data
    let rawData;
    if (process.env.OCTO_ORBIT_MOCK === 'true') {
      core.info('OCTO_ORBIT_MOCK is set. Using high-fidelity synthetic mock dataset.');
      rawData = getMockGraphQLResponse(config.username);
    } else {
      if (!config.token) {
        throw new Error(
          'Missing required GitHub token. Please pass `token: ${{ secrets.GITHUB_TOKEN }}` in your action configuration.'
        );
      }
      core.info('Querying GitHub GraphQL API for repositories, languages, and activity...');
      rawData = await fetchGitHubEcosystem(config.username, config.token, config.externalRepositories);
    }

    // Normalize and filter dataset
    core.info('Normalizing and analyzing developer ecosystem...');
    const ecosystem = normalizeEcosystemData(rawData, config);
    core.info(
      `Analyzed ${ecosystem.repositories.length} active repositories across ${ecosystem.metrics.languages.length} languages.`
    );
    core.info(`Assigned Cosmic Rank: "${ecosystem.metrics.cosmicRank}"`);

    const filesToCommit: string[] = [];

    // 1. Generate Primary Visualization
    core.info(`Generating primary vector visualization (${config.outputPath})...`);
    const primarySvg = renderVisualization(ecosystem, config);
    const primaryWrite = writeSvgIfChanged(config.outputPath, primarySvg);
    core.info(`Asset status: [${primaryWrite.reason}] ${primaryWrite.filePath}`);
    if (primaryWrite.written) {
      filesToCommit.push(primaryWrite.filePath);
    }

    // 2. Generate Explicit Dark Asset if requested
    if (config.outputDarkPath) {
      core.info(`Generating dedicated dark mode asset (${config.outputDarkPath})...`);
      const darkConfig = { ...config, theme: 'dark' as const };
      const darkSvg = renderVisualization(ecosystem, darkConfig);
      const darkWrite = writeSvgIfChanged(config.outputDarkPath, darkSvg);
      core.info(`Dark asset status: [${darkWrite.reason}] ${darkWrite.filePath}`);
      if (darkWrite.written) {
        filesToCommit.push(darkWrite.filePath);
      }
    }

    // 3. Generate Explicit Light Asset if requested
    if (config.outputLightPath) {
      core.info(`Generating dedicated light mode asset (${config.outputLightPath})...`);
      const lightConfig = { ...config, theme: 'light' as const };
      const lightSvg = renderVisualization(ecosystem, lightConfig);
      const lightWrite = writeSvgIfChanged(config.outputLightPath, lightSvg);
      core.info(`Light asset status: [${lightWrite.reason}] ${lightWrite.filePath}`);
      if (lightWrite.written) {
        filesToCommit.push(lightWrite.filePath);
      }
    }

    // Output variables for GitHub Action steps
    core.setOutput('svg_path', config.outputPath);
    core.setOutput('total_repositories', ecosystem.metrics.totalRepos);
    core.setOutput('total_stars', ecosystem.metrics.totalStars);
    core.setOutput('dominant_language', ecosystem.metrics.dominantLanguage);
    core.setOutput('cosmic_rank', ecosystem.metrics.cosmicRank);

    // 4. Safe Git Auto-Commit if enabled
    if (config.autoCommit) {
      core.info('Initiating safe Git commit evaluation...');
      await autoCommitFiles(filesToCommit, config.commitMessage);
    }

    core.info('✨ octo-orbit visualization cycle completed successfully!');
  } catch (error: any) {
    core.setFailed(error.message || String(error));
  }
}

// Execute when run directly as Action
run();

