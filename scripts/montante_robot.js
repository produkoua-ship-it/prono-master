require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Erreur : Variables d'environnement Supabase manquantes.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MISE_DEPART = 1000; // 1000 FCFA de départ
const COEFFICIENT = 1.5;  // Mise × 1.5 chaque jour
const TOTAL_JOURS = 17;

async function main() {
    console.log("🤖 === Robot Montante - Vérification automatique ===\n");

    // 1. Récupérer la dernière ligne de montante
    const { data: derniereMontante, error: fetchError } = await supabase
        .from("montante_du_jour")
        .select("*")
        .order("id", { ascending: false })
        .limit(1)
        .single();

    if (fetchError || !derniereMontante) {
        console.error("❌ Impossible de récupérer la montante :", fetchError?.message || "Aucune ligne trouvée.");
        return;
    }

    console.log(`📋 Montante actuelle : Jour ${derniereMontante.jour_actuel}/${TOTAL_JOURS}`);
    console.log(`   Mise : ${derniereMontante.mise_actuelle} FCFA`);
    console.log(`   Statut : ${derniereMontante.statut}`);
    console.log(`   Prono : ${derniereMontante.prono_selectionne || "N/A"}`);
    console.log(`   Match : ${derniereMontante.home_team || "?"} vs ${derniereMontante.away_team || "?"}\n`);

    // 2. Vérifier si le résultat est déjà connu
    if (derniereMontante.statut !== "en_cours") {
        console.log("ℹ️  La montante a déjà un statut final. Rien à faire.");
        return;
    }

    // 3. Déterminer le résultat du prono
    // (En production, le robot vérifierait les scores via l'API)
    // Pour l'instant, on lit le champ statut ou on vérifie si un résultat est disponible
    let resultat = null;

    // Vérifier si le match est terminé (commence_at < maintenant)
    if (derniereMontante.commence_at) {
        const matchTime = new Date(derniereMontante.commence_at).getTime();
        const now = Date.now();
        const deuxHeuresApres = matchTime + 2 * 60 * 60 * 1000;

        if (now < deuxHeuresApres) {
            console.log("⏳ Le match est encore en cours ou vient de commencer. Attente...");
            return;
        }

        // Le match est terminé — on vérifie le résultat
        // En production, vérifier via une API de scores
        // Ici, on utilise un champ 'statut' ou 'resultat' de la table
        if (derniereMontante.resultat) {
            resultat = derniereMontante.resultat; // "gagne" ou "perdu"
        } else {
            console.log("⚠️  Aucun résultat enregistré pour ce match. En attente du résultat.");
            return;
        }
    } else {
        console.log("⚠️  Pas de date de match. Impossible de vérifier.");
        return;
    }

    console.log(`🎯 Résultat du prono : ${resultat.toUpperCase()}\n`);

    // 4. Logique de relance automatique
    if (resultat === "gagne") {
        if (derniereMontante.jour_actuel >= TOTAL_JOURS) {
            // 🏆 DÉFI RÉUSSI !
            console.log("🏆🎉 FÉLICITATIONS ! Le défi de 17 jours est RÉUSSI !");
            console.log(`   Gains cumulés : ${derniereMontante.gain_potentiel.toLocaleString("fr-FR")} FCFA\n`);

            // Enregistrer la victoire et relancer un nouveau cycle
            const nouvelleMontante = {
                jour_actuel: 1,
                mise_actuelle: MISE_DEPART,
                gain_potentiel: MISE_DEPART * COEFFICIENT,
                statut: "en_cours",
                prono_selectionne: null,
                home_team: null,
                away_team: null,
                cote: null,
                commence_at: null,
                resultat: null,
            };

            const { error: insertError } = await supabase
                .from("montante_du_jour")
                .insert([nouvelleMontante]);

            if (insertError) {
                console.error("❌ Erreur lors de la création du nouveau cycle :", insertError.message);
            } else {
                console.log("✅ Nouveau cycle lancé au Jour 1 avec mise de base !");
            }
        } else {
            // 📈 Succès intermédiaire — jour suivant
            const nouveauJour = derniereMontante.jour_actuel + 1;
            const nouvelleMise = Math.round(derniereMontante.mise_actuelle * COEFFICIENT);

            console.log(`📈 Succès ! Passage au Jour ${nouveauJour}`);
            console.log(`   Nouvelle mise : ${nouvelleMise.toLocaleString("fr-FR")} FCFA`);

            const nouvelleMontante = {
                jour_actuel: nouveauJour,
                mise_actuelle: nouvelleMise,
                gain_potentiel: Math.round(nouvelleMise * COEFFICIENT),
                statut: "en_cours",
                prono_selectionne: null,
                home_team: null,
                away_team: null,
                cote: null,
                commence_at: null,
                resultat: null,
            };

            const { error: insertError } = await supabase
                .from("montante_du_jour")
                .insert([nouvelleMontante]);

            if (insertError) {
                console.error("❌ Erreur lors de la création du jour suivant :", insertError.message);
            } else {
                console.log("✅ Jour suivant créé !");
            }
        }
    } else if (resultat === "perdu") {
        // ❌ Défi échoué — relance au Jour 1
        console.log(`❌ Défi échoué au Jour ${derniereMontante.jour_actuel}.`);
        console.log(`   Perte : ${derniereMontante.mise_actuelle.toLocaleString("fr-FR")} FCFA`);
        console.log("   Relance automatique au Jour 1...\n");

        const nouvelleMontante = {
            jour_actuel: 1,
            mise_actuelle: MISE_DEPART,
            gain_potentiel: MISE_DEPART * COEFFICIENT,
            statut: "en_cours",
            prono_selectionne: null,
            home_team: null,
            away_team: null,
            cote: null,
            commence_at: null,
            resultat: null,
        };

        const { error: insertError } = await supabase
            .from("montante_du_jour")
            .insert([nouvelleMontante]);

        if (insertError) {
            console.error("❌ Erreur lors de la relance :", insertError.message);
        } else {
            console.log("✅ Nouveau cycle lancé au Jour 1 avec mise de base !");
        }
    }

    console.log("\n🤖 === Fin du traitement ===");
}

main().catch(err => {
    console.error("Erreur inattendue :", err);
    process.exit(1);
});