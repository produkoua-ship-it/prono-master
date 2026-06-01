"use client";

import React, { useState } from "react";

interface MontanteMatch {
    home_team: string;
    away_team: string;
    prediction: string;
    cote: number;
    commence_at?: string;
}

interface MontanteRow {
    id: number;
    jour_actuel: number;
    mise_actuelle: number;
    cote_cible: number;
    statut: string;
    matchs: MontanteMatch[] | null;
    created_at: string;
}

interface Props {
    montante: MontanteRow;
    historique: MontanteRow[];
}

export default function MontanteSectionClient({ montante, historique }: Props) {
    const [showHistory, setShowHistory] = useState(false);
    const totalJours = 17;
    const progression = Math.round((montante.jour_actuel / totalJours) * 100);
    const miseFormatee = montante.mise_actuelle.toLocaleString("fr-FR");
    const gainPotentiel = Math.round(montante.mise_actuelle * montante.cote_cible);
    const gainFormate = gainPotentiel.toLocaleString("fr-FR");
    const matchs = (montante.matchs || []) as MontanteMatch[];
    const match = matchs[0] || null;

    return (
        <>
            <div className="w-full max-w-6xl mb-8">
                <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-8 overflow-hidden border border-slate-700/50 shadow-[0_8px_40px_rgba(0,0,0,0.2)]">
                    {/* Effets de lueur */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-yellow-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

                    {/* Badge + Jour + Bouton Historique */}
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)]">
                                🔥 Défi Montante
                            </span>
                            <span className="px-2.5 py-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-[10px] sm:text-xs font-bold rounded-full uppercase">
                                {montante.statut === "EN_COURS" ? "En cours" : montante.statut === "GAGNE" ? "Réussi" : "Échoué"}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-white">
                                <span className="text-xl sm:text-3xl font-black">Jour {montante.jour_actuel}</span>
                                <span className="text-white/50 font-bold text-sm sm:text-lg"> / {totalJours}</span>
                            </div>
                            {historique.length > 0 && (
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white text-[10px] sm:text-xs font-bold rounded-full transition-all duration-300 whitespace-nowrap"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Historique
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bouton historique mobile */}
                    {historique.length > 0 && (
                        <button
                            onClick={() => setShowHistory(true)}
                            className="sm:hidden w-full flex items-center justify-center gap-1.5 px-3 py-2 mb-4 bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white text-[10px] font-bold rounded-xl transition-all duration-300"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Historique du défi
                        </button>
                    )}

                    {/* Barre de progression */}
                    <div className="relative mb-5">
                        <div className="w-full h-2.5 sm:h-3 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                                style={{ width: `${progression}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1.5 text-[10px] sm:text-xs text-white/40 font-medium">
                            <span>Jour 1</span>
                            <span className="text-white/60 font-bold">{progression}%</span>
                            <span>Jour 17</span>
                        </div>
                    </div>

                    {/* Mise + Gain */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5">
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
                            <p className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Mise du jour</p>
                            <p className="text-lg sm:text-2xl font-black text-white leading-tight">{miseFormatee} <span className="text-xs sm:text-sm text-white/60">FCFA</span></p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
                            <p className="text-[9px] sm:text-[10px] text-emerald-400/70 uppercase tracking-widest font-bold mb-1">Gain potentiel</p>
                            <p className="text-lg sm:text-2xl font-black text-emerald-400 leading-tight">{gainFormate} <span className="text-xs sm:text-sm text-emerald-400/60">FCFA</span></p>
                        </div>
                    </div>

                    {/* Match du jour */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
                        {match ? (
                            <>
                                <p className="text-[9px] sm:text-[10px] text-orange-400/80 uppercase tracking-widest font-bold mb-2.5">🤖 Prono sélectionné par le Robot</p>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                                    <div className="min-w-0">
                                        <p className="text-base sm:text-lg font-black text-white truncate">
                                            {match.home_team} <span className="text-white/40 font-normal text-xs sm:text-sm">vs</span> {match.away_team}
                                        </p>
                                        <p className="text-xs sm:text-sm text-white/60 font-medium mt-0.5 truncate">{match.prediction}</p>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                        {match.commence_at && (
                                            <span className="text-[10px] sm:text-xs text-white/40 font-mono">
                                                {new Date(match.commence_at).toLocaleTimeString("fr-FR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        )}
                                        <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-black rounded-full">
                                            @ {match.cote.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-2">
                                <p className="text-[10px] sm:text-xs text-white/50">
                                    ⏳ En attente du premier prono du robot...
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Cote cible */}
                    <div className="mt-4 flex items-center gap-2 text-white/40 text-[10px] sm:text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Cote cible : {montante.cote_cible.toFixed(2)} max</span>
                    </div>
                </div>
            </div>

            {/* Modal Historique */}
            {showHistory && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
                    <div className="relative bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-[0_25px_60px_rgba(0,0,0,0.2)]">
                        <div className="flex items-start justify-between mb-5 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-950">Historique du défi</h3>
                                <p className="text-xs text-slate-400 mt-1">Cycle actuel — {historique.length} jour(s) enregistré(s)</p>
                            </div>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
                                aria-label="Fermer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {historique.map((row) => {
                                const isWin = row.statut === "GAGNE";
                                const isLose = row.statut === "PERDU";
                                const isCurrent = row.id === montante.id;
                                const rowMatchs = (row.matchs || []) as MontanteMatch[];
                                const rowMatch = rowMatchs[0] || null;
                                const matchLabel = rowMatch ? `${rowMatch.home_team} vs ${rowMatch.away_team}` : "Match à venir";

                                return (
                                    <div
                                        key={row.id}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isCurrent
                                            ? "bg-orange-50 border-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                                            : isWin
                                                ? "bg-emerald-50 border-emerald-100"
                                                : isLose
                                                    ? "bg-red-50 border-red-100"
                                                    : "bg-slate-50 border-slate-100"
                                            }`}
                                    >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${isWin ? "bg-emerald-100 text-emerald-600" : isLose ? "bg-red-100 text-red-500" : "bg-slate-100 text-slate-400"}`}>
                                            {isWin ? "✅" : isLose ? "❌" : "⏳"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold ${isCurrent ? "text-orange-700" : "text-slate-800"}`}>
                                                Jour {row.jour_actuel} {isCurrent && <span className="text-orange-500 text-[10px]">(aujourd'hui)</span>}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                {matchLabel}
                                                {rowMatch ? ` • ${rowMatch.prediction}` : ""}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-slate-700">{row.mise_actuelle.toLocaleString("fr-FR")} FCFA</p>
                                            {isWin && (
                                                <p className="text-[10px] font-bold text-emerald-500">+{Math.round(row.mise_actuelle * row.cote_cible).toLocaleString("fr-FR")}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {historique.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-6">Aucun historique pour ce cycle.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}