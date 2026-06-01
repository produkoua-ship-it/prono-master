"use client";

import { useState } from "react";

interface ClipboardButtonProps {
  textToCopy: string;
  label?: string;
}

export default function ClipboardButton({ textToCopy, label = "Copier le combiné" }: ClipboardButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`w-full py-3 px-4 rounded-2xl font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 border ${
        copied
          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
          : "bg-white text-slate-700 border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:bg-gradient-to-r hover:from-[#FF2E93] hover:to-[#712EFF] hover:text-white hover:border-transparent hover:shadow-[0_8px_20px_rgba(255,46,147,0.15)]"
      }`}
    >
      {copied ? (
        <>
          <svg
            className="w-5 h-5 animate-scale-up"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Copié !
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
