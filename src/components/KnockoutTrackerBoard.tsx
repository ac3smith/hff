import React, { useMemo } from 'react';
import { Skull, DollarSign } from 'lucide-react';

interface KnockoutTrackerBoardProps {
  data: any[];
  week: number;
  allGames: any;
  isLocked: boolean;
  adminForceReveal: boolean;
  currentUser: any;
  globalSettings: any;
  getCanonicalTeamCode: (input: string) => string;
  isUserEliminatedThisWeek: (user: any, week: number, games: any[]) => boolean;
}

export function KnockoutTrackerBoard({
  data,
  week,
  allGames,
  isLocked,
  adminForceReveal,
  currentUser,
  globalSettings,
  getCanonicalTeamCode,
  isUserEliminatedThisWeek
}: KnockoutTrackerBoardProps) {
  const maxWeeks = globalSettings?.maxActiveWeeks || 18;
  const startWeek = globalSettings?.knockoutStartWeek || 1;
  const activeWeeks = Array.from({ length: Math.max(1, maxWeeks - startWeek + 1) }, (_, i) => startWeek + i);

  const sortedGridData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return [...data].map((user: any) => {
      if (!user) return null;
      let eliminatedWeek: number | null = null;

      for (let wk = startWeek; wk <= week; wk++) {
        const wkGames = globalSettings?.games?.[wk] || globalSettings?.games?.[String(wk)] || (wk === week ? allGames : []) || [];
        const isOutThisWk = isUserEliminatedThisWeek(user, wk, wkGames);
        const isAdminOut = globalSettings?.knockoutEliminations?.[wk]?.includes(user.id);
        const isProfileOut = user.knockoutEliminatedWeek && user.knockoutEliminatedWeek <= wk;
        const wkStatus = user.knockoutStatuses?.[wk] || user.knockoutStatuses?.[String(wk)];
        const isStatusOut = ['Loser', 'Loser (No Pick)', 'Knocked Out'].includes(wkStatus);

        if (isOutThisWk || isAdminOut || isProfileOut || isStatusOut) {
          eliminatedWeek = wk;
          break;
        }
      }

      if (user.paymentStatus === 'disqualified') {
        eliminatedWeek = eliminatedWeek || 1;
      }

      return {
        ...user,
        isAlive: eliminatedWeek === null,
        eliminatedWeek
      };
    }).filter(Boolean).sort((a: any, b: any) => {
      if (a.isAlive && !b.isAlive) return -1;
      if (!a.isAlive && b.isAlive) return 1;
      if (b.eliminatedWeek !== a.eliminatedWeek) {
        return (b.eliminatedWeek || 0) - (a.eliminatedWeek || 0);
      }
      return String(a.lastName || '').localeCompare(String(b.lastName || ''));
    });
  }, [data, maxWeeks, globalSettings, week, allGames, startWeek, isUserEliminatedThisWeek]);

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden border-t-8 border-red-600 max-w-full mx-auto">
      <div className="p-4 sm:p-6 bg-slate-50 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-black italic uppercase text-slate-900 flex items-center gap-2">
            <Skull className="w-6 h-6 text-red-600" /> Knockout Results
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Full season ledger &bull; Longest survivors listed on top
          </p>
        </div>
      </div>

      <div className="w-full overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white uppercase border-b-4 border-[#FFB81C]">
              <th className="p-3 sticky left-0 bg-slate-900 z-30 w-44 sm:w-56 text-xs sm:text-sm italic font-black">Player</th>
              <th className="p-2 text-center w-20 text-[10px] sm:text-xs font-black italic text-[#FFB81C] border-r border-slate-800">Status</th>
              {activeWeeks.map((wk) => (
                <th key={wk} className={`p-2 text-center text-[10px] sm:text-xs font-black italic border-r border-slate-800 min-w-[65px] ${wk === week ? 'bg-amber-500/20 text-[#FFB81C]' : 'text-slate-300'}`}>
                  Wk {wk}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedGridData.map((user: any) => {
              const isMe = currentUser && user.id === currentUser.id;
              const isUnpaid = user.paymentStatus === 'unpaid' || user.paymentStatus === 'disqualified';

              return (
                <tr key={user.id} className={isMe ? 'bg-[#FFB81C]/20 font-black' : 'hover:bg-slate-50'}>
                  <td className="p-2.5 sm:p-3 sticky left-0 z-20 bg-white border-r-2 border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {user.firstName || ''} {user.lastName || ''}
                      </span>
                      {isUnpaid && <DollarSign className="w-3.5 h-3.5 text-red-600 shrink-0" title="Unpaid / Disqualified" />}
                    </div>
                  </td>
                  <td className="p-2 text-center border-r border-slate-100">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${user.isAlive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {user.isAlive ? 'Alive' : 'Out'}
                    </span>
                  </td>
                  {activeWeeks.map((wk) => {
                    const rawPick = user.knockoutPicks?.[wk] || user.knockoutPicks?.[String(wk)];
                    const canonicalPick = getCanonicalTeamCode(rawPick);

                    // Look up historical game data for week `wk`
                    const weekGamesList = globalSettings?.games?.[wk] || globalSettings?.games?.[String(wk)] || (wk === week ? allGames : []) || [];
                    const targetGame = weekGamesList.find((g: any) => {
                      const awayCode = getCanonicalTeamCode(g.away);
                      const homeCode = getCanonicalTeamCode(g.home);
                      return awayCode === canonicalPick || homeCode === canonicalPick;
                    });

                    const savedStatus = user.knockoutStatuses?.[wk] || user.knockoutStatuses?.[String(wk)];
                    const isGameFinal = String(targetGame?.status || '').toLowerCase() === 'final';
                    const winnerCode = targetGame?.winner ? getCanonicalTeamCode(targetGame.winner) : '';

                    const wasOutBefore = user.eliminatedWeek !== null && wk > user.eliminatedWeek;
                    const isFutureWeek = wk > week;
                    const isWinner = savedStatus === 'Winner' || (isGameFinal && winnerCode && winnerCode === canonicalPick);
                    const isLoser = ['Loser', 'Loser (No Pick)', 'Knocked Out'].includes(savedStatus) || 
                                    (isGameFinal && winnerCode && (winnerCode === 'TIE' || winnerCode !== canonicalPick));

                    let cellBg = 'bg-slate-100 text-slate-700 font-bold';

                    if (wasOutBefore || isFutureWeek) {
                      cellBg = 'bg-transparent';
                    } else if (isLoser) {
                      cellBg = 'bg-rose-600 text-white font-black';
                    } else if (isWinner) {
                      cellBg = 'bg-emerald-600 text-white font-black shadow-sm';
                    } else if (rawPick) {
                      cellBg = 'bg-amber-500/10 text-amber-900 border border-amber-300 font-black';
                    }

                    return (
                      <td key={wk} className="p-1 text-center border-r border-slate-100 text-xs font-black">
                        {wasOutBefore || isFutureWeek || (!rawPick && !isWeekLocked && !adminForceReveal) ? (
                          <span className="text-[10px] font-bold text-slate-300 block text-center">—</span>
                        ) : (
                          <div className={`py-1 px-1 rounded uppercase text-[10px] sm:text-xs truncate ${cellBg}`}>
                            {rawPick ? canonicalPick : 'NO PICK'}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}