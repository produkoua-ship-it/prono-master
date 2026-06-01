import { supabase } from "@/lib/supabase";
import MontanteSectionClient from "./MontanteSectionClient";

interface MontanteMatch {
    home_team: string;
    away_team: string;
    prediction: string;
    cote: number;
    commence_at?: string;
}

interface MontanteRow {
    id: number;
    jour_actuel: number;
    mise_actuelle: number;
    cote_cible: number;
    statut: string;
    matchs: MontanteMatch[] | null;
    created_at: string;
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

    // 2. Récupérer l'historique du cycle actuel (depuis le dernier jour 1)
    const { data: historiqueData } = await supabase
        .from("montante_du_jour")
        .select("id, jour_actuel, mise_actuelle, cote_cible, statut, matchs, created_at")
        .lte("id", montante.id)
        .order("id", { ascending: true });

    const allRows = (historiqueData || []) as MontanteRow[];
    const filteredRows: MontanteRow[] = [];
    let found = false;
    for (let i = allRows.length - 1; i >= 0; i--) {
        if (found) break;
        filteredRows.unshift(allRows[i]);
        if (allRows[i].jour_actuel === 1 && allRows[i].id !== montante.id) found = true;
    }

    return (
        <MontanteSectionClient
            montante={montante}
            historique={filteredRows}
        />
    );
}