import { supabase } from "@/lib/supabase";
import MontanteSectionClient from "./MontanteSectionClient";

interface MontanteRow {
    id: number;
    jour_actuel: number;
    mise_actuelle: number;
    gain_potentiel: number;
    prono_selectionne: string | null;
    home_team: string | null;
    away_team: string | null;
    cote: number | null;
    commence_at: string | null;
    statut: string;
}

export default async function MontanteSection() {
    // 1. Récupérer la montante en cours
    const { data, error } = await supabase
        .from("montante_du_jour")
        .select("*")
        .order("id", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) return null;

    const montante = data as MontanteRow;

    // 2. Récupérer l'historique des jours précédents (même cycle)
    // On cherche toutes les lignes avec un id <= l'id courant
    const { data: historiqueData } = await supabase
        .from("montante_du_jour")
        .select("id, jour_actuel, mise_actuelle, gain_potentiel, statut, prono_selectionne, home_team, away_team, cote, commence_at")
        .lte("id", montante.id)
        .order("id", { ascending: true });

    // Filtrer pour ne garder que le cycle actuel (depuis le dernier jour 1)
    const allRows = historiqueData || [];
    const filteredRows: MontanteRow[] = [];
    let found = false;
    for (let i = allRows.length - 1; i >= 0; i--) {
        if (found) break;
        filteredRows.unshift(allRows[i]);
        if (allRows[i].jour_actuel === 1 && allRows[i].id !== montante.id) found = true;
    }
    const historique = filteredRows;

    return (
        <MontanteSectionClient
            montante={montante}
            historique={historique}
        />
    );
}