/**
 * Helper functions and shared styles for the Hanover Football Fanatics application.
 * This file is designed to have no external dependencies to prevent circular imports.
 */

/**
 * Formats a player's name with their nickname in quotes if available.
 */
 export function formatFullName(user: any): string {
  if (!user) return "";
  const nick = user.nickname ? ` "${user.nickname}"` : "";
  return `${user.firstName}${nick} ${user.lastName}`;
}

/**
 * Calculates total points for a confidence pool based on correct picks and assigned ranks.
 */
export function calculatePoints(picks: any, ranks: any, games: any[]): number {
  let score = 0;
  if (!picks || !ranks || !games) return score;
  
  games.forEach(g => {
    if (g.status === 'final' && g.winner && picks[g.id] === g.winner) {
      score += parseInt(ranks[g.id], 10) || 0;
    }
  });
  return score;
}

/**
 * Determines if a user was eliminated in any previous week of the Survivor pool.
 */
export function wasAlreadyOut(user: any, currentWeek: number, weekStates: any): boolean {
  if (!user) return true;
  if (user.paymentStatus === 'disqualified') return true;
  
  for (let wk = 1; wk < currentWeek; wk++) {
    if (weekStates?.[wk] === 'closed') {
      const s = user.knockoutStatuses?.[wk];
      // A user is out if they lost or failed to make a pick in a closed week
      if (s === 'Loser' || s === 'Loser (No Pick)' || s === 'No Pick' || !s) return true;
    }
  }
  return false;
}

/**
 * Finds the earliest game time and sets lockdown to 1 hour prior.
 */
export function getLockdownTime(gamesList: any[]): number | null {
  if (!gamesList || gamesList.length === 0) return null;
  let earliest = Infinity;
  
  gamesList.forEach(g => {
    if (g && g.date && g.time) {
      const parts = g.date.split(', '); // Expects "Tue, May 12"
      const md = parts[1]; 
      if (md) {
        const t = new Date(`${md}, ${new Date().getFullYear()} ${g.time}`).getTime();
        if (t < earliest) earliest = t;
      }
    }
  });
  
  return earliest === Infinity ? null : earliest - (60 * 60 * 1000); 
}

/**
 * CSS background configuration for the "Football Field" UI theme.
 */
export const fieldBackgroundStyle = {
  backgroundColor: '#1b4d26',
  backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 3px, transparent 3px), 
                    linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.4) 8%, rgba(255,255,255,0.4) calc(8% + 2px), transparent calc(8% + 2px), transparent 92%, rgba(255,255,255,0.4) 92%, rgba(255,255,255,0.4) calc(92% + 2px), transparent calc(92% + 2px)), 
                    repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(0,0,0,0.15) 50px, rgba(0,0,0,0.15) 100px)`,
  backgroundSize: '100% 100px, 100% 100px, 100% 100px',
  backgroundAttachment: 'fixed' as const
};