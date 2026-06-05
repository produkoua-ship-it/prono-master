const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// ── Utilitaire de pause ────────────────────────────────────────
const delay = ms => new Promise(res => setTimeout(res, ms));

// ── Configuration ──────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY;

console.log("🔍 Vérification des variables : URL =", !!supabaseUrl, "| KEY =", !!supabaseKey, "| ODDS =", !!ODDS_API_KEY);

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Variables d'environnement Supabase manquantes.");
    process.exit(1);
}
if (!ODDS_API_KEY) {
    console.error("❌ ODDS_API_KEY manquante.");
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

const MISE_DEPART = 1000;
const COTE_CIBLE = 1.50;
const TOTAL_JOURS = 17;
const DELAI_APRES_MATCH_MS = 2 * 60 * 60 * 1000; // 2h après le coup d'envoi
const MAX_RETRY = 3; // Nombre max de tentatives avant d'alerter
const RETRY_DELAY_MS = 15 * 60 * 1000; // 15 minutes entre chaque tentative

// ── Système de logs Supabase ───────────────────────────────────
async function logToSupabase(level, message, data = {}) {
    try {
        await supabase.from("logs_robot").insert([{
            level, // 'info', 'warning', 'error'
            message,
            data,
            created_at: new Date().toISOString(),
        }]);
    } catch (e) {
        console.error("⚠️ Erreur écriture log Supabase :", e.message);
    }
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Récupère la clé API d'un sport via son titre (ex: "Soccer" -> "soccer_epl")
 */
async function getSportKeyFromTitle(title) {
    try {
        const { data } = await axios.get('https://api.the-odds-api.com/v4/sports', {
            params: { apiKey: ODDS_API_KEY }
        });
        const match = data.find(s => s.title === title || s.group === title);
        return match ? match.key : null;
    } catch (err) {
        console.error("Erreur récupération sports :", err.message);
        return null;
    }
}

/**
 * Récupère les scores d'un match via The Odds API
 * Retourne { homeScore, awayScore, completed } ou null
 */
async function fetchMatchScore(sportKey, matchId) {
    try {
        const { data } = await axios.get(
            `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/`,
            { params: { apiKey: ODDS_API_KEY, daysFrom: 3 } }
        );
        const found = data.find(m => m.id === matchId);
        if (!found) return null;
        if (!found.completed || !found.scores || found.scores.length < 2) return null;
        return {
            homeScore: parseInt(found.scores[0].score) || 0,
            awayScore: parseInt(found.scores[1].score) || 0,
            completed: true
        };
    } catch (err) {
        console.error(`Erreur scores pour ${sportKey} :`, err.message);
        return null;
    }
}

/**
 * Détermine si le pronostic est gagné ou perdu en fonction du score réel
 * Logique calquée sur verificateur_resultats.js
 */
function verifierPronostic(match, homeScore, awayScore) {
    const market = match.market;
    const prediction = match.prediction || '';

    try {
        // ── H2H ──
        if (market === 'h2h') {
            const predictedTeam = prediction.replace('Victoire de ', '').trim();
            let predictedScore, otherScore;
            if (match.home_team && (match.home_team.includes(predictedTeam) || predictedTeam.includes(match.home_team))) {
                predictedScore = homeScore; otherScore = awayScore;
            } else if (match.away_team && (match.away_team.includes(predictedTeam) || predictedTeam.includes(match.away_team))) {
                predictedScore = awayScore; otherScore = homeScore;
            } else {
                // Fallback : premier nom = home
                predictedScore = homeScore; otherScore = awayScore;
            }
            return predictedScore > otherScore ? 'GAGNE' : 'PERDU';
        }

        // ── TOTALS ──
        if (market === 'totals') {
            const isOver = prediction.toLowerCase().includes('plus') || prediction.toLowerCase().includes('over');
            const matchPoint = prediction.match(/(\d+\.?\d*)/);
            if (!matchPoint) return null;
            const point = parseFloat(matchPoint[1]);
            const total = homeScore + awayScore;
            if (isOver) return total > point ? 'GAGNE' : 'PERDU';
            return total < point ? 'GAGNE' : 'PERDU';
        }

        // ── BTTS ──
        if (market === 'btts') {
            const isYes = prediction.includes('Oui');
            const bothScored = homeScore > 0 && awayScore > 0;
            if (isYes) return bothScored ? 'GAGNE' : 'PERDU';
            return !bothScored ? 'GAGNE' : 'PERDU';
        }

        // ── DOUBLE CHANCE ──
        if (market === 'double_chance') {
            const isDraw = homeScore === awayScore;
            const homeWon = homeScore > awayScore;
            const awayWon = awayScore > homeScore;
            if (prediction.includes('1X') || prediction.toLowerCase().includes('home/draw'))
                return (homeWon || isDraw) ? 'GAGNE' : 'PERDU';
            if (prediction.includes('X2') || prediction.toLowerCase().includes('draw/away'))
                return (awayWon || isDraw) ? 'GAGNE' : 'PERDU';
            if (prediction.includes('12') || prediction.toLowerCase().includes('home/away'))
                return (!isDraw) ? 'GAGNE' : 'PERDU';
            // Fallback
            return null;
        }

        // ── DRAW NO BET ──
        if (market === 'draw_no_bet') {
            if (homeScore === awayScore) return null; // Remboursé → ignoré
            const predictedTeam = prediction.replace('Nul remboursé :', '').replace('Nul remboursé:', '').trim();
            let predictedScore, otherScore;
            if (match.home_team && (match.home_team.includes(predictedTeam) || predictedTeam.includes(match.home_team))) {
                predictedScore = homeScore; otherScore = awayScore;
            } else {
                predictedScore = awayScore; otherScore = homeScore;
            }
            return predictedScore > otherScore ? 'GAGNE' : 'PERDU';
        }

        // ── SPREADS ──
        if (market === 'spreads') {
            const pointMatch = prediction.match(/(\d+\.?\d*)/);
            if (!pointMatch) return null;
            const spread = parseFloat(pointMatch[1]);
            // "Team A gagne par plus de X buts/points d'écart"
            const isHome = prediction.includes(match.home_team || '');
            const diff = isHome ? (homeScore - awayScore) : (awayScore - homeScore);
            return diff > spread ? 'GAGNE' : 'PERDU';
        }

        // Marchés non supportés (corners, cartons, team_totals…)
        console.log(`   ℹ️  Marché "${market}" non vérifiable via scores API.`);
        return null;

    } catch (err) {
        console.error("   Erreur vérification pronostic :", err.message);
        return null;
    }
}

// ── Main ───────────────────────────────────────────────────────

/**
 * Sélectionne un match disponible dans les combinés et crée une nouvelle ligne montante
 */
async function initMontanteDepuisCombinés() {
    console.log("\n🔍 Aucune montante active — tentative de création via les combinés...");

    // Chercher des matchs à venir dans matchs_du_combine
    const maintenant = new Date().toISOString();
    const { data: matchsDispos, error } = await supabase
        .from("matchs_du_combine")
        .select("match_id, combine_id, home_team, away_team, prediction, market, cote, commence_at, sport")
        .gt("commence_at", maintenant)
        .order("cote", { ascending: true })
        .limit(10);

    if (error || !matchsDispos || matchsDispos.length === 0) {
        console.log("⚠️  Aucun match disponible dans les combinés pour initialiser la montante.");
        return false;
    }

    // Prendre le match avec la cote la plus proche de COTE_CIBLE (1.50)
    const meilleurMatch = matchsDispos.reduce((best, m) => {
        const diff = Math.abs(m.cote - COTE_CIBLE);
        const bestDiff = Math.abs(best.cote - COTE_CIBLE);
        return diff < bestDiff ? m : best;
    }, matchsDispos[0]);

    console.log(`   Match sélectionné : ${meilleurMatch.home_team} vs ${meilleurMatch.away_team} (@${meilleurMatch.cote}) — ${meilleurMatch.sport || "Sport inconnu"}`);

    const matchData = {
        home_team: meilleurMatch.home_team,
        away_team: meilleurMatch.away_team,
        prediction: meilleurMatch.prediction,
        cote: meilleurMatch.cote,
        commence_at: meilleurMatch.commence_at,
        sport: meilleurMatch.sport || null,
    };

    // Vérifier s'il existe déjà une ligne EN_COURS pour ce cycle
    const { data: existante } = await supabase
        .from("montante_du_jour")
        .select("id")
        .eq("statut", "EN_COURS")
        .limit(1);

    if (existante && existante.length > 0) {
        console.log("⚠️  Une ligne EN_COURS existe déjà. On met à jour ses matchs plutôt que d'en créer une nouvelle.");
        const { error: updateErr } = await supabase
            .from("montante_du_jour")
            .update({ matchs: [matchData] })
            .eq("id", existante[0].id);
        if (updateErr) {
            console.error("❌ Erreur mise à jour matchs :", updateErr.message);
            return false;
        }
        console.log(`✅ Match associé à la montante #${existante[0].id}`);
        return true;
    }

    // Créer une nouvelle ligne
    const { error: insertErr } = await supabase
        .from("montante_du_jour")
        .insert([{
            jour_actuel: 1,
            mise_actuelle: MISE_DEPART,
            cote_cible: COTE_CIBLE,
            statut: "EN_COURS",
            matchs: [matchData],
        }]);

    if (insertErr) {
        console.error("❌ Erreur création montante :", insertErr.message);
        return false;
    }

    console.log("✅ Nouvelle montante créée avec un match !");
    return true;
}

async function main() {
    console.log("🤖 === Robot Montante - Vérification automatique ===\n");

    // 0. Si aucun match n'est associé, tenter d'en piocher un depuis les combinés
    const { data: checkMatchs } = await supabase
        .from("montante_du_jour")
        .select("matchs")
        .eq("statut", "EN_COURS")
        .order("id", { ascending: false })
        .limit(1)
        .single();

    const matchsVides = !checkMatchs || !checkMatchs.matchs || checkMatchs.matchs.length === 0;

    if (matchsVides) {
        const initOk = await initMontanteDepuisCombinés();
        if (!initOk) {
            console.log("ℹ️  Impossible d'initialiser la montante. Fin.");
            return;
        }
    }

    // 1. Récupérer la dernière ligne EN_COURS
    const { data: derniere, error: fetchError } = await supabase
        .from("montante_du_jour")
        .select("*")
        .eq("statut", "EN_COURS")
        .order("id", { ascending: false })
        .limit(1)
        .single();

    if (fetchError || !derniere) {
        console.log("ℹ️  Aucune montante EN_COURS trouvée.", fetchError?.message || "");
        return;
    }

    console.log(`📋 Jour ${derniere.jour_actuel}/${TOTAL_JOURS} | Mise: ${derniere.mise_actuelle} FCFA | Statut: ${derniere.statut}`);

    // 2. Vérifier que le match existe et est terminé
    const matchs = derniere.matchs || [];
    const match = matchs[0];
    if (!match || !match.commence_at) {
        console.log("⚠️  Pas de match associé à cette montante.");
        return;
    }

    const matchTime = new Date(match.commence_at).getTime();
    const now = Date.now();
    if (now < matchTime + DELAI_APRES_MATCH_MS) {
        const resteMin = Math.round((matchTime + DELAI_APRES_MATCH_MS - now) / 60000);
        console.log(`⏳ Match pas encore terminé. Attente encore ~${resteMin} min.`);
        return;
    }

    // 3. Récupérer le score réel via The Odds API
    console.log(`🔍 Vérification du score via The Odds API...`);
    console.log(`   Match : ${match.home_team} vs ${match.away_team}`);
    console.log(`   Sport : ${match.sport || match.sport_group || 'inconnu'}`);

    let scoreResult = null;
    let retryCount = 0;

    while (!scoreResult && retryCount < MAX_RETRY) {
        const sportKey = await getSportKeyFromTitle(match.sport || match.sport_group || '');
        if (!sportKey) {
            console.log(`⚠️  Clé de sport introuvable pour "${match.sport}". Impossible de vérifier le score.`);
            await logToSupabase("warning", `Sport key not found: ${match.sport}`, { match_id: match.match_id });
            return;
        }

        console.log(`   Clé API : ${sportKey} (tentative ${retryCount + 1}/${MAX_RETRY})`);
        scoreResult = await fetchMatchScore(sportKey, match.match_id);

        if (!scoreResult) {
            retryCount++;
            if (retryCount < MAX_RETRY) {
                console.log(`   ⏳ Tentative ${retryCount}/${MAX_RETRY} échouée. Nouvel essai dans 15 min...`);
                await logToSupabase("info", `Retry ${retryCount}/${MAX_RETRY} pour match ${match.home_team} vs ${match.away_team}`);
                await delay(RETRY_DELAY_MS);
            }
        }
    }

    if (!scoreResult) {
        // Après X tentatives : match considéré comme reporté/annulé → cote = 1.00, passage au jour suivant
        console.log("⚠️  ⚠️ Match non trouvé après toutes les tentatives — considéré comme REPORTÉ/ANNULÉ.");
        await logToSupabase("warning", `Match reporté/annulé après ${MAX_RETRY} tentatives : ${match.home_team} vs ${match.away_team}`, {
            match_id: match.match_id,
            statut_traite: "ANNULE_COTE_1.00"
        });

        // Mettre le statut à 1.00 pour ce match (reporté/annulé), et passer au jour suivant
        await supabase
            .from("montante_du_jour")
            .update({ statut: "GAGNE_COTE_1" }) // Gain forcé à cote 1.0
            .eq("id", derniere.id);

        console.log(`✅ Match reporté — cote forcée à 1.00. Passage au jour suivant.`);

        // Insérer le jour suivant avec le même montant (mise inchangée car cote = 1.0)
        await supabase
            .from("montante_du_jour")
            .insert([{
                jour_actuel: derniere.jour_actuel + 1,
                mise_actuelle: derniere.mise_actuelle, // Mise inchangée
                cote_cible: COTE_CIBLE,
                statut: "EN_COURS",
                matchs: null,
            }]);

        console.log(`📈 Passage au Jour ${derniere.jour_actuel + 1} (mise inchangée suite report)`);
        return;
    }

    console.log(`   ✅ Score final : ${match.home_team} ${scoreResult.homeScore} - ${scoreResult.awayScore} ${match.away_team}`);

    // 4. Vérifier le pronostic
    const resultat = verifierPronostic(match, scoreResult.homeScore, scoreResult.awayScore);
    if (!resultat) {
        console.log("⚠️  Impossible de déterminer le résultat du pronostic (marché non supporté ou données manquantes).");
        await logToSupabase("error", "Marché non supporté pour vérification", { market: match.market, match_id: match.match_id });
        return;
    }

    await logToSupabase("info", `Résultat montante Jour ${derniere.jour_actuel}`, {
        match: `${match.home_team} vs ${match.away_team}`,
        resultat,
        mise: derniere.mise_actuelle
    });

    console.log(`\n🎯 Résultat du pronostic : ${resultat}\n`);

    // 5. Pause de sécurité de 5 secondes avant l'UPDATE
    console.log(`⏳ Pause 5s avant mise à jour...`);
    await delay(5000);

    // 6. Double vérification : s'assurer que la ligne est toujours EN_COURS
    const { data: verif } = await supabase
        .from("montante_du_jour")
        .select("statut")
        .eq("id", derniere.id)
        .single();

    if (!verif || verif.statut !== "EN_COURS") {
        console.log(`⚠️ Double vérification : la ligne #${derniere.id} a déjà été traitée (statut: ${verif?.statut}). Annulation.`);
        return;
    }
    console.log(`✅ Double vérification OK - Ligne #${derniere.id} toujours EN_COURS`);

    // 7. Mettre à jour le statut de la ligne actuelle AVANT d'insérer la nouvelle
    const { error: updateError } = await supabase
        .from("montante_du_jour")
        .update({ statut: resultat })
        .eq("id", derniere.id);

    if (updateError) {
        console.error("❌ Erreur mise à jour statut :", updateError.message);
        return;
    }
    console.log(`✅ Statut de la ligne #${derniere.id} mis à jour -> ${resultat}`);

    // 8. Calculer la suite
    const gainPotentiel = Math.round(derniere.mise_actuelle * COTE_CIBLE);

    if (resultat === "GAGNE") {
        if (derniere.jour_actuel >= TOTAL_JOURS) {
            // ── DÉFI TERMINÉ (Jour 17 gagné) ──
            console.log(`\n🏆🎉 DÉFI RÉUSSI ! ${TOTAL_JOURS} jours consécutifs !`);
            console.log(`   Gain final : ${gainPotentiel.toLocaleString("fr-FR")} FCFA`);

            // Marquer la ligne comme COMPLETED pour garder la trace dans l'historique
            await supabase
                .from("montante_du_jour")
                .update({ statut: "COMPLETED" })
                .eq("id", derniere.id);

            console.log(`✅ Ligne #${derniere.id} marquée COMPLETED (gain: ${gainPotentiel.toLocaleString("fr-FR")} FCFA)`);

            // Relancer un nouveau cycle au Jour 1
            const { error: insertError } = await supabase
                .from("montante_du_jour")
                .insert([{
                    jour_actuel: 1,
                    mise_actuelle: MISE_DEPART,
                    cote_cible: COTE_CIBLE,
                    statut: "EN_COURS",
                    matchs: null,
                }]);

            if (insertError) {
                console.error("❌ Erreur insertion nouveau cycle :", insertError.message);
            } else {
                console.log("✅ Nouveau cycle lancé au Jour 1 !");
            }
        } else {
            // ── PASSAGE AU JOUR SUIVANT ──
            const nouvelleMise = gainPotentiel;
            console.log(`📈 Succès ! Passage au Jour ${derniere.jour_actuel + 1}`);
            console.log(`   Nouvelle mise : ${nouvelleMise.toLocaleString("fr-FR")} FCFA`);

            const { error: insertError } = await supabase
                .from("montante_du_jour")
                .insert([{
                    jour_actuel: derniere.jour_actuel + 1,
                    mise_actuelle: nouvelleMise,
                    cote_cible: COTE_CIBLE,
                    statut: "EN_COURS",
                    matchs: null,
                }]);

            if (insertError) {
                console.error("❌ Erreur insertion jour suivant :", insertError.message);
            } else {
                console.log("✅ Jour suivant créé !");
            }
        }
    } else if (resultat === "PERDU") {
        // ── RELAUNCH AU JOUR 1 ──
        console.log(`❌ Défi échoué au Jour ${derniere.jour_actuel}. Relance au Jour 1.`);

        const { error: insertError } = await supabase
            .from("montante_du_jour")
            .insert([{
                jour_actuel: 1,
                mise_actuelle: MISE_DEPART,
                cote_cible: COTE_CIBLE,
                statut: "EN_COURS",
                matchs: null,
            }]);

        if (insertError) {
            console.error("❌ Erreur relance :", insertError.message);
        } else {
            console.log("✅ Nouveau cycle lancé au Jour 1 !");
        }
    }

    console.log("\n🤖 === Fin du traitement ===");
}

main().catch(err => {
    console.error("❌ Erreur inattendue :", err);
    process.exit(1);
});