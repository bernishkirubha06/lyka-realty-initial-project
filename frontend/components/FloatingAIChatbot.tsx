"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Sparkles, ArrowUpRight } from "lucide-react";

function FloatingAIChatbotContent() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // Do not render the floating launcher if already on the AI Assistant page
  if (pathname === "/assistant") {
    return null;
  }

  return (
    <aside 
      aria-label="AI Assistant Quick Launch"
      className="fixed bottom-6 right-6 z-50 flex items-center group select-none"
    >
      <Link
        href="/assistant"
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex items-center gap-3 p-1.5 pl-4 pr-2 rounded-full bg-[#12141C]/95 border border-[#C5A869]/50 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(197,168,105,0.25)] hover:shadow-[0_8px_36px_rgba(0,0,0,0.8),0_0_30px_rgba(197,168,105,0.5)] hover:border-[#C5A869] backdrop-blur-xl transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
        title="Open Lyka AI Advisory in a new tab"
      >
        {/* Subtle decorative pulsing halo */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#C5A869]/40 via-[#F3E5AB]/20 to-[#9E8042]/40 blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200 pointer-events-none" />

        {/* Text Pill label */}
        <div className="relative flex flex-col text-left py-1">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#E1CB8E]">
              Lyka AI
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#C5A869]/20 text-[#DFCA93] border border-[#C5A869]/30 font-medium">
              Live
            </span>
          </div>
          <span className="text-xs font-semibold text-white group-hover:text-[#F3E5AB] transition-colors flex items-center gap-1">
            Chat with Advisor
            <ArrowUpRight className="w-3 h-3 text-[#C5A869] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </span>
        </div>

        {/* Circular Glowing Icon Button */}
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-[#9E8042] via-[#C5A869] to-[#F3E5AB] text-black shadow-inner transition-transform duration-300 group-hover:scale-105">
          <Bot className="w-6 h-6 text-black drop-shadow-sm transition-transform duration-300 group-hover:rotate-6" />
          
          {/* Sparkle badge in corner */}
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#090A0D] border border-[#C5A869] flex items-center justify-center shadow">
            <Sparkles className="w-2.5 h-2.5 text-[#E1CB8E]" />
          </div>
        </div>
      </Link>
    </aside>
  );
}

export default function FloatingAIChatbot() {
  return (
    <Suspense fallback={null}>
      <FloatingAIChatbotContent />
    </Suspense>
  );
}
