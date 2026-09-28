import { getCanonicalTeamCode } from '../App';

export interface Game {
  id: string | number;
  home: string;
  away: string;
  status: string;
  winner?: string | null;
  [key: string]: any;
}

// Checks if a player qualifies as a deadbeat for a given week
export function isUserDeadbeat(user: any, week: number, weekGames: Game[]): boolean {
  if (!user || !user.playsConfidence) return false;
  const userRanks = user.ranks?.[week] || {};
  const userTBStr = String(user.tiebreakers?.[week] ?? '').trim();

  if (userTBStr === '0') return true;

  if (weekGames.length > 0) {
    const allRanksAreFive = weekGames.every((g) => {
      const r = parseInt(String(userRanks[g.id] || userRanks[String(g.id)] || 0), 10);
      return r === 5;
    });
    if (allRanksAreFive) return true;
  }

  return false;
}

// Dynamically resolves picks & ranks for a user, auto-filling Home Team + 5 PTS if Deadbeat
export function getResolvedUserPicksAndRanks(user: any, week: number, weekGames: Game[]) {
  const userPicks = { ...(user.picks?.[week] || {}) };
  const userRanks = { ...(user.ranks?.[week] || {}) };
  const isDB = isUserDeadbeat(user, week, weekGames);

  if (isDB) {
    weekGames.forEach((g) => {
      userPicks[g.id] = g.home;
      userRanks[g.id] = 5;
    });
  }

  return { userPicks, userRanks, isDeadbeat: isDB };
}