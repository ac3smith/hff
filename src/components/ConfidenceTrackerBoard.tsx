import React, { useState, useMemo } from 'react';
import { Target, Zap } from 'lucide-react';

function getProjectedWinner(game: any) {
  if (!game) return null;
  if (game.status === 'final') return game.winner;
  
  const awayScore = parseInt(String(game.awayScore ?? 0), 10);
  const homeScore = parseInt(String(game.homeScore ?? 0), 10);

  if (awayScore > homeScore) return game.away;
  if (homeScore > awayScore) return game.home;
  
  return null;
}

function LiveScoreTicker({ games }: any) {
  if (!games || games.length === 0) return null;

  const sortedGames = useMemo(() => {
    return [...games].sort((a: any, b: any) => {
      const getOrder = (status: string) => {
        if (status === 'in_progress') return 1;
        if (status === 'scheduled') return 2;
        if (status === 'final') return 3;
        return 4;
      };
      return getOrder(a.status) - getOrder(b.status);
    });
  }, [games]);

  return (
    <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-white shadow-xl border-t-4 border-[#FFB81C] mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#FFB81C] animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black italic uppercase tracking-wider text-[#FFB81C]">
            Live Scoreboard
          </h3>
        </div>
        <span className="text-[9px] sm:text-[10px] font-black uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
          Real-Time
        </span>
      </div>

      <div className="flex overflow-x-auto gap-2.5 sm:gap-3 pb-1 scrollbar-hide overscroll-x-contain" style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}>
        {sortedGames.map((g: any) => {
          const isLive = g.status === 'in_progress';
          const isFinal = g.status === 'final';
          const awayScore = g.awayScore !== null && g.awayScore !== undefined ? g.awayScore : '-';
          const homeScore = g.homeScore !== null && g.homeScore !== undefined ? g.homeScore : '-';

          return (
            <div
              key={g.id}
              className={`min-w-[130px] sm:min-w-[150px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border flex flex-col justify-between shrink-0 shadow-sm transition-all ${
                isLive
                  ? 'bg-slate-800 border-[#FFB81C] ring-1 ring-[#FFB81C]/40'
                  : isFinal
                  ? 'bg-slate-800/50 border-slate-800 opacity-70'
                  : 'bg-slate-800/80 border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5 text-[9px] sm:text-[10px] font-black uppercase text-slate-400">
                <span>{isFinal ? 'FINAL' : isLive ? (g.gameQuarter || 'LIVE') : (g.time || 'UPCOMING')}</span>
                {isLive && g.gameClock && <span className="text-[#FFB81C] font-mono">{g.gameClock}</span>}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs sm:text-sm font-black">
                  <span className="text-slate-200">{g.awayAbbr || g.away}</span>
                  <span className="font-mono text-white">{awayScore}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm font-black">
                  <span className="text-slate-200">{g.homeAbbr || g.home}</span>
                  <span className="font-mono text-white">{homeScore}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveTrackerCell({ game, pick, rank, isProjection }: any) {
  if (!pick || !rank) return <div className="text-center text-slate-300 font-bold text-xs py-1">-</div>;
  
  const activeWinner = isProjection ? getProjectedWinner(game) : (game?.status === 'final' ? game?.winner : null);
  const isWinner = activeWinner && pick === activeWinner;
  const isLoser = activeWinner && pick !== activeWinner;
  const inProgress = game?.status === 'in_progress';
  
  const awayScore = parseInt(String(game?.awayScore ?? 0), 10);
  const homeScore = parseInt(String(game?.homeScore ?? 0), 10);
  const isLiveTie = inProgress && awayScore === homeScore;

  let bg = 'bg-slate-100 text-slate-900 border-slate-300';
  
  if (isWinner) {
    bg = inProgress && isProjection
      ? 'bg-emerald-600 text-white font-black border-emerald-400 animate-pulse'
      : 'bg-emerald-600 text-white font-black border-emerald-500';
  } else if (isLoser) {
    bg = inProgress && isProjection
      ? 'bg-rose-600 text-white font-black border-rose-500 animate-pulse'
      : 'bg-rose-600 text-white font-black border-rose-500';
  } else if (isLiveTie && isProjection) {
    bg = 'bg-amber-500/90 text-slate-900 font-black border-amber-400 animate-pulse ring-2 ring-amber-300/50';
  }

  const displayPick = pick === game?.away ? (game?.awayAbbr || pick) : (pick === game?.home ? (game?.homeAbbr || pick) : pick);

  return (
    <div className={`font-black uppercase text-center rounded py-1 px-0.5 border w-full flex flex-col items-center justify-center leading-none ${bg}`}>
      <span className="text-xs sm:text-sm font-black tracking-tighter">
        {String(displayPick)}
      </span>
      <span className={`text-[10px] sm:text-xs font-black italic mt-0.5 px-1 rounded ${
        isWinner ? 'bg-black/30 text-white' : isLiveTie ? 'bg-black/20 text-slate-900' : inProgress && isLoser ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-900'
      }`}>
        {String(rank)}
      </span>
    </div>
  );
}

export function ConfidenceTrackerBoard({ data, games, week, isWeekComplete, currentUser, isWeekLocked, adminForceReveal, globalSettings }: any) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isProjection, setIsProjection] = useState<boolean>(false);

  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    const actualTB = globalSettings?.actualTiebreakers?.[week] ?? globalSettings?.actualTiebreakers?.[String(week)] ?? 0;
    const targetGames = games || [];
    const standardMaxPossible = targetGames.reduce((sum: number, _: any, idx: number) => sum + (idx + 1), 0);

    const processed = data
      .filter((u: any) => Boolean(u?.playsConfidence) && String(u?.paymentStatus) !== 'disqualified')
      .map((u: any) => {
        const userPicksRaw = u?.picks?.[week] ?? u?.picks?.[String(week)] ?? u?.picks?.[Number(week)] ?? {};
        const userRanksRaw = u?.ranks?.[week] ?? u?.ranks?.[String(week)] ?? u?.ranks?.[Number(week)] ?? {};

        let userPicks = { ...userPicksRaw };
        let userRanks = { ...userRanksRaw };

        const userTBStr = String(
          u?.tiebreakers?.[week] ?? 
          u?.tiebreakers?.[String(week)] ?? 
          u?.tiebreakers?.[Number(week)] ?? ''
        ).trim();
        const userTB = parseInt(userTBStr || '0', 10);

        const isDeadbeat =
          userTBStr === '0' ||
          (targetGames.length > 0 &&
            targetGames.every((g: any) => {
              const r = parseInt(String(userRanks[g.id] || userRanks[String(g.id)] || 0), 10);
              return r === 5;
            }));

        if (isDeadbeat) {
          targetGames.forEach((g: any) => {
            if (!userRanks[g.id] && !userRanks[String(g.id)]) userRanks[g.id] = 5;
            if (!userPicks[g.id] && !userPicks[String(g.id)]) userPicks[g.id] = 'DB';
          });
        }

        const userMaxPossible = isDeadbeat ? targetGames.length * 5 : standardMaxPossible;

        const pointsLost = targetGames.reduce((lost: number, g: any) => {
          const pick = userPicks[g.id] || userPicks[String(g.id)];
          const rank = parseInt(String(userRanks[g.id] || userRanks[String(g.id)] || 0), 10);

          if (!pick || !rank) return lost;

          const projWinner = getProjectedWinner(g);
          const activeWinner = isProjection 
            ? (g.status === 'final' ? g.winner : projWinner) 
            : (g.status === 'final' ? g.winner : null);

          if (activeWinner && pick !== activeWinner) {
            return lost + rank;
          }

          return lost;
        }, 0);

        const activeScore = userMaxPossible - pointsLost;
        const tbDiff = Math.abs(userTB - actualTB);

        return {
          ...u,
          activeScore,
          confidenceScore: activeScore,
          projectedScore: activeScore,
          tbDiff,
          userPicks,
          userRanks,
          userTB
        };
      });

    processed.sort((a: any, b: any) => {
      if (b.activeScore !== a.activeScore) return b.activeScore - a.activeScore;
      if (actualTB > 0 && a.tbDiff !== b.tbDiff) {
        return a.tbDiff - b.tbDiff;
      }
      const nameA = `${a.firstName} ${a.lastName}`.trim();
      const nameB = `${b.firstName} ${b.lastName}`.trim();
      return nameA.localeCompare(nameB);
    });

    let currentRank = 1;
    processed.forEach((u: any, i: number) => {
      const activeScore = u.activeScore;
      const prevScore = i > 0 ? processed[i - 1].activeScore : null;

      if (i > 0) {
        const prevUser = processed[i - 1];
        if (activeScore < prevScore || (actualTB > 0 && u.tbDiff > prevUser.tbDiff)) {
          currentRank = i + 1;
        }
      }

      u.projectedRank = currentRank;
      u.displayRank = currentRank;
    });

    return processed;
  }, [data, games, week, isProjection, isWeekComplete, globalSettings]);

  const highStakesGames = useMemo(() => {
    if (!currentUser || !games) return [];
    
    const myPicks = currentUser.picks?.[week] || currentUser.picks?.[String(week)] || {};
    const myRanks = currentUser.ranks?.[week] || currentUser.ranks?.[String(week)] || {};

    return games
      .filter((g: any) => g.status === 'in_progress' || g.status === 'scheduled')
      .map((g: any) => {
        const myPick = myPicks[g.id];
        const myRank = parseInt(myRanks[g.id] || 0, 10);
        return { game: g, myPick, myRank };
      })
      .filter((item: any) => item.myPick && item.myRank >= 8)
      .sort((a: any, b: any) => b.myRank - a.myRank)
      .slice(0, 3);
  }, [currentUser, games, week]);

  const actualTB = globalSettings?.actualTiebreakers?.[week] ?? globalSettings?.actualTiebreakers?.[String(week)] ?? undefined;
  const isWeekStateLocked = globalSettings?.weekStates?.[week] === 'locked' || 
                            globalSettings?.weekStates?.[week] === 'closed' ||
                            globalSettings?.weekStates?.[String(week)] === 'locked' ||
                            globalSettings?.weekStates?.[String(week)] === 'closed';

  const tbGame = (games || []).find((g: any) => g.isTiebreaker) || (games || [])[(games || []).length - 1];

  return (
    <div className="space-y-4 sm:space-y-6">

      {currentUser && highStakesGames.length > 0 && (
        <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl border-t-4 sm:border-t-8 border-[#FFB81C]">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black italic uppercase text-[#FFB81C] flex items-center gap-1.5">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB81C]" /> High-Stakes Watch
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5">
                Top confidence picks live or upcoming
              </p>
            </div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase bg-[#FFB81C]/20 text-[#FFB81C] px-2.5 py-1 rounded-full border border-[#FFB81C]/30">
              Watchlist
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
            {highStakesGames.map(({ game, myPick, myRank }: any) => {
              const projWinner = getProjectedWinner(game);
              const isWinning = projWinner === myPick;
              const displayPick = myPick === game.away ? (game.awayAbbr || myPick) : (game.homeAbbr || myPick);

              return (
                <div key={game.id} className="bg-slate-800/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-700 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      {game.awayAbbr} @ {game.homeAbbr}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black italic text-[#FFB81C] bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      +{myRank} PTS
                    </span>
                  </div>

                  <div className="flex items-center justify-between my-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs text-slate-400 font-bold">Pick:</span>
                      <span className="text-xs sm:text-sm font-black text-white">{displayPick}</span>
                    </div>

                    {game.status === 'in_progress' ? (
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded ${isWinning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                        {isWinning ? '▲ Winning' : '▼ Trailing'}
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                        Upcoming
                      </span>
                    )}
                  </div>

                  <div className="text-[9px] sm:text-[10px] font-mono text-slate-400 mt-1.5 border-t border-slate-700/60 pt-1.5 flex justify-between">
                    <span>Score: {game.awayScore ?? 0} - {game.homeScore ?? 0}</span>
                    <span className="text-slate-300 font-bold">{game.status === 'in_progress' ? 'In Progress' : 'Scheduled'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`rounded-3xl sm:rounded-[2rem] shadow-xl border overflow-hidden relative w-full transition-colors duration-300 ${
        isProjection 
          ? 'bg-amber-50/60 border-2 border-amber-200 border-t-6 sm:border-t-8 border-t-amber-500' 
          : 'bg-white border border-t-6 sm:border-t-8 border-slate-900'
      }`}>
        <div className={`p-3.5 sm:p-5 border-b flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 ${
          isProjection ? 'bg-amber-100/50 border-amber-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <h2 className="text-lg sm:text-2xl font-black italic uppercase text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              Week {week} {isProjection ? 'Live Projection' : 'Official Results'}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-0.5">
              {isProjection ? 'Simulating live standings' : 'Official settled scores'}
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex bg-slate-200 p-0.5 sm:p-1 rounded-xl border border-slate-300 flex-1 sm:flex-initial">
              <button
                onClick={() => setIsProjection(false)}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                  !isProjection ? 'bg-slate-900 text-[#FFB81C] shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Official
              </button>
              <button
                onClick={() => setIsProjection(true)}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                  isProjection ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3 h-3" /> Live
              </button>
            </div>

            <div className="flex bg-slate-200 p-0.5 sm:p-1 rounded-xl border border-slate-300">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'table' ? 'bg-slate-900 text-[#FFB81C] shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'cards' ? 'bg-slate-900 text-[#FFB81C] shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Games
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-3 sm:p-4 border-b-2 border-[#FFB81C] flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB81C]" />
            <div>
              <h4 className="font-black uppercase italic text-xs sm:text-sm text-[#FFB81C] flex items-center gap-1.5">
                Official Tiebreaker
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold truncate max-w-[180px] sm:max-w-none">
                {tbGame ? `${tbGame.awayName || tbGame.away} @ ${tbGame.homeName || tbGame.home}` : 'Last Game'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 block">Total</span>
            <span className="text-sm sm:text-lg font-black italic text-[#FFB81C] font-mono">
              {actualTB !== undefined && actualTB !== null && actualTB > 0 ? `${actualTB} PTS` : 'Pending'}
            </span>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto scrollbar-hide relative z-0 overscroll-x-contain" style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-900 text-white uppercase border-b-4 border-[#FFB81C]">
                  <th className="p-1.5 sm:p-2 sticky left-0 bg-slate-900 z-30 w-32 sm:w-52 shadow-[3px_0_10px_rgba(0,0,0,0.3)] tracking-widest italic font-black text-[11px] sm:text-sm">
                    Player
                  </th>

                  {(games || []).map((g: any) => (
                    <th key={g.id} className={`p-0.5 text-center border-r border-slate-800 font-black italic leading-tight w-9 sm:w-11 ${g.isTiebreaker ? 'bg-amber-500/20' : ''}`}>
                      <div className="text-[#FFB81C] text-[10px] sm:text-xs truncate flex items-center justify-center gap-0.5">
                        <span>{String(g.awayAbbr || g.away)}</span>
                        {g.isTiebreaker && <span className="text-[#FFB81C] font-black text-xs leading-none">*</span>}
                      </div>
                      <div className="text-slate-400 font-mono text-[8px] my-0.5">
                        {g.status === 'final' ? 'FINAL' : (g.awayScore !== null && g.awayScore !== undefined) ? `${g.awayScore}-${g.homeScore}` : '@'}
                      </div>
                      <div className="text-white text-[10px] sm:text-xs truncate">{String(g.homeAbbr || g.home)}</div>
                    </th>
                  ))}

                  <th className="p-1 text-center border-l-2 border-r border-slate-800 w-12 sm:w-14 text-[#FFB81C] font-black italic text-[11px] sm:text-sm">
                    PTS
                  </th>
                  <th className="p-1 text-center border-r border-slate-800 w-12 sm:w-14 italic text-[10px] sm:text-xs">Behind</th>
                  <th className="p-1 text-center border-r border-slate-800 w-12 sm:w-16 italic text-[10px] sm:text-xs">TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.map((user: any, idx: number) => {
                  if (!user) return null;

                  const activeScore = user.activeScore ?? 0;
                  const activeRank = user.displayRank ?? 1;
                  const firstScore = processedData[0]?.activeScore ?? 0;

                  const behindFirst = firstScore - activeScore;
                  const behindNext = idx > 0 ? ((processedData[idx - 1]?.activeScore ?? 0) - activeScore) : 0;
                  const isMe = currentUser && user.id === currentUser.id;

                  const shouldHide = !isWeekLocked && !isWeekStateLocked && !adminForceReveal && !isMe;

                  return (
                    <tr key={user.id} className={`${isMe ? 'bg-[#FFB81C]/20 border-l-4 border-[#FFB81C] font-black' : isProjection ? 'hover:bg-amber-100/40' : 'hover:bg-slate-50'} transition-colors group relative`}>
                      <td className={`px-2 py-1 sticky left-0 z-20 ${isMe ? 'bg-[#F7D870] border-l-4 border-[#FFB81C]' : isProjection ? 'bg-amber-50' : 'bg-white'} border-r-2 border-slate-300 shadow-md`}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black italic text-xs sm:text-sm text-slate-900 w-5 text-right shrink-0">
                            {activeRank}.
                          </span>
                          <div className="flex flex-col leading-none truncate">
                            <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate">
                              {String(user.firstName)} {user.nickname ? `"${user.nickname}"` : ''}
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-700 tracking-tight truncate mt-0.5">
                              {String(user.lastName)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {(games || []).map((g: any) => {
                        const pick = user.userPicks?.[g.id] || user.userPicks?.[String(g.id)];
                        const rank = user.userRanks?.[g.id] || user.userRanks?.[String(g.id)];

                        return (
                          <td key={g.id} className={`p-0.5 border-r border-slate-100 text-center ${isMe ? 'bg-[#FFB81C]/10' : isProjection ? 'bg-amber-50/50' : 'bg-white'}`}>
                            {shouldHide && !pick ? (
                              <div className="text-center text-[10px] font-black italic text-slate-400 bg-slate-100 py-1 rounded uppercase border border-slate-200">
                                LOCK
                              </div>
                            ) : (
                              <LiveTrackerCell game={g} pick={pick} rank={rank} isProjection={isProjection} />
                            )}
                          </td>
                        );
                      })}

                      <td className={`p-1 text-center font-black tabular-nums text-xs sm:text-base border-l-2 border-r border-slate-100 text-slate-900 ${isMe ? 'bg-[#FFB81C]/20' : isProjection ? 'bg-amber-50' : 'bg-white'}`}>
                        {activeScore}
                      </td>
                      <td className={`p-1 text-right font-black italic tabular-nums text-[10px] sm:text-xs border-r border-slate-100 ${isMe ? 'bg-[#FFB81C]/20' : isProjection ? 'bg-amber-50' : 'bg-white'}`}>
                        {idx === 0 ? (
                          <span className="text-slate-300 font-bold block text-center">-</span>
                        ) : (
                          <div className="flex flex-col items-end leading-tight pr-0.5">
                            <span className={behindFirst === 0 ? 'text-slate-400' : 'text-rose-600 font-black'}>
                              {behindFirst === 0 ? '0' : `-${behindFirst}`}
                            </span>
                            <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold">({behindNext === 0 ? '0' : `-${behindNext}`})</span>
                          </div>
                        )}
                      </td>
                      <td className={`p-1 text-center text-[10px] sm:text-xs font-bold text-slate-700 italic border-r border-slate-100 ${isMe ? 'bg-[#FFB81C]/20' : isProjection ? 'bg-amber-50' : 'bg-white'}`}>
                        <span className="text-slate-600 font-mono">
                          {String(user.userTB || user.tiebreakers?.[week] || '—')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              const myPicks = currentUser?.picks?.[week] || currentUser?.picks?.[String(week)] || {};
              const myRanks = currentUser?.ranks?.[week] || currentUser?.ranks?.[String(week)] || {};

              if (!games || games.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 text-slate-400 font-bold">
                    No games loaded for Week {week}.
                  </div>
                );
              }

              return games.map((g: any) => {
                const pick = myPicks[g.id] || myPicks[String(g.id)];
                const rank = parseInt(String(myRanks[g.id] || myRanks[String(g.id)] || 0), 10);

                const activeWinner = isProjection ? getProjectedWinner(g) : (g.status === 'final' ? g.winner : null);
                const isWinner = activeWinner && pick === activeWinner;
                const isLoser = activeWinner && pick !== activeWinner;
                const displayPick = pick === g.away ? (g.awayAbbr || pick) : (pick === g.home ? (g.homeAbbr || pick) : pick);

                return (
                  <div key={g.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-white flex flex-col justify-between shadow-lg">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <span className="text-xs font-black uppercase text-slate-400">
                        {g.awayAbbr || g.away} @ {g.homeAbbr || g.home}
                      </span>
                      <span className="text-xs font-black text-[#FFB81C] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {g.status === 'final' ? 'FINAL' : g.status === 'in_progress' ? 'LIVE' : g.time}
                      </span>
                    </div>

                    <div className="my-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-400">Your Pick</div>
                        <div className="text-base font-black text-white">{displayPick || 'No Pick'}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-black uppercase text-slate-400">Confidence</div>
                        <div className="text-lg font-black text-[#FFB81C]">+{rank || 0} PTS</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                      <span className="font-mono text-slate-400">
                        Score: {g.awayScore ?? 0} - {g.homeScore ?? 0}
                      </span>

                      {isWinner ? (
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black border border-emerald-500/30">
                          ▲ WON
                        </span>
                      ) : isLoser ? (
                        <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-black border border-rose-500/30">
                          ▼ LOST
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}