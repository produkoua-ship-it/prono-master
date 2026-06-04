import HistoryCard from "@/components/HistoryCard";
import { supabase } from "@/lib/supabase";
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
  statut_match?: string | null;
}

interface Combined {
  id: number;
  cote_totale: number;
  created_at: string;
  matchs: CombinedMatch[];
  statut: string | null;
}

type CombineRow = Omit<Combined, "matchs">;

type MatchRow = CombinedMatch & {
  combine_id: number;
};

export default async function HistoriquePage() {
  // Fresh server-side cutoff for deciding which pending combines belong in history.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  const { data: combines, error } = await supabase
    .from("combines_du_jour")
    .select("id, cote_totale, created_at, statut")
    .order("id", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Supabase fetch error:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F5F8] text-red-500 p-8">
        <p>Erreur lors du chargement de l&apos;historique : {error.message}</p>
        <Link href="/" className="mt-4 text-[#712EFF] hover:underline font-semibold">Retour à l&apos;accueil</Link>
      </div>
    );
  }

  if (!combines || combines.length === 0) {
    return (
      <div className="flex flex-col items-center min-h-screen bg-[#F3F5F8] p-4 sm:p-8 text-[#1A1C24]">
        <div className="w-full max-w-6xl mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour à l&apos;accueil
          </Link>
          <h1 className="text-lg sm:text-3xl font-black text-[#1A1C24] tracking-wide">Historique des pronostics</h1>
          <div className="w-24" />
        </div>
        <div className="flex flex-col items-center justify-center mt-20 text-slate-400">
          <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">Aucun combiné disponible.</p>
          <Link href="/" className="mt-6 px-6 py-3 bg-gradient-to-r from-[#FF2E93] to-[#712EFF] text-white font-bold rounded-2xl shadow-[0_4px_15px_rgba(255,46,147,0.2)] hover:shadow-[0_4px_25px_rgba(255,46,147,0.4)] hover:scale-[1.02] transition-all">
            Voir les combinés du jour
          </Link>
        </div>
      </div>
    );
  }

  const combineRows = combines as CombineRow[];
  const combineIds = combineRows.map((c) => c.id);

  const { data: allMatchs, error: matchsError } = await supabase
    .from("matchs_du_combine")
    .select("combine_id, match_id, sport, home_team, away_team, prediction, market, cote, commence_at, statut_match")
    .in("combine_id", combineIds);

  if (matchsError) {
    console.error("Supabase matchs fetch error:", matchsError.message);
  }

  const matchsByCombineId: Record<number, CombinedMatch[]> = {};
  if (allMatchs) {
    for (const m of allMatchs as MatchRow[]) {
      const cid = m.combine_id;
      if (!matchsByCombineId[cid]) matchsByCombineId[cid] = [];
      matchsByCombineId[cid].push({
        match_id: m.match_id,
        sport: m.sport,
        home_team: m.home_team,
        away_team: m.away_team,
        prediction: m.prediction,
        market: m.market,
        cote: m.cote,
        commence_at: m.commence_at,
        statut_match: m.statut_match,
      });
    }
  }

  const allCombines: Combined[] = combineRows
    .map((c) => ({
      id: c.id,
      cote_totale: c.cote_totale,
      created_at: c.created_at,
      matchs: matchsByCombineId[c.id] || [],
      statut: c.statut || null,
    }))
    .filter((c: Combined) => {
      // Seuls les combinés avec un statut définitif (GAGNÉ ou PERDU) sont affichés.
      // Les statuts "en_cours", "en_attente" ou null ne doivent jamais apparaître dans l'historique.
      return c.statut === "gagne" || c.statut === "perdu";
    })
    .slice(0, 20);

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#F3F5F8] p-8 text-[#1A1C24]">
      <div className="w-full max-w-6xl mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour à l&apos;accueil
        </Link>
        <h1 className="text-3xl font-black text-[#1A1C24] tracking-wide">Historique des pronostics</h1>
        <div className="w-24" />
      </div>

      {allCombines.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-slate-400">
          <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">Aucun combiné terminé pour le moment.</p>
          <p className="text-sm mt-2">Revenez plus tard pour voir l&apos;historique des pronostics.</p>
          <Link href="/" className="mt-6 px-6 py-3 bg-gradient-to-r from-[#FF2E93] to-[#712EFF] text-white font-bold rounded-2xl shadow-[0_4px_15px_rgba(255,46,147,0.2)] hover:shadow-[0_4px_25px_rgba(255,46,147,0.4)] hover:scale-[1.02] transition-all">
            Voir les combinés du jour
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-6xl">
          {allCombines.map((c: Combined) => (
            <HistoryCard key={c.id} combine={c} />
          ))}
        </div>
      )}
    </div>
  );
}
