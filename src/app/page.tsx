import CombineCard from "@/components/CombineCard";
import MatchBannerSlider from "@/components/MatchBannerSlider";
import FlashBanner from "@/components/FlashBanner";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

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

type CombineRow = Omit<Combined, "matchs"> & {
  matchs?: CombinedMatch[] | null;
};

export default async function Home() {
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F5F8] text-red-500">
        <p>Erreur lors du chargement des combinés : {error.message}</p>
      </div>
    );
  }

  const combinesData: Combined[] = ((combines || []) as CombineRow[]).map((c) => ({
    id: c.id,
    cote_totale: c.cote_totale,
    matchs: c.matchs || [],
  }));

  // Fetch unique matches for the banner slider
  const { data: allMatchs } = await supabase
    .from("matchs_du_combine")
    .select("id, sport, home_team, away_team, commence_at")
    .not("commence_at", "is", null)
    .order("commence_at", { ascending: true })
    .limit(20);

  // Deduplicate by home_team+away_team combo
  const seen = new Set<string>();
  const bannerMatches = (allMatchs || []).filter((m: any) => {
    const key = `${m.home_team}-${m.away_team}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);

  // Find the earliest match time for the flash banner countdown
  const earliestMatch = bannerMatches.length > 0
    ? bannerMatches.reduce((earliest: any, m: any) =>
      new Date(m.commence_at) < new Date(earliest.commence_at) ? m : earliest
    )
    : null;

  const nextMatchTime = earliestMatch?.commence_at || null;
  const nextMatchLabel = earliestMatch
    ? `${earliestMatch.home_team} vs ${earliestMatch.away_team}`
    : null;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#F3F5F8] p-4 sm:p-8 text-[#1A1C24]">
      <div className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 mb-6 sm:mb-8">
        <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">PronoMaster - Vos combinés du jour</h1>
        <a
          href="/historique"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-900 rounded-2xl border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 text-sm group whitespace-nowrap font-medium"
        >
          <svg className="w-4 h-4 text-slate-400 group-hover:text-pink-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="tracking-wide">Historique des pronos</span>
          <svg className="w-3 h-3 text-slate-400 group-hover:text-pink-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
      <div className="w-full max-w-6xl mb-4">
        <MatchBannerSlider matches={bannerMatches} />
      </div>
      <FlashBanner nextMatchTime={nextMatchTime} matchLabel={nextMatchLabel} />
      {combinesData.length === 0 ? (
        <p className="text-slate-500 font-medium">{"Aucun combiné disponible pour aujourd'hui."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-6xl">
          {combinesData.map((c) => (
            <CombineCard key={c.id} combine={c} />
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
