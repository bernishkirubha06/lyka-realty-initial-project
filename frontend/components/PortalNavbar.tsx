"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Briefcase, 
  Cpu, 
  UserCheck, 
  Users,
  LogOut, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Building2
} from "lucide-react";
import LykaLogo from "./LykaLogo";
import { Currency } from "@/lib/currency";
import { api } from "@/lib/api";
import { User } from "@/lib/types";

interface PortalNavbarProps {
  currentCurrency?: Currency;
  onCurrencyChange?: (c: Currency) => void;
  activeRoleTitle?: string;
}

export default function PortalNavbar({
  currentCurrency = "AED",
  onCurrencyChange,
  activeRoleTitle = "Staff Workspace"
}: PortalNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("propai_user");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    router.push("/portal");
  };

  // Role-based portal navigation:
  // - Sales Person (agent): ONLY sees "Sales Dashboard" (/sales). Removed Manager & Admin pages!
  // - Sales Manager (manager): Sees "Sales Manager Portal" (/manager) & "Sales Dashboard" (/sales). Removed Admin page!
  // - Admin (admin): Sees "Admin Console" (/admin), "Sales Manager Portal" (/manager), and "Sales Dashboard" (/sales).
  const allowedViews = React.useMemo(() => {
    const role = currentUser?.role;
    if (role === "agent") {
      return [{ name: "Sales Dashboard", href: "/sales", icon: Users }];
    }
    if (role === "manager") {
      return [
        { name: "Sales Manager Portal", href: "/manager", icon: Briefcase },
        { name: "Sales Dashboard", href: "/sales", icon: Users }
      ];
    }
    if (role === "admin") {
      return [
        { name: "Admin Console", href: "/admin", icon: Cpu },
        { name: "Sales Manager Portal", href: "/manager", icon: Briefcase },
        { name: "Sales Dashboard", href: "/sales", icon: Users }
      ];
    }
    // Default fallback while loading
    return [{ name: "Sales Dashboard", href: "/sales", icon: Users }];
  }, [currentUser]);

  return (
    <header className="sticky top-0 z-50 bg-[#0B0D13]/95 backdrop-blur-md border-b border-[#232733] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left: Logo & Enterprise Badge */}
          <div className="flex items-center gap-4">
            <LykaLogo size="md" />
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-zinc-800">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A869]" />
                Enterprise Portal
              </span>
              <span className="text-xs text-zinc-400 font-medium hidden md:inline">
                {activeRoleTitle}
              </span>
            </div>
          </div>

          {/* Center: Role-restricted Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-[#141620] p-1 rounded-xl border border-[#232733]">
            {allowedViews.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#C5A869] text-black shadow-md font-bold"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Currency, Customer Site Link & User Profile */}
          <div className="flex items-center gap-3">
            {/* Currency selector toggle */}
            <div className="hidden md:flex items-center bg-[#15171F] p-1 rounded-lg border border-[#262A36]">
              <button
                type="button"
                onClick={() => onCurrencyChange?.("AED")}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition-all ${
                  currentCurrency === "AED"
                    ? "bg-[#C5A869] text-black shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                AED
              </button>
              <button
                type="button"
                onClick={() => onCurrencyChange?.("INR")}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition-all ${
                  currentCurrency === "INR"
                    ? "bg-[#C5A869] text-black shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                INR ₹
              </button>
            </div>

            {/* Link back to public customer marketplace */}
            <Link
              href="/"
              target="_blank"
              title="Open public customer site in new tab"
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C5A869]" />
              <span>Customer Site</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </Link>

            {/* Staff User Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <div className="text-right">
                  <p className="text-xs font-semibold text-white leading-tight">
                    {currentUser.full_name}
                  </p>
                  <p className="text-[10px] text-[#C5A869] uppercase font-mono tracking-wider">
                    {currentUser.role}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out of Enterprise Portal"
                  className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/portal"
                className="px-3 py-1.5 text-xs font-semibold text-[#E1CB8E] bg-[#C5A869]/10 border border-[#C5A869]/30 rounded-lg hover:bg-[#C5A869]/20 transition"
              >
                Staff Login
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
