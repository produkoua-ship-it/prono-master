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
      className={`w-full py-3 px-4 rounded-xl font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 border ${
        copied
          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-glow"
          : "bg-neon-green/10 text-neon-green border-neon-green/20 hover:bg-neon-green hover:text-black hover:border-neon-green hover:shadow-[0_0_15px_rgba(57,255,20,0.4)]"
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
