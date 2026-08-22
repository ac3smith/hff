/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Initialize Firebase Admin to bypass security rules locally on the server
admin.initializeApp();
const db = admin.firestore();

// This must match the appId used in your frontend App.tsx
const appId = 'hanover-test-season-11'; 

exports.autoSyncScores = onSchedule("every 1 minutes", async (event) => {
    try {
        const settingsRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('pool_settings').doc('global');
        const settingsSnap = await settingsRef.get();
        
        if (!settingsSnap.exists) {
            console.log("Database not found.");
            return;
        }

        const settings = settingsSnap.data();
        const apiKey = settings.apiSportsKey;
        
        if (!apiKey) {
            console.log("No API-Sports key found in the database. Aborting sync.");
            return;
        }

        // 1. Automatically find the active week (whichever week is open or locked)
        const weeks = [1, 2, 3, 4, 5, 6, 7];
        const activeWeek = weeks.find(w => ['open', 'locked'].includes(settings.weekStates?.[w])) || 1;
        
        const games = settings.games?.[activeWeek] || [];
        if (games.length === 0) {
            console.log(`No games populated for Week ${activeWeek}. Aborting sync.`);
            return;
        }

        // 2. Extract unique API dates from those games
        const datesToFetch = [...new Set(games.map(g => g.apiDate).filter(Boolean))];
        if (datesToFetch.length === 0) return;

        // 3. Fetch data from API-Sports for those dates
        // 4. Fetch live games directly, or fallback to date range (+/- 1 day for UTC offset)
    let apiGames = [];
    
    // First, try fetching all currently live/in-progress NFL games
    const liveResponse = await fetch(`https://v1.american-football.api-sports.io/games?league=1&live=all`, {
      headers: { 'x-apisports-key': apiKey }
    });
    const liveJson = await liveResponse.json();
    if (liveJson.response && Array.isArray(liveJson.response) && liveJson.response.length > 0) {
      apiGames = liveJson.response;
    } else {
      // Fallback: Fetch dates with a +1 day window to cover UTC timezone shifts
      for (const dateStr of datesToFetch) {
        const season = String(dateStr).split('-')[0] || "2026";
        
        // Calculate date + 1 day to catch evening kickoff UTC shifts
        const baseDate = new Date(dateStr + 'T12:00:00Z');
        const nextDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        for (const queryDate of [dateStr, nextDate]) {
          const response = await fetch(`https://v1.american-football.api-sports.io/games?league=1&season=${season}&date=${queryDate}`, {
            headers: { 'x-apisports-key': apiKey }
          });
          const json = await response.json();
          if (json.response && Array.isArray(json.response)) {
            apiGames = [...apiGames, ...json.response];
          }
        }
      }
    }

        // 4. Match the backend scores to our database matches
        const updatedGames = games.map(g => {
            const match = apiGames.find(ag => ag.teams.away.name.includes(g.awayName) && ag.teams.home.name.includes(g.homeName));
            if (match) {
                const isFinal = ['FT', 'AOT'].includes(match.status.short);
                let winner = g.winner;
                
                if (isFinal) {
                    winner = match.scores.home.total > match.scores.away.total ? g.home : g.away;
                }
                
                return { 
                    ...g, 
                    status: isFinal ? 'final' : 'upcoming', 
                    homeScore: match.scores.home.total, 
                    awayScore: match.scores.away.total,
                    winner: winner
                };
            }
            return g; // If no update, return as-is
        });

        // 5. Save the newly scored games back to Firestore
        await settingsRef.update({
            [`games.${activeWeek}`]: updatedGames
        });

        console.log(`Successfully auto-synced live scores for Week ${activeWeek}!`);

    } catch (error) {
        console.error("Fatal error during automated score sync:", error);
    }
});

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
