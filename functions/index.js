const { setGlobalOptions } = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const appId = 'hanover-test-season-11';

// Central Canonical NFL Team Code Mapper
function getCanonicalTeamCode(rawInput) {
  if (!rawInput) return '';
  const clean = String(rawInput).trim().toUpperCase();

  const ALIASES = {
    GB: ['GB', 'GRE', 'GNB', 'GREEN BAY', 'PACKERS'],
    NYG: ['NYG', 'NY', 'NEW', 'GIANTS'],
    NYJ: ['NYJ', 'JETS'],
    LAR: ['LAR', 'LOS', 'LA', 'RAMS'],
    LAC: ['LAC', 'CHARGERS'],
    SF: ['SF', 'SFO', 'SAN FRANCISCO', '49ERS', 'NINERS'],
    KC: ['KC', 'KAN', 'KANSAS CITY', 'CHIEFS'],
    LV: ['LV', 'LVR', 'OAK', 'LAS VEGAS', 'RAIDERS'],
    NE: ['NE', 'NWE', 'NEW ENGLAND', 'PATRIOTS'],
    NO: ['NO', 'NOR', 'NEW ORLEANS', 'SAINTS'],
    TB: ['TB', 'TAM', 'TAMPA BAY', 'BUCS', 'BUCCANEERS'],
    JAX: ['JAX', 'JAC', 'JACKSONVILLE', 'JAGS'],
    WAS: ['WAS', 'WSH', 'WASHINGTON', 'COMMANDERS'],
    PHI: ['PHI', 'PHILADELPHIA', 'EAGLES'],
    BAL: ['BAL', 'BALTIMORE', 'RAVENS'],
    BUF: ['BUF', 'BUFFALO', 'BILLS'],
    MIA: ['MIA', 'MIAMI', 'DOLPHINS'],
    DAL: ['DAL', 'DALLAS', 'COWBOYS'],
    PIT: ['PIT', 'PITTSBURGH', 'STEELERS'],
    CLE: ['CLE', 'CLEVELAND', 'BROWNS'],
    CIN: ['CIN', 'CINCINNATI', 'BENGALS'],
    HOU: ['HOU', 'HOUSTON', 'TEXANS'],
    IND: ['IND', 'INDIANAPOLIS', 'COLTS'],
    TEN: ['TEN', 'TENNESSEE', 'TITANS'],
    DEN: ['DEN', 'DENVER', 'BRONCOS'],
    ARI: ['ARI', 'ARIZONA', 'CARDINALS'],
    ATL: ['ATL', 'ATLANTA', 'FALCONS'],
    CAR: ['CAR', 'CAROLINA', 'PANTHERS'],
    CHI: ['CHI', 'CHICAGO', 'BEARS'],
    DET: ['DET', 'DETROIT', 'LIONS'],
    MIN: ['MIN', 'MINNESOTA', 'VIKINGS'],
    SEA: ['SEA', 'SEATTLE', 'SEAHAWKS']
  };

  for (const [code, aliasList] of Object.entries(ALIASES)) {
    if (code === clean || aliasList.some(a => a === clean || clean.includes(a))) {
      return code;
    }
  }
  return clean;
}

exports.autoSyncNFLScores = onSchedule("every 2 minutes", async (event) => {
  try {
    const settingsRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('pool_settings').doc('global');
    const settingsSnap = await settingsRef.get();

    if (!settingsSnap.exists) return;

    const settings = settingsSnap.data() || {};
    const apiKey = settings.apiSportsKey;
    if (!apiKey) return;

    const maxWeeks = settings.maxActiveWeeks || 21;
    const weeks = Array.from({ length: maxWeeks }, (_, i) => i + 1);
    const activeWeek = weeks.find(w => ['open', 'locked'].includes(settings.weekStates?.[w])) || 1;
    const games = settings.games?.[activeWeek] || [];

    if (games.length === 0) return;

    console.log(`[POLLING SEASON 2026] Polling API-Sports...`);

    const response = await fetch(`https://v1.american-football.api-sports.io/games?league=1&season=2026`, {
      headers: { 'x-apisports-key': apiKey }
    });
    const json = await response.json();
    const apiGames = json.response || [];

    if (apiGames.length === 0) {
      console.log(`0 games returned from API-Sports for Season 2026.`);
      return;
    }

    let updatedCount = 0;
    let liveCount = 0;

    const updatedGames = games.map((g) => {
      if (String(g.status).toLowerCase() === 'final') return g;

      const gAwayCanonical = getCanonicalTeamCode(g.away || g.awayAbbr || g.awayName);
      const gHomeCanonical = getCanonicalTeamCode(g.home || g.homeAbbr || g.homeName);

      const match = apiGames.find((ag) => {
        const agAwayCanonical = getCanonicalTeamCode(ag.teams?.away?.code || ag.teams?.away?.name);
        const agHomeCanonical = getCanonicalTeamCode(ag.teams?.home?.code || ag.teams?.home?.name);

        return (
          String(ag.game?.id) === String(g.id) ||
          (agAwayCanonical === gAwayCanonical && agHomeCanonical === gHomeCanonical)
        );
      });

      if (match) {
        updatedCount++;
        const shortStatus = String(match.game?.status?.short || '').toUpperCase();
        const isFinal = ['FT', 'AOT', 'POST', 'CANC', 'ABD', 'FINAL', 'FINISHED'].includes(shortStatus);
        const isLive = ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'LIVE', 'HALFTIME', '1Q', '2Q', '3Q', '4Q', 'IN_PROGRESS'].includes(shortStatus);

        if (isLive) liveCount++;

        const homeTotal = match.scores?.home?.total ?? null;
        const awayTotal = match.scores?.away?.total ?? null;

        let winner = g.winner || null;
        if (isFinal && homeTotal !== null && awayTotal !== null) {
          if (homeTotal > awayTotal) winner = g.home;
          else if (awayTotal > homeTotal) winner = g.away;
          else winner = 'TIE';
        }

        return {
          ...g,
          status: isFinal ? 'final' : (isLive ? 'in_progress' : g.status || 'upcoming'),
          gameQuarter: isFinal ? 'FINAL' : (isLive ? shortStatus : null),
          gameClock: isFinal ? null : (match.game?.status?.timer || match.game?.clock || null),
          possession: isLive ? (match.game?.possession || null) : null,
          homeScore: homeTotal !== null ? homeTotal : (g.homeScore ?? null),
          awayScore: awayTotal !== null ? awayTotal : (g.awayScore ?? null),
          winner: winner
        };
      }
      return g;
    });

    await settingsRef.update({
      [`games.${activeWeek}`]: updatedGames,
      syncStatus: {
        isActivePolling: true,
        activeGameCount: liveCount,
        lastCheckedAt: new Date().toISOString()
      }
    });

    console.log(`Updated ${updatedCount} games (${liveCount} active) for Week ${activeWeek}.`);

  } catch (error) {
    console.error("Fatal error during Cloud Function score sync:", error);
  }
});

setGlobalOptions({ maxInstances: 10 });