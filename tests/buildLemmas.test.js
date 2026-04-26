import { describe, it, expect } from 'vitest';
import { buildLemmaIndex } from '../scripts/build-lemmas.js';

describe('buildLemmaIndex', () => {
  it('maps inflected words to their lemma when the lemma is in the vocabulary', () => {
    const idx = buildLemmaIndex(['walk', 'walks', 'walked', 'walking']);
    expect(idx.walks).toContain('walk');
    expect(idx.walked).toContain('walk');
    expect(idx.walking).toContain('walk');
  });

  it('maps simple plurals to their singular root', () => {
    const idx = buildLemmaIndex(['nub', 'nubs', 'book', 'books', 'cat', 'cats']);
    expect(idx.nubs).toContain('nub');
    expect(idx.books).toContain('book');
    expect(idx.cats).toContain('cat');
  });

  it('omits words whose only candidate lemmas equal themselves', () => {
    const idx = buildLemmaIndex(['walk', 'snub', 'rate']);
    expect(idx.walk).toBeUndefined();
    expect(idx.snub).toBeUndefined();
    expect(idx.rate).toBeUndefined();
  });

  it('captures the over-stem case (rated → rat) so the trailing-e heuristic can fire', () => {
    const idx = buildLemmaIndex(['rate', 'rated', 'rat']);
    expect(idx.rated).toContain('rat');
  });
});
