import React, { useState, useMemo } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, DollarSign, X } from 'lucide-react';

interface CloseWeekPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCloseWeek: (finalData: any) => Promise<void>;
  selectedWeek: number;
  games: any[];
  allUsers: any[];
  globalSettings?: any;
  payoutStructure?: number[];
}

// 🏈 DYNAMIC PERCENTAGE-BASED FANATICS PAYOUT ENGINE
function calculateFanaticsPayouts(numPlayers: number, totalWeeks = 18) {
  const percentages = [0.22, 0.19, 0.16, 0.13, 0.09, 0.08, 0.07, 0.06];

  const roundAndBalance = (pot: number) => {
    if (pot <= 0) return Array(8).fill(0);
    const raw = percentages.map(p => Math.round(pot * p));
    const currentSum = raw.reduce((sum, v) => sum + v, 0);
    const diff = Math.round(pot) - currentSum;
    if (diff !== 0) raw[0] += diff; // Balance rounding variance to 1st place
    return raw;
  };

  const weeklyPot = numPlayers * 7.0;
  const weeklyGross = roundAndBalance(weeklyPot);
  return { weeklyPot, weeklyGross };
}

function calculateTiedPayouts(sortedUsers: any[], grossPayoutMatrix: number[]) {
  let i = 0;
  while (i < sortedUsers.length) {
    let j = i;
    while (
      j < sortedUsers.length &&
      sortedUsers[j].score === sortedUsers[i].score &&
      sortedUsers[j].tbDiff === sortedUsers[i].tbDiff
    ) {
      j++;
    }

    const tiedCount = j - i;
    const startRank = i + 1;

    let combinedPool = 0;
    for (let r = startRank; r < startRank + tiedCount; r++) {
      if (r <= 8) {
        combinedPool += grossPayoutMatrix[r - 1] || 0;
      }
    }

    const splitGross = tiedCount > 0 ? Math.round(combinedPool / tiedCount) : 0;

    for (let k = i; k < j; k++) {
      sortedUsers[k].rank = startRank;
      sortedUsers[k].grossPayout = splitGross;
      sortedUsers[k].netEarnings = splitGross > 0 ? splitGross - 12 : -12;
      sortedUsers[k].isTied = tiedCount > 1;
    }

    i = j;
  }

  return sortedUsers;
}

export function CloseWeekPreviewModal({
  isOpen,
  onClose,
  onConfirmCloseWeek,
  selectedWeek,
  games,
  allUsers,
  globalSettings
}: CloseWeekPreviewModalProps) {
  if (!isOpen) return null;

  // 1. Find last game automatically & calculate total points for tiebreaker
  const tbGame = (games || []).find((g: any) => g.isTiebreaker) || (games || [])[games.length - 1];
  const autoCalculatedTotal = tbGame && tbGame.status === 'final'
    ? (parseInt(tbGame.awayScore || '0', 10) + parseInt(tbGame.homeScore || '0', 10))
    : 0;

  const [overrideTBScore, setOverrideTBScore] = useState<number>(autoCalculatedTotal);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Compute accurate confidence points and dynamic payouts for each player
  const top8WithPayouts = useMemo(() => {
    if (!allUsers || !games || games.length === 0) return [];

    // Calculate active non-disqualified confidence players count matching Financials tab
    const activeConfidenceUsers = (allUsers || []).filter((u: any) => 
      Boolean(u?.playsConfidence) && String(u?.paymentStatus) !== 'disqualified'
    );
    const activeCount = activeConfidenceUsers.length;

    // Derive exact weekly gross payout matrix (e.g., [89, 77, 65, 53, 37, 32, 28, 24] for 58 players)
    const { weeklyGross } = calculateFanaticsPayouts(activeCount, globalSettings?.maxActiveWeeks || 18);

    const standardMaxPossible = (games || []).reduce((sum: number, _: any, idx: number) => sum + (idx + 1), 0);

    const processed = activeConfidenceUsers.map((u: any) => {
      let score = u.weeklyConfidenceHistory?.[selectedWeek];

      if (score === undefined || score === null) {
        const userPicks = u.picks?.[selectedWeek] || {};
        const userRanks = u.ranks?.[selectedWeek] || {};

        const isDeadbeat = u.tiebreakers?.[selectedWeek] === '0' || 
          (games.length > 0 && games.every((g: any) => parseInt(userRanks[g.id] || 0, 10) === 5));

        const userMaxPossible = isDeadbeat ? games.length * 5 : standardMaxPossible;

        const pointsLost = games.reduce((lost: number, g: any) => {
          const pick = userPicks[g.id];
          const rank = parseInt(userRanks[g.id] || 0, 10);
          if (!pick || !rank) return lost;

          if (g.status === 'final' && g.winner && pick !== g.winner) {
            return lost + rank;
          }
          return lost;
        }, 0);

        score = userMaxPossible - pointsLost;
      }

      const tbGuess = parseInt(u.tiebreakers?.[selectedWeek] || '0', 10);
      const tbDiff = Math.abs(tbGuess - overrideTBScore);

      return {
        ...u,
        score: Number(score) || 0,
        tbGuess,
        tbDiff,
        firstName: u.firstName || '',
        lastName: u.lastName || ''
      };
    });

    // Primary Sort: Score Descending -> Secondary Sort: TB Diff Ascending -> Alphabetical
    processed.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tbDiff !== b.tbDiff) return a.tbDiff - b.tbDiff;
      return String(a.lastName || '').localeCompare(String(b.lastName || ''));
    });

    // Apply Equal Tie-Split Payout Engine
    calculateTiedPayouts(processed, weeklyGross);

    return processed.map((u: any) => ({
      ...u,
      calculatedRank: u.rank || 1,
      currentPts: u.score,
      absDiff: u.tbDiff,
      calculatedPayout: u.grossPayout || 0,
      isTied: Boolean(u.isTied),
      tiedCount: u.isTied ? processed.filter(x => x.score === u.score && x.tbDiff === u.tbDiff).length : 1
    })).slice(0, 8);

  }, [allUsers, games, selectedWeek, overrideTBScore, globalSettings]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmCloseWeek({
        week: selectedWeek,
        finalTiebreakerScore: overrideTBScore,
        winners: top8WithPayouts
      });
      onClose();
    } catch (err) {
      console.error("Failed to close week:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 text-white border-2 border-[#FFB81C] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#FFB81C]" />
            <div>
              <h3 className="text-xl font-black italic uppercase">Close Week {selectedWeek} Preview</h3>
              <p className="text-xs text-slate-400 font-bold">Review rankings, tiebreaker proximity, and payout splits before locking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TIEBREAKER VERIFICATION CARD */}
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase text-[#FFB81C] tracking-widest block">Tiebreaker Game</span>
            <div className="text-sm font-black text-white uppercase">
              {tbGame ? `${tbGame.awayName || tbGame.away} @ ${tbGame.homeName || tbGame.home}` : 'Last Game'}
            </div>
            <p className="text-xs text-slate-400">Auto-calculated final total points</p>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-300">Actual Total:</label>
            <input
              type="number"
              value={overrideTBScore}
              onChange={(e) => setOverrideTBScore(Number(e.target.value))}
              className="bg-slate-900 border-2 border-[#FFB81C] rounded-xl px-3 py-1.5 font-mono font-black text-center text-lg w-24 text-white outline-none"
            />
          </div>
        </div>

        {/* TOP STANDINGS & PAYOUT PREVIEW TABLE */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Top Standings & Financials Payouts</h4>
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800 text-slate-400 font-black uppercase text-[10px] border-b border-slate-700">
                  <th className="p-3">Rank</th>
                  <th className="p-3">Player</th>
                  <th className="p-3 text-center">PTS</th>
                  <th className="p-3 text-center">TB Guess (Diff)</th>
                  <th className="p-3 text-right">Calculated Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-bold">
                {top8WithPayouts.map((u) => (
                  <tr key={u.id} className={u.isTied ? 'bg-amber-500/10' : ''}>
                    <td className="p-3 italic text-slate-400">#{u.calculatedRank}</td>
                    <td className="p-3 text-white font-black">
                      {u.firstName} {u.lastName}
                      {u.isTied && (
                        <span className="ml-2 text-[8px] bg-amber-500 text-slate-900 font-black px-1.5 py-0.5 rounded uppercase">
                          Split ({u.tiedCount}-way)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center text-slate-200">{u.currentPts}</td>
                    <td className="p-3 text-center font-mono">
                      {u.tbGuess} <span className="text-slate-400 text-[10px]">({u.absDiff > 0 ? `±${u.absDiff}` : 'Exact!'})</span>
                    </td>
                    <td className="p-3 text-right font-black text-[#FFB81C]">
                      ${u.calculatedPayout}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase rounded-2xl text-xs transition-colors"
          >
            Cancel & Make Edits
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-[#FFB81C] hover:bg-amber-400 text-slate-900 font-black uppercase rounded-2xl text-xs transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Locking Week...' : 'Confirm & Finalize Week'}
          </button>
        </div>

      </div>
    </div>
  );
}