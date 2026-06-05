const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// ── Utilitaire de pause (rythme sans presse) ───────────────────
const delay = ms => new Promise(res => setTimeout(res, ms));

// ── 1. Initialisation ──────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log("🔍 Vérification des variables : URL =", !!supabaseUrl, "| KEY =", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error("Erreur : Les variables d'environnement Supabase sont manquantes.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    transport: ws
  }
});
const { requireEnv } = require('./envHelper');
const ODDS_API_KEY = requireEnv('ODDS_API_KEY');

// Bookmakers de référence pour la Value Bet
const VALUE_BOOKMAKERS = ['pinnacle', 'bet365', '1xbet'];
const BOOKMAKER_REF = 'pinnacle'; // Bookmaker de référence pour le marché le plus efficient

// ── 2. Priorités par sport ─────────────────────────────────────
const SPORT_STRATEGIES = {
  'Soccer': {
    preferredMarkets: ['double_chance', 'totals', 'btts', 'draw_no_bet'],
    avoidMarkets: ['h2h'], // Éviter les victoires sèches trop risquées
    totalThreshold: 1.5, // Privilégie Plus de 1.5 buts
    oddsRange: [1.25, 1.50]
  },
  'Basketball': {
    preferredMarkets: ['spreads', 'h2h', 'totals'],
    useHandicapFavHome: true, // Favori à domicile avec handicap léger
    oddsRange: [1.30, 1.70]
  },
  'Baseball': {
    preferredMarkets: ['spreads', 'h2h'],
    useHandicapFavHome: true,
    oddsRange: [1.30, 1.70]
  },
  'Ice Hockey': {
    preferredMarkets: ['h2h', 'totals'],
    // NHL : interdit les victoires sèches en temps réglementaire
    // On utilise le Moneyline (h2h inclut les prolongations dans Odds API)
    avoidOutrightWin: true, // Ne pas prendre "Victoire de X" trop serré
    totalsAvgThreshold: 4.5, // Si moyennes élevées -> +4.5 buts
    oddsRange: [1.30, 1.65]
  },
  'American Football': {
    preferredMarkets: ['spreads', 'totals'],
    oddsRange: [1.30, 1.70]
  }
};

// ── 3. Récupération des sports actifs ──────────────────────────
async function getActiveSports() {
  try {
    console.log("Récupération de tous les sports actifs depuis The Odds API...");
    const response = await axios.get('https://api.the-odds-api.com/v4/sports', {
      params: { apiKey: ODDS_API_KEY }
    });
    const activeSports = response.data.filter(sport => sport.active === true);
    console.log(`Trouvé ${activeSports.length} ligues/sports actifs dans le monde.`);
    return activeSports.map(s => ({
      key: s.key,
      name: s.title,
      group: s.group
    }));
  } catch (error) {
    console.error("Impossible de récupérer la liste des sports actifs.", error.message);
    return [];
  }
}

// ── 4. Récupération des scores récents pour l'analyse de forme ─
// Cache simple pour éviter de rappeler l'API pour chaque match
const scoresCache = {};

async function getRecentScoresForSport(sportKey) {
  if (scoresCache[sportKey]) return scoresCache[sportKey];
  try {
    const { data } = await axios.get(
      `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/`,
      { params: { apiKey: ODDS_API_KEY, daysFrom: 30 } }
    );
    const completed = data.filter(m => m.completed && m.scores);
    scoresCache[sportKey] = completed;
    return completed;
  } catch (err) {
    return [];
  }
}

// ── Analyse approfondie de la dynamique des équipes ────────────
async function analyserDynamiqueEquipe(teamName, sportKey, estDomicile) {
  const matches = await getRecentScoresForSport(sportKey);
  const teamMatches = matches.filter(m => {
    const homeMatch = m.home_team && (m.home_team.includes(teamName) || teamName.includes(m.home_team));
    const awayMatch = m.away_team && (m.away_team.includes(teamName) || teamName.includes(m.away_team));
    return homeMatch || awayMatch;
  });

  // Derniers 5 matchs
  const last5 = teamMatches.slice(-5);
  if (last5.length < 2) return { wins: 0, losses: 0, draws: 0, streak: 0, ratioDomicile: null, ratioExterieur: null, winRateDomicile: 0, winRateExterieur: 0 };

  let wins = 0, losses = 0, draws = 0, streak = 0;
  for (const m of last5) {
    const s1 = parseInt(m.scores[0]?.score) || 0;
    const s2 = parseInt(m.scores[1]?.score) || 0;
    const home = m.home_team && (m.home_team.includes(teamName) || teamName.includes(m.home_team));
    const teamScore = home ? s1 : s2;
    const oppScore = home ? s2 : s1;
    if (teamScore > oppScore) { wins++; streak = streak >= 0 ? streak + 1 : 1; }
    else if (teamScore < oppScore) { losses++; streak = streak <= 0 ? streak - 1 : -1; }
    else { draws++; streak = 0; }
  }

  // Analyse spécifique DOMICILE (matchs où l'équipe recevait)
  const homeMatches = last5.filter(m => {
    const homeTeam = m.home_team;
    return homeTeam && (homeTeam.includes(teamName) || teamName.includes(homeTeam));
  });
  const homeWins = homeMatches.filter(m => {
    const s1 = parseInt(m.scores[0]?.score) || 0;
    const s2 = parseInt(m.scores[1]?.score) || 0;
    return s1 > s2;
  }).length;
  const homeLosses = homeMatches.filter(m => {
    const s1 = parseInt(m.scores[0]?.score) || 0;
    const s2 = parseInt(m.scores[1]?.score) || 0;
    return s1 < s2;
  }).length;

  // Analyse spécifique EXTERIEUR (matchs où l'équipe se déplaçait)
  const awayMatches = last5.filter(m => {
    const awayTeam = m.away_team;
    return awayTeam && (awayTeam.includes(teamName) || teamName.includes(awayTeam));
  });
  const awayWins = awayMatches.filter(m => {
    const s1 = parseInt(m.scores[0]?.score) || 0;
    const s2 = parseInt(m.scores[1]?.score) || 0;
    return s2 > s1; // away team = scores[1]
  }).length;
  const awayLosses = awayMatches.filter(m => {
    const s1 = parseInt(m.scores[0]?.score) || 0;
    const s2 = parseInt(m.scores[1]?.score) || 0;
    return s2 < s1;
  }).length;

  const winRateDomicile = homeMatches.length >= 2 ? (homeWins / homeMatches.length) * 100 : 0;
  const winRateExterieur = awayMatches.length >= 2 ? (awayWins / awayMatches.length) * 100 : 0;

  console.log(`   📊 ${teamName} : ${wins}V/${losses}D (${homeWins}V/${homeLosses}D à domicile, ${awayWins}V/${awayLosses}D à l'extérieur) - Série: ${streak}`);

  return {
    wins, losses, draws, streak,
    ratioDomicile: homeMatches.length >= 2 ? `${homeWins}/${homeMatches.length}` : null,
    ratioExterieur: awayMatches.length >= 2 ? `${awayWins}/${awayMatches.length}` : null,
    winRateDomicile,
    winRateExterieur,
    aPerduADomicile: homeLosses > 0,
    invaincuDomicile: homeMatches.length >= 2 && homeLosses === 0,
    nbMatchsDomicile: homeMatches.length,
    nbMatchsExterieur: awayMatches.length
  };
}

// Conserver l'ancien nom pour compatibilité (délègue à la nouvelle fonction)
async function getTeamForm(teamName, sportKey, isHome) {
  return analyserDynamiqueEquipe(teamName, sportKey, isHome);
}

// ── 5. Analyse Value Bet ──────────────────────────────────────
function detectValueBet(outcomes) {
  // outcomes = tableau de { name, price } d'un marché donné
  // Calcule la cote moyenne et détecte si un bookmaker est anormalement haut
  if (!outcomes || outcomes.length === 0) return { value: false, avgPrice: 0, bestPrice: 0, bestBookmaker: '' };

  const prices = outcomes.map(o => o.price).filter(p => p > 1);
  if (prices.length === 0) return { value: false, avgPrice: 0, bestPrice: 0, bestBookmaker: '' };

  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const best = outcomes.reduce((max, o) => o.price > max.price ? o : max, outcomes[0]);

  // Si le meilleur prix est significativement plus haut que la moyenne (+10%)
  // et que la cote est dans une plage raisonnable
  const premium = best.price / avgPrice;
  const isValue = premium > 1.05 && best.price >= 1.20 && best.price <= 2.50;

  return {
    value: isValue,
    avgPrice: parseFloat(avgPrice.toFixed(2)),
    bestPrice: best.price,
    premium: parseFloat(premium.toFixed(3))
  };
}

// ── 6. Calcul de l'Indice de Confiance ─────────────────────────
async function calculerIndiceConfiance(match, sportGroup, homeForm, awayForm, bookmakers) {
  let score = 70; // Base
  let reasons = [];

  // ── A. Analyse de forme approfondie ──
  if (homeForm && awayForm) {
    const homeStreak = homeForm.streak || 0;
    const awayStreak = awayForm.streak || 0;

    // Momentum
    if (homeStreak >= 2) { score += 8; reasons.push("🏠 Domicile en bonne dynamique"); }
    if (awayStreak <= -2) { score += 5; reasons.push("🎯 Extérieur en crise"); }

    // --- Analyse ratio DOMICILE vs EXTERIEUR ---
    // L'équipe à domicile : regarder son winRate à domicile
    if (homeForm.winRateDomicile >= 60) {
      score += 12;
      reasons.push(`🏠 ${match.home_team} solide à domicile (${homeForm.winRateDomicile.toFixed(0)}% victoires)`);
    } else if (homeForm.winRateDomicile <= 30 && homeForm.nbMatchsDomicile >= 2) {
      score -= 20;
      reasons.push(`⚠️ ${match.home_team} faible à domicile (${homeForm.winRateDomicile.toFixed(0)}% victoires)`);
    }

    // L'équipe à l'extérieur : regarder son winRate à l'extérieur
    if (awayForm.winRateExterieur <= 25 && awayForm.nbMatchsExterieur >= 2) {
      score += 8;
      reasons.push(`🎯 ${match.away_team} médiocre à l'extérieur (${awayForm.winRateExterieur.toFixed(0)}% victoires)`);
    } else if (awayForm.winRateExterieur >= 60 && awayForm.nbMatchsExterieur >= 2) {
      score -= 10;
      reasons.push(`⚠️ ${match.away_team} performant à l'extérieur`);
    }

    // Filtre de validateur : favori à l'extérieur face à une équipe solide à domicile
    const h2hMarket = bookmakers?.[0]?.markets?.find(m => m.key === 'h2h');
    if (h2hMarket && h2hMarket.outcomes.length >= 2) {
      const homeOutcome = h2hMarket.outcomes.find(o => o.name === match.home_team);
      const awayOutcome = h2hMarket.outcomes.find(o => o.name === match.away_team);
      if (homeOutcome && awayOutcome) {
        const favoriteIsHome = homeOutcome.price < awayOutcome.price;
        // Si le favori joue à l'extérieur
        if (!favoriteIsHome) {
          // Filtre strict : rejeter si favori extérieur face à équipe invaincue à domicile
          if (homeForm.invaincuDomicile && homeForm.nbMatchsDomicile >= 2) {
            score -= 40;
            reasons.push("❌ FAVORI EXTERIEUR face à une équipe invaincue à domicile");
          }
          // Aussi pénaliser si l'équipe à domicile a un bon winRate
          if (homeForm.winRateDomicile >= 50 && homeForm.nbMatchsDomicile >= 2) {
            score -= 15;
            reasons.push("⚠️ Favori extérieur face à un domicile solide");
          }
        }
        if (favoriteIsHome && homeForm.wins >= 2) {
          score += 10;
          reasons.push("✅ Favori à domicile en forme");
        }
      }
    }
  }

  // ── B. Analyse Value Bet ──
  let valueDetected = false;
  let totalPremium = 0;
  let valueCount = 0;

  for (const bm of bookmakers || []) {
    for (const market of bm.markets || []) {
      if (['h2h', 'totals', 'spreads'].includes(market.key)) {
        const analysis = detectValueBet(market.outcomes);
        if (analysis.value) {
          valueDetected = true;
          totalPremium += analysis.premium;
          valueCount++;
        }
      }
    }
  }

  if (valueDetected) {
    const avgPremium = totalPremium / valueCount;
    if (avgPremium > 1.08) { score += 12; reasons.push("💰 Value Bet détectée (+" + ((avgPremium - 1) * 100).toFixed(0) + "%)"); }
    else { score += 7; reasons.push("📊 Légère Value détectée"); }
  }

  return { score: Math.min(100, Math.max(0, score)), reasons, passing: score >= 55 };
}

// ── 7. Extraction des pronostics avec analyse intelligente ────
async function extractPredictions(matches, sportGroup, sportKey) {
  const predictions = [];

  for (const match of matches) {
    const { id, sport_title, home_team, away_team, commence_time, bookmakers } = match;
    if (!bookmakers || bookmakers.length === 0) continue;

    // Pause de 2 secondes entre chaque match (rythme sans presse)
    console.log(`   ⏳ Pause 2s avant analyse de ${home_team} vs ${away_team}...`);
    await delay(2000);

    // Récupérer la forme des équipes via l'analyse approfondie
    const homeForm = await analyserDynamiqueEquipe(home_team, sportKey, true);
    const awayForm = await analyserDynamiqueEquipe(away_team, sportKey, false);

    // Calculer l'indice de confiance global
    const confiance = await calculerIndiceConfiance(match, sportGroup, homeForm, awayForm, bookmakers);
    if (!confiance.passing) {
      console.log(`   ⛔ ${home_team} vs ${away_team} rejeté (confiance: ${confiance.score}/100) : ${confiance.reasons.join(', ')}`);
      continue;
    }

    const strategy = SPORT_STRATEGIES[sportGroup] || { preferredMarkets: ['h2h', 'totals', 'spreads', 'double_chance', 'btts'], oddsRange: [1.20, 1.80] };
    const usedBookmaker = bookmakers[0];

    for (const market of usedBookmaker.markets) {
      // --- FOOTBALL : Double Chance ou +1.5 buts ---
      if (sportGroup === 'Soccer') {
        if (market.key === 'double_chance') {
          for (const outcome of market.outcomes) {
            if (outcome.price >= strategy.oddsRange[0] && outcome.price <= strategy.oddsRange[1]) {
              predictions.push({
                match_id: id, sport: sport_title, sport_group: sportGroup,
                home_team, away_team, commence_at: commence_time,
                prediction: `Double chance : ${outcome.name}`,
                market: 'double_chance', cote: outcome.price,
                type_pari: 'double_chance', confiance: confiance.score,
                value_bet: confiance.reasons.some(r => r.includes('Value'))
              });
            }
          }
        }
        if (market.key === 'totals') {
          for (const outcome of market.outcomes) {
            if (outcome.name === 'Over' && (outcome.point === 1.5 || outcome.point === 2.5)) {
              if (outcome.price >= 1.20 && outcome.price <= 1.60) {
                predictions.push({
                  match_id: id, sport: sport_title, sport_group: sportGroup,
                  home_team, away_team, commence_at: commence_time,
                  prediction: `Plus de ${outcome.point} buts`,
                  market: 'totals', cote: outcome.price,
                  type_pari: 'totaux', confiance: confiance.score,
                  value_bet: confiance.reasons.some(r => r.includes('Value'))
                });
              }
            }
          }
        }
        if (market.key === 'btts') {
          for (const outcome of market.outcomes) {
            if (outcome.price >= 1.50 && outcome.price <= 1.80 && outcome.name === 'No') {
              predictions.push({
                match_id: id, sport: sport_title, sport_group: sportGroup,
                home_team, away_team, commence_at: commence_time,
                prediction: 'Chaque équipe marque : Non',
                market: 'btts', cote: outcome.price,
                type_pari: 'btts', confiance: confiance.score,
                value_bet: confiance.reasons.some(r => r.includes('Value'))
              });
            }
          }
        }
      }

      // --- BASKETBALL / BASEBALL : Handicap de sécurité pour favori à domicile ---
      else if (sportGroup === 'Basketball' || sportGroup === 'Baseball') {
        if (market.key === 'spreads') {
          for (const outcome of market.outcomes) {
            const point = outcome.point;
            if (point < 0 && outcome.price >= 1.30 && outcome.price <= 1.75) {
              predictions.push({
                match_id: id, sport: sport_title, sport_group: sportGroup,
                home_team, away_team, commence_at: commence_time,
                prediction: `${outcome.name} gagne par plus de ${Math.abs(point)} points d'écart`,
                market: 'spreads', cote: outcome.price,
                type_pari: 'handicap', confiance: confiance.score,
                value_bet: confiance.reasons.some(r => r.includes('Value'))
              });
            }
          }
        }
        if (market.key === 'h2h' && !usedBookmaker.markets.some(m => m.key === 'spreads')) {
          for (const outcome of market.outcomes) {
            if (outcome.price >= 1.25 && outcome.price <= 1.55) {
              if (outcome.name === home_team) {
                predictions.push({
                  match_id: id, sport: sport_title, sport_group: sportGroup,
                  home_team, away_team, commence_at: commence_time,
                  prediction: `Victoire de ${outcome.name}`,
                  market: 'h2h', cote: outcome.price,
                  type_pari: 'resultat', confiance: confiance.score,
                  value_bet: confiance.reasons.some(r => r.includes('Value'))
                });
              }
            }
          }
        }
      }

      // --- NHL (HOCKEY SUR GLACE) : UNIQUEMENT Moneyline ou +4.5 buts ---
      else if (sportGroup === 'Ice Hockey') {
        // Marché Moneyline (h2h inclut les prolongations dans Odds API)
        if (market.key === 'h2h') {
          for (const outcome of market.outcomes) {
            // UNIQUEMENT favori à domicile en Moneyline
            if (outcome.price >= 1.35 && outcome.price <= 1.65 && outcome.name === home_team) {
              predictions.push({
                match_id: id, sport: sport_title, sport_group: sportGroup,
                home_team, away_team, commence_at: commence_time,
                prediction: `Victoire ${outcome.name} (ML)`,
                market: 'h2h', cote: outcome.price,
                type_pari: 'moneyline_nhl', confiance: confiance.score,
                value_bet: confiance.reasons.some(r => r.includes('Value'))
              });
            }
          }
        }
        // Alternative : Plus de 4.5 buts (pas de victoire sèche)
        if (market.key === 'totals') {
          for (const outcome of market.outcomes) {
            if (outcome.name === 'Over' && outcome.point >= 4.5 && outcome.point <= 5.5) {
              if (outcome.price >= 1.50 && outcome.price <= 1.85) {
                predictions.push({
                  match_id: id, sport: sport_title, sport_group: sportGroup,
                  home_team, away_team, commence_at: commence_time,
                  prediction: `Plus de ${outcome.point} buts`,
                  market: 'totals', cote: outcome.price,
                  type_pari: 'totaux_nhl', confiance: confiance.score,
                  value_bet: confiance.reasons.some(r => r.includes('Value'))
                });
              }
            }
          }
        }
      }

      // --- AUTRES SPORTS (fallback générique) ---
      else {
        if (market.key === 'h2h') {
          for (const outcome of market.outcomes) {
            if (outcome.price >= 1.30 && outcome.price <= 1.70 && outcome.name === home_team) {
              predictions.push({
                match_id: id, sport: sport_title, sport_group: sportGroup,
                home_team, away_team, commence_at: commence_time,
                prediction: `Victoire de ${outcome.name}`,
                market: 'h2h', cote: outcome.price,
                type_pari: 'resultat', confiance: confiance.score,
                value_bet: confiance.reasons.some(r => r.includes('Value'))
              });
            }
          }
        }
      }
    }
  }

  return predictions;
}

// ── 8. Générateur de combinés intelligents ─────────────────────
function generateCombinés(predictionsPool, count = 10, globalUsedMatchIds = new Set()) {
  const combinés = [];

  if (predictionsPool.length < 2) {
    console.error("Pas assez de pronostics dans le pool (minimum 2 requis).");
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
    console.log(`  - ${type}: ${arr.length} pronostics (confiance avg: ${(arr.reduce((s, p) => s + (p.confiance || 0), 0) / arr.length).toFixed(0)})`);
  }

  // Trier par confiance décroissante pour favoriser les meilleurs pronostics
  const sortedPool = [...predictionsPool].sort((a, b) => (b.confiance || 0) - (a.confiance || 0));

  let attempts = 0;
  while (combinés.length < count && attempts < 3000) {
    attempts++;

    // 2 ou 3 matchs max (pas 4)
    const selectionCount = Math.random() < 0.6 ? 2 : 3;
    const currentSelections = [];
    const usedMatchIds = new Set();
    const usedSports = new Set();
    let totalOdds = 1.0;
    let avgConfiance = 0;

    for (let i = 0; i < selectionCount; i++) {
      // À chaque itération, on pioche dans le pool trié (les meilleurs confiance en premier)
      // mais avec une préférence pour les sports variés
      // On exclut aussi les matchs déjà utilisés dans des combinés précédents (globalUsedMatchIds)
      let availablePool;
      if (i === 0) {
        // Premier choix : meilleur pronostic disponible (jamais utilisé)
        availablePool = sortedPool.filter(bet =>
          !usedMatchIds.has(bet.match_id) &&
          !globalUsedMatchIds.has(bet.match_id)
        );
      } else {
        // Choix suivants : favoriser les sports différents
        availablePool = sortedPool.filter(bet =>
          !usedMatchIds.has(bet.match_id) &&
          !globalUsedMatchIds.has(bet.match_id) &&
          !usedSports.has(bet.sport_group)
        );
        // Si aucun sport différent disponible, on autorise le même sport
        if (availablePool.length === 0) {
          availablePool = sortedPool.filter(bet =>
            !usedMatchIds.has(bet.match_id) &&
            !globalUsedMatchIds.has(bet.match_id)
          );
        }
      }

      if (availablePool.length === 0) break;

      // Prendre le meilleur pronostic disponible (ou aléatoire pondéré par confiance)
      const pickIndex = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * Math.min(availablePool.length, 5));
      const selected = availablePool[pickIndex];
      currentSelections.push(selected);
      usedMatchIds.add(selected.match_id);
      if (selected.sport_group) usedSports.add(selected.sport_group);
      totalOdds *= selected.cote;
      avgConfiance += (selected.confiance || 0);
    }

    avgConfiance = currentSelections.length > 0 ? avgConfiance / currentSelections.length : 0;

    // Nouvelles règles strictes : cote entre 1.80 et 2.50, confiance minimale, 2-3 matchs
    if (
      totalOdds >= 1.80 &&
      totalOdds <= 2.50 &&
      currentSelections.length >= 2 &&
      currentSelections.length <= 3 &&
      avgConfiance >= 55
    ) {
      const sortedIds = currentSelections.map(m => m.match_id).sort().join('-');
      const alreadyExists = combinés.some(c =>
        c.matchs.map(m => m.match_id).sort().join('-') === sortedIds
      );

      if (!alreadyExists) {
        combinés.push({
          cote_totale: parseFloat(totalOdds.toFixed(2)),
          confiance_moyenne: Math.round(avgConfiance),
          nb_sports: usedSports.size,
          sports: [...usedSports].join(', '),
          matchs: currentSelections
        });
      }
    }
  }

  return combinés;
}

// ── 9. Nettoyage anciens combinés ──────────────────────────────
async function cleanupOldCombines() {
  console.log("--- Nettoyage des anciens combinés (plus de 3 jours) ---");
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const { error } = await supabase.from('combines_du_jour').delete().lt('created_at', threeDaysAgo.toISOString());
  if (error) {
    console.error("Erreur lors du nettoyage:", error.message);
  } else {
    console.log("Nettoyage réussi.");
  }
}

// ── 10. Main ───────────────────────────────────────────────────
async function main() {
  console.log("=== 🧠 Début de la génération intelligente des Combinés PronoMaster ===");
  console.log("=== Analyse : Forme × Value Bet × Sécurité Multisports ===\n");

  await cleanupOldCombines();

  // 1. Récupérer TOUS les sports actifs
  const activeSports = await getActiveSports();
  if (activeSports.length === 0) {
    console.error("Aucun sport actif trouvé. Arrêt du script.");
    return;
  }

  // Limiter à 12 sports max (on prend + de sports pour avoir + de diversité)
  // Prioriser les sports avec stratégies définies
  const sportsPriority = ['Soccer', 'Basketball', 'Baseball', 'Ice Hockey', 'American Football'];
  const ordered = [
    ...sportsPriority.flatMap(group => activeSports.filter(s => s.group === group)).slice(0, 8),
    ...activeSports.filter(s => !sportsPriority.includes(s.group)).slice(0, 4)
  ];
  const sportsToQuery = ordered.slice(0, 12);
  console.log(`Requêtage de ${sportsToQuery.length} sports (sur ${activeSports.length} disponibles)...`);

  let allPredictions = [];

  // 2. Requêter les cotes avec analyse intelligente
  for (const sport of sportsToQuery) {
    console.log(`\n🔍 Récupération des cotes pour : ${sport.name} (${sport.group})...`);
    const matches = await fetchOddsForSport(sport.key);
    if (matches && matches.length > 0) {
      console.log(`   Analyse de ${matches.length} matchs avec indice de confiance...`);
      const sportPredictions = await extractPredictions(matches, sport.group, sport.key);
      console.log(`   -> ${sportPredictions.length} pronostics retenus après filtrage.`);
      allPredictions = allPredictions.concat(sportPredictions);
    } else {
      console.log(`   -> Aucun match disponible.`);
    }
  }

  console.log(`\n=== Pool total de pronostics validés : ${allPredictions.length} ===`);

  // Vérifier combien de combinés valides existent déjà
  const now = new Date();
  const { data: recentCombines } = await supabase
    .from('combines_du_jour')
    .select(`id, matchs:matchs_du_combine (commence_at)`)
    .order('id', { ascending: false })
    .limit(30);

  let validCount = 0;
  if (recentCombines) {
    for (const c of recentCombines) {
      if (c.matchs && c.matchs.length > 0) {
        const isValid = c.matchs.every(m => new Date(m.commence_at).getTime() > now.getTime());
        if (isValid) validCount++;
      }
    }
  }

  const neededCombines = Math.max(0, 10 - validCount);
  console.log(`\nCombinés valides existants : ${validCount}. Nouveaux combinés nécessaires : ${neededCombines}`);

  if (neededCombines === 0) {
    console.log("Aucun nouveau combiné nécessaire. Processus terminé.");
    return;
  }

  // 3. Génération intelligente avec anti-doublon global
  const globalUsedMatchIds = new Set();
  const combinésGénérés = generateCombinés(allPredictions, neededCombines, globalUsedMatchIds);

  // Ajouter les matchs des combinés générés dans le Set global pour éviter les doublons lors de prochains cycles
  for (const c of combinésGénérés) {
    for (const m of c.matchs) {
      globalUsedMatchIds.add(m.match_id);
    }
  }

  console.log(`\n=== Génération terminée. ${combinésGénérés.length}/${neededCombines} combinés créés (cote: 1.80-2.50). ===`);
  if (globalUsedMatchIds.size > 0) {
    console.log(`   ${globalUsedMatchIds.size} matchs uniques utilisés (aucun doublon entre combinés).`);
  }

  if (combinésGénérés.length === 0) {
    console.log("Aucun combiné n'a pu être généré (pas assez de pronostics avec confiance suffisante).");
    return;
  }

  // Affichage détaillé
  console.log("\n--- Détail des combinés générés ---");
  for (let i = 0; i < combinésGénérés.length; i++) {
    const c = combinésGénérés[i];
    console.log(`\n[Combiné #${i + 1}] Cote: ${c.cote_totale} | Confiance: ${c.confiance_moyenne}% | Sports: ${c.sports}`);
    for (let j = 0; j < c.matchs.length; j++) {
      const m = c.matchs[j];
      console.log(`   ${j + 1}. ${m.home_team} vs ${m.away_team} -> ${m.prediction} (@${m.cote}) [${m.type_pari}] ${m.value_bet ? '💰' : ''}`);
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
    console.log(`Combiné #${i + 1} inséré avec ID: ${insertedCombineId} (Cote: ${combine.cote_totale}, Confiance: ${combine.confiance_moyenne}%)`);

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

  console.log("\n=== 🧠 Processus terminé avec succès ===");
}

// ── Réutiliser fetchOddsForSport depuis la version existante ──
const MARKET_TIERS = [
  ['h2h', 'totals', 'spreads', 'btts', 'double_chance', 'draw_no_bet', 'team_totals', 'asian_corners', 'cards'],
  ['h2h', 'totals', 'spreads', 'btts', 'double_chance', 'draw_no_bet', 'team_totals'],
  ['h2h', 'totals', 'spreads', 'btts', 'double_chance'],
  ['h2h', 'totals', 'spreads'],
  ['h2h', 'totals'],
  ['h2h']
];

async function fetchOddsForSport(sportKey) {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const pad2 = (n) => String(n).padStart(2, '0');
  const formatDate = (d) =>
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;
  const commenceTimeFrom = formatDate(now);
  const commenceTimeTo = formatDate(in24h);

  for (const markets of MARKET_TIERS) {
    let attempt = 0;
    while (attempt < 2) {
      try {
        const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`, {
          params: {
            apiKey: ODDS_API_KEY,
            regions: 'eu',
            markets: markets.join(','),
            oddsFormat: 'decimal',
            commenceTimeFrom,
            commenceTimeTo
          }
        });
        if (response.data && response.data.length > 0) return response.data;
        break;
      } catch (error) {
        const msg = error.response?.data?.message || error.message;
        if (msg.includes('Invalid markets') || msg.includes('Markets not supported') || msg.includes('Invalid sport') || msg.includes('not found')) {
          attempt = 2;
          break;
        }
        if (msg.includes('quota') || msg.includes('Usage quota')) {
          console.error(`Quota API atteint pour ${sportKey}. Arrêt des requêtes.`);
          return [];
        }
        attempt++;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        console.error(`Erreur réseau pour ${sportKey} (tentative ${attempt}):`, msg);
        return [];
      }
    }
  }
  return [];
}

main();