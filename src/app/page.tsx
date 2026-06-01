import { supabase } from "@/lib/supabase";
import CombineCard from "@/components/CombineCard";

export const revalidate = 0;

interface CombinedMatch {
  match_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  prediction: string;
  market: string;
  cote: number;
  commence_at?: string;
}

interface Combined {
  id: number;
  cote_totale: number;
  matchs: CombinedMatch[];
}

export default async function Home() {
  // Récupère les combinés et spécifie la relation exacte via la clé étrangère 'combine_id'
  const { data: combines, error } = await supabase
    .from("combines_du_jour")
    .select(`
      id,
      cote_totale,
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
    .limit(10);

  if (error) {
    console.error("Supabase fetch error:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-neon-green">
        <p>Erreur lors du chargement des combinés : {error.message}</p>
      </div>
    );
  }

  // Les matchs sont déjà renommés en "matchs" grâce à l'alias 'matchs:matchs_du_combine'
  const combinesData = (combines || []).map((c: any) => ({
    id: c.id,
    cote_totale: c.cote_totale,
    matchs: c.matchs || []
  }));

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-black p-8">
      <div className="w-full max-w-6xl flex justify-between items-start mb-8">
        <h1 className="text-3xl font-bold text-neon-green">PronoMaster – Vos combinés du jour</h1>
        <a
          href="/historique"
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg border border-zinc-700 hover:border-neon-green/50 transition-all duration-300 text-sm group whitespace-nowrap"
        >
          <svg className="w-4 h-4 text-zinc-400 group-hover:text-neon-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Historique des pronos</span>
          <svg className="w-3 h-3 text-zinc-500 group-hover:text-neon-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
      {combinesData.length === 0 ? (
        <p className="text-neon-green">Aucun combiné disponible pour aujourd'hui.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 w-full max-w-6xl">
          {combinesData.map((c) => (
            <CombineCard key={c.id} combine={c} />
          ))}
        </div>
      )}
    </div>
  );
}

