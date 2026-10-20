import React, { useState, useMemo } from 'react';
import { 
  BarChart2, Target, Zap, Trophy, ShieldAlert, CheckCircle, XCircle, 
  TrendingUp, TrendingDown, Users, Flame, Lock, AlertCircle, User
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
  const [subTab, setSubTab] = useState<'personal' | 'weekly' | 'path' | 'season'>('personal');
  const [seasonView, setSeasonView] = useState<'Overall' | '1st Half' | '2nd Half'>('Overall');
  const [targetUserId, setTargetUserId] = useState<string>(currentUser?.id || '');

  // Keep target user aligned if currentUser changes
  const activeInspectUser = useMemo(() => {
    return allUsers.find(u => u.id === targetUserId) || currentUser || allUsers[0];
  }, [allUsers, targetUserId, currentUser]);

  const fanaticsUsers = useMemo(() => {
    return (allUsers || [])
      .filter((u: any) => u.playsConfidence)
      .sort((a: any, b: any) => {
        const lastA = String(a.lastName || '').trim().toLowerCase();
        const lastB = String(b.lastName || '').trim().toLowerCase();
        const lastCompare = lastA.localeCompare(lastB);
        if (lastCompare !== 0) return lastCompare;
        return String(a.firstName || '').trim().toLowerCase().localeCompare(String(b.firstName || '').trim().toLowerCase());
      });
  }, [allUsers]);

  const currentGames = useMemo(() => {
    return globalSettings?.games?.[selectedWeek] || [];
  }, [globalSettings, selectedWeek]);

  // Lock status check for the selected week
  const selectedWeekState = globalSettings?.weekStates?.[selectedWeek];
  const isSelectedWeekLocked = selectedWeekState === 'closed' || selectedWeekState === 'locked';

  // Closed weeks across the season
  const closedWeeks = useMemo(() => {
    return Array.from({ length: maxActiveWeeks }, (_, i) => i + 1)
      .filter((w) => globalSettings?.weekStates?.[w] === 'closed');
  }, [globalSettings, maxActiveWeeks]);

  // ==========================================
  // 0. PERSONAL STATS & TRAJECTORY GRAPH
  // ==========================================
  const trajectoryData = useMemo(() => {
    if (!activeInspectUser || closedWeeks.length === 0) return [];

    return closedWeeks.map((wk) => {
      const standingsAtWeek = fanaticsUsers.map((u: any) => {
        let sum = 0;
        for (let w = 1; w <= wk; w++) {
          const val = u.weeklyConfidenceHistory?.[w] ?? u.weeklyConfidenceHistory?.[String(w)];
          if (val !== undefined && val !== null) sum += parseFloat(val);
        }
        return { id: u.id, pts: sum };
      }).sort((a, b) => b.pts - a.pts);

      let playerRank = 1;
      let finalRank = 1;
      for (let i = 0; i < standingsAtWeek.length; i++) {
        if (i > 0 && standingsAtWeek[i].pts < standingsAtWeek[i - 1].pts) {
          finalRank = i + 1;
        }
        if (standingsAtWeek[i].id === activeInspectUser.id) {
          playerRank = finalRank;
          break;
        }
      }

      const playerStanding = standingsAtWeek.find((item) => item.id === activeInspectUser.id);
      const weekPtsVal = activeInspectUser.weeklyConfidenceHistory?.[wk] ?? activeInspectUser.weeklyConfidenceHistory?.[String(wk)] ?? 0;

      return {
        week: wk,
        rank: playerRank,
        weekPts: parseFloat(weekPtsVal) || 0,
        totalPts: playerStanding?.pts || 0
      };
    });
  }, [activeInspectUser, fanaticsUsers, closedWeeks]);

  const personalMetrics = useMemo(() => {
    if (!trajectoryData.length) {
      return { bestRank: null, lowestRank: null, bestScore: 0, avgPts: '0.0' };
    }
    const bestRank = Math.min(...trajectoryData.map((d) => d.rank));
    const lowestRank = Math.max(...trajectoryData.map((d) => d.rank));
    const bestScore = Math.max(...trajectoryData.map((d) => d.weekPts));
    const avgPts = (trajectoryData.reduce((acc, d) => acc + d.weekPts, 0) / trajectoryData.length).toFixed(1);

    return { bestRank, lowestRank, bestScore, avgPts };
  }, [trajectoryData]);

  // SVG Chart Dimensions
  const totalPoolSize = fanaticsUsers.length || 58;
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 30;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  const pointsString = trajectoryData.map((d, idx) => {
    const x = paddingX + (trajectoryData.length > 1 ? (idx / (trajectoryData.length - 1)) * graphWidth : graphWidth / 2);
    const y = paddingY + ((d.rank - 1) / Math.max(1, totalPoolSize - 1)) * graphHeight;
    return `${x},${y}`;
  }).join(' ');

  // ==========================================
  // 1. WEEKLY DEEP DIVE & GAME INSIGHTS
  // ==========================================
  const weeklyInsights = useMemo(() => {
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

    const sortedByExposure = [...analyticsList].sort((a, b) => b.totalPts - a.totalPts);
    const poolShifter = sortedByExposure[0] || null;

    const sortedByPointsLost = [...analyticsList]
      .filter(item => item.game.status === 'final')
      .sort((a, b) => b.ptsLost - a.ptsLost);
    const upsetGame = sortedByPointsLost[0] || null;

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
    if (!isSelectedWeekLocked || !currentGames.length || !fanaticsUsers.length) {
      return { userRoster: [], targetAnalysis: null };
    }

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

    userRoster.sort((a, b) => b.currentPts - a.currentPts || b.ceiling - a.ceiling);

    const leaderFloor = userRoster[0]?.floor || 0;
    const eighthPlaceUser = userRoster[7] || userRoster[userRoster.length - 1];
    const ninthPlaceUser = userRoster[8] || null;

    const eighthPlaceFloor = eighthPlaceUser?.floor || 0;
    const ninthPlaceCeiling = ninthPlaceUser ? ninthPlaceUser.ceiling : 0;

    const target = userRoster.find(u => u.id === activeInspectUser?.id) || userRoster[0];
    const targetRankIndex = userRoster.findIndex(u => u.id === target.id);

    let statusTag = 'IN_CONTENTION';
    let statusLabel = 'In Contention for Top 8';
    let statusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

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
        const wkState = globalSettings?.weekStates?.[wk];
        if (wkState !== 'closed' && wkState !== 'locked') continue;

        const wkGames = globalSettings.games?.[wk] || [];
        const uPicks = user.picks?.[wk] || {};
        const uRanks = user.ranks?.[wk] || {};

        wkGames.forEach((g: any) => {
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

        {/* 4 SUB-NAVIGATION TABS */}
        <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700 flex-wrap gap-1">
          <button
            onClick={() => setSubTab('personal')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'personal' ? 'bg-[#FFB81C] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" /> Personal Stats
          </button>
          <button
            onClick={() => setSubTab('weekly')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'weekly' ? 'bg-[#FFB81C] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" /> Weekly Deep Dive
          </button>
          <button
            onClick={() => setSubTab('path')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'path' ? 'bg-[#FFB81C] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" /> Path To Victory
          </button>
          <button
            onClick={() => setSubTab('season')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'season' ? 'bg-[#FFB81C] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" /> Season Stats
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 0: PERSONAL STATS & TRAJECTORY GRAPH   */}
      {/* ========================================== */}
      {subTab === 'personal' && (
        <div className="space-y-6">
          {/* INSPECT PLAYER SELECTOR */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Select Player Profile:</span>
              <select
                value={activeInspectUser?.id || ''}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-black italic text-base uppercase outline-none focus:border-[#FFB81C] cursor-pointer"
              >
                {fanaticsUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.lastName ? `${u.lastName}, ${u.firstName}` : u.firstName} {u.id === currentUser?.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Season Record Through <span className="font-black text-slate-900">{closedWeeks.length} Closed Weeks</span>
            </span>
          </div>

          {/* CAREER BESTS & AVERAGES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Season High Rank</span>
              <span className="text-2xl font-black italic text-emerald-600 font-mono">
                {personalMetrics.bestRank !== null ? `#${personalMetrics.bestRank}` : '—'}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Peak Position</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Lowest Rank</span>
              <span className="text-2xl font-black italic text-rose-600 font-mono">
                {personalMetrics.lowestRank !== null ? `#${personalMetrics.lowestRank}` : '—'}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Floor Position</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Best Week Total</span>
              <span className="text-2xl font-black italic text-[#FFB81C] font-mono">
                {personalMetrics.bestScore > 0 ? `${personalMetrics.bestScore} PTS` : '—'}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Single-Week Best</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Scoring Average</span>
              <span className="text-2xl font-black italic text-slate-900 font-mono">
                {personalMetrics.avgPts}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Points Per Week</span>
            </div>
          </div>

          {/* STANDINGS TRAJECTORY GRAPH */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-black italic uppercase text-slate-900">
                  Season Standings Trajectory
                </h3>
                <p className="text-xs text-slate-400 font-bold">Overall league rank movement after each closed week</p>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                Top = Rank #1
              </span>
            </div>

            {trajectoryData.length <= 1 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                Need at least 2 closed weeks to plot rank trajectory
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px]">
                  {/* Gridlines */}
                  <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="#e2e8f0" strokeDasharray="4" />
                  <line x1={paddingX} y1={paddingY + graphHeight / 2} x2={svgWidth - paddingX} y2={paddingY + graphHeight / 2} stroke="#e2e8f0" strokeDasharray="4" />
                  <line x1={paddingX} y1={paddingY + graphHeight} x2={svgWidth - paddingX} y2={paddingY + graphHeight} stroke="#e2e8f0" strokeDasharray="4" />

                  {/* Y-Axis Labels */}
                  <text x={paddingX - 8} y={paddingY + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-bold font-mono">#1</text>
                  <text x={paddingX - 8} y={paddingY + graphHeight / 2 + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-bold font-mono">#{Math.round(totalPoolSize / 2)}</text>
                  <text x={paddingX - 8} y={paddingY + graphHeight + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-bold font-mono">#{totalPoolSize}</text>

                  {/* Trajectory Polyline */}
                  <polyline
                    fill="none"
                    stroke="#FFB81C"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsString}
                  />

                  {/* Nodes & Labels */}
                  {trajectoryData.map((d, idx) => {
                    const x = paddingX + (trajectoryData.length > 1 ? (idx / (trajectoryData.length - 1)) * graphWidth : graphWidth / 2);
                    const y = paddingY + ((d.rank - 1) / Math.max(1, totalPoolSize - 1)) * graphHeight;

                    return (
                      <g key={d.week}>
                        <circle cx={x} cy={y} r="5" fill="#0f172a" stroke="#FFB81C" strokeWidth="2.5" />
                        <text x={x} y={y - 10} textAnchor="middle" className="text-[10px] fill-slate-800 font-black font-mono">
                          #{d.rank}
                        </text>
                        <text x={x} y={svgHeight - 6} textAnchor="middle" className="text-[10px] fill-slate-400 font-bold uppercase">
                          Wk {d.week}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 1: WEEKLY DEEP DIVE                    */}
      {/* ========================================== */}
      {subTab === 'weekly' && (
        <div className="space-y-6">
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
                    Week {w}
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
                Picks for Week {selectedWeek} are hidden until kickoff to ensure fair play.
              </p>
            </div>
          ) : (
            <>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Live mathematical standing matrices and ceilings unlock once Week {selectedWeek} kicks off.
              </p>
            </div>
          ) : (
            <>
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