import { supabase } from "@/lib/supabase";
import HistoryCard from "@/components/HistoryCard";
import Link from "next/link";

export const revalidate = 0;

interface CombinedMatch {
    match_id: string;
    sport: string;
    home_team: string;
    away_team: string;
    prediction: string;
    market: string;
    cote: number;
    commence_at: string;
}

interface Combined {
    id: number;
    cote_totale: number;
    created_at: string;
    matchs: CombinedMatch[];
    statut: string | null;
}

export default async function HistoriquePage() {
    // Récupère les combinés dans Supabase
    const { data: combines, error } = await supabase
        .from("combines_du_jour")
        .select(`
      id,
      cote_totale,
      created_at,
      statut,
      matchs:matchs_du_combine!fk_matchs_du_combine_combines (
        match_id,
        sport,
        home_team,
        away_team,
        prediction,
        market,
        cote,
        commence_at
      )
    `)
        .order("id", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Supabase fetch error:", error);
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-neon-green p-8">
                <p>Erreur lors du chargement de l'historique : {error.message}</p>
                <Link href="/" className="mt-4 text-neon-green underline">Retour à l'accueil</Link>
            </div>
        );
    }

    // Filtrer : on garde uniquement les combinés dont TOUS les matchs sont terminés
    // On compare en UTC pour éviter les problèmes de fuseau horaire côté serveur
    const now = new Date();
    // On prend la date UTC : maintenant - 1h (marge pour les matchs qui viennent de se terminer)
    // mais on garde l'heure locale de l'utilisateur via le client
    // Le serveur rend en UTC, donc on utilise UTC pour la comparaison serveur
    const nowUtc = Date.now();

    const allCombines: Combined[] = (combines || [])
        .map((c: any) => ({
            id: c.id,
            cote_totale: c.cote_totale,
            created_at: c.created_at,
            matchs: c.matchs || [],
            statut: c.statut || null,
        }))
        .filter((c: Combined) => {
            // Si le statut est déjà renseigné en base, on l'affiche toujours
            if (c.statut === "gagne" || c.statut === "perdu") return true;
            // Sinon, on affiche uniquement si TOUS les matchs sont dans le passé
            if (c.matchs.length === 0) return false;
            return c.matchs.every((m) => new Date(m.commence_at).getTime() < nowUtc);
        })
        .slice(0, 20);

    return (
        <div className="flex flex-col items-center min-h-screen bg-black p-8">
            {/* Header */}
            <div className="w-full max-w-6xl mb-8 flex items-center justify-between">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-zinc-400 hover:text-neon-green transition-colors text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour à l'accueil
                </Link>
                <h1 className="text-3xl font-bold text-neon-green">📜 Historique des pronostics</h1>
                <div className="w-24" /> {/* spacer */}
            </div>

            {allCombines.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-20 text-zinc-500">
                    <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg">Aucun combiné terminé pour le moment.</p>
                    <p className="text-sm mt-2">Revenez plus tard pour voir l'historique des pronostics.</p>
                    <Link href="/" className="mt-6 px-6 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green/80 transition-all">
                        Voir les combinés du jour
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 w-full max-w-6xl">
                    {allCombines.map((c: Combined) => (
                        <HistoryCard key={c.id} combine={c} />
                    ))}
                </div>
            )}
        </div>
    );
}