"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

interface MontanteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MontanteModal({ isOpen, onClose }: MontanteModalProps) {
    const [montante, setMontante] = useState<MontanteRow | null>(null);
    const [historique, setHistorique] = useState<MontanteRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch current montante
                const { data: currentData } = await supabase
                    .from("montante_du_jour")
                    .select("*")
                    .order("id", { ascending: false })
                    .limit(1)
                    .single();

                if (currentData) {
                    setMontante(currentData as MontanteRow);

                    // Fetch history
                    const { data: historyData } = await supabase
                        .from("montante_du_jour")
                        .select("id, jour_actuel, mise_actuelle, cote_cible, statut, matchs, created_at")
                        .lte("id", currentData.id)
                        .order("id", { ascending: true });

                    if (historyData) {
                        const allRows = historyData as MontanteRow[];
                        const filteredRows: MontanteRow[] = [];
                        let found = false;
                        for (let i = allRows.length - 1; i >= 0; i--) {
                            if (found) break;
                            filteredRows.unshift(allRows[i]);
                            if (allRows[i].jour_actuel === 1 && allRows[i].id !== currentData.id) found = true;
                        }
                        setHistorique(filteredRows);
                    }
                }
            } catch (error) {
                console.error("Error fetching montante:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen]);

    if (!isOpen) return null;

    const totalJours = 17;

    // Default state if no data
    const displayMontante = montante || {
        id: 0,
        jour_actuel: 1,
        mise_actuelle: 1000,
        cote_cible: 1.50,
        statut: "EN_COURS",
        matchs: null,
        created_at: new Date().toISOString(),
    };

    const progression = Math.round((displayMontante.jour_actuel / totalJours) * 100);
    const miseFormatee = displayMontante.mise_actuelle.toLocaleString("fr-FR");
    const gainPotentiel = Math.round(displayMontante.mise_actuelle * displayMontante.cote_cible);
    const gainFormate = gainPotentiel.toLocaleString("fr-FR");
    const matchs = (displayMontante.matchs || []) as MontanteMatch[];
    const match = matchs[0] || null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full sm:max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 to-red-500 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🔥</span>
                        <div>
                            <h2 className="text-white font-black text-lg">Défi Montante</h2>
                            <p className="text-white/80 text-xs">17 jours pour gagner gros</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 flex items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <div className="p-5">
                        {/* Jour actuel + Progression */}
                        <div className="mb-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white/60 text-xs font-bold uppercase">Progression</span>
                                <span className="text-white font-black text-lg">
                                    Jour {displayMontante.jour_actuel}<span className="text-white/50 text-sm">/{totalJours}</span>
                                </span>
                            </div>
                            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                                    style={{ width: `${progression}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1.5 text-[10px] text-white/40 font-medium">
                                <span>Jour 1</span>
                                <span className="text-white/60 font-bold">{progression}%</span>
                                <span>Jour 17</span>
                            </div>
                        </div>

                        {/* Statut */}
                        <div className="mb-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${displayMontante.statut === "GAGNE"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : displayMontante.statut === "PERDU"
                                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                        : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                }`}>
                                {displayMontante.statut === "EN_COURS" ? "⏳ En cours" : displayMontante.statut === "GAGNE" ? "✅ Gagné" : "❌ Perdu"}
                            </span>
                        </div>

                        {/* Mise + Gain */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Mise du jour</p>
                                <p className="text-xl font-black text-white">{miseFormatee} <span className="text-xs text-white/60">FCFA</span></p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest font-bold mb-1">Gain potentiel</p>
                                <p className="text-xl font-black text-emerald-400">{gainFormate} <span className="text-xs text-emerald-400/60">FCFA</span></p>
                            </div>
                        </div>

                        {/* Match du jour */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-5">
                            {match ? (
                                <>
                                    <p className="text-[10px] text-orange-400/80 uppercase tracking-widest font-bold mb-2">🤖 Prono du Robot</p>
                                    <p className="text-base font-black text-white truncate">
                                        {match.home_team} <span className="text-white/40 font-normal text-xs">vs</span> {match.away_team}
                                    </p>
                                    <p className="text-xs text-white/60 font-medium mt-1 truncate">{match.prediction}</p>
                                    <div className="flex items-center gap-3 mt-3">
                                        {match.commence_at && (
                                            <span className="text-[10px] text-white/40 font-mono">
                                                {new Date(match.commence_at).toLocaleTimeString("fr-FR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        )}
                                        <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black rounded-full">
                                            @ {match.cote.toFixed(2)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-2">
                                    <p className="text-xs text-white/50">⏳ En attente du premier prono du robot...</p>
                                </div>
                            )}
                        </div>

                        {/* Cote cible */}
                        <div className="flex items-center gap-2 text-white/40 text-xs mb-6">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Cote cible : {displayMontante.cote_cible.toFixed(2)} max</span>
                        </div>

                        {/* Historique */}
                        {historique.length > 0 && (
                            <div>
                                <h3 className="text-white font-black text-sm mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Historique du cycle
                                </h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {historique.map((row) => {
                                        const isWin = row.statut === "GAGNE";
                                        const isLose = row.statut === "PERDU";
                                        const isCurrent = row.id === displayMontante.id;
                                        const rowMatchs = (row.matchs || []) as MontanteMatch[];
                                        const rowMatch = rowMatchs[0] || null;

                                        return (
                                            <div
                                                key={row.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border ${isCurrent
                                                        ? "bg-orange-500/10 border-orange-500/30"
                                                        : isWin
                                                            ? "bg-emerald-500/10 border-emerald-500/20"
                                                            : isLose
                                                                ? "bg-red-500/10 border-red-500/20"
                                                                : "bg-white/5 border-white/10"
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${isWin ? "bg-emerald-500/20 text-emerald-400" : isLose ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/40"
                                                    }`}>
                                                    {isWin ? "✅" : isLose ? "❌" : "⏳"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-bold ${isCurrent ? "text-orange-400" : "text-white"}`}>
                                                        Jour {row.jour_actuel} {isCurrent && <span className="text-[9px] text-orange-400/70">(aujourd'hui)</span>}
                                                    </p>
                                                    <p className="text-[10px] text-white/40 truncate">
                                                        {rowMatch ? `${rowMatch.home_team} vs ${rowMatch.away_team}` : "Match à venir"}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] font-bold text-white/70">{row.mise_actuelle.toLocaleString("fr-FR")} F</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}