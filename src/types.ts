export type VisualizationTemplate = 'space' | 'landscape' | 'network' | 'minimal';
export type VisualizationTheme = 'auto' | 'dark' | 'light';

export interface ActionConfig {
  username: string;
  token: string;
  template: VisualizationTemplate;
  theme: VisualizationTheme;
  outputPath: string;
  outputDarkPath?: string;
  outputLightPath?: string;
  excludeRepositories: string[];
  excludeLanguages?: string[];
  includeRepositories?: string[];
  externalRepositories?: string[];
  includeForks: boolean;
  includeArchived: boolean;
  maxRepositories: number;
  role?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  showStats?: boolean;
  showLanguages?: boolean;
  showActivity?: boolean;
  showConstellations?: boolean;
  showOrbits?: boolean;
  showAnimations?: boolean;
  showUfo?: boolean;
  showSpaceship?: boolean;
  showSatellite?: boolean;
  showComet?: boolean;
  customTitle?: string;
  autoCommit: boolean;
  commitMessage: string;
}

export interface UserSummary {
  login: string;
  name: string;
  bio: string;
  avatarUrl: string;
  followers: number;
  following: number;
  createdAt: string;
  totalCommitContributions: number;
  restrictedContributionsCount: number;
}

export interface RepoLanguage {
  name: string;
  color: string;
  bytes: number;
  percentage: number;
}

export interface NormalizedRepo {
  id: string;
  name: string;
  owner: string;
  description: string;
  isFork: boolean;
  isArchived: boolean;
  stars: number;
  forks: number;
  primaryLanguage: string;
  primaryColor: string;
  languages: RepoLanguage[];
  topics: string[];
  pushedAt: string;
  pushedDaysAgo: number;
  activityScore: number; // 0 - 100 based on recency and activity
  gravityRadius: number; // visual radius in space metaphors
  orbitTier: number;     // 1 = inner, 4 = outer belt
  resonanceCluster: string; // primary topic or language cluster
  authorshipRatio?: number; // 0.0 to 1.0 (exact personal contribution ratio)
  isExternal?: boolean;     // true if transferred to organization or external repo
}

export interface LanguageStat {
  name: string;
  color: string;
  bytes: number;
  percentage: number;
  repoCount: number;
}

export interface TopicStat {
  topic: string;
  count: number;
}

export interface EcosystemData {
  user: UserSummary;
  repositories: NormalizedRepo[];
  metrics: {
    totalRepos: number;
    totalStars: number;
    totalForks: number;
    totalCommits: number;
    languages: LanguageStat[];
    topics: TopicStat[];
    dominantLanguage: string;
    cosmicRank: string;
    diversityIndex: number; // Shannon-like diversity 0-100
  };
  generatedAt: string;
}

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgGradient: [string, string, string];
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentGlow: string;
  orbitLine: string;
  constellationLine: string;
  gridLine: string;
  starDust: string;
  radarRing: string;
  badgeBg: string;
}

export interface ThemeDefinition {
  mode: 'dark' | 'light';
  colors: ThemeColors;
}
