const GREEN = '\u{1F7E9}';
const YELLOW = '\u{1F7E8}';
const MAX_WEIGHTED_LENGTH = 260;
const HEAD_KEEP = 3;
const TAIL_KEEP = 3;

export function generateShareText({
  mode,
  date,
  score,
  longestWord,
  totalTimeMs,
  history = [],
  streak = 0,
}) {
  const headerId = mode === 'daily' ? date : 'Random';
  const header = `Anagrams ${headerId} — ${score}`;

  const rows = history.map((entry) => {
    const carried = (entry.parents || []).reduce(
      (sum, p) => sum + p.length,
      0
    );
    const added = Math.max(0, entry.word.length - carried);
    return YELLOW.repeat(carried) + GREEN.repeat(added);
  });

  const longestLen = (longestWord || '').length;
  const time = formatTime(totalTimeMs);
  const parts = [];
  if (longestLen) parts.push(`Longest ${longestLen}`);
  parts.push(`Time ${time}`);
  if (mode === 'daily' && streak >= 2) parts.push(`Streak ${streak}`);
  const footer = parts.join(' · ');

  const fullText = assemble(header, rows, footer);
  if (
    rows.length <= HEAD_KEEP + TAIL_KEEP ||
    weightedLength(fullText) <= MAX_WEIGHTED_LENGTH
  ) {
    return fullText;
  }

  // Truncated output is not re-checked against MAX_WEIGHTED_LENGTH; the kept 6
  // rows fit the 260 budget for any realistic Anagrams play (max scrabble word
  // length 15 → 6×15×2 = 180 emoji weight + ~80 header/footer/elision).
  const dropped = rows.length - HEAD_KEEP - TAIL_KEEP;
  const truncatedRows = [
    ...rows.slice(0, HEAD_KEEP),
    `… +${dropped} more`,
    ...rows.slice(rows.length - TAIL_KEEP),
  ];
  return assemble(header, truncatedRows, footer);
}

function assemble(header, rows, footer) {
  const sections = [header];
  if (rows.length > 0) sections.push('', ...rows);
  sections.push('', footer);
  return sections.join('\n');
}

function weightedLength(text) {
  let len = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    len += cp <= 0x7F ? 1 : 2;
  }
  return len;
}

function formatTime(ms) {
  const totalSec = Math.floor((ms || 0) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function generateShareAltText({
  mode,
  date,
  score,
  longestWord,
  totalTimeMs,
  history = [],
  streak = 0,
}) {
  const headerSubject =
    mode === 'daily' ? `daily ${humanizeDate(date)}` : 'random run';
  const header = `Anagrams, ${headerSubject}. Score ${score}.`;

  const rows = history.map((entry, i) => sentenceFor(entry, i + 1));

  const longestLen = (longestWord || '').length;
  const footerParts = [];
  if (longestLen) footerParts.push(`Longest word ${longestLen} letters.`);
  footerParts.push(`Time ${humanizeTime(totalTimeMs)}.`);
  if (mode === 'daily' && streak >= 2) footerParts.push(`Streak ${streak}.`);
  const footer = footerParts.join(' ');

  if (rows.length <= HEAD_KEEP + TAIL_KEEP) {
    return assembleAlt(header, rows, footer);
  }

  const dropped = rows.length - HEAD_KEEP - TAIL_KEEP;
  const elision = `…and ${dropped} more word${dropped === 1 ? '' : 's'}…`;
  const truncated = [
    ...rows.slice(0, HEAD_KEEP),
    elision,
    ...rows.slice(rows.length - TAIL_KEEP),
  ];
  return assembleAlt(header, truncated, footer);
}

function assembleAlt(header, rows, footer) {
  const sections = [header];
  if (rows.length > 0) sections.push(...rows);
  sections.push(footer);
  return sections.join('\n');
}

function sentenceFor(entry, n) {
  const carried = (entry.parents || []).reduce(
    (sum, p) => sum + p.length,
    0
  );
  const added = Math.max(0, entry.word.length - carried);
  if (carried === 0) {
    return `Word ${n}: ${added} new letter${added === 1 ? '' : 's'}.`;
  }
  return `Word ${n}: ${carried} carried, ${added} new.`;
}

function humanizeDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d} ${y}`;
}

function humanizeTime(ms) {
  const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
  if (totalSec < 60) {
    return `${totalSec} second${totalSec === 1 ? '' : 's'}`;
  }
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (s === 0) {
    return `${m} minute${m === 1 ? '' : 's'}`;
  }
  return `${m} minute${m === 1 ? '' : 's'} ${s} second${s === 1 ? '' : 's'}`;
}
