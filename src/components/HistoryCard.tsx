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
    statut_match?: string | null;
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
    const datePart = d.toLocaleDateString("fr-FR", { timeZone: "UTC", day: "2-digit", month: "short" });
    const timePart = d.toLocaleTimeString("fr-FR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
    return `${datePart} à ${timePart}`;
}

function formatDateShort(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();

    const todayStr = now.toLocaleDateString("fr-FR", { timeZone: "UTC" });
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toLocaleDateString("fr-FR", { timeZone: "UTC" });
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toLocaleDateString("fr-FR", { timeZone: "UTC" });
    const targetStr = d.toLocaleDateString("fr-FR", { timeZone: "UTC" });

    if (targetStr === todayStr) return "Aujourd'hui";
    if (targetStr === tomorrowStr) return "Demain";
    if (targetStr === yesterdayStr) return "Hier";

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
export default function HistoryCard({ combine }: { combine: Combined }) {
    const status = determineStatus(combine.statut);
    const isWin = status === "win";
    const isLoss = status === "loss";

    return (
        <div
            className={`
                relative w-full rounded-3xl p-5 bg-white border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] overflow-hidden
                transition-all duration-500 flex flex-col justify-between
                ${isWin
                    ? "border-emerald-500/30 ring-1 ring-emerald-500/10"
                    : isLoss
                        ? "border-slate-200 opacity-90"
                        : "border-slate-200"
                }
            `}
        >
            {/* Lueur pour les gagnants */}
            {isWin && (
                <>
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-[#FF2E93]/5 to-[#712EFF]/10 rounded-3xl blur-xl opacity-60 animate-glowRotate pointer-events-none" />
                </>
            )}

            {/* Content */}
            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-5 pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-black text-[#1A1C24]">Combiné N° {combine.id}</h2>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                            {formatDate(combine.created_at || combine.matchs[0]?.commence_at || "")}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Cote Totale</p>
                        <p className={`text-2xl font-black ${isWin ? "bg-gradient-to-r from-[#FF2E93] to-[#712EFF] bg-clip-text text-transparent" : "text-slate-800"}`}>
                            {combine.cote_totale.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Badge statut */}
                <div className="flex justify-center mb-5">
                    {isWin ? (
                        <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#FF2E93] to-[#712EFF] text-white font-extrabold text-xs tracking-wider rounded-full shadow-[0_4px_15px_rgba(255,46,147,0.25)] animate-badgePulse">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            GAGNANT
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </div>
                    ) : isLoss ? (
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-slate-100 text-slate-500 font-extrabold text-xs tracking-wider rounded-full">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            PERDU
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-slate-50 text-slate-400 border border-slate-100 font-extrabold text-xs tracking-wider rounded-full">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            EN ATTENTE
                        </div>
                    )}
                </div>

                {/* Matchs */}
                <div className="space-y-4">
                    {combine.matchs.map((match, idx) => {
                        const homeInitial = match.home_team.substring(0, 1);
                        const awayInitial = match.away_team.substring(0, 1);
                        
                        return (
                            <div key={idx} className="w-full bg-slate-50 p-4 rounded-2xl my-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200 gap-2 flex-wrap sm:flex-nowrap">
                                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[9px] shrink-0 whitespace-nowrap">
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{match.commence_at ? `${formatDateShort(match.commence_at)} à ${formatTime(match.commence_at)}` : "Live"}</span>
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
                                    {match.statut_match === 'gagne' ? (
                                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                            ✅ {match.prediction} • <span className="text-emerald-700">{match.cote.toFixed(2)}</span>
                                        </span>
                                    ) : match.statut_match === 'perdu' ? (
                                        <span className="text-[10px] font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                            ❌ {match.prediction} • <span className="text-red-700">{match.cote.toFixed(2)}</span>
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-extrabold text-[#712EFF] bg-purple-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                            ⏳ {match.prediction} • <span className="text-[#FF2E93]">{match.cote.toFixed(2)}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
