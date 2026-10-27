"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Sparkles, 
  ArrowRight, 
  UserCheck, 
  Briefcase, 
  Cpu, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  UserPlus,
  Phone,
  User as UserIcon,
  ExternalLink,
  Eye,
  EyeOff
} from "lucide-react";
import LykaLogo from "@/components/LykaLogo";
import { api } from "@/lib/api";
import { isAuthorizedStaffEmail } from "@/lib/staff";

export default function PortalPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState<"agent" | "manager" | "admin">("agent");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("propai_user");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
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
      router.push("/dashboard");
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
      const res = await api.login({ email: cleanEmail, password: cleanPassword });
      if (res.user.role === "customer") {
        throw new Error("Customer accounts must sign in via the Customer Marketplace.");
      }
      routeByRole(res.user.role);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your work email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const cleanEmail = regEmail.trim().toLowerCase();
      if (!isAuthorizedStaffEmail(cleanEmail, regRole)) {
        if (regRole === "agent") {
          throw new Error("Access Restricted: Only the 12 authorized Lyka Realty sales person emails are permitted.");
        } else if (regRole === "manager") {
          throw new Error("Access Restricted: Only the authorized Sales Manager (fatima.alzaabi@lykarealty.ae) is permitted.");
        } else {
          throw new Error("Access Restricted: Only the authorized Administrator (alexander.vance@lykarealty.ae) is permitted.");
        }
      }

      const res = await api.register({
        email: cleanEmail,
        password: regPassword.trim(),
        full_name: regFullName.trim(),
        phone: regPhone ? regPhone.trim() : undefined,
        role: regRole
      });
      setSuccessMsg(`Account created successfully as ${regRole.toUpperCase()}! Redirecting to dashboard...`);
      setTimeout(() => {
        routeByRole(res.user.role);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoRole: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email: demoEmail, password: "password123" });
      routeByRole(res.user.role);
    } catch (err: any) {
      try {
        const altPass = demoRole === "admin" ? "admin123" : demoRole === "manager" ? "manager123" : "agent123";
        const res2 = await api.login({ email: demoEmail, password: altPass });
        routeByRole(res2.user.role);
      } catch (err2: any) {
        setError(err.message || "Demo login failed.");
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col selection:bg-[#C5A869]/30">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#C5A869]/15 via-transparent to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-blue-500/5 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 border-b border-[#1E222D] bg-[#090A0D]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LykaLogo size="md" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/30">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A869]" /> Enterprise Portal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="text-xs text-zinc-400 hover:text-[#E1CB8E] transition flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-[#C5A869]" />
            Customer Marketplace
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
          
          {/* Left: Form Card with Toggle for Login vs Register */}
          <div className="lg:col-span-7 bg-[#111319] border border-[#232733] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  Staff Enterprise Gateway
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Dedicated portal for Real Estate Agents, Sales Managers &amp; Administrators
                </p>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex items-center bg-[#181B24] p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    mode === "login"
                      ? "bg-[#C5A869] text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(null); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    mode === "register"
                      ? "bg-[#C5A869] text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {currentUser && (
              <div className="mb-5 p-3.5 rounded-xl bg-[#181B24] border border-[#C5A869]/40 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-zinc-400">Currently signed in as:</div>
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

            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* MODE 1: LOGIN */}
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Work Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="rajesh.sharma@lykarealty.ae"
                      className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
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
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#C5A869] to-[#DFCA93] hover:from-[#B89A5B] hover:to-[#C5A869] text-black font-semibold text-sm transition shadow-lg shadow-[#C5A869]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? "Authenticating..." : "Sign In to Enterprise Workspace"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* MODE 2: REGISTER WITH SEPARATE ROLES */
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Role Selector Cards */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-2">
                    Select Your Enterprise Role:
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRegRole("agent")}
                      className={`p-3 rounded-xl border text-left transition ${
                        regRole === "agent"
                          ? "bg-blue-500/15 border-blue-500 text-white"
                          : "bg-[#181B24] border-[#262A36] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <UserCheck className={`w-4 h-4 mb-1.5 ${regRole === "agent" ? "text-blue-400" : "text-zinc-500"}`} />
                      <div className="text-xs font-bold leading-tight">Agent</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Leads &amp; CRM</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegRole("manager")}
                      className={`p-3 rounded-xl border text-left transition ${
                        regRole === "manager"
                          ? "bg-purple-500/15 border-purple-500 text-white"
                          : "bg-[#181B24] border-[#262A36] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Briefcase className={`w-4 h-4 mb-1.5 ${regRole === "manager" ? "text-purple-400" : "text-zinc-500"}`} />
                      <div className="text-xs font-bold leading-tight">Manager</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Team Oversight</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegRole("admin")}
                      className={`p-3 rounded-xl border text-left transition ${
                        regRole === "admin"
                          ? "bg-[#C5A869]/15 border-[#C5A869] text-white"
                          : "bg-[#181B24] border-[#262A36] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Cpu className={`w-4 h-4 mb-1.5 ${regRole === "admin" ? "text-[#E1CB8E]" : "text-zinc-500"}`} />
                      <div className="text-xs font-bold leading-tight">Admin</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Full System</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Omar Khalid"
                      className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Work Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="omar@lykarealty.ae"
                        className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+971 50 123 4567"
                        className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      tabIndex={-1}
                      title={showRegPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-0.5 rounded focus:outline-none cursor-pointer"
                    >
                      {showRegPassword ? (
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
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#C5A869] to-[#DFCA93] hover:from-[#B89A5B] hover:to-[#C5A869] text-black font-semibold text-sm transition shadow-lg shadow-[#C5A869]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? "Creating Staff Account..." : `Register as ${regRole.toUpperCase()} & Launch Dashboard`}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="mt-6 pt-5 border-t border-[#1E222D] flex items-center justify-between text-[11px] text-zinc-500">
              <span>Customer website: <Link href="/" className="text-[#E1CB8E] hover:underline">lykarealty.ae</Link></span>
              <span>PropAI Architecture v2.4</span>
            </div>
          </div>

          {/* Right: 1-Click Fast Switcher for Demo */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#151720]/90 border border-[#262A36] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#E1CB8E] mb-2">
                <Sparkles className="w-4 h-4 text-[#C5A869]" />
                Instant Role-Based Access Switcher
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Test any staff role instantly without typing passwords. Click below to launch their dedicated dashboard:
              </p>

              <div className="space-y-3">
                {/* 0. Sales Person Dashboard (Firebase Live Sync) */}
                <Link
                  href="/sales"
                  className="w-full text-left p-3.5 rounded-xl bg-gradient-to-r from-[#C5A869]/15 to-transparent border border-[#C5A869]/60 hover:border-[#E1CB8E] hover:bg-[#C5A869]/20 transition group flex items-start gap-3 block"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#C5A869]/25 border border-[#C5A869]/60 flex items-center justify-center shrink-0 text-[#E1CB8E]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#E1CB8E] flex items-center gap-1.5">
                        Sales Person Dashboard
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Firebase</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#C5A869]/20 text-[#E1CB8E] font-mono">/sales</span>
                    </div>
                    <div className="text-[11px] text-zinc-300 mt-0.5">rajesh.sharma@lykarealty.ae • Approved Access</div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      Assigned leads, live customer activity tracking, real property recommendations &amp; visit booking.
                    </div>
                  </div>
                </Link>

                {/* 1. Real Estate Agent */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin("rajesh.sharma@lykarealty.ae", "agent")}
                  disabled={loading}
                  className="w-full text-left p-3.5 rounded-xl bg-[#101218] border border-blue-500/30 hover:border-blue-400/80 hover:bg-blue-500/5 transition group flex items-start gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">1. Real Estate Agent (1 of 12)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">/sales</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Rajesh Sharma • rajesh.sharma@lykarealty.ae</div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Assigned leads CRM, qualification scores, follow-ups &amp; booked site visits.
                    </div>
                  </div>
                </button>

                {/* 2. Sales Manager */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin("fatima.alzaabi@lykarealty.ae", "manager")}
                  disabled={loading}
                  className="w-full text-left p-3.5 rounded-xl bg-[#101218] border border-purple-500/30 hover:border-purple-400/80 hover:bg-purple-500/5 transition group flex items-start gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">2. Sales Manager (1 Authorized)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">/manager</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Fatima Al-Zaabi • fatima.alzaabi@lykarealty.ae</div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Team lead oversight, agent leaderboard, VIP visit dispatching &amp; conversion metrics.
                    </div>
                  </div>
                </button>

                {/* 3. System Administrator */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin("alexander.vance@lykarealty.ae", "admin")}
                  disabled={loading}
                  className="w-full text-left p-3.5 rounded-xl bg-[#101218] border border-[#C5A869]/40 hover:border-[#E1CB8E] hover:bg-[#C5A869]/5 transition group flex items-start gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#C5A869]/15 border border-[#C5A869]/40 flex items-center justify-center shrink-0 text-[#E1CB8E]">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">3. System Administrator (1 Authorized)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#C5A869]/20 text-[#E1CB8E] font-mono">/admin</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Alexander Vance • alexander.vance@lykarealty.ae</div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Staff user &amp; role management, full property inventory CRUD &amp; system audit logs.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Customer Website Info Card */}
            <div className="p-4 rounded-xl bg-[#111319]/80 border border-[#232733] flex items-start gap-3">
              <Building2 className="w-5 h-5 text-[#C5A869] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white">Looking for the Customer Portal?</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Customers explore properties and interact with the AI assistant at the main marketplace.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 text-xs text-[#E1CB8E] hover:underline font-semibold mt-2"
                >
                  Go to Customer Dashboard (/dashboard) →
                </Link>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
