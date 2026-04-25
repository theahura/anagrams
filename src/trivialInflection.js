import lem from 'wink-lemmatizer';

const FORCE_TRIVIAL = new Set();
const FORCE_NON_TRIVIAL = new Set([
  'sin|sines', 'sag|sages', 'rot|rotes', 'ras|rases', 'sit|sited',
  'pas|pases', 'sip|siped', 'sip|sipes', 'rat|rated', 'tar|tared',
  'tar|tares', 'mar|mares', 'tin|tined', 'tin|tines', 'lam|lamed',
  'hat|hated', 'bar|bared', 'par|pared', 'rap|raped', 'sup|supes',
  'sol|soles', 'far|farer', 'rub|rubes', 'lop|loped', 'din|dined',
  'rag|raged', 'pal|paled', 'wan|waned', 'low|lowes', 'aid|aides',
  'war|wared', 'log|loges', 'hop|hoped', 'sic|sices', 'cat|cates',
  'pat|pated', 'pat|pates', 'tap|taped', 'lob|lobed', 'lob|lobes',
  'cap|caped', 'cap|capes', 'nod|nodes', 'con|coned', 'rob|robed',
  'rim|rimed', 'lug|luged', 'cop|coped', 'run|runes', 'nap|napes',
  'pan|paned', 'pan|panes', 'mat|mated', 'mat|mater', 'top|toped',
  'dun|dunes', 'win|wined', 'wad|waded', 'fat|fated', 'man|maned',
  'man|manes', 'pin|pined', 'rip|riped', 'rip|ripes', 'eros|eroses',
  'sire|sirees', 'scar|scared', 'star|stared', 'rage|ragees',
  'mars|marses', 'spar|spared', 'sell|selles', 'slat|slated',
  'agon|agones', 'loos|looses', 'slop|sloped', 'slim|slimed',
  'char|chared', 'char|chares', 'regal|regaler', 'indorse|indorsees',
  'relocate|relocatees',
]);

export function isTrivialInflection(answer, root) {
  const a = answer.toLowerCase();
  const r = root.toLowerCase();
  if (a === r) return false;
  const key = `${r}|${a}`;
  if (FORCE_TRIVIAL.has(key)) return true;
  if (FORCE_NON_TRIVIAL.has(key)) return false;

  for (const fn of [lem.verb, lem.noun, lem.adjective]) {
    if (fn(a) === r) return true;
  }

  if (r.endsWith('e')) {
    const dropE = r.slice(0, -1);
    const looksLikeInflection = a.startsWith(r) || a === dropE + 'ing';
    if (looksLikeInflection) {
      for (const fn of [lem.verb, lem.noun, lem.adjective]) {
        if (fn(a) + 'e' === r) return true;
      }
    }
  }

  return false;
}
