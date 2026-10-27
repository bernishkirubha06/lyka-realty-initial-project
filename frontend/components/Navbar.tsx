"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building2, 
  LayoutDashboard, 
  ShieldCheck, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  PhoneCall,
  Sparkles,
  Users
} from "lucide-react";
import LykaLogo from "./LykaLogo";
import AuthModal from "./AuthModal";
import { Currency } from "@/lib/currency";
import { api } from "@/lib/api";
import { User } from "@/lib/types";

interface NavbarProps {
  currentCurrency?: Currency;
  onCurrencyChange?: (c: Currency) => void;
  onOpenAuth?: (initialMode?: "login" | "register") => void;
}

export default function Navbar({
  currentCurrency = "AED",
  onCurrencyChange,
  onOpenAuth
}: NavbarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalAuthOpen, setInternalAuthOpen] = useState(false);
  const [internalAuthMode, setInternalAuthMode] = useState<"login" | "register">("login");

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
    window.location.reload();
  };

  const openAuth = (mode: "login" | "register" = "login") => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      setInternalAuthMode(mode);
      setInternalAuthOpen(true);
    }
  };

  const navLinks = [
    { name: "Explore Properties", href: "/properties", icon: Building2 },
    { name: "AI Assistant", href: "/assistant", icon: Sparkles },
    ...(currentUser?.role === "customer"
      ? [{ name: "My Dashboard", href: "/dashboard", icon: LayoutDashboard }]
      : currentUser?.role === "admin"
      ? [{ name: "Admin Console", href: "/admin", icon: ShieldCheck }]
      : currentUser?.role === "manager"
      ? [{ name: "Sales Oversight", href: "/manager", icon: ShieldCheck }]
      : currentUser?.role === "agent"
      ? [
          { name: "Sales Dashboard", href: "/sales", icon: Users }
        ]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#090A0D]/90 backdrop-blur-md border-b border-[#232733] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <LykaLogo size="md" />

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={`${link.name}-${link.href}`}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "text-[#E1CB8E] bg-[#C5A869]/10 border border-[#C5A869]/30 shadow-sm"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Controls: Currency Toggle & Auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Currency selector toggle */}
            <div className="flex items-center bg-[#15171F] p-1 rounded-lg border border-[#262A36]">
              <button
                type="button"
                onClick={() => onCurrencyChange?.("AED")}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
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
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                  currentCurrency === "INR"
                    ? "bg-[#C5A869] text-black shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                INR ₹
              </button>
            </div>



            {/* User Profile or Login */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <Link
                  href={
                    currentUser.role === "admin" 
                      ? "/admin" 
                      : currentUser.role === "manager" 
                      ? "/manager" 
                      : currentUser.role === "agent" 
                      ? "/agent" 
                      : "/dashboard"
                  }
                  className="text-right hover:opacity-80 transition"
                >
                  <p className="text-xs font-semibold text-zinc-200 leading-tight">
                    {currentUser.full_name.split(" ")[0]}
                  </p>
                  <p className="text-[10px] text-[#C5A869] uppercase font-mono">
                    {currentUser.role} Dashboard →
                  </p>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition border border-zinc-700/60"
              >
                <UserIcon className="w-4 h-4 text-zinc-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => onCurrencyChange?.(currentCurrency === "AED" ? "INR" : "AED")}
              className="px-2 py-1 text-xs font-bold rounded bg-zinc-800 text-[#C5A869] border border-zinc-700"
            >
              {currentCurrency}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0F1117] border-b border-zinc-800 px-4 pt-3 pb-6 space-y-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={`${link.name}-${link.href}`}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <Icon className="w-5 h-5 text-[#C5A869]" />
                {link.name}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">

            {currentUser ? (
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 rounded-lg">
                <span className="text-xs text-zinc-300">{currentUser.full_name} ({currentUser.role})</span>
                <button onClick={handleLogout} className="text-xs text-red-400 flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuth("login");
                }}
                className="w-full py-2.5 rounded-lg text-sm text-zinc-300 bg-zinc-800 text-center"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Customer Auth Modal (only when not handled by page) */}
      {!onOpenAuth && (
        <AuthModal
          isOpen={internalAuthOpen}
          onClose={() => setInternalAuthOpen(false)}
          initialMode={internalAuthMode}
          onSuccess={() => window.location.reload()}
        />
      )}
    </nav>
  );
}
