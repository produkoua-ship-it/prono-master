"use client";

import React, { useState } from "react";
import CombineModal from "./CombineModal";

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

interface Combined {
  id: number;
  cote_totale: number;
  matchs: CombinedMatch[];
}

export default function CombineCard({ combine }: { combine: Combined }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoadingPub, setIsLoadingPub] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUnlock = () => {
    if (isUnlocked) {
      setIsModalOpen(true);
      return;
    }

    setIsLoadingPub(true);
    setTimeout(() => {
      setIsLoadingPub(false);
      setIsUnlocked(true);
      setIsModalOpen(true);
    }, 1500);
  };

  return (
    <>
      <div className="w-full bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-all border border-slate-100 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold bg-slate-100 px-2 py-0.5 rounded-full">Combiné</span>
              <h2 className="text-lg font-black text-[#1A1C24] mt-1">N° {combine.id}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Cote Totale</p>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-900 font-black text-3xl">{combine.cote_totale.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-col items-center">
            <button
              type="button"
              onClick={handleUnlock}
              disabled={isLoadingPub}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#FF2E93] to-[#712EFF] text-white font-bold rounded-2xl shadow-[0_4px_15px_rgba(255,46,147,0.15)] hover:shadow-[0_6px_25px_rgba(255,46,147,0.3)] hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 text-center flex justify-center items-center gap-2 cursor-pointer text-xs tracking-wide"
            >
              {isLoadingPub ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Chargement de la publicité...
                </>
              ) : isUnlocked ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Voir
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Débloquer
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      {isModalOpen && <CombineModal combine={combine} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
