/** A tiny relative-time formatter for note timestamps ("2 hrs ago"). */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60_000);

  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;

  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ago`;

  const days = Math.round(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return new Date(iso).toLocaleDateString();
}
