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
