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

interface Combined {
  id: number;
  cote_totale: number;
  matchs: CombinedMatch[];
}

export default function CombineCard({ combine }: { combine: Combined }) {
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
    <div className="w-full bg-zinc-900/80 border border-neon-green/30 rounded-xl p-6 backdrop-blur-md shadow-lg transition-all hover:border-neon-green/60">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Combiné #{combine.id}</h2>
        <div className="text-right">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">Cote Totale</p>
          <p className="text-2xl font-black text-neon-green">{combine.cote_totale.toFixed(2)}</p>
        </div>
      </div>

      {/* Dynamic area: button or matches */}
      {!isUnlocked ? (
        <div className="mt-4 pt-2 border-t border-zinc-800 flex flex-col items-center">
          <p className="text-xs text-zinc-400 mb-3 text-center">
            ⚡ Débloque les {combine.matchs?.length || 0} pronostics de ce combiné en un clic !
          </p>
          <button
            onClick={handleUnlock}
            disabled={isLoadingPub}
            className="w-full py-3 px-4 bg-neon-green text-black font-bold rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:bg-neon-green/90 transition-all disabled:opacity-50 text-center flex justify-center items-center gap-2"
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
        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3 animate-fadeIn">
          <p className="text-xs font-bold text-neon-green uppercase tracking-wider mb-2">🎰 Matchs inclus :</p>
          {combine.matchs && combine.matchs.length > 0 ? (
            combine.matchs.map((match, idx) => (
              <div key={idx} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-zinc-800 text-neon-green px-2 py-0.5 rounded-full font-mono uppercase">
                      {match.sport}
                    </span>
                    {match.commence_at && (
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {formatDateShort(match.commence_at)} à {formatTime(match.commence_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white mt-1">
                    {match.home_team} <span className="text-zinc-500">vs</span> {match.away_team}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Prono : <span className="text-neon-green font-medium">{match.prediction}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Cote</p>
                  <p className="text-sm font-bold text-white">{match.cote.toFixed(2)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500 italic">Aucun détail disponible pour ce combiné.</p>
          )}
        </div>
      )}
    </div>
  );
}

