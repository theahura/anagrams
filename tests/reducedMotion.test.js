import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STYLE_CSS_PATH = resolve(__dirname, '..', 'style.css');

describe('prefers-reduced-motion', () => {
  let css;
  let block;

  beforeAll(() => {
    css = readFileSync(STYLE_CSS_PATH, 'utf8');

    const mediaRe = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/i;
    const startMatch = css.match(mediaRe);
    if (!startMatch) {
      block = '';
      return;
    }

    let depth = 0;
    let i = startMatch.index + startMatch[0].length;
    const startContent = i;
    depth = 1;
    while (i < css.length && depth > 0) {
      const ch = css[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    block = css.slice(startContent, i - 1);
  });

  test('style.css contains an @media (prefers-reduced-motion: reduce) block', () => {
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i);
    expect(block).not.toBe('');
  });

  test('reduced-motion block caps animation duration to 0.01ms with !important', () => {
    expect(block).toMatch(/animation-duration\s*:\s*0\.01ms\s*!important/i);
  });

  test('reduced-motion block caps animation iteration count to 1 with !important', () => {
    expect(block).toMatch(/animation-iteration-count\s*:\s*1\s*!important/i);
  });

  test('reduced-motion block caps transition duration to 0.01ms with !important', () => {
    expect(block).toMatch(/transition-duration\s*:\s*0\.01ms\s*!important/i);
  });

  test('reduced-motion block neutralises the clickable-tile hover transform', () => {
    expect(block).toMatch(
      /\.tile\.clickable\s*:\s*hover\s*\{[^}]*transform\s*:\s*none/i,
    );
  });
});
