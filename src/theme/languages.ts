/**
 * Canonical GitHub Linguist Language Colors and Normalizer
 * Provides official colors and mappings for 60+ programming languages.
 */

export const GITHUB_LANG_COLORS: Record<string, string> = {
  // PHP & Ecosystem
  php: '#4F5D95',
  blade: '#F05340',
  hack: '#878787',

  // JavaScript & TypeScript
  typescript: '#3178C6',
  javascript: '#F1E05A',
  jsx: '#F1E05A',
  tsx: '#3178C6',
  vue: '#41B883',
  svelte: '#FF3E00',
  astro: '#FF5D01',

  // Python
  python: '#3572A5',
  jupyter: '#DA5B0B',
  'jupyter notebook': '#DA5B0B',

  // Java, Kotlin & JVM
  java: '#B07219',
  kotlin: '#A97BFF',
  scala: '#C22D40',
  groovy: '#4298B8',
  clojure: '#DB5855',

  // C / C++ / C#
  'c#': '#178600',
  csharp: '#178600',
  'c++': '#F34B7D',
  cpp: '#F34B7D',
  c: '#555555',

  // Systems & Native
  rust: '#DEA584',
  go: '#00ADD8',
  zig: '#EC915C',
  nim: '#FFE953',
  d: '#BA595E',
  fortran: '#4D41B1',
  assembly: '#6E4C13',

  // Mobile
  swift: '#F05138',
  dart: '#00B4AB',
  'objective-c': '#438EFF',

  // Scripting, Shell & Automation
  shell: '#89E051',
  bash: '#89E051',
  powershell: '#012456',
  lua: '#000080',
  ruby: '#701516',
  perl: '#0298C3',
  awk: '#C30E9B',

  // Functional & Scientific
  elixir: '#6E4A7E',
  erlang: '#B83998',
  haskell: '#5E5086',
  ocaml: '#EF7A08',
  r: '#198CE7',
  julia: '#A270BA',
  matlab: '#E16737',

  // Web, Styles & Markup
  html: '#E34C26',
  css: '#563D7C',
  scss: '#C6538C',
  sass: '#A53B70',
  less: '#1D365D',
  markdown: '#0284C7',

  // Data, Config & DevOps
  sql: '#E38C00',
  plsql: '#DAD8D8',
  dockerfile: '#384D54',
  yaml: '#CB171E',
  json: '#292929',
  graphql: '#E10098',
  solidity: '#AA6746',
  tex: '#3D6117'
};

/**
 * Returns the official color hex code for any given language name.
 * Defaults to sleek slate if unknown.
 */
export function getLanguageColor(langName?: string | null): string {
  if (!langName) return '#64748B';
  const clean = langName.toLowerCase().trim();
  return GITHUB_LANG_COLORS[clean] || '#64748B';
}
