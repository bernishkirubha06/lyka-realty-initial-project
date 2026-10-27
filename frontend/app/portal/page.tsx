"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  Eye,
  EyeOff,
  Building2
} from "lucide-react";
import LykaLogo from "@/components/LykaLogo";
import { api } from "@/lib/api";
import { isAuthorizedStaffEmail } from "@/lib/staff";

export default function PortalPage() {
  const router = useRouter();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("propai_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role === "customer") {
          // Customers have NO access in the staff portal
          localStorage.removeItem("propai_user");
          localStorage.removeItem("propai_token");
        } else {
          setCurrentUser(u);
        }
      } catch {}
    }
  }, []);

  const routeByRole = (role: string) => {
    if (role === "admin") {
      router.push("/admin");
    } else if (role === "manager") {
      router.push("/manager");
    } else if (role === "agent") {
      router.push("/sales");
    } else {
      router.push("/");
    }
  };

  const handleSignOut = () => {
    api.logout();
    setCurrentUser(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      const cleanPassword = loginPassword.trim();

      // Check if email belongs to any authorized staff role
      const isAgent = isAuthorizedStaffEmail(cleanEmail, "agent");
      const isManager = isAuthorizedStaffEmail(cleanEmail, "manager");
      const isAdmin = isAuthorizedStaffEmail(cleanEmail, "admin");

      if (!isAgent && !isManager && !isAdmin) {
        throw new Error("Access Denied: Unrecognized or unauthorized corporate email.");
      }

      const res = await api.login({ email: cleanEmail, password: cleanPassword });

      if (res.user.role === "customer") {
        throw new Error("Access Denied: Customer accounts are not permitted on the staff portal.");
      }

      routeByRole(res.user.role);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your work email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col selection:bg-[#C5A869]/30">
      {/* Background Subtle Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#C5A869]/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-[#1E222D] bg-[#090A0D]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LykaLogo size="md" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A869]" /> Corporate Staff Gateway
          </span>
        </div>
        <Link 
          href="/" 
          className="text-xs text-zinc-400 hover:text-[#E1CB8E] transition flex items-center gap-1.5"
        >
          <Building2 className="w-3.5 h-3.5 text-[#C5A869]" />
          Return to Public Site
        </Link>
      </header>

      {/* Centered Isolated Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-[#111319] border border-[#232733] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          
          <div className="text-center pb-5 border-b border-zinc-800/80 mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A869]" />
              Staff Authentication
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Corporate Portal Sign In
            </h1>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto">
              Restricted to authorized real estate personnel only.
            </p>
          </div>

          {currentUser && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#181B24] border border-[#C5A869]/40 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-zinc-400">Active session:</div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{currentUser.full_name || currentUser.email}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-[#C5A869]/20 text-[#E1CB8E]">
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => routeByRole(currentUser.role)}
                  className="px-3 py-1.5 rounded-lg bg-[#C5A869] text-black font-semibold text-xs hover:bg-[#B89A5B] transition shadow"
                >
                  Open Workspace
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Secure Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Corporate Work Email <span className="text-[#C5A869]">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="corporate.email@lykarealty.ae"
                  className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password <span className="text-[#C5A869]">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  tabIndex={-1}
                  title={showLoginPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-0.5 rounded focus:outline-none cursor-pointer"
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#C5A869] to-[#DFCA93] hover:from-[#B89A5B] hover:to-[#C5A869] text-black font-semibold text-sm transition shadow-lg shadow-[#C5A869]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Authenticating..." : "Sign In to Staff Workspace"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#1E222D] text-center text-[11px] text-zinc-500">
            <span>Enterprise Security • Strict Authentication Required</span>
          </div>
        </div>
      </main>
    </div>
  );
}
