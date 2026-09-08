import * as core from '@actions/core';
import { ActionConfig, VisualizationTemplate, VisualizationTheme } from './types.js';

export function parseListInput(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[\n,]/)
    .map(s => {
      let trimmed = s.trim();
      trimmed = trimmed.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');
      return trimmed;
    })
    .filter(s => s.length > 0);
}

export function parseBooleanInput(val: string, defaultVal = false): boolean {
  if (!val) return defaultVal;
  const lower = val.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

export function parseNumberInput(val: string, defaultVal: number): number {
  if (!val) return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

export function loadConfig(envOverrides: Record<string, string> = {}): ActionConfig {
  const get = (key: string, envKey?: string): string => {
    if (envOverrides[key]) return envOverrides[key];
    const actionVal = core.getInput(key);
    if (actionVal) return actionVal;
    if (envKey && process.env[envKey]) return process.env[envKey]!;
    return '';
  };

  const username =
    get('username', 'GITHUB_ACTOR') ||
    process.env.GITHUB_REPOSITORY_OWNER ||
    '';

  const token =
    get('token', 'GITHUB_TOKEN') ||
    process.env.GH_TOKEN ||
    '';

  const rawTemplate = get('template', 'TEMPLATE') || 'space';
  const template = ['space', 'landscape', 'network', 'minimal'].includes(rawTemplate.toLowerCase())
    ? (rawTemplate.toLowerCase() as VisualizationTemplate)
    : 'space';

  const rawTheme = get('theme', 'THEME') || 'auto';
  const theme = ['auto', 'dark', 'light'].includes(rawTheme.toLowerCase())
    ? (rawTheme.toLowerCase() as VisualizationTheme)
    : 'auto';

  const outputPath = get('output_path', 'OUTPUT_PATH') || 'dist/github-cosmos.svg';
  const outputDarkPath = get('output_dark_path', 'OUTPUT_DARK_PATH') || undefined;
  const outputLightPath = get('output_light_path', 'OUTPUT_LIGHT_PATH') || undefined;

  const rawExclude = get('exclude_repositories', 'EXCLUDE_REPOSITORIES');
  const excludeRepositories = parseListInput(rawExclude);

  const rawInclude = get('include_repositories', 'INCLUDE_REPOSITORIES');
  const includeRepositories = parseListInput(rawInclude);

  const rawExternal = get('external_repositories', 'EXTERNAL_REPOSITORIES');
  const externalRepositories = parseListInput(rawExternal);

  const includeForks = parseBooleanInput(get('include_forks', 'INCLUDE_FORKS'), false);
  const includeArchived = parseBooleanInput(get('include_archived', 'INCLUDE_ARCHIVED'), false);
  const maxRepositories = parseNumberInput(get('max_repositories', 'MAX_REPOSITORIES'), 25);

  const role = get('role', 'ROLE') || undefined;
  const showHeader = parseBooleanInput(get('show_header', 'SHOW_HEADER'), true);
  const showFooter = parseBooleanInput(get('show_footer', 'SHOW_FOOTER'), true);
  const showStats = parseBooleanInput(get('show_stats', 'SHOW_STATS'), true);
  const showLanguages = parseBooleanInput(get('show_languages', 'SHOW_LANGUAGES'), true);
  const showActivity = parseBooleanInput(get('show_activity', 'SHOW_ACTIVITY'), true);
  const showConstellations = parseBooleanInput(get('show_constellations', 'SHOW_CONSTELLATIONS'), true);
  const showOrbits = parseBooleanInput(get('show_orbits', 'SHOW_ORBITS'), true);
  const showAnimations = parseBooleanInput(get('show_animations', 'SHOW_ANIMATIONS'), true);
  const showUfo = parseBooleanInput(get('show_ufo', 'SHOW_UFO'), true);
  const showSpaceship = parseBooleanInput(get('show_spaceship', 'SHOW_SPACESHIP'), true);
  const showSatellite = parseBooleanInput(get('show_satellite', 'SHOW_SATELLITE'), true);
  const showComet = parseBooleanInput(get('show_comet', 'SHOW_COMET'), true);

  const customTitle = get('custom_title', 'CUSTOM_TITLE') || undefined;
  const autoCommit = parseBooleanInput(get('auto_commit', 'AUTO_COMMIT'), true);
  const commitMessage =
    get('commit_message', 'COMMIT_MESSAGE') ||
    'chore(docs): update GitHub ecosystem visualization [skip ci]';

  return {
    username,
    token,
    template,
    theme,
    outputPath,
    outputDarkPath,
    outputLightPath,
    excludeRepositories,
    includeRepositories: includeRepositories.length > 0 ? includeRepositories : undefined,
    externalRepositories: externalRepositories.length > 0 ? externalRepositories : undefined,
    includeForks,
    includeArchived,
    maxRepositories,
    role,
    showHeader,
    showFooter,
    showStats,
    showLanguages,
    showActivity,
    showConstellations,
    showOrbits,
    showAnimations,
    showUfo,
    showSpaceship,
    showSatellite,
    showComet,
    customTitle,
    autoCommit,
    commitMessage
  };
}
