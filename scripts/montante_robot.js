// ── Polyfill WebSocket pour Node.js 20 (requis par @supabase/supabase-js) ──
if (typeof globalThis.WebSocket === 'undefined') {
    const { WebSocket } = require('ws');
    globalThis.WebSocket = WebSocket;
}

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ── Utilitaire de pause ────────────────────────────────────────
const delay = ms => new Promise(res => setTimeout(res, ms));

// ── Configuration ──────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Variables d'environnement Supabase manquantes.");
    process.exit(1);
}
if (!ODDS_API_KEY) {
    console.error("❌ ODDS_API_KEY manquante.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MISE_DEPART = 1000;
const COTE_CIBLE = 1.50;
const TOTAL_JOURS = 17;
const DELAI_APRES_MATCH_MS = 2 * 60 * 60 * 1000; // 2h après le coup d'envoi

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

async function main() {
    console.log("🤖 === Robot Montante - Vérification automatique ===\n");

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

    const sportKey = await getSportKeyFromTitle(match.sport || match.sport_group || '');
    if (!sportKey) {
        console.log(`⚠️  Clé de sport introuvable pour "${match.sport}". Impossible de vérifier le score.`);
        return;
    }

    console.log(`   Clé API : ${sportKey}`);
    const scoreResult = await fetchMatchScore(sportKey, match.match_id);
    if (!scoreResult) {
        console.log("⚠️  Score non disponible ou match non terminé selon l'API.");
        return;
    }

    console.log(`   ✅ Score final : ${match.home_team} ${scoreResult.homeScore} - ${scoreResult.awayScore} ${match.away_team}`);

    // 4. Vérifier le pronostic
    const resultat = verifierPronostic(match, scoreResult.homeScore, scoreResult.awayScore);
    if (!resultat) {
        console.log("⚠️  Impossible de déterminer le résultat du pronostic (marché non supporté ou données manquantes).");
        return;
    }

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