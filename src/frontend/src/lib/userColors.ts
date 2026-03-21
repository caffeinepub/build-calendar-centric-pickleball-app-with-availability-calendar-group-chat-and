/**
 * Deterministic per-user accent colors based on a hash of the username.
 * Colors are chosen from a palette that works well on dark backgrounds.
 */
const USER_COLOR_PALETTE = [
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#f472b6", // pink-400
  "#a78bfa", // violet-400
  "#fb923c", // orange-400
  "#22d3ee", // cyan-400
  "#facc15", // yellow-400
  "#f87171", // red-400
  "#4ade80", // green-400
  "#c084fc", // purple-400
  "#38bdf8", // sky-400
  "#fb7185", // rose-400
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getUserColor(username: string): string {
  if (!username) return USER_COLOR_PALETTE[0];
  return USER_COLOR_PALETTE[hashString(username) % USER_COLOR_PALETTE.length];
}
