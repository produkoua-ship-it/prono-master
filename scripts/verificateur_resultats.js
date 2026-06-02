const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { requireEnv } = require('./envHelper');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ODDS_API_KEY = requireEnv('ODDS_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse result logic based on market and prediction text
function verifyPrediction(match, scores) {
  // scores = [{ name: 'Team A', score: '2' }, { name: 'Team B', score: '1' }]
  if (!scores || scores.length < 2) return null;

  // Find scores
  const scoreA = parseInt(scores[0].score) || 0;
  const scoreB = parseInt(scores[1].score) || 0;
  const teamA = scores[0].name;
  const teamB = scores[1].name;

  const getScoreByTeam = (teamName) => {
    if (teamName === teamA) return scoreA;
    if (teamName === teamB) return scoreB;
    // Attempt partial match
    if (teamA.includes(teamName) || teamName.includes(teamA)) return scoreA;
    if (teamB.includes(teamName) || teamName.includes(teamB)) return scoreB;
    return null;
  };

  const market = match.market;
  const prediction = match.prediction;

  try {
    if (market === 'h2h') {
      // e.g. "Victoire de Team A"
      const predictedTeam = prediction.replace('Victoire de ', '').trim();
      const s1 = getScoreByTeam(predictedTeam);
      const s2 = predictedTeam === teamA ? scoreB : scoreA;

      if (s1 === null) return null; // Could not match team name

      if (s1 > s2) return 'gagne';
      return 'perdu';
    }
    else if (market === 'totals') {
      // e.g. "Plus de 2.5 buts/points" or "Under 2.5 buts/points"
      // Wait, generator produces: "Plus de 2.5 buts" or "Moins de 2.5 buts" or "Under..."
      const isOver = prediction.toLowerCase().includes('plus') || prediction.toLowerCase().includes('over');
      const isUnder = prediction.toLowerCase().includes('moins') || prediction.toLowerCase().includes('under');
      const matchPoint = prediction.match(/(\d+\.\d+|\d+)/);
      if (!matchPoint) return null;
      const point = parseFloat(matchPoint[0]);
      const totalScore = scoreA + scoreB;

      if (isOver) return totalScore > point ? 'gagne' : 'perdu';
      if (isUnder) return totalScore < point ? 'gagne' : 'perdu';
    }
    else if (market === 'btts') {
      // e.g. "Chaque équipe marque : Oui" / "Non"
      const isYes = prediction.includes('Oui');
      const bothScored = scoreA > 0 && scoreB > 0;
      if (isYes) return bothScored ? 'gagne' : 'perdu';
      return !bothScored ? 'gagne' : 'perdu';
    }
    else if (market === 'double_chance') {
      // "Double chance : 1X", "X2", "12"
      // Actually Odds API outcomes for double chance are usually "Home/Draw", "Draw/Away", "Home/Away" or the team names
      const homeScore = getScoreByTeam(match.home_team) || scoreA;
      const awayScore = getScoreByTeam(match.away_team) || scoreB;

      const isDraw = homeScore === awayScore;
      const homeWon = homeScore > awayScore;
      const awayWon = awayScore > homeScore;

      if (prediction.includes(match.home_team) && prediction.includes('Nul')) {
        // Home or Draw
        return (homeWon || isDraw) ? 'gagne' : 'perdu';
      }
      if (prediction.includes(match.away_team) && prediction.includes('Nul')) {
        // Away or Draw
        return (awayWon || isDraw) ? 'gagne' : 'perdu';
      }
      // If it contains both teams without draw
      if (prediction.includes(match.home_team) && prediction.includes(match.away_team)) {
        return (!isDraw) ? 'gagne' : 'perdu';
      }

      // fallback simple matching
      if (prediction.includes('1X') || prediction.includes('Home/Draw')) return (homeWon || isDraw) ? 'gagne' : 'perdu';
      if (prediction.includes('X2') || prediction.includes('Draw/Away')) return (awayWon || isDraw) ? 'gagne' : 'perdu';
      if (prediction.includes('12') || prediction.includes('Home/Away')) return (!isDraw) ? 'gagne' : 'perdu';
    }
    else if (market === 'draw_no_bet') {
      // "Nul remboursé : Team A"
      const predictedTeam = prediction.replace('Nul remboursé :', '').trim();
      const s1 = getScoreByTeam(predictedTeam);
      const s2 = predictedTeam === teamA ? scoreB : scoreA;

      if (s1 === s2) return 'rembourse'; // Should probably just be ignored or marked as cancelled, we'll map to 'en_attente' for simplicity or 'gagne_rembourse'
      if (s1 > s2) return 'gagne';
      return 'perdu';
    }

    // For other markets like asian_corners or cards, we don't have the data from /scores
    return null;
  } catch (e) {
    console.log("Erreur d'analyse pour le match:", match.match_id, e.message);
    return null;
  }
}

async function main() {
  console.log("=== Lancement de la vérification des résultats ===");

  // 1. Fetch pending matches
  const { data: pendingMatches, error: matchesError } = await supabase
    .from('matchs_du_combine')
    .select('*')
    .or('statut_match.eq.en_attente,statut_match.is.null');

  if (matchesError) {
    console.error("Erreur de récupération des matchs :", matchesError);
    return;
  }

  if (!pendingMatches || pendingMatches.length === 0) {
    console.log("Aucun match en attente à vérifier.");
    return;
  }

  console.log(`Trouvé ${pendingMatches.length} matchs potentiellement en attente.`);

  // Group by sport to optimize API calls
  const sports = [...new Set(pendingMatches.map(m => m.sport))];
  // Map sport names to sport keys. Since we don't store sport_key directly, we need to fetch all sports first to map them

  const { data: sportsData } = await axios.get('https://api.the-odds-api.com/v4/sports', {
    params: { apiKey: ODDS_API_KEY }
  });

  const titleToKey = {};
  if (sportsData) {
    sportsData.forEach(s => titleToKey[s.title] = s.key);
  }

  const scoresByMatchId = {};

  for (const sport of sports) {
    const sportKey = titleToKey[sport];
    if (!sportKey) {
      console.log(`Clé de sport introuvable pour : ${sport}`);
      continue;
    }

    console.log(`Récupération des scores pour ${sport} (${sportKey})...`);
    try {
      const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sportKey}/scores/`, {
        params: { apiKey: ODDS_API_KEY, daysFrom: 3 }
      });

      if (response.data) {
        response.data.forEach(match => {
          if (match.completed && match.scores) {
            scoresByMatchId[match.id] = match.scores;
          }
        });
      }
    } catch (err) {
      console.error(`Erreur The Odds API pour ${sportKey} :`, err.message);
    }
  }

  // Update matches
  let updatedMatchCount = 0;
  for (const match of pendingMatches) {
    const scores = scoresByMatchId[match.match_id];
    if (scores) {
      const result = verifyPrediction(match, scores);
      if (result === 'gagne' || result === 'perdu') {
        const { error: updateError } = await supabase
          .from('matchs_du_combine')
          .update({ statut_match: result })
          .eq('id', match.id);

        if (!updateError) {
          console.log(`Match ${match.home_team} vs ${match.away_team} mis à jour : ${result.toUpperCase()} (Prono: ${match.prediction})`);
          updatedMatchCount++;
        } else {
          console.error(`Erreur update match ${match.id}:`, updateError.message);
        }
      } else if (result === 'rembourse') {
        console.log(`Match ${match.home_team} vs ${match.away_team} remboursé (Prono: ${match.prediction})`);
      }
    }
  }

  console.log(`${updatedMatchCount} matchs mis à jour.`);

  // 2. Update combine statuses
  console.log("\nVérification du statut des combinés...");
  const { data: combines, error: combinesError } = await supabase
    .from('combines_du_jour')
    .select('id, statut');

  if (combinesError) {
    console.error("Erreur de récupération des combinés :", combinesError.message);
    return;
  }

  const { data: allMatchesForCombines } = await supabase
    .from('matchs_du_combine')
    .select('combine_id, statut_match');

  if (combines && allMatchesForCombines) {
    for (const combine of combines) {
      if (combine.statut === 'gagne' || combine.statut === 'perdu') continue;

      const combineMatches = allMatchesForCombines.filter(m => m.combine_id === combine.id);
      if (combineMatches.length === 0) continue;

      let allWon = true;
      let anyLost = false;

      for (const m of combineMatches) {
        if (m.statut_match === 'perdu') {
          anyLost = true;
        }
        if (m.statut_match !== 'gagne') {
          allWon = false;
        }
      }

      let newStatus = null;
      if (anyLost) newStatus = 'perdu';
      else if (allWon) newStatus = 'gagne';

      if (newStatus && newStatus !== combine.statut) {
        await supabase
          .from('combines_du_jour')
          .update({ statut: newStatus })
          .eq('id', combine.id);
        console.log(`Combiné #${combine.id} mis à jour -> ${newStatus.toUpperCase()}`);
      }
    }
  }

  console.log("=== Terminé ===");
}

main();
