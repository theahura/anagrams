import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

describe('favicon', () => {
  it('declares an SVG favicon whose referenced file exists and is a valid SVG', () => {
    const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');

    const linkTag = html.match(/<link\b[^>]*\brel\s*=\s*["']icon["'][^>]*>/i);
    expect(linkTag, 'index.html should contain a <link rel="icon"> tag').not.toBeNull();

    const tag = linkTag[0];
    expect(tag, 'icon link should declare type="image/svg+xml"').toMatch(
      /type\s*=\s*["']image\/svg\+xml["']/i
    );

    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    expect(hrefMatch, 'icon link should have an href').not.toBeNull();

    const href = hrefMatch[1];
    const filename = href.replace(/^\.?\/?/, '');
    const filePath = path.join(ROOT, 'public', filename);

    expect(
      existsSync(filePath),
      `public/${filename} (referenced by icon href "${href}") should exist on disk`
    ).toBe(true);

    const svg = readFileSync(filePath, 'utf8').trim();
    expect(svg.length).toBeGreaterThan(0);
    expect(svg).toContain('<svg');
    expect(svg.endsWith('</svg>')).toBe(true);
  });
});
