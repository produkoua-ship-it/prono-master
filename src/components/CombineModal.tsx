"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

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
  statut?: string | null;
}

interface CombineModalProps {
  combine: Combined;
  onClose: () => void;
}

export default function CombineModal({ combine, onClose }: CombineModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      {/* Backdrop with fade */}
      <div className="absolute inset-0 bg-black/30 animate-backdropFadeIn" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative glass-panel p-6 w-full max-w-2xl mx-4 animate-modalScaleIn">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-black text-[#1A1C24]">Combinaison N° {combine.id}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 transition-colors" aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Total odds */}
        <p className="text-xl font-bold bg-gradient-to-r from-[#FF2E93] to-[#712EFF] bg-clip-text text-transparent mb-4">
          Cote Totale : {combine.cote_totale.toFixed(2)}
        </p>

        {/* Match list */}
        <div className="space-y-4">
          {combine.matchs && combine.matchs.length > 0 ? (
            combine.matchs.map((match, idx) => {
              const homeInitial = match.home_team.substring(0, 1);
              const awayInitial = match.away_team.substring(0, 1);
              return (
                <div key={idx} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                  {/* Header (date / sport) */}
                  <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[9px]">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{match.commence_at ? `${formatDateShort(match.commence_at)} à ${formatTime(match.commence_at)}` : "Live"}</span>
                    </div>
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {match.sport || "MLB"}
                    </span>
                  </div>

                  {/* Teams */}
                  <div className="flex flex-col gap-2.5 my-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-[10px] font-black">
                        {homeInitial}
                      </div>
                      <span className="text-sm font-bold text-[#1A1C24] line-clamp-2">
                        {match.home_team}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-black">
                        {awayInitial}
                      </div>
                      <span className="text-sm font-bold text-[#1A1C24] line-clamp-2">
                        {match.away_team}
                      </span>
                    </div>
                  </div>

                  {/* Prediction & odds – enlarged */}
                  <div className="flex items-center mt-3 pt-2 border-t border-slate-100">
                      <span className="text-xl font-extrabold text-[#712EFF] bg-purple-50 px-2 py-0.5 rounded-lg">
                        {match.prediction} • <span className="text-[#FF2E93] text-2xl">{match.cote.toFixed(2)}</span>
                      </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-2">Aucun détail disponible.</p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Helper functions – duplicated from CombineCard for simplicity
function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStr = now.toLocaleDateString("fr-FR", { timeZone: "UTC" });
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toLocaleDateString("fr-FR", { timeZone: "UTC" });
  const targetStr = d.toLocaleDateString("fr-FR", { timeZone: "UTC" });
  if (targetStr === todayStr) return "Aujourd'hui";
  if (targetStr === tomorrowStr) return "Demain";
  return d.toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
}
