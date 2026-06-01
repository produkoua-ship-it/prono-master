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

          <div className="mt-4 pt-2 flex flex-col items-center">
            <p className="text-xs text-slate-500 mb-4 text-center font-medium leading-relaxed">
              {isUnlocked
                ? `Ce combiné contient ${combine.matchs?.length || 0} pronostics prêts à consulter.`
                : `Débloque les ${combine.matchs?.length || 0} pronostics de ce combiné en un clic !`}
            </p>
            <button
              type="button"
              onClick={handleUnlock}
              disabled={isLoadingPub}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF2E93] to-[#712EFF] text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(255,46,147,0.15)] hover:shadow-[0_8px_35px_rgba(255,46,147,0.3)] hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 text-center flex justify-center items-center gap-2 cursor-pointer text-sm tracking-wide"
            >
              {isLoadingPub ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Chargement de la publicité...
                </>
              ) : isUnlocked ? (
                "Voir le combiné"
              ) : (
                "Débloquer le combiné"
              )}
            </button>
          </div>
        </div>
      </div>
      {isModalOpen && <CombineModal combine={combine} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
