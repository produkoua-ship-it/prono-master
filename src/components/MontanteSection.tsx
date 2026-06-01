import { supabase } from "@/lib/supabase";

interface MontanteRow {
    id: number;
    jour_actuel: number;
    mise_actuelle: number;
    gain_potentiel: number;
    prono_selectionne: string | null;
    home_team: string | null;
    away_team: string | null;
    cote: number | null;
    commence_at: string | null;
    statut: string;
}

export default async function MontanteSection() {
    // Récupérer la dernière montante en cours
    const { data, error } = await supabase
        .from("montante_du_jour")
        .select("*")
        .order("id", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return null;
    }

    const montante = data as MontanteRow;
    const totalJours = 17;
    const progression = Math.round((montante.jour_actuel / totalJours) * 100);
    const miseFormatee = montante.mise_actuelle.toLocaleString("fr-FR");
    const gainFormate = montante.gain_potentiel.toLocaleString("fr-FR");

    return (
        <div className="w-full max-w-6xl mb-8">
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 overflow-hidden border border-slate-700/50 shadow-[0_8px_40px_rgba(0,0,0,0.2)]">
                {/* Effet de lueur décoratif */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-yellow-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

                {/* Badge + Jour */}
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)]">
                            🔥 Défi Montante
                        </span>
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-bold rounded-full uppercase">
                            {montante.statut === "en_cours" ? "En cours" : montante.statut === "gagne" ? "Réussi" : "Échoué"}
                        </span>
                    </div>
                    <div className="text-white">
                        <span className="text-2xl sm:text-3xl font-black">Jour {montante.jour_actuel}</span>
                        <span className="text-white/50 font-bold text-lg"> / {totalJours}</span>
                    </div>
                </div>

                {/* Barre de progression */}
                <div className="relative mb-6">
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                            style={{ width: `${progression}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-white/40 font-medium">
                        <span>Jour 1</span>
                        <span>Jour 17</span>
                    </div>
                </div>

                {/* Mise + Gain */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Mise du jour</p>
                        <p className="text-xl sm:text-2xl font-black text-white">{miseFormatee} <span className="text-sm text-white/60">FCFA</span></p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest font-bold mb-1">Gain potentiel</p>
                        <p className="text-xl sm:text-2xl font-black text-emerald-400">{gainFormate} <span className="text-sm text-emerald-400/60">FCFA</span></p>
                    </div>
                </div>

                {/* Match du jour */}
                {montante.prono_selectionne && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <p className="text-[10px] text-orange-400/80 uppercase tracking-widest font-bold mb-3">🤖 Prono sélectionné par le Robot</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <p className="text-lg font-black text-white">
                                    {montante.home_team} <span className="text-white/40 font-normal text-sm">vs</span> {montante.away_team}
                                </p>
                                <p className="text-sm text-white/60 font-medium mt-1">{montante.prono_selectionne}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {montante.commence_at && (
                                    <span className="text-xs text-white/40 font-mono">
                                        {new Date(montante.commence_at).toLocaleTimeString("fr-FR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                )}
                                {montante.cote && (
                                    <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-black rounded-full">
                                        @ {montante.cote.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}