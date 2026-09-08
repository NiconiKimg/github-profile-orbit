import { describe, it, expect } from 'vitest';
import { parseBooleanInput, parseListInput, parseNumberInput } from '../src/config.js';

describe('Configuration Parser', () => {
  it('parses multi-line and comma-separated lists', () => {
    const multiLine = `
      repo-a
      repo-b
      repo-c
    `;
    expect(parseListInput(multiLine)).toEqual(['repo-a', 'repo-b', 'repo-c']);

    const commaSeparated = 'repo-1, repo-2,  repo-3 ';
    expect(parseListInput(commaSeparated)).toEqual(['repo-1', 'repo-2', 'repo-3']);

    expect(parseListInput('')).toEqual([]);
  });

  it('parses boolean inputs correctly', () => {
    expect(parseBooleanInput('true')).toBe(true);
    expect(parseBooleanInput('True')).toBe(true);
    expect(parseBooleanInput('1')).toBe(true);
    expect(parseBooleanInput('yes')).toBe(true);
    expect(parseBooleanInput('false')).toBe(false);
    expect(parseBooleanInput('0')).toBe(false);
    expect(parseBooleanInput('', true)).toBe(true);
    expect(parseBooleanInput('', false)).toBe(false);
  });

  it('parses numeric inputs with default fallback', () => {
    expect(parseNumberInput('50', 25)).toBe(50);
    expect(parseNumberInput('invalid', 25)).toBe(25);
    expect(parseNumberInput('', 25)).toBe(25);
  });
});
