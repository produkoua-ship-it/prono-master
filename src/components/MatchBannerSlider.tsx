"use client";

import { useState, useEffect } from "react";

interface BannerMatch {
    id: number;
    sport: string;
    home_team: string;
    away_team: string;
    commence_at: string;
}

interface MatchBannerSliderProps {
    matches: BannerMatch[];
}

// Images de stade fiables par sport (Unsplash)
const sportImages: Record<string, string> = {
    soccer: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
    football: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
    ligue: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
    premier: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
    champions: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
    liga: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
    serie: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
    bundesliga: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
    mlb: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=1200&q=80",
    baseball: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=1200&q=80",
    nba: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80",
    basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80",
    hockey: "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=1200&q=80",
    nhl: "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=1200&q=80",
    tennis: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80",
    atp: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80",
    wta: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80",
    cricket: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200&q=80",
    nfl: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&q=80",
    ufc: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&q=80",
    mma: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&q=80",
    boxing: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&q=80",
    rugby: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1200&q=80",
};

// Image de stade générique par défaut (stade sous projecteurs)
const defaultImage = "https://images.unsplash.com/photo-1540747737956-37872e7e56ae?w=1200&q=80";

function getSportImage(sport: string): string {
    if (!sport) return defaultImage;
    const lower = sport.toLowerCase();
    for (const [key, url] of Object.entries(sportImages)) {
        if (lower.includes(key)) return url;
    }
    return defaultImage;
}

function formatBannerTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
}

const welcomeBanner = {
    id: 0,
    title: "PronoMaster",
    subtitle: "Bienvenue",
    league: "Tous les sports",
    time: "",
    image: defaultImage,
};

export default function MatchBannerSlider({ matches }: MatchBannerSliderProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    const banners = matches.length > 0
        ? matches.map((m) => ({
            id: m.id,
            title: `${m.home_team} vs ${m.away_team}`,
            subtitle: "Match du jour",
            league: m.sport || "Sport",
            time: formatBannerTime(m.commence_at),
            image: getSportImage(m.sport),
        }))
        : [welcomeBanner];

    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % banners.length);
        }, 4500);
        return () => clearInterval(interval);
    }, [banners.length]);

    return (
        <div className="relative w-full h-32 sm:h-36 md:h-44 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-6 group">
            {banners.map((banner, idx) => (
                <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                >
                    {/* Image de fond via div + backgroundImage (pas de texte alt parasite) */}
                    <div
                        className="absolute inset-0 w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${banner.image})` }}
                    />
                    {/* Superposition sombre */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/30" />

                    {/* Contenu texte */}
                    <div className="relative h-full flex flex-col justify-between p-3 sm:p-4 md:p-6 text-white">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                Top Match
                            </span>
                            <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
                                {banner.league}
                            </span>
                        </div>

                        <div className="space-y-0.5 sm:space-y-1">
                            <p className="text-[9px] sm:text-[10px] font-medium text-white/70 uppercase tracking-wider">
                                {banner.subtitle}
                            </p>
                            <h2 className="text-xs sm:text-sm md:text-base font-black tracking-tight drop-shadow-lg">
                                {banner.title}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 text-white/90">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[10px] sm:text-xs md:text-sm font-bold">
                                {banner.time ? `Coup d'envoi à ${banner.time}` : "Bonne lecture !"}
                            </span>
                        </div>
                    </div>
                </div>
            ))}

            {banners.length > 1 && (
                <>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                        {banners.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveIndex(idx)}
                                className={`transition-all duration-300 rounded-full ${idx === activeIndex ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80"}`}
                                aria-label={`Aller au slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={() => setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-all duration-300"
                        aria-label="Slide précédent"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setActiveIndex((prev) => (prev + 1) % banners.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-all duration-300"
                        aria-label="Slide suivant"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}
        </div>
    );
}