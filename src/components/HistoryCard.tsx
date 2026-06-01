"use client";

import React from "react";

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

// Utilise le champ statut de la base de données Supabase (gagne | perdu | null)
function determineStatus(statut: string | null): "win" | "loss" | "unknown" {
    if (statut === "gagne") return "win";
    if (statut === "perdu") return "loss";
    return "unknown";
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDateShort(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0 && diffDays > -1) return "Aujourd'hui";
    if (diffDays === -1) return "Hier";
    return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
    });
}

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function HistoryCard({ combine }: { combine: Combined }) {
    const status = determineStatus(combine.statut);
    const isWin = status === "win";
    const isLoss = status === "loss";

    return (
        <div
            className={`
        relative w-full rounded-xl p-6 backdrop-blur-md shadow-lg overflow-hidden
        transition-all duration-500
        ${isWin
                    ? "bg-gradient-to-br from-zinc-900 via-emerald-950/40 to-zinc-900 border border-emerald-500/40 animate-glowPulse"
                    : isLoss
                        ? "bg-zinc-900/80 border border-red-900/40"
                        : "bg-zinc-900/80 border border-zinc-700/40"
                }
      `}
        >
            {/* Animation de lueur pour les gagnants */}
            {isWin && (
                <>
                    {/* Lueur animée dorée/verte */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-yellow-400/20 to-emerald-500/20 rounded-xl blur-xl opacity-60 animate-glowRotate pointer-events-none" />
                    {/* Particules scintillantes */}
                    <div className="absolute top-0 left-1/4 w-1 h-1 bg-emerald-400 rounded-full animate-particle1 pointer-events-none" />
                    <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-particle2 pointer-events-none" />
                    <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-emerald-300 rounded-full animate-particle3 pointer-events-none" />
                    <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-particle4 pointer-events-none" />
                </>
            )}

            {/* Content */}
            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">Combiné #{combine.id}</h2>
                        <p className="text-xs text-zinc-500 mt-1">
                            {formatDate(combine.created_at || combine.matchs[0]?.commence_at || "")}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-zinc-400 uppercase tracking-wider">Cote Totale</p>
                        <p className={`text-2xl font-black ${isWin ? "text-yellow-400" : "text-neon-green"}`}>
                            {combine.cote_totale.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Badge statut */}
                <div className="flex justify-center mb-4">
                    {isWin ? (
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-yellow-500 text-black font-bold rounded-full animate-badgePulse shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            GAGNANT
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </div>
                    ) : isLoss ? (
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-700 to-red-900 text-red-200 font-bold rounded-full">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            PERDU
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-zinc-800 text-zinc-400 font-bold rounded-full">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            EN ATTENTE
                        </div>
                    )}
                </div>

                {/* Matchs */}
                <div className="space-y-2">
                    {combine.matchs.map((match, idx) => (
                        <div
                            key={idx}
                            className={`
                p-3 rounded-lg border flex justify-between items-center
                ${isWin
                                    ? "bg-emerald-950/30 border-emerald-900/40"
                                    : isLoss
                                        ? "bg-red-950/30 border-red-900/40"
                                        : "bg-zinc-950 border-zinc-800"
                                }
              `}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono uppercase">
                                        {match.sport}
                                    </span>
                                    <span className="text-[10px] text-zinc-600 font-mono">
                                        {formatDateShort(match.commence_at)} {formatTime(match.commence_at)}
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-white mt-1">
                                    {match.home_team} <span className="text-zinc-500">vs</span> {match.away_team}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Prono : <span className={`font-medium ${isWin ? "text-emerald-400" : "text-neon-green"}`}>{match.prediction}</span>
                                </p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className="text-xs text-zinc-500">Cote</p>
                                <p className="text-sm font-bold text-white">{match.cote.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}