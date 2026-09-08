/**
 * Deterministic Linear Congruential Generator (PRNG).
 * Ensures layouts and background stars do not jitter between runs.
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number | string = 42) {
    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      this.seed = Math.abs(hash) || 123456789;
    } else {
      this.seed = Math.abs(seed) || 123456789;
    }
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Escapes XML special characters for safe SVG rendering.
 */
export function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts polar coordinates (radius, angle in radians) to Cartesian (x, y) relative to center.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleRad: number
): { x: number; y: number } {
  return {
    x: Number((cx + r * Math.cos(angleRad)).toFixed(2)),
    y: Number((cy + r * Math.sin(angleRad)).toFixed(2))
  };
}

/**
 * Formats large numbers compactly (e.g. 1284 -> 1.3k).
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

/**
 * Truncates string with ellipsis if exceeding max length.
 */
export function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
