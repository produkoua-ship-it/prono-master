"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MontanteModal from "./MontanteModal";

export default function BottomNav() {
    const pathname = usePathname();
    const [showMontanteModal, setShowMontanteModal] = useState(false);

    const navItems = [
        {
            href: "/",
            label: "Accueil",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            href: "#montante",
            label: "Montante",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
            isModal: true,
        },
        {
            href: "/historique",
            label: "Historique",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
        },
        {
            href: "/compte",
            label: "Mon Compte",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
        },
    ];

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname === href;
    };

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 sm:hidden">
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        const isModal = item.isModal;

                        if (isModal) {
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => setShowMontanteModal(true)}
                                    className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all"
                                >
                                    <div className={`${active ? "text-purple-600" : "text-slate-400"} transition-colors`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-[10px] font-bold ${active ? "text-purple-600" : "text-slate-400"}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${active
                                    ? "text-purple-600 bg-purple-50"
                                    : "text-slate-400 hover:text-slate-600"
                                    }`}
                            >
                                <div className={active ? "text-purple-600" : "text-slate-400"}>
                                    {item.icon}
                                </div>
                                <span className={`text-[10px] font-bold ${active ? "text-purple-600" : "text-slate-400"}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Spacer pour éviter que le contenu soit caché sous la nav */}
            <div className="h-16 sm:hidden" />

            {/* Modal Montante */}
            <MontanteModal isOpen={showMontanteModal} onClose={() => setShowMontanteModal(false)} />
        </>
    );
}
