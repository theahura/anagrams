export function generateShareText({
  mode,
  date,
  score,
  longestWord,
  totalTimeMs,
}) {
  const longestLen = (longestWord || '').length;
  const mins = Math.floor(totalTimeMs / 1000 / 60);
  const secs = Math.floor((totalTimeMs / 1000) % 60);
  const time = `${mins}:${secs.toString().padStart(2, '0')}`;
  const header = mode === 'daily' ? `Anagrams ${date}` : 'Anagrams Random';
  return `${header}\nScore: ${score}\nLongest: ${longestLen} letters\nTime: ${time}`;
}
