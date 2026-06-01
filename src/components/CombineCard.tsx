"use client";

import React, { useState } from "react";

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();

  const todayStr = now.toLocaleDateString("fr-FR", { timeZone: "UTC" });
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toLocaleDateString("fr-FR", { timeZone: "UTC" });
  const targetStr = d.toLocaleDateString("fr-FR", { timeZone: "UTC" });

  if (targetStr === todayStr) return "Aujourd'hui";
  if (targetStr === tomorrowStr) return "Demain";
  
  return d.toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

// Optional status field (gagne | perdu | null)
interface Combined {
  id: number;
  cote_totale: number;
  matchs: CombinedMatch[];
  statut?: string | null;
}

export default function CombineCard({ combine }: { combine: Combined }) {
  // Determine match status if provided (same logic as HistoryCard)
  function determineStatus(statut: string | null): "win" | "loss" | "unknown" {
    if (statut === "gagne") return "win";
    if (statut === "perdu") return "loss";
    return "unknown";
  }

  const status = determineStatus(combine.statut ?? null);
  const isWin = status === "win";
  const isLoss = status === "loss";

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoadingPub, setIsLoadingPub] = useState(false);

  const handleUnlock = () => {
    setIsLoadingPub(true);
    // Simulate ad loading for 1.5 seconds
    setTimeout(() => {
      setIsLoadingPub(false);
      setIsUnlocked(true);
    }, 1500);
  };

  return (
    <div className="w-full bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-all border border-slate-100 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold bg-slate-100 px-2 py-0.5 rounded-full">Combiné</span>
            <h2 className="text-lg font-black text-[#1A1C24] mt-1">N° {combine.id}</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Cote Totale</p>
            <p className="text-2xl font-black bg-gradient-to-r from-[#FF2E93] to-[#712EFF] bg-clip-text text-transparent">{combine.cote_totale.toFixed(2)}</p>
          </div>
        </div>

        {/* Dynamic area: button or matches */}
        {!isUnlocked ? (
          <div className="mt-4 pt-2 flex flex-col items-center">
            <p className="text-xs text-slate-500 mb-4 text-center font-medium leading-relaxed">
              ⚡ Débloque les {combine.matchs?.length || 0} pronostics de ce combiné en un clic !
            </p>
            <button
              onClick={handleUnlock}
              disabled={isLoadingPub}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF2E93] to-[#712EFF] text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(255,46,147,0.15)] hover:shadow-[0_8px_35px_rgba(255,46,147,0.3)] hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 text-center flex justify-center items-center gap-2 cursor-pointer text-sm tracking-wide"
            >
              {isLoadingPub ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
                  Chargement de la publicité...
                </>
              ) : (
                "Débloquer le combiné 🔓"
              )}
            </button>
          </div>
        ) : (
          /* Match list revealed */
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-3 bg-gradient-to-b from-[#FF2E93] to-[#712EFF] rounded-full"></span>
              <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Matchs inclus :</p>
            </div>
            {combine.matchs && combine.matchs.length > 0 ? (
              combine.matchs.map((match, idx) => {
                const homeInitial = match.home_team.substring(0, 1);
                const awayInitial = match.away_team.substring(0, 1);
                
                return (
                  <div key={idx} className="w-full bg-slate-50 p-4 rounded-2xl my-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    {/* En-tête : L'heure et la date en haut à gauche, en face de Prono / Cote à droite */}
                    <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200 gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[9px] shrink-0 whitespace-nowrap">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {match.commence_at ? `${formatDateShort(match.commence_at)} à ${formatTime(match.commence_at)}` : "Live"}
                        </span>
                      </div>
                      <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                        {match.sport || 'MLB'}
                      </span>
                    </div>


                    {/* Corps : Les noms des équipes l'un en dessous de l'autre (verticalement), chacun précédé de son petit badge/logo */}
                    <div className="flex flex-col gap-2.5 my-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                          {homeInitial}
                        </div>
                        <span className="text-xs font-bold text-[#1A1C24] line-clamp-2">{match.home_team}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                          {awayInitial}
                        </div>
                        <span className="text-xs font-bold text-[#1A1C24] line-clamp-2">{match.away_team}</span>
                      </div>
                    </div>

                    {/* Pied : Prédiction et cote en bas */}
                    <div className="flex items-center mt-3 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-extrabold text-[#712EFF] bg-purple-50 px-2 py-0.5 rounded-lg">
                        {match.prediction} • <span className="text-[#FF2E93]">{match.cote.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-2">Aucun détail disponible pour ce combiné.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

