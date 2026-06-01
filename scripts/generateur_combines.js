require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// 1. Initialisation Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erreur : Les variables d'environnement Supabase sont manquantes dans .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Clé The Odds API
const MARKET_TIERS = [
  ['h2h', 'totals', 'spreads', 'btts', 'double_chance', 'draw_no_bet', 'team_totals', 'asian_corners', 'cards'],
  ['h2h', 'totals', 'spreads', 'btts', 'double_chance', 'draw_no_bet', 'team_totals'],
  ['h2h', 'totals', 'spreads', 'btts', 'double_chance'],
  ['h2h', 'totals', 'spreads'],
  ['h2h', 'totals'],
  ['h2h']
];
const { requireEnv } = require('./envHelper');
const ODDS_API_KEY = requireEnv('ODDS_API_KEY');


// Récupère TOUS les sports actifs sans aucun filtre
async function getActiveSports() {
  try {
    console.log("Récupération de tous les sports actifs depuis The Odds API...");
    const response = await axios.get('https://api.the-odds-api.com/v4/sports', {
      params: { apiKey: ODDS_API_KEY }
    });

    const activeSports = response.data.filter(sport => sport.active === true);
    console.log(`Trouvé ${activeSports.length} ligues/sports actifs dans le monde.`);
    return activeSports.map(s => ({ key: s.key, name: s.title, group: s.group }));
  } catch (error) {
    console.error("Impossible de récupérer la liste des sports actifs.", error.message);
    return [];
  }
}

async function fetchOddsForSport(sportKey) {
  // Calculer la fenêtre : maintenant -> dans 48h (format strict ISO 8601 sans millisecondes)
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const pad2 = (n) => String(n).padStart(2, '0');
  const formatDate = (d) =>
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;
  const commenceTimeFrom = formatDate(now);
  const commenceTimeTo = formatDate(in48h);

  // On essaie plusieurs niveaux de marchés (du plus complet au plus basique)
  // Utilise le tableau constant MARKET_TIERS défini en haut du fichier
  for (const markets of MARKET_TIERS) {
    // Simple retry mechanism for transient network errors (max 2 retries)
    let attempt = 0;
    while (attempt < 2) {
      try {
        const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`, {
          params: {
            apiKey: ODDS_API_KEY,
            regions: 'eu',
            markets: markets.join(','),
            oddsFormat: 'decimal',
            commenceTimeFrom: commenceTimeFrom,
            commenceTimeTo: commenceTimeTo
          }
        });
        // If we received matches, return them immediately
        if (response.data && response.data.length > 0) {
          return response.data;
        }
        // Empty response – try next tier instead of exiting early
        break; // exit retry loop, proceed to next markets tier
      } catch (error) {
        const msg = error.response?.data?.message || error.message;
        // Handle known API errors that dictate moving to next tier
        if (msg.includes('Invalid markets') || msg.includes('Markets not supported') || msg.includes('Invalid sport') || msg.includes('not found')) {
          // Continue to next tier
          attempt = 2; // skip retries for this tier
          break;
        }
        // Quota exhausted – stop all fetching
        if (msg.includes('quota') || msg.includes('Usage quota')) {
          console.error(`Quota API atteint pour ${sportKey}. Arrêt des requêtes.`);
          return [];
        }
        // Transient network error – retry after short delay
        attempt++;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500)); // 500 ms back‑off
          continue;
        }
        console.error(`Erreur réseau pour ${sportKey} (tentative ${attempt}):`, msg);
        return [];
      }
    }
  }
  // Aucun match disponible pour ce sport
  return [];
}

// Analyse des cotes d'un match pour trouver TOUS les types de pronostics diversifiés
function extractPredictions(matches, sportGroup) {
  const predictions = [];

  for (const match of matches) {
    const { id, sport_title, home_team, away_team, commence_time, bookmakers } = match;
    if (!bookmakers || bookmakers.length === 0) continue;

    const bookmaker = bookmakers[0];

    for (const market of bookmaker.markets) {
      switch (market.key) {
        // --- H2H (Victoire) ---
        case 'h2h': {
          market.outcomes.forEach(outcome => {
            if (outcome.price >= 1.20 && outcome.price <= 1.80) {
              predictions.push({
                match_id: id,
                sport: sport_title,
                sport_group: sportGroup,
                home_team,
                away_team,
                commence_at: commence_time,
                prediction: `Victoire de ${outcome.name}`,
                market: 'h2h',
                cote: outcome.price,
                type_pari: 'resultat'
              });
            }
          });
          break;
        }

        // --- TOTALS (Plus/Moins de buts/points) ---
        case 'totals': {
          market.outcomes.forEach(outcome => {
            if (outcome.price >= 1.20 && outcome.price <= 1.75) {
              const label = outcome.name === 'Over' ? 'Plus' : 'Moins';
              let suffixe = 'buts/points';
              if (sportGroup === 'Soccer') suffixe = 'buts';
              else if (sportGroup === 'Basketball') suffixe = 'points';
              else if (sportGroup === 'Ice Hockey') suffixe = 'buts';
              else if (sportGroup === 'American Football') suffixe = 'points';
              else if (sportGroup === 'Baseball') suffixe = 'points';
              else if (sportGroup === 'Tennis') suffixe = 'jeux';

              predictions.push({
                match_id: id,
                sport: sport_title,
                sport_group: sportGroup,
                home_team,
                away_team,
                commence_at: commence_time,
                prediction: `${label} de ${outcome.point} ${suffixe}`,
                market: 'totals',
                cote: outcome.price,
                type_pari: 'totaux'
              });
            }
          });
          break;
        }

        // --- SPREADS (Handicap) ---
        case 'spreads': {
          market.outcomes.forEach(outcome => {
            if (outcome.price >= 1.20 && outcome.price <= 1.80) {
              const point = outcome.point;
              if (point < 0) {
                predictions.push({
                  match_id: id,
                  sport: sport_title,
                  sport_group: sportGroup,
                  home_team,
                  away_team,
                  commence_at: commence_time,
                  prediction: `${outcome.name} gagne par plus de ${Math.abs(point)} ${sportGroup === 'Soccer' ? "buts d'écart" : "points d'écart"}`,
                  market: 'spreads',
                  cote: outcome.price,
                  type_pari: 'handicap'
                });
              }
            }
          });
          break;
        }

        // --- BTTS (Chaque équipe marque) ---
        case 'btts': {
          market.outcomes.forEach(outcome => {
            if (outcome.price >= 1.20 && outcome.price <= 1.80) {
              const valeur = outcome.name === 'Yes' ? 'Oui' : 'Non';
              predictions.push({
                match_id: id,
                sport: sport_title,
                sport_group: sportGroup,
                home_team,
                away_team,
                commence_at: commence_time,
                prediction: `Chaque équipe marque : ${valeur}`,
                market: 'btts',
                cote: outcome.price,
                type_pari: 'btts'
              });
            }
          });
          break;
        }

        // --- ASIAN CORNERS (Plus/Moins de X corners) ---
        case 'asian_corners': {
          market.outcomes.forEach(outcome => {
            if (outcome.price >= 1.20 && outcome.price <= 1.80) {
              const label = outcome.name === 'Over' ? 'Plus de' : 'Moins de';
              predictions.push({
                match_id: id,
                sport: sport_title,
                sport_group: sportGroup,
                home_team,
                away_team,
                commence_at: commence_time,
                prediction: `${label} ${outcome.point} Corners`,
                market: 'asian_corners',
                cote: outcome.price,
                type_pari: 'corners'
              });
            }
          });
          break;
        }

        // --- CARDS (Plus/Moins de X cartons) ---
        case 'cards': {
          market.outcomes.forEach(outcome => {
            if (outcome.price >= 1.20 && outcome.price <= 1.80) {
              const label = outcome.name === 'Over' ? 'Plus de' : 'Moins de';
              predictions.push({
                match_id: id,
                sport: sport_title,
                sport_group: sportGroup,
                home_team,
                away_team,
                commence_at: commence_time,
                prediction: `${label} ${outcome.point} Cartons`,
                market: 'cards',
                cote: outcome.price,
                type_pari: 'cartons'
              });
            }
          });
          break;
        }

        // --- DOUBLE CHANCE (1X, X2, 12) ---
        case 'double_chance': {
          market.outcomes.forEach(outcome => {
            if (outcome.price >= 1.20 && outcome.price <= 1.80) {
              predictions.push({
                match_id: id,
                sport: sport_title,
                sport_group: sportGroup,
                home_team,
                away_team,
                commence_at: commence_time,
                prediction: `Double chance : ${outcome.name}`,
                market: 'double_chance',
                cote: outcome.price,
                type_pari: 'double_chance'
              });
            }
          });
          break;
        }

        // --- DRAW NO BET (Nul remboursé) ---
        case 'draw_no_bet': {
          market.outcomes.forEach(outcome => {
            if (outcome.price >= 1.20 && outcome.price <= 1.80) {
              predictions.push({
                match_id: id,
                sport: sport_title,
                sport_group: sportGroup,
                home_team,
                away_team,
                commence_at: commence_time,
                prediction: `Nul remboursé : ${outcome.name}`,
                market: 'draw_no_bet',
                cote: outcome.price,
                type_pari: 'nul_rembourse'
              });
            }
          });
          break;
        }

        // --- TEAM TOTALS (Total de buts d'une équipe) ---
        case 'team_totals': {
          market.outcomes.forEach(outcome => {
            if (outcome.price >= 1.20 && outcome.price <= 1.80) {
              const label = outcome.name === 'Over' ? 'Plus de' : 'Moins de';
              const nomNettoye = outcome.description || outcome.name;
              predictions.push({
                match_id: id,
                sport: sport_title,
                sport_group: sportGroup,
                home_team,
                away_team,
                commence_at: commence_time,
                prediction: `${label} ${outcome.point} (${nomNettoye})`,
                market: 'team_totals',
                cote: outcome.price,
                type_pari: 'buts_equipe'
              });
            }
          });
          break;
        }

        default:
          break;
      }
    }
  }

  return predictions;
}

// Générateur de combinés (SEULE règle : cote totale <= 3.00)
function generateCombinés(predictionsPool, count = 10) {
  const combinés = [];

  if (predictionsPool.length < 2) {
    console.error("Pas assez de pronostics dans le pool pour générer des combinés.");
    return [];
  }

  // Répartition par type pour le diagnostic
  const predictionsByType = {};
  for (const p of predictionsPool) {
    if (!predictionsByType[p.type_pari]) predictionsByType[p.type_pari] = [];
    predictionsByType[p.type_pari].push(p);
  }
  console.log(`\nRépartition par type de pari :`);
  for (const [type, arr] of Object.entries(predictionsByType)) {
    console.log(`  - ${type}: ${arr.length} pronostics`);
  }

  let attempts = 0;
  while (combinés.length < count && attempts < 5000) {
    attempts++;

    const selectionCount = Math.floor(Math.random() * 3) + 2; // 2, 3 ou 4
    const currentSelections = [];
    const usedMatchIds = new Set();
    let totalOdds = 1.0;

    for (let i = 0; i < selectionCount; i++) {
      const availablePool = predictionsPool.filter(bet => !usedMatchIds.has(bet.match_id));
      if (availablePool.length === 0) break;

      const randomBet = availablePool[Math.floor(Math.random() * availablePool.length)];
      currentSelections.push(randomBet);
      usedMatchIds.add(randomBet.match_id);
      totalOdds *= randomBet.cote;
    }

    // SEULE règle : cote totale <= 3.00 et au moins 2 matchs
    if (totalOdds <= 3.00 && currentSelections.length >= 2) {
      const sortedIds = currentSelections.map(m => m.match_id).sort().join('-');
      const alreadyExists = combinés.some(c =>
        c.matchs.map(m => m.match_id).sort().join('-') === sortedIds
      );

      if (!alreadyExists) {
        combinés.push({
          cote_totale: parseFloat(totalOdds.toFixed(2)),
          matchs: currentSelections
        });
      }
    }
  }

  return combinés;
}

async function cleanupOldCombines() {
  console.log("--- Nettoyage des anciens combinés ---");
  const { error } = await supabase.from('combines_du_jour').delete().neq('id', 0);
  if (error) {
    console.error("Erreur lors du nettoyage:", error.message);
  } else {
    console.log("Nettoyage réussi.");
  }
}

async function main() {
  console.log("=== Début de la génération des Combinés PronoMaster (Version Diversifiée) ===");
  
  await cleanupOldCombines();

  // 1. Récupérer TOUS les sports actifs (aucun filtre pays/championnat)
  const activeSports = await getActiveSports();
  if (activeSports.length === 0) {
    console.error("Aucun sport actif trouvé. Arrêt du script.");
    return;
  }

  // Limiter à 10 sports max pour respecter le quota API (suffisant pour générer 10 combinés)
  const sportsToQuery = activeSports.slice(0, 10);
  console.log(`Requêtage de ${sportsToQuery.length} sports (sur ${activeSports.length} disponibles)...`);

  let allPredictions = [];

  // 2. Requêter les cotes
  for (const sport of sportsToQuery) {
    console.log(`\nRécupération des cotes pour : ${sport.name} (${sport.group})...`);
    const matches = await fetchOddsForSport(sport.key);
    if (matches && matches.length > 0) {
      const sportPredictions = extractPredictions(matches, sport.group);
      console.log(`  -> ${sportPredictions.length} pronostics trouvés.`);
      allPredictions = allPredictions.concat(sportPredictions);
    } else {
      console.log(`  -> Aucun match disponible.`);
    }
  }

  console.log(`\n=== Pool total de pronostics disponibles : ${allPredictions.length} ===`);

  // 3. Génération des combinés (seule règle : cote totale <= 3.00)
  const combinésGénérés = generateCombinés(allPredictions, 10);
  console.log(`\n=== Génération terminée. ${combinésGénérés.length}/10 combinés créés (cote totale <= 3.00). ===`);

  if (combinésGénérés.length === 0) {
    console.log("Aucun combiné n'a pu être généré.");
    return;
  }

  // Affichage détaillé
  console.log("\n--- Détail des combinés générés ---");
  for (let i = 0; i < combinésGénérés.length; i++) {
    const combine = combinésGénérés[i];
    console.log(`\n[Combiné #${i + 1}] Cote totale: ${combine.cote_totale}`);
    for (let j = 0; j < combine.matchs.length; j++) {
      const m = combine.matchs[j];
      console.log(`   ${j + 1}. ${m.home_team} vs ${m.away_team} -> ${m.prediction} (@${m.cote}) [${m.type_pari}]`);
    }
  }

  // 4. Insertion dans Supabase
  console.log("\n--- Enregistrement des combinés dans Supabase ---");

  for (let i = 0; i < combinésGénérés.length; i++) {
    const combine = combinésGénérés[i];

    const { data: combineData, error: combineError } = await supabase
      .from('combines_du_jour')
      .insert([{ nom_du_combine: `Combiné #${i + 1}`, cote_totale: combine.cote_totale }])
      .select();

    if (combineError) {
      console.error(`Erreur d'insertion du combiné #${i + 1}:`, combineError.message);
      continue;
    }

    const insertedCombineId = combineData[0].id;
    console.log(`Combiné #${i + 1} inséré avec ID: ${insertedCombineId} (Cote: ${combine.cote_totale})`);

    const matchsToInsert = combine.matchs.map(match => ({
      combine_id: insertedCombineId,
      match_id: match.match_id,
      match_nom: `${match.home_team} vs ${match.away_team}`,
      sport: match.sport,
      home_team: match.home_team,
      away_team: match.away_team,
      commence_at: match.commence_at,
      prediction: match.prediction,
      option_pari: match.prediction,
      market: match.market,
      cote_pari: match.cote,
      cote: match.cote
    }));

    const { error: matchsError } = await supabase
      .from('matchs_du_combine')
      .insert(matchsToInsert);

    if (matchsError) {
      console.error(`Erreur d'insertion des matchs pour le combiné #${i + 1}:`, matchsError.message);
    } else {
      console.log(`  -> ${matchsToInsert.length} matchs associés avec succès.`);
    }
  }

  console.log("\n=== Processus terminé avec succès ===");
}

main();