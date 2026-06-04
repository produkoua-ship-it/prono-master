"use client";

import { useState } from "react";

interface FlashBannerProps {
    jourActuel?: number;
    miseActuelle?: number;
    gainPotentiel?: number;
    statut?: string;
    homeTeam?: string | null;
    awayTeam?: string | null;
    prediction?: string | null;
    cote?: number | null;
    commenceAt?: string | null;
}

export default function FlashBanner({
    jourActuel = 1,
    miseActuelle = 1000,
    gainPotentiel = 1500,
    statut = "EN_COURS",
    homeTeam = null,
    awayTeam = null,
    prediction = null,
    cote = null,
    commenceAt = null,
}: FlashBannerProps) {
    const [showProno, setShowProno] = useState(false);
    const totalJours = 17;
    const progression = Math.round((jourActuel / totalJours) * 100);
    const miseFormatee = miseActuelle.toLocaleString("fr-FR");
    const gainFormate = gainPotentiel.toLocaleString("fr-FR");

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString("fr-FR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
    };

    const hasMatch = homeTeam && awayTeam && prediction;

    return (
        <>
            <div
                onClick={() => hasMatch && setShowProno(true)}
                className={`w-full max-w-6xl mb-4 rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 ${hasMatch ? "cursor-pointer hover:shadow-[0_8px_30px_rgba(249,115,22,0.4)] hover:scale-[1.01] active:scale-[0.99]" : ""} transition-all duration-200`}
            >
                <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
                    {/* Gauche : Titre Montante */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full">
                            <span className="text-white font-black text-sm sm:text-base">🔥</span>
                        </div>
                        <div>
                            <p className="text-white text-xs sm:text-sm font-black tracking-wide uppercase">
                                Montante N°1
                            </p>
                            <p className="text-white/80 text-[10px] sm:text-xs font-medium">
                                Jour {jourActuel} / {totalJours}
                            </p>
                        </div>
                    </div>

                    {/* Droite : Infos clés */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        {/* Mise */}
                        <div className="text-right">
                            <p className="text-white/70 text-[9px] sm:text-[10px] font-bold uppercase">Mise</p>
                            <p className="text-white font-black text-sm sm:text-base">{miseFormatee} <span className="text-[9px] sm:text-[10px] text-white/70">F</span></p>
                        </div>

                        {/* Séparateur */}
                        <div className="w-px h-8 bg-white/30" />

                        {/* Gain */}
                        <div className="text-right">
                            <p className="text-white/70 text-[9px] sm:text-[10px] font-bold uppercase">Gain</p>
                            <p className="text-white font-black text-sm sm:text-base">{gainFormate} <span className="text-[9px] sm:text-[10px] text-white/70">F</span></p>
                        </div>

                        {/* Flèche si match dispo */}
                        {hasMatch && (
                            <svg className="w-5 h-5 text-white/80 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                    </div>
                </div>

                {/* Barre de progression */}
                <div className="px-4 pb-3 sm:px-6 sm:pb-4">
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${progression}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-white/60 font-medium">
                        <span>Départ</span>
                        <span className="text-white font-bold">{progression}%</span>
                        <span>Objectif</span>
                    </div>
                </div>

                {/* Indication cliquable */}
                {hasMatch && (
                    <div className="px-4 pb-2 sm:px-6 sm:pb-3">
                        <p className="text-white/60 text-[9px] sm:text-[10px] font-medium text-center">
                            👆 Appuie pour voir le pronostic du jour
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Pronostic */}
            {showProno && hasMatch && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowProno(false)}
                    />
                    <div className="relative w-full sm:max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🔥</span>
                                <div>
                                    <h2 className="text-white font-black text-lg">Prono du Jour</h2>
                                    <p className="text-white/80 text-xs">Montante N°1 — Jour {jourActuel}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowProno(false)}
                                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-5">
                            {/* Match */}
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                                <p className="text-[10px] text-orange-400/80 uppercase tracking-widest font-bold mb-3">🤖 Pronostic du Robot</p>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex-1 text-right pr-3">
                                        <p className="text-white font-black text-base sm:text-lg truncate">{homeTeam}</p>
                                    </div>
                                    <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-full shrink-0">
                                        <span className="text-white/60 text-xs font-bold">VS</span>
                                    </div>
                                    <div className="flex-1 text-left pl-3">
                                        <p className="text-white font-black text-base sm:text-lg truncate">{awayTeam}</p>
                                    </div>
                                </div>

                                {/* Pronostic */}
                                <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl p-3 mb-3">
                                    <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest font-bold mb-1">Pronostic</p>
                                    <p className="text-emerald-400 font-black text-lg">{prediction}</p>
                                </div>

                                {/* Cote */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {commenceAt && (
                                            <span className="text-white/50 text-xs font-mono">{formatTime(commenceAt)}</span>
                                        )}
                                    </div>
                                    <span className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-black rounded-full">
                                        Cote @ {cote?.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Rappel mise/gain */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                    <p className="text-[9px] text-white/50 uppercase tracking-widest font-bold mb-1">Mise</p>
                                    <p className="text-white font-black text-lg">{miseFormatee} <span className="text-xs text-white/60">F</span></p>
                                </div>
                                <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 text-center">
                                    <p className="text-[9px] text-emerald-400/70 uppercase tracking-widest font-bold mb-1">Gain potentiel</p>
                                    <p className="text-emerald-400 font-black text-lg">{gainFormate} <span className="text-xs text-emerald-400/60">F</span></p>
                                </div>
                            </div>

                            {/* Bouton fermer */}
                            <button
                                onClick={() => setShowProno(false)}
                                className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-colors text-sm"
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