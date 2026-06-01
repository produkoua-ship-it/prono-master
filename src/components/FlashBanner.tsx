"use client";

interface FlashBannerProps {
    jourActuel?: number;
    miseActuelle?: number;
    gainPotentiel?: number;
    statut?: string;
}

export default function FlashBanner({
    jourActuel = 1,
    miseActuelle = 1000,
    gainPotentiel = 1500,
    statut = "EN_COURS"
}: FlashBannerProps) {
    const totalJours = 17;
    const progression = Math.round((jourActuel / totalJours) * 100);
    const miseFormatee = miseActuelle.toLocaleString("fr-FR");
    const gainFormate = gainPotentiel.toLocaleString("fr-FR");

    return (
        <div className="w-full max-w-6xl mb-4 rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500">
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
        </div>
    );
}