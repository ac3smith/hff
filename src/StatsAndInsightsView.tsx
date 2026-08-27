import React, { useState, useMemo } from 'react';
import { 
  BarChart2, Target, Zap, Trophy, ShieldAlert, CheckCircle, XCircle, 
  TrendingUp, TrendingDown, Users, Flame, Lock, AlertCircle
} from 'lucide-react';

interface StatsAndInsightsViewProps {
  allUsers: any[];
  globalSettings: any;
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  currentUser: any;
  maxActiveWeeks?: number;
}

export function StatsAndInsightsView({
  allUsers,
  globalSettings,
  selectedWeek,
  setSelectedWeek,
  currentUser,
  maxActiveWeeks = 18
}: StatsAndInsightsViewProps) {
  const [subTab, setSubTab] = useState<'weekly' | 'path' | 'season'>('weekly');
  const [seasonView, setSeasonView] = useState<'Overall' | '1st Half' | '2nd Half'>('Overall');
  const [targetUserId, setTargetUserId] = useState<string>(currentUser?.id || '');

  // Keep target user aligned if currentUser changes
  const activeInspectUser = useMemo(() => {
    return allUsers.find(u => u.id === targetUserId) || currentUser || allUsers[0];
  }, [allUsers, targetUserId, currentUser]);

  const fanaticsUsers = useMemo(() => {
    return (allUsers || []).filter((u: any) => u.playsConfidence);
  }, [allUsers]);

  const currentGames = useMemo(() => {
    return globalSettings?.games?.[selectedWeek] || [];
  }, [globalSettings, selectedWeek]);

  // Lock status check for the selected week
  const selectedWeekState = globalSettings?.weekStates?.[selectedWeek];
  const isSelectedWeekLocked = selectedWeekState === 'closed' || selectedWeekState === 'locked';

  // ==========================================
  // 1. WEEKLY DEEP DIVE & GAME INSIGHTS
  // ==========================================
  const weeklyInsights = useMemo(() => {
    // 🔒 PRIVACY GUARD: Hide weekly pick statistics until the week is locked or closed
    if (!isSelectedWeekLocked || !currentGames.length || !fanaticsUsers.length) {
      return {
        completedGames: [],
        totalPointsPossible: 0,
        totalPointsScored: 0,
        leagueAccuracy: '0.0',
        leagueEfficiency: '0.0',
        gameAnalytics: [],
        poolShifter: null,
        swingGame: null,
        upsetGame: null
      };
    }

    const finalGames = currentGames.filter((g: any) => g.status === 'final' && g.winner);
    let totalPtsPossible = 0;
    let totalPtsScored = 0;
    let totalWins = 0;
    let totalPicksOnFinals = 0;

    const gameStatsMap: Record<number, {
      game: any;
      awayPts: number;
      homePts: number;
      awayPicks: number;
      homePicks: number;
      totalPts: number;
      totalPicks: number;
      ptsLost: number;
    }> = {};

    currentGames.forEach((g: any) => {
      gameStatsMap[g.id] = {
        game: g,
        awayPts: 0,
        homePts: 0,
        awayPicks: 0,
        homePicks: 0,
        totalPts: 0,
        totalPicks: 0,
        ptsLost: 0
      };
    });

    fanaticsUsers.forEach((u: any) => {
      const picks = u.picks?.[selectedWeek] || {};
      const ranks = u.ranks?.[selectedWeek] || {};

      currentGames.forEach((g: any) => {
        const pick = picks[g.id];
        const rank = parseInt(ranks[g.id], 10) || 0;

        if (pick && rank > 0) {
          const stats = gameStatsMap[g.id];
          stats.totalPts += rank;
          stats.totalPicks += 1;

          if (pick === g.away) {
            stats.awayPts += rank;
            stats.awayPicks += 1;
          } else if (pick === g.home) {
            stats.homePts += rank;
            stats.homePicks += 1;
          }

          if (g.status === 'final' && g.winner) {
            totalPicksOnFinals += 1;
            totalPtsPossible += rank;
            if (pick === g.winner) {
              totalWins += 1;
              totalPtsScored += rank;
            } else {
              stats.ptsLost += rank;
            }
          }
        }
      });
    });

    const analyticsList = Object.values(gameStatsMap);

    // High Exposure (Pool-Shifter): Most confidence points committed pool-wide
    const sortedByExposure = [...analyticsList].sort((a, b) => b.totalPts - a.totalPts);
    const poolShifter = sortedByExposure[0] || null;

    // Upset / Chaos Game: Final game where the losing pick cost the pool the most points
    const sortedByPointsLost = [...analyticsList]
      .filter(item => item.game.status === 'final')
      .sort((a, b) => b.ptsLost - a.ptsLost);
    const upsetGame = sortedByPointsLost[0] || null;

    // Swing Game: Game with the most balanced point split (closest to 50/50 division)
    const sortedByDivergence = [...analyticsList].sort((a, b) => {
      if (a.totalPts === 0) return 1;
      if (b.totalPts === 0) return -1;
      const ratioA = Math.abs(0.5 - (a.awayPts / a.totalPts));
      const ratioB = Math.abs(0.5 - (b.awayPts / b.totalPts));
      return ratioA - ratioB;
    });
    const swingGame = sortedByDivergence[0] || null;

    const leagueAccuracy = totalPicksOnFinals > 0 ? ((totalWins / totalPicksOnFinals) * 100).toFixed(1) : '0.0';
    const leagueEfficiency = totalPtsPossible > 0 ? ((totalPtsScored / totalPtsPossible) * 100).toFixed(1) : '0.0';

    return {
      completedGames: finalGames,
      totalPointsPossible: totalPtsPossible,
      totalPointsScored: totalPtsScored,
      leagueAccuracy,
      leagueEfficiency,
      gameAnalytics: analyticsList,
      poolShifter,
      swingGame,
      upsetGame
    };
  }, [currentGames, fanaticsUsers, selectedWeek, isSelectedWeekLocked]);

  // ==========================================
  // 2. PATH TO VICTORY CALCULATIONS
  // ==========================================
  const pathData = useMemo(() => {
    // 🔒 PRIVACY GUARD: Hide live ceilings & unplayed picks until the week is locked or closed
    if (!isSelectedWeekLocked || !currentGames.length || !fanaticsUsers.length) {
      return { userRoster: [], targetAnalysis: null };
    }

    // Calculate live ceiling / floor for each user
    const userRoster = fanaticsUsers.map((u: any) => {
      let currentPts = 0;
      let remainingUnplayedPts = 0;
      const picks = u.picks?.[selectedWeek] || {};
      const ranks = u.ranks?.[selectedWeek] || {};

      currentGames.forEach((g: any) => {
        const pick = picks[g.id];
        const rank = parseInt(ranks[g.id], 10) || 0;

        if (pick && rank > 0) {
          if (g.status === 'final' && g.winner) {
            if (pick === g.winner) currentPts += rank;
          } else {
            // Live or upcoming game — counts toward potential ceiling
            remainingUnplayedPts += rank;
          }
        }
      });

      const ceiling = currentPts + remainingUnplayedPts;
      const floor = currentPts;

      return {
        ...u,
        currentPts,
        remainingUnplayedPts,
        ceiling,
        floor
      };
    });

    // Sort by Current Points descending (then by Ceiling)
    userRoster.sort((a, b) => b.currentPts - a.currentPts || b.ceiling - a.ceiling);

    // Find thresholds
    const leaderFloor = userRoster[0]?.floor || 0;
    const eighthPlaceUser = userRoster[7] || userRoster[userRoster.length - 1];
    const ninthPlaceUser = userRoster[8] || null;

    const eighthPlaceFloor = eighthPlaceUser?.floor || 0;
    const ninthPlaceCeiling = ninthPlaceUser ? ninthPlaceUser.ceiling : 0;

    // Analyze target selected user
    const target = userRoster.find(u => u.id === activeInspectUser?.id) || userRoster[0];
    const targetRankIndex = userRoster.findIndex(u => u.id === target.id);

    let statusTag = 'IN_CONTENTION';
    let statusLabel = 'In Contention for Top 8';
    let statusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

    // Strict Clinch & Elimination Math
    if (target.ceiling < eighthPlaceFloor) {
      statusTag = 'ELIMINATED';
      statusLabel = 'Eliminated from Top 8 Money';
      statusColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    } else if (ninthPlaceUser && target.floor > ninthPlaceCeiling) {
      statusTag = 'CLINCHED_MONEY';
      statusLabel = 'Clinched Top 8 Payout!';
      statusColor = 'bg-[#FFB81C]/20 text-[#FFB81C] border-[#FFB81C]/40';
    } else if (targetRankIndex < 8) {
      statusTag = 'IN_PAYOUT_ZONE';
      statusLabel = `Currently #${targetRankIndex + 1} (In Payout Zone)`;
      statusColor = 'bg-[#FFB81C]/20 text-[#FFB81C] border-[#FFB81C]/40';
    } else {
      statusTag = 'NEEDS_HELP';
      statusLabel = `Currently #${targetRankIndex + 1} (Chasing Top 8)`;
      statusColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }

    // Key unplayed games for this target user
    const keyUnplayedGames = currentGames
      .filter((g: any) => g.status !== 'final')
      .map((g: any) => {
        const myPick = target.picks?.[selectedWeek]?.[g.id];
        const myRank = parseInt(target.ranks?.[selectedWeek]?.[g.id], 10) || 0;
        return { game: g, myPick, myRank };
      })
      .filter(item => item.myPick && item.myRank > 0)
      .sort((a, b) => b.myRank - a.myRank);

    return {
      userRoster,
      leaderFloor,
      eighthPlaceFloor,
      targetAnalysis: {
        target,
        statusTag,
        statusLabel,
        statusColor,
        keyUnplayedGames
      }
    };
  }, [currentGames, fanaticsUsers, selectedWeek, activeInspectUser, isSelectedWeekLocked]);

  // ==========================================
  // 3. SEASON LEADERBOARD
  // ==========================================
  const seasonAnalytics = useMemo(() => {
    if (!globalSettings || !allUsers.length) return [];

    const isFirstHalf = seasonView === '1st Half';
    const isSecondHalf = seasonView === '2nd Half';

    const minWk = isFirstHalf ? 1 : isSecondHalf ? 10 : 1;
    const maxWk = isFirstHalf ? 9 : isSecondHalf ? 18 : (globalSettings.maxActiveWeeks || 18);

    const roster = fanaticsUsers.map((user: any) => {
      let totalPicks = 0;
      let totalWins = 0;
      let totalPtsScored = 0;
      let totalPtsPossible = 0;

      for (let wk = minWk; wk <= maxWk; wk++) {
        // 🔒 PRIVACY GUARD: Skip open/unlocked weeks completely!
        const wkState = globalSettings?.weekStates?.[wk];
        if (wkState !== 'closed' && wkState !== 'locked') continue;

        const wkGames = globalSettings.games?.[wk] || [];
        const uPicks = user.picks?.[wk] || {};
        const uRanks = user.ranks?.[wk] || {};

        wkGames.forEach((g: any) => {
          // Evaluate ANY game that is marked final
          if (g.status === 'final' && g.winner) {
            const pick = uPicks[g.id];
            const rank = parseInt(uRanks[g.id], 10) || 0;

            if (pick && rank > 0) {
              totalPicks++;
              totalPtsPossible += rank;
              if (pick === g.winner) {
                totalWins++;
                totalPtsScored += rank;
              }
            }
          }
        });
      }

      const accuracy = totalPicks > 0 ? (totalWins / totalPicks) * 100 : 0;
      const efficiency = totalPtsPossible > 0 ? (totalPtsScored / totalPtsPossible) * 100 : 0;

      return {
        ...user,
        totalPicks,
        totalWins,
        totalPtsScored,
        totalPtsPossible,
        accuracy: accuracy.toFixed(1),
        efficiency: efficiency.toFixed(1)
      };
    });

    // Sort by Efficiency (Point Capture %) descending
    roster.sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency) || parseFloat(b.accuracy) - parseFloat(a.accuracy));

    return roster;
  }, [allUsers, fanaticsUsers, globalSettings, seasonView]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* HEADER BAR */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border-b-8 border-[#FFB81C] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart2 className="w-8 h-8 text-[#FFB81C]" />
            <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter">
              Analytics & Game Intelligence
            </h2>
          </div>
          <p className="text-slate-400 font-bold text-xs sm:text-sm uppercase tracking-widest">
            Evaluated strictly on official settled games
          </p>
        </div>

        {/* SUB-NAVIGATION TABS */}
        <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setSubTab('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'weekly' ? 'bg-[#FFB81C] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" /> Weekly Deep Dive
          </button>
          <button
            onClick={() => setSubTab('path')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'path' ? 'bg-[#FFB81C] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" /> Path To Victory
          </button>
          <button
            onClick={() => setSubTab('season')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'season' ? 'bg-[#FFB81C] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" /> Season Stats
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 1: WEEKLY DEEP DIVE                    */}
      {/* ========================================== */}
      {subTab === 'weekly' && (
        <div className="space-y-6">
          {/* WEEK SELECTOR BAR */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Select Week:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-black italic text-lg uppercase outline-none focus:border-[#FFB81C] cursor-pointer"
              >
                {Array.from({ length: maxActiveWeeks }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>
                    {w <= 3 ? `Preseason Week ${w}` : `Week ${w - 3}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs font-bold text-slate-500">
              Completed Games Evaluated: <span className="font-black text-slate-900">{weeklyInsights.completedGames.length} / {currentGames.length}</span>
            </div>
          </div>

          {!isSelectedWeekLocked ? (
            <div className="bg-slate-900 text-white p-12 rounded-3xl text-center border-b-8 border-[#FFB81C] shadow-xl">
              <Lock className="w-12 h-12 text-[#FFB81C] mx-auto mb-3 animate-pulse" />
              <h3 className="text-3xl font-black italic uppercase">Weekly Insights Locked</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">
                Picks for Week {selectedWeek <= 3 ? `Preseason W${selectedWeek}` : selectedWeek - 3} are hidden until kickoff to ensure fair play.
              </p>
            </div>
          ) : (
            <>
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">League Game Accuracy (Finals Only)</div>
                  <div className="text-4xl font-black italic text-slate-900">{weeklyInsights.leagueAccuracy}%</div>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Accuracy on settled outcomes</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">League Point Capture Efficiency</div>
                  <div className="text-4xl font-black italic text-[#FFB81C]">{weeklyInsights.leagueEfficiency}%</div>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    {weeklyInsights.totalPointsScored} / {weeklyInsights.totalPointsPossible} PTS Captured
                  </p>
                </div>
              </div>

              {/* GAME EXPOSURE HIGHLIGHT CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* POOL SHIFTER */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 border-t-4 border-[#FFB81C] shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-[#FFB81C] tracking-widest">High Exposure (Pool Shifter)</span>
                      <Flame className="w-4 h-4 text-[#FFB81C]" />
                    </div>
                    <h4 className="text-lg font-black italic uppercase">
                      {weeklyInsights.poolShifter ? `${weeklyInsights.poolShifter.game.awayAbbr} @ ${weeklyInsights.poolShifter.game.homeAbbr}` : 'N/A'}
                    </h4>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Most confidence points assigned pool-wide ({weeklyInsights.poolShifter?.totalPts || 0} PTS).
                    </p>
                  </div>
                </div>

                {/* SWING GAME */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 border-t-4 border-sky-400 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-sky-400 tracking-widest">The Swing Game</span>
                      <Zap className="w-4 h-4 text-sky-400" />
                    </div>
                    <h4 className="text-lg font-black italic uppercase">
                      {weeklyInsights.swingGame ? `${weeklyInsights.swingGame.game.awayAbbr} @ ${weeklyInsights.swingGame.game.homeAbbr}` : 'N/A'}
                    </h4>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Closest point division across the league.
                    </p>
                  </div>
                </div>

                {/* UPSET / CHAOS GAME */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 border-t-4 border-rose-500 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Chaos / Upset Minefield</span>
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                    </div>
                    <h4 className="text-lg font-black italic uppercase">
                      {weeklyInsights.upsetGame ? `${weeklyInsights.upsetGame.game.awayAbbr} @ ${weeklyInsights.upsetGame.game.homeAbbr}` : 'N/A'}
                    </h4>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Cost the pool the most points ({weeklyInsights.upsetGame?.ptsLost || 0} PTS lost).
                    </p>
                  </div>
                </div>
              </div>

              {/* DETAILED GAME BREAKDOWN TABLE */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-lg font-black italic uppercase text-slate-900">Weekly Game Exposure Breakdown</h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">Shows how the league split picks and confidence points per game</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]">
                        <th className="p-4">Matchup</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Away Team Exposure</th>
                        <th className="p-4 text-center">Home Team Exposure</th>
                        <th className="p-4 text-right">Total Pool Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {weeklyInsights.gameAnalytics.map((item) => {
                        const g = item.game;
                        const awayPct = item.totalPicks > 0 ? Math.round((item.awayPicks / item.totalPicks) * 100) : 0;
                        const homePct = item.totalPicks > 0 ? Math.round((item.homePicks / item.totalPicks) * 100) : 0;

                        return (
                          <tr key={g.id} className="hover:bg-slate-50 font-bold">
                            <td className="p-4">
                              <span className="font-black text-slate-900 uppercase text-base">{g.awayAbbr || g.away} @ {g.homeAbbr || g.home}</span>
                              <span className="block text-[10px] text-slate-400 font-bold">{g.date} • {g.time}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                                g.status === 'final' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {g.status === 'final' ? `Final (${g.winner})` : g.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="text-xs font-black text-slate-800">{g.awayAbbr}: {awayPct}% ({item.awayPts} PTS)</div>
                              <div className="text-[10px] text-slate-400">{item.awayPicks} picks</div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="text-xs font-black text-slate-800">{g.homeAbbr}: {homePct}% ({item.homePts} PTS)</div>
                              <div className="text-[10px] text-slate-400">{item.homePicks} picks</div>
                            </td>
                            <td className="p-4 text-right font-black italic text-base text-[#FFB81C]">
                              {item.totalPts} PTS
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: PATH TO VICTORY                     */}
      {/* ========================================== */}
      {subTab === 'path' && (
        <div className="space-y-6">
          {!isSelectedWeekLocked ? (
            <div className="bg-slate-900 text-white p-12 rounded-3xl text-center border-b-8 border-[#FFB81C] shadow-xl">
              <Lock className="w-12 h-12 text-[#FFB81C] mx-auto mb-3 animate-pulse" />
              <h3 className="text-3xl font-black italic uppercase">Path To Victory Locked</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">
                Live mathematical standing matrices and ceilings unlock once Week {selectedWeek <= 3 ? `Preseason W${selectedWeek}` : selectedWeek - 3} kicks off.
              </p>
            </div>
          ) : (
            <>
              {/* INSPECTION TARGET SELECTOR */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Inspect Player's Path:</span>
                  <select
                    value={activeInspectUser?.id || ''}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-black italic text-base uppercase outline-none focus:border-[#FFB81C] cursor-pointer"
                  >
                    {pathData.userRoster.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.currentPts} PTS)
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Top 8 Threshold Floor: <span className="font-black text-slate-900">{pathData.eighthPlaceFloor} PTS</span>
                </span>
              </div>

              {/* PERSONALIZED PATH STATUS CARD */}
              {pathData.targetAnalysis && (
                <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border-t-8 border-[#FFB81C]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-2xl font-black italic uppercase text-white flex items-center gap-2">
                        <Target className="w-6 h-6 text-[#FFB81C]" />
                        Path Analysis for {pathData.targetAnalysis.target.firstName} {pathData.targetAnalysis.target.lastName}
                      </h3>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">
                        Evaluates mathematical ceilings against payout thresholds
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider border ${pathData.targetAnalysis.statusColor}`}>
                      {pathData.targetAnalysis.statusLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Current Points (Floor)</span>
                      <span className="text-3xl font-black italic text-white">{pathData.targetAnalysis.target.floor} PTS</span>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Unplayed Points Remaining</span>
                      <span className="text-3xl font-black italic text-sky-400">+{pathData.targetAnalysis.target.remainingUnplayedPts} PTS</span>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Max Mathematical Ceiling</span>
                      <span className="text-3xl font-black italic text-[#FFB81C]">{pathData.targetAnalysis.target.ceiling} PTS</span>
                    </div>
                  </div>
                </div>
              )}

              {/* KEY UNPLAYED GAMES FOR TARGET */}
              {pathData.targetAnalysis?.keyUnplayedGames.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-black italic uppercase text-slate-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#FFB81C]" /> Essential High-Stakes Picks Needed
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {pathData.targetAnalysis.keyUnplayedGames.map(({ game, myPick, myRank }: any) => (
                      <div key={game.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase text-slate-400">{game.awayAbbr} @ {game.homeAbbr}</span>
                          <span className="text-xs font-black text-[#FFB81C] bg-slate-900 px-2 py-0.5 rounded border border-slate-700">+{myRank} PTS</span>
                        </div>
                        <div className="text-sm font-black text-slate-900">
                          Pick: <span className="text-indigo-600">{myPick}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-2">{game.date} • {game.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LEADERBOARD CEILING VS FLOOR TABLE */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-lg font-black italic uppercase text-slate-900">Live Mathematical Standing Matrix</h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">Top 8 players receive payout at week closure</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]">
                        <th className="p-4 italic">Rank</th>
                        <th className="p-4">Player</th>
                        <th className="p-4 text-center">Current Points (Floor)</th>
                        <th className="p-4 text-center">Unplayed PTS</th>
                        <th className="p-4 text-right">Max Ceiling</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {pathData.userRoster.map((u, idx) => {
                        const isTop8 = idx < 8;
                        const isTarget = u.id === activeInspectUser?.id;

                        return (
                          <tr key={u.id} className={`font-bold transition-colors ${
                            isTarget ? 'bg-[#FFB81C]/20 border-l-4 border-[#FFB81C]' : isTop8 ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                          }`}>
                            <td className="p-4 font-black italic text-slate-400">#{idx + 1}</td>
                            <td className="p-4 font-black text-slate-900">
                              {u.firstName} {u.lastName}
                              {isTop8 && <span className="ml-2 text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Top 8</span>}
                            </td>
                            <td className="p-4 text-center font-mono text-slate-900 text-base">{u.currentPts}</td>
                            <td className="p-4 text-center font-mono text-sky-600">+{u.remainingUnplayedPts}</td>
                            <td className="p-4 text-right font-black italic text-base text-[#FFB81C]">{u.ceiling} PTS</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: SEASON LEADERBOARD                  */}
      {/* ========================================== */}
      {subTab === 'season' && (
        <div className="space-y-6">
          {/* SEASON PERIOD FILTER */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-b-8 border-[#FFB81C]">
            <div>
              <h3 className="text-xl font-black italic uppercase text-white">Season Point Capture Standings</h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">Calculated exclusively on final, official games</p>
            </div>
            <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-md">
              {(['Overall', '1st Half', '2nd Half'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setSeasonView(v)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    seasonView === v ? 'bg-[#FFB81C] text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* STANDINGS TABLE */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]">
                    <th className="p-4 italic">Rank</th>
                    <th className="p-4">Player</th>
                    <th className="p-4 text-center">Final Games Won</th>
                    <th className="p-4 text-center">Game Win %</th>
                    <th className="p-4 text-center">Points Earned / Possible</th>
                    <th className="p-4 text-right">Point Capture Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {seasonAnalytics.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors font-bold">
                      <td className="p-4 font-black italic text-slate-400 text-base">#{idx + 1}</td>
                      <td className="p-4 font-black text-slate-900">{u.firstName} {u.lastName}</td>
                      <td className="p-4 text-center text-slate-700">{u.totalWins} / {u.totalPicks}</td>
                      <td className="p-4 text-center font-mono text-slate-800">{u.accuracy}%</td>
                      <td className="p-4 text-center text-slate-700">{u.totalPtsScored} / {u.totalPtsPossible}</td>
                      <td className="p-4 text-right font-black italic text-base text-[#FFB81C]">{u.efficiency}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}