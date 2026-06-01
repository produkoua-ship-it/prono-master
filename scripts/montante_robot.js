require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Erreur : Variables d'environnement Supabase manquantes.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MISE_DEPART = 1000;
const COTE_CIBLE = 1.50;
const TOTAL_JOURS = 17;

async function main() {
    console.log("🤖 === Robot Montante - Vérification automatique ===\n");

    // 1. Récupérer la dernière ligne
    const { data: derniere, error: fetchError } = await supabase
        .from("montante_du_jour")
        .select("*")
        .order("id", { ascending: false })
        .limit(1)
        .single();

    if (fetchError || !derniere) {
        console.error("❌ Aucune montante trouvée :", fetchError?.message || "Table vide");
        return;
    }

    console.log(`📋 Jour ${derniere.jour_actuel}/${TOTAL_JOURS} | Mise: ${derniere.mise_actuelle} FCFA | Statut: ${derniere.statut}`);

    if (derniere.statut !== "EN_COURS") {
        console.log("ℹ️  Statut déjà final. Rien à faire.");
        return;
    }

    // 2. Vérifier si le match est terminé
    const matchs = derniere.matchs || [];
    const match = matchs[0];
    if (!match || !match.commence_at) {
        console.log("⚠️  Pas de match associé.");
        return;
    }

    const matchTime = new Date(match.commence_at).getTime();
    const now = Date.now();
    if (now < matchTime + 2 * 60 * 60 * 1000) {
        console.log("⏳ Match encore en cours. Attente...");
        return;
    }

    // 3. Vérifier le résultat (à compléter avec une API de scores ou champ manual)
    // Pour l'instant, on lit un champ "resultat" s'il existe dans les matchs JSONB
    // Ou on utilise une API externe pour vérifier le score
    let resultat = null;

    // Ici, le robot devrait vérifier via une API de scores
    // Pour l'instant, on suppose que le résultat est dans un champ 'resultat' du JSONB
    if (match.resultat) {
        resultat = match.resultat; // "GAGNE" ou "PERDU"
    } else {
        // Vérifier via une API de scores externe (The Odds API scores endpoint, etc.)
        console.log("⚠️  Résultat non encore disponible. En attente.");
        return;
    }

    console.log(`🎯 Résultat : ${resultat}\n`);

    // 4. Logique de relance
    const gainPotentiel = Math.round(derniere.mise_actuelle * COTE_CIBLE);

    if (resultat === "GAGNE") {
        if (derniere.jour_actuel >= TOTAL_JOURS) {
            console.log("🏆🎉 DÉFI RÉUSSI ! 17 jours consécutifs !");
            console.log(`   Gain final : ${gainPotentiel.toLocaleString("fr-FR")} FCFA\n`);
        } else {
            console.log(`📈 Succès ! Passage au Jour ${derniere.jour_actuel + 1}`);
            const nouvelleMise = gainPotentiel;
            console.log(`   Nouvelle mise : ${nouvelleMise.toLocaleString("fr-FR")} FCFA`);
        }

        // Insérer jour suivant ou relance
        const { error: insertError } = await supabase
            .from("montante_du_jour")
            .insert([{
                jour_actuel: derniere.jour_actuel >= TOTAL_JOURS ? 1 : derniere.jour_actuel + 1,
                mise_actuelle: derniere.jour_actuel >= TOTAL_JOURS ? MISE_DEPART : gainPotentiel,
                cote_cible: COTE_CIBLE,
                statut: "EN_COURS",
                matchs: null,
            }]);

        if (insertError) {
            console.error("❌ Erreur insertion :", insertError.message);
        } else {
            console.log("✅ Nouveau jour créé !");
        }
    } else if (resultat === "PERDU") {
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
            console.log("✅ Nouveau cycle lancé !");
        }
    }

    console.log("\n🤖 === Fin du traitement ===");
}

main().catch(err => {
    console.error("Erreur inattendue :", err);
    process.exit(1);
});