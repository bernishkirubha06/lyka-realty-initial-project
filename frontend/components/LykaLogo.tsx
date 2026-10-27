import React from "react";
import Link from "next/link";

interface LykaLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  href?: string;
}

export default function LykaLogo({
  size = "md",
  showWordmark = true,
  className = "",
  href = "/"
}: LykaLogoProps) {
  const dimensions = {
    sm: { height: 32, emblemWidth: 32, totalWidth: 140, emblemH: 26 },
    md: { height: 44, emblemWidth: 44, totalWidth: 180, emblemH: 36 },
    lg: { height: 56, emblemWidth: 56, totalWidth: 230, emblemH: 48 }
  }[size];

  const content = (
    <div className={`flex items-center gap-3 cursor-pointer group ${className}`}>
      {/* Golden Architectural Emblem */}
      <div className="relative flex-shrink-0" style={{ width: dimensions.emblemWidth, height: dimensions.emblemH }}>
        <svg
          viewBox="0 0 130 190"
          className="w-full h-full drop-shadow-[0_2px_10px_rgba(197,168,105,0.4)] transition-transform duration-300 group-hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lykaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F3E5AB" />
              <stop offset="35%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#C5A869" />
              <stop offset="100%" stopColor="#9E8042" />
            </linearGradient>
          </defs>
          {/* Left bent arch pillar / chevron roof */}
          <path
            d="M 12 185 L 12 60 L 98 12 L 98 64 L 54 88 L 54 185 Z"
            fill="url(#lykaGoldGrad)"
          />
          {/* Right vertical pillar */}
          <path
            d="M 85 88 L 122 109 L 122 185 L 85 185 Z"
            fill="url(#lykaGoldGrad)"
          />
        </svg>
      </div>

      {/* Typography */}
      {showWordmark && (
        <div className="flex flex-col select-none leading-none">
          <span className="font-extrabold tracking-tight text-white text-xl sm:text-2xl drop-shadow-sm font-sans flex items-center">
            Lyka
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-gradient-to-r from-[#C5A869] to-[#9E8042] text-black rounded font-mono">
              AI
            </span>
          </span>
          <span className="text-[11px] sm:text-[12px] font-medium tracking-[0.22em] text-[#C5A869] uppercase mt-0.5">
            Realty
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
