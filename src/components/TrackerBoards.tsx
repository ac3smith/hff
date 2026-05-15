import React from 'react';
import { MOCK_WEEKS } from '../constants';
import { formatFullName } from '../utils/helpers';

export function LiveTrackerCell({ game, pick, rank }) {
    if (!pick) return <div className="text-center text-slate-200 py-2">-</div>;
    const isWinner = game.status === 'final' && pick === game.winner;
    const isLoser = game.status === 'final' && pick !== game.winner;
    const bg = isWinner ? 'bg-green-500 text-white' : isLoser ? 'bg-red-500 text-white opacity-60' : 'bg-white text-slate-700 border-slate-200';
    return (
        <div className={`font-black uppercase text-center px-1 py-1.5 rounded border text-[10px] sm:text-xs flex flex-col ${bg}`}>
            <span>{pick}</span>
            <span className="text-[8px] bg-black/10 rounded px-1 mt-0.5">{rank}</span>
        </div>
    );
}

export function ConfidenceTrackerBoard({ data, games, week, isWeekComplete, currentUser }) {
    return (
        <div className="bg-white rounded-3xl shadow-xl border overflow-hidden border-t-8 border-slate-900">
            <div className="p-6 bg-slate-50 border-b">
                <h2 className="text-2xl font-black italic uppercase">Week {week} Live Tracker</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase">
                        <tr>
                            <th className="p-4 sticky left-0 bg-slate-900 z-10">Identity</th>
                            {(games || []).map(g => (
                                <th key={g.id} className="p-2 text-center border-l border-slate-700 font-black italic">
                                    {g.away} @ {g.home}
                                </th>
                            ))}
                            <th className="p-4 text-center border-l border-slate-700 text-[#FFB81C]">Pts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                        {data.map(user => (
                            <tr key={user.id} className={user.id === currentUser.id ? 'bg-[#FFB81C]/10' : 'hover:bg-slate-50'}>
                                <td className="p-4 font-bold sticky left-0 bg-white z-10 border-r">{formatFullName(user)}</td>
                                {games.map(g => (
                                    <td key={g.id} className="p-1 border-l">
                                        <LiveTrackerCell game={g} pick={user.picks?.[week]?.[g.id]} rank={user.ranks?.[week]?.[g.id]} />
                                    </td>
                                ))}
                                <td className="p-4 text-center font-black text-lg bg-slate-50">{user.confidenceScore || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}