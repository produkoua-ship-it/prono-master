"use client";

import React, { useState } from "react";

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

function determineStatus(statut: string | null): "win" | "loss" | "unknown" {
    if (statut === "gagne") return "win";
    if (statut === "perdu") return "loss";
    return "unknown";
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `Fait le ${dd}/${mm}/${yyyy}`;
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
    const [showModal, setShowModal] = useState(false);
    const status = determineStatus(combine.statut);
    const isWin = status === "win";
    const isLoss = status === "loss";
    const nbMatchs = combine.matchs?.length || 0;

    // Compter les matchs gagnés/perdus
    const nbGagnes = combine.matchs?.filter(m => m.statut_match === "gagne").length || 0;
    const nbPerdus = combine.matchs?.filter(m => m.statut_match === "perdu").length || 0;

    return (
        <>
            <div
                onClick={() => setShowModal(true)}
                className={`
                    relative w-full rounded-3xl p-4 sm:p-5 bg-white border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] overflow-hidden
                    transition-all duration-300 flex flex-col justify-between cursor-pointer
                    hover:scale-[1.02] active:scale-[0.98]
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
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-[#FF2E93]/5 to-[#712EFF]/10 rounded-3xl blur-xl opacity-60 animate-glowRotate pointer-events-none" />
                )}

                {/* Content */}
                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-100">
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-[#1A1C24]">N° {combine.id}</h2>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 font-semibold">
                                {formatDate(combine.created_at || combine.matchs[0]?.commence_at || "")}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Cote</p>
                            <p className={`text-lg sm:text-xl font-black ${isWin ? "bg-gradient-to-r from-[#FF2E93] to-[#712EFF] bg-clip-text text-transparent" : "text-slate-800"}`}>
                                {combine.cote_totale.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Badge statut */}
                    <div className="flex justify-center mb-3">
                        {isWin ? (
                            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF2E93] to-[#712EFF] text-white font-extrabold text-[10px] sm:text-xs tracking-wider rounded-full shadow-[0_4px_15px_rgba(255,46,147,0.25)]">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                GAGNÉ
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                            </div>
                        ) : isLoss ? (
                            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-500 font-extrabold text-[10px] sm:text-xs tracking-wider rounded-full">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                PERDU
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-400 border border-slate-100 font-extrabold text-[10px] sm:text-xs tracking-wider rounded-full">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                EN ATTENTE
                            </div>
                        )}
                    </div>

                    {/* Résumé rapide des matchs */}
                    <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            {nbMatchs} match{nbMatchs > 1 ? "s" : ""}
                        </span>
                        {nbGagnes > 0 && (
                            <span className="flex items-center gap-1 text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {nbGagnes} ✅
                            </span>
                        )}
                        {nbPerdus > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                {nbPerdus} ❌
                            </span>
                        )}
                    </div>

                    {/* Indication clic */}
                    <p className="text-center text-[9px] text-slate-400 mt-2">
                        👆 Appuie pour voir les détails
                    </p>
                </div>
            </div>

            {/* Modal Détails */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    />
                    <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] overflow-y-auto">
                        {/* Header Modal */}
                        <div className={`sticky top-0 z-10 p-4 flex items-center justify-between ${isWin
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                            : isLoss
                                ? "bg-gradient-to-r from-slate-600 to-slate-700"
                                : "bg-gradient-to-r from-[#FF2E93] to-[#712EFF]"
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    {isWin ? (
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    ) : isLoss ? (
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-white font-black text-lg">Combiné N° {combine.id}</h2>
                                    <p className="text-white/80 text-xs">
                                        {isWin ? "✅ Gagné" : isLoss ? "❌ Perdu" : "⏳ En attente"} • Cote {combine.cote_totale.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Liste des matchs */}
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-slate-500 font-semibold mb-2">
                                {formatDate(combine.created_at || combine.matchs[0]?.commence_at || "")}
                            </p>

                            {combine.matchs.map((match, idx) => {
                                const homeInitial = match.home_team.substring(0, 1);
                                const awayInitial = match.away_team.substring(0, 1);
                                const matchGagne = match.statut_match === "gagne";
                                const matchPerdu = match.statut_match === "perdu";

                                return (
                                    <div
                                        key={idx}
                                        className={`w-full p-4 rounded-2xl border ${matchGagne
                                            ? "bg-emerald-50 border-emerald-200"
                                            : matchPerdu
                                                ? "bg-red-50 border-red-200"
                                                : "bg-slate-50 border-slate-200"
                                            }`}
                                    >
                                        {/* Header match */}
                                        <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200 gap-2">
                                            <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[10px]">
                                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>{match.commence_at ? `${formatDateShort(match.commence_at)} à ${formatTime(match.commence_at)}` : "Live"}</span>
                                            </div>
                                            <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                {match.sport || "Sport"}
                                            </span>
                                        </div>

                                        {/* Équipes */}
                                        <div className="flex flex-col gap-2 my-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                                    {homeInitial}
                                                </div>
                                                <span className="text-xs font-bold text-slate-800 line-clamp-1">{match.home_team}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                                    {awayInitial}
                                                </div>
                                                <span className="text-xs font-bold text-slate-800 line-clamp-1">{match.away_team}</span>
                                            </div>
                                        </div>

                                        {/* Pronostic + Cote */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                            {matchGagne ? (
                                                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                    ✅ {match.prediction}
                                                </span>
                                            ) : matchPerdu ? (
                                                <span className="text-[11px] font-extrabold text-red-700 bg-red-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                    ❌ {match.prediction}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-extrabold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                    ⏳ {match.prediction}
                                                </span>
                                            )}
                                            <span className={`text-xs font-black px-2 py-1 rounded-full ${matchGagne
                                                ? "bg-emerald-200 text-emerald-800"
                                                : matchPerdu
                                                    ? "bg-red-200 text-red-800"
                                                    : "bg-purple-200 text-purple-800"
                                                }`}>
                                                @ {match.cote.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bouton fermer */}
                        <div className="p-4 pt-0">
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}