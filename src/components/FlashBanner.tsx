"use client";

import { useState, useEffect } from "react";

interface FlashBannerProps {
    nextMatchTime?: string | null;
    matchLabel?: string | null;
}

export default function FlashBanner({ nextMatchTime, matchLabel }: FlashBannerProps) {
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        if (!nextMatchTime) return;

        const targetTime = new Date(nextMatchTime).getTime();

        const updateCountdown = () => {
            const now = Date.now();
            const diff = targetTime - now;

            if (diff <= 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds });
            setIsUrgent(hours === 0 && minutes < 30);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [nextMatchTime]);

    if (!nextMatchTime) return null;

    const pad = (n: number) => String(n).padStart(2, "0");

    return (
        <div className={`w-full max-w-6xl mb-4 rounded-2xl overflow-hidden ${isUrgent
            ? "bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse"
            : "bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600"
            }`}>
            <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
                {/* Gauche : Label */}
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white text-xs sm:text-sm font-black tracking-wide uppercase">
                        {isUrgent ? "⚡ URGENT" : "🎯 Coup d'envoi imminent"}
                    </span>
                    {matchLabel && (
                        <span className="hidden sm:inline text-white/70 text-xs truncate">
                            — {matchLabel}
                        </span>
                    )}
                </div>

                {/* Droite : Compte à rebours */}
                <div className="flex items-center gap-1 shrink-0">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1 min-w-[2rem] text-center">
                        <span className="text-white font-mono text-sm sm:text-lg font-black tabular-nums">{pad(timeLeft.hours)}</span>
                        <span className="text-white/60 text-[8px] block leading-none">h</span>
                    </div>
                    <span className="text-white font-bold text-sm animate-pulse">:</span>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1 min-w-[2rem] text-center">
                        <span className="text-white font-mono text-sm sm:text-lg font-black tabular-nums">{pad(timeLeft.minutes)}</span>
                        <span className="text-white/60 text-[8px] block leading-none">m</span>
                    </div>
                    <span className="text-white font-bold text-sm animate-pulse">:</span>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1 min-w-[2rem] text-center">
                        <span className={`font-mono text-sm sm:text-lg font-black tabular-nums ${isUrgent ? "text-yellow-300" : "text-white"}`}>{pad(timeLeft.seconds)}</span>
                        <span className="text-white/60 text-[8px] block leading-none">s</span>
                    </div>
                </div>
            </div>
        </div>
    );
}