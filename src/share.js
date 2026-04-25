const GREEN = '\u{1F7E9}';
const YELLOW = '\u{1F7E8}';

export function generateShareText({
  mode,
  date,
  score,
  longestWord,
  totalTimeMs,
  history = [],
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
  const footer = longestLen
    ? `Longest ${longestLen} · Time ${time}`
    : `Time ${time}`;

  const sections = [header];
  if (rows.length > 0) sections.push('', ...rows);
  sections.push('', footer);
  return sections.join('\n');
}

function formatTime(ms) {
  const totalSec = Math.floor((ms || 0) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
