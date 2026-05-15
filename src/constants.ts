export const MOCK_WEEKS = Array.from({ length: 5 }, (_, i) => i + 1);

export const TEAM_COLORS: Record<string, string> = {
  NYY: '#003087', BAL: '#DF4601', BOS: '#BD3039', TB:  '#092C5C', PHI: '#E81828', NYM: '#FF5910', ATL: '#CE1141', MIA: '#00A3E0',
  CHC: '#0E3386', PIT: '#FDB827', LAD: '#005A9C', SD:  '#2F241D', SF:  '#FD5A1E', ARI: '#A71930', TEX: '#003278', HOU: '#EB6E1F'
};

export const INITIAL_GAMES_BY_WEEK = {
  1: [
    { id: 1, away: 'NYY', home: 'BAL', awayName: 'Yankees', homeName: 'Orioles', date: 'Tue, May 12', time: '6:35 PM', apiDate: '2026-05-12', status: 'upcoming' },
    { id: 2, away: 'BOS', home: 'TB', awayName: 'Red Sox', homeName: 'Rays', date: 'Tue, May 12', time: '6:50 PM', apiDate: '2026-05-12', status: 'upcoming' },
    { id: 3, away: 'PHI', home: 'NYM', awayName: 'Phillies', homeName: 'Mets', date: 'Tue, May 12', time: '7:10 PM', apiDate: '2026-05-12', status: 'upcoming' },
    { id: 4, away: 'ATL', home: 'MIA', awayName: 'Braves', homeName: 'Marlins', date: 'Tue, May 12', time: '7:20 PM', apiDate: '2026-05-12', status: 'upcoming' }
  ],
  // ... (refer to previous constants block for weeks 2-5)
};