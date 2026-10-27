"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Flame, 
  Zap, 
  Snowflake, 
  TrendingUp, 
  Building2, 
  Filter, 
  Search, 
  Eye, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  BarChart3, 
  X,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  LogOut,
  ChevronRight,
  Award,
  Calendar,
  Plus
} from "lucide-react";
import LykaLogo from "@/components/LykaLogo";
import PortalNavbar from "@/components/PortalNavbar";
import { 
  Lead, 
  Property, 
  SiteVisit,
  DashboardAnalytics,
  User as UserType,
  FollowUpNote
} from "@/lib/types";
import { Currency, formatCurrency } from "@/lib/currency";
import { api } from "@/lib/api";
import { APPROVED_SALES_PERSONS, DISALLOWED_MOCK_EMAILS } from "@/lib/staff";
import { firebaseService, SalesLead } from "@/lib/firebase";

export default function SalesManagerDashboardPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("AED");
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [teamLeads, setTeamLeads] = useState<Lead[]>([]);
  const [firebaseLeads, setFirebaseLeads] = useState<SalesLead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [allFollowUps, setAllFollowUps] = useState<FollowUpNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedSalespersonFilter, setSelectedSalespersonFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");
  const [searchLead, setSearchLead] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "leaderboard" | "visits" | "followups" | "properties">("overview");

  // Lead detail drawer & reassignment
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [targetSalespersonEmail, setTargetSalespersonEmail] = useState<string>(APPROVED_SALES_PERSONS[0].email);
  const [reassigning, setReassigning] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Add Lead Modal State
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    customer_name: "",
    phone: "",
    email: "",
    locality: "Downtown Dubai",
    property_type: "Apartment",
    bhk: 2,
    budget_max: 2500000,
    assigned_to_email: APPROVED_SALES_PERSONS[0].email,
    pipeline_status: "New"
  });

  useEffect(() => {
    const stored = localStorage.getItem("propai_user");
    if (!stored) {
      router.replace("/");
      return;
    }
    try {
      const u = JSON.parse(stored);
      const cleanEmail = (u.email || "").toLowerCase().trim();

      // Reject mock emails
      if (DISALLOWED_MOCK_EMAILS.includes(cleanEmail) || !cleanEmail) {
        localStorage.removeItem("propai_user");
        localStorage.removeItem("propai_token");
        router.replace("/");
        return;
      }

      // Customer redirected to customer dashboard
      if (u.role === "customer") {
        router.replace("/dashboard");
        return;
      }

      // Sales person (agent) strictly barred from manager page -> redirect to sales dashboard
      if (u.role === "agent") {
        router.replace("/sales");
        return;
      }

      // Only manager or admin permitted
      if (u.role !== "manager" && u.role !== "admin") {
        router.replace("/");
        return;
      }

      setCurrentUser(u);
    } catch {
      router.replace("/");
      return;
    }
    fetchManagerData();

    // Subscribe to live Firebase leads across all 12 salespersons
    const unsub = firebaseService.subscribeAssignedLeads("", (fbLeads: SalesLead[]) => {
      setFirebaseLeads(fbLeads);
    }, true);

    return () => unsub();
  }, [router]);

  const fetchManagerData = async () => {
    setLoading(true);
    try {
      // 1. Fetch team leads from backend API
      const leads = await api.getLeads({
        category: selectedCategoryFilter || undefined,
        search: searchLead || undefined
      });
      setTeamLeads(leads);

      // 2. Fetch team-wide analytics & agent leaderboard
      const analyticsData = await api.getDashboardAnalytics();
      setAnalytics(analyticsData);

      // 3. Fetch follow ups due
      const fus = await api.getFollowUpsDueToday();
      setAllFollowUps(fus);

      // 4. Fetch properties
      const props = await api.getProperties({ page_size: 12 });
      setProperties(props.items);

      // 5. Fetch team site visits
      try {
        const visitsData = await api.getAllSiteVisits();
        setVisits(visitsData);
      } catch (err) {
        console.warn("Visits fetch:", err);
      }
    } catch (err: any) {
      console.error("Error loading manager data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVisitStatus = async (id: number, newStatus: any) => {
    try {
      await api.updateSiteVisit(id, { status: newStatus });
      setVisits((prev) => prev.map((v) => v.id === id ? { ...v, status: newStatus as any } : v));
    } catch (err: any) {
      alert(err.message || "Failed to update visit status");
    }
  };

  const handleReassignLead = async (leadId: string | number) => {
    setReassigning(true);
    setActionSuccess(null);
    try {
      const targetSp = APPROVED_SALES_PERSONS.find(sp => sp.email === targetSalespersonEmail) || APPROVED_SALES_PERSONS[0];

      // Update in Firebase live store
      await firebaseService.saveLead({
        id: String(leadId),
        assigned_to_email: targetSp.email,
        assigned_agent_name: targetSp.name
      } as any);

      // Also attempt backend update if numeric
      if (typeof leadId === "number" || !isNaN(Number(leadId))) {
        try {
          await api.assignLead(Number(leadId), 1);
        } catch {}
      }

      setActionSuccess(`Lead reassigned successfully to ${targetSp.name} (${targetSp.specialty})!`);
      setSelectedLead((prev: any) => prev ? { 
        ...prev, 
        assigned_agent_name: targetSp.name, 
        assigned_to_email: targetSp.email,
        assigned_specialty: targetSp.specialty
      } : null);
      await fetchManagerData();
    } catch (err: any) {
      alert(err.message || "Failed to reassign lead");
    } finally {
      setReassigning(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string | number, newStatus: string) => {
    try {
      await firebaseService.updateLeadStatus(String(leadId), newStatus as any);
      const numId = Number(leadId);
      if (!isNaN(numId)) {
        try {
          await api.updateLead(numId, { pipeline_status: newStatus as any });
        } catch (e) {
          console.warn("Backend update error:", e);
        }
      }

      setFirebaseLeads((prev) =>
        prev.map((l) => (String(l.id) === String(leadId) ? { ...l, pipeline_status: newStatus as any } : l))
      );
      setTeamLeads((prev) =>
        prev.map((l) => (String(l.id) === String(leadId) ? { ...l, pipeline_status: newStatus as any } : l))
      );
      setSelectedLead((prev: any) =>
        prev && String(prev.id) === String(leadId) ? { ...prev, pipeline_status: newStatus } : prev
      );
      setActionSuccess(`Pipeline stage updated to "${newStatus}". Conversion rate recalculated.`);
    } catch (err: any) {
      alert(err.message || "Failed to update lead status");
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sp = APPROVED_SALES_PERSONS.find((s) => s.email === newLeadData.assigned_to_email) || APPROVED_SALES_PERSONS[0];
      const created = await firebaseService.saveLead({
        customer_name: newLeadData.customer_name,
        phone: newLeadData.phone,
        email: newLeadData.email,
        locality: newLeadData.locality,
        property_type: newLeadData.property_type,
        bhk: Number(newLeadData.bhk),
        budget_max: Number(newLeadData.budget_max),
        assigned_to_email: sp.email,
        assigned_agent_name: sp.name,
        pipeline_status: newLeadData.pipeline_status as any,
        lead_score: 80,
        lead_category: "HOT"
      });
      setFirebaseLeads((prev) => [created, ...prev]);
      setAddLeadOpen(false);
      setNewLeadData({
        customer_name: "",
        phone: "",
        email: "",
        locality: "Downtown Dubai",
        property_type: "Apartment",
        bhk: 2,
        budget_max: 2500000,
        assigned_to_email: APPROVED_SALES_PERSONS[0].email,
        pipeline_status: "New"
      });
      setActionSuccess(`New lead created for ${created.customer_name} and assigned to ${sp.name}!`);
    } catch (err: any) {
      alert(err.message || "Failed to create lead");
    }
  };

  // Merge leads across all 12 salespersons from both Firebase & SQLite
  const allCombinedLeads = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Add Firebase leads (includes live territory routing)
    firebaseLeads.forEach((fb) => {
      const sp = APPROVED_SALES_PERSONS.find(
        (s) => s.email.toLowerCase() === (fb.assigned_to_email || "").toLowerCase()
      );
      const score = typeof fb.lead_score === "number" ? fb.lead_score : 75;
      const cat = fb.lead_category || (score >= 70 ? "HOT" : score >= 40 ? "WARM" : "COLD");

      map.set(String(fb.id), {
        id: fb.id,
        customer_name: fb.customer_name || "Prospective Client",
        email: fb.email,
        phone: fb.phone,
        locality: fb.locality || "Dubai",
        city: fb.city || "Dubai",
        property_type: fb.property_type || "Apartment",
        bhk: fb.bhk,
        budget_max: fb.budget_max,
        budget_min: fb.budget_min,
        currency: fb.currency || "AED",
        lead_score: score,
        lead_category: cat,
        pipeline_status: fb.pipeline_status || "New",
        assigned_agent_name: fb.assigned_agent_name || sp?.name || "Rajesh Sharma",
        assigned_to_email: fb.assigned_to_email || sp?.email || "rajesh.sharma@lykarealty.ae",
        assigned_specialty: sp?.specialty || fb.locality || "Dubai Prime Specialist",
        purchase_timeline: fb.purchase_timeline,
        preferred_features: fb.preferred_features || [],
        notes: fb.notes,
        is_demo: fb.is_demo
      });
    });

    // 2. Add SQLite leads if not already in map
    teamLeads.forEach((sqlLead) => {
      const key = String(sqlLead.id);
      if (!map.has(key)) {
        const sp = APPROVED_SALES_PERSONS.find(
          (s) => s.name.toLowerCase() === (sqlLead.assigned_agent_name || "").toLowerCase()
        ) || APPROVED_SALES_PERSONS[0];
        const score = typeof sqlLead.lead_score === "number" ? sqlLead.lead_score : 75;
        const cat = sqlLead.lead_category || (score >= 70 ? "HOT" : score >= 40 ? "WARM" : "COLD");

        map.set(key, {
          ...sqlLead,
          lead_score: score,
          lead_category: cat,
          assigned_agent_name: sqlLead.assigned_agent_name || sp.name,
          assigned_to_email: sp.email,
          assigned_specialty: sp.specialty
        });
      }
    });

    return Array.from(map.values());
  }, [teamLeads, firebaseLeads]);

  // Filter leads by search query, score category, and salesperson
  const filteredLeads = useMemo(() => {
    return allCombinedLeads.filter((lead) => {
      // Search filter
      if (searchLead.trim()) {
        const q = searchLead.toLowerCase();
        const matchCust = lead.customer_name?.toLowerCase().includes(q);
        const matchEmail = lead.email?.toLowerCase().includes(q);
        const matchPhone = lead.phone?.toLowerCase().includes(q);
        const matchLoc = lead.locality?.toLowerCase().includes(q);
        const matchSp = lead.assigned_agent_name?.toLowerCase().includes(q);
        if (!matchCust && !matchEmail && !matchPhone && !matchLoc && !matchSp) return false;
      }

      // Score category filter
      if (selectedCategoryFilter) {
        if (lead.lead_category !== selectedCategoryFilter) return false;
      }

      // Salesperson filter
      if (selectedSalespersonFilter !== "all") {
        const agentName = (lead.assigned_agent_name || "").toLowerCase();
        const agentEmail = (lead.assigned_to_email || "").toLowerCase();
        const target = selectedSalespersonFilter.toLowerCase();
        if (!agentName.includes(target) && !agentEmail.includes(target)) {
          return false;
        }
      }

      return true;
    });
  }, [allCombinedLeads, searchLead, selectedCategoryFilter, selectedSalespersonFilter]);

  // High-level statistics
  const hotCount = allCombinedLeads.filter((l) => l.lead_category === "HOT").length;
  const warmCount = allCombinedLeads.filter((l) => l.lead_category === "WARM").length;
  const coldCount = allCombinedLeads.filter((l) => l.lead_category === "COLD").length;
  const convertedCount = allCombinedLeads.filter((l) => (l.pipeline_status || "").toLowerCase().includes("convert")).length;

  // Dynamic Leaderboard computed across ALL 12 Salespersons
  const salespersonLeaderboard = useMemo(() => {
    return APPROVED_SALES_PERSONS.map((sp) => {
      const spLeads = allCombinedLeads.filter((l) => {
        const matchEmail = (l.assigned_to_email || "").toLowerCase() === sp.email.toLowerCase();
        const matchName = (l.assigned_agent_name || "").toLowerCase() === sp.name.toLowerCase();
        return matchEmail || matchName;
      });
      const totalLeads = spLeads.length;
      const hotLeads = spLeads.filter((l) => l.lead_category === "HOT").length;
      const avgScore = totalLeads > 0 
        ? Math.round(spLeads.reduce((acc, curr) => acc + (curr.lead_score || 70), 0) / totalLeads) 
        : 75;
      const converted = spLeads.filter((l) => (l.pipeline_status || "").toLowerCase().includes("convert")).length;
      const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
      const followUps = allFollowUps.filter((f) => (f.agent_name || "").toLowerCase() === sp.name.toLowerCase()).length;

      return {
        salesperson_name: sp.name,
        email: sp.email,
        specialty: sp.specialty,
        phone: sp.phone,
        total_leads: totalLeads,
        hot_leads: hotLeads,
        avg_lead_score: avgScore,
        converted: converted,
        conversion_rate: conversionRate,
        pending_followups: followUps
      };
    }).sort((a, b) => b.total_leads - a.total_leads || b.hot_leads - a.hot_leads);
  }, [allCombinedLeads, allFollowUps]);

  return (
    <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col selection:bg-[#C5A869]/30">
      <PortalNavbar
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        activeRoleTitle="Sales Oversight & Performance"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Welcome & Overview Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E222D]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Sales Manager Dashboard
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30 font-mono">
                12 Salespersons Active
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Live monitoring of leads, qualification scores, assigned customers, and salesperson territory performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchManagerData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-[#151720] hover:bg-[#1E222E] border border-[#262A36] text-xs font-medium text-zinc-300 transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
            <button
              type="button"
              onClick={() => setAddLeadOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Lead
            </button>
            <Link
              href="/assistant"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C5A869] to-[#DFCA93] text-black font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-[#C5A869]/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Analysis Desk
            </Link>
          </div>
        </div>

        {/* TOP STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111319] border border-[#232733] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Total Team Leads</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{allCombinedLeads.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Across all 12 salespersons</div>
          </div>

          <div className="bg-[#111319] border border-red-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Hot Leads</span>
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-red-400">{hotCount}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Score ≥ 70 • Immediate readiness</div>
          </div>

          <div className="bg-[#111319] border border-amber-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Warm Leads</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-400">{warmCount}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Score 40-69 • Within 3 months</div>
          </div>

          <div className="bg-[#111319] border border-emerald-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Team Conversions</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{convertedCount}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Active client acquisitions</div>
          </div>
        </div>

        {/* Lead Temperature Distribution Bar */}
        <div className="bg-[#111319] border border-[#232733] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
            <span>Overall Leads Temperature Breakdown (All 12 Salespersons)</span>
            <span className="font-mono text-[#E1CB8E]">Total: {allCombinedLeads.length} leads</span>
          </div>
          <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden flex">
            <div 
              style={{ width: `${(hotCount / Math.max(allCombinedLeads.length, 1)) * 100}%` }} 
              className="bg-red-500 h-full transition-all"
              title={`Hot: ${hotCount}`}
            />
            <div 
              style={{ width: `${(warmCount / Math.max(allCombinedLeads.length, 1)) * 100}%` }} 
              className="bg-amber-500 h-full transition-all"
              title={`Warm: ${warmCount}`}
            />
            <div 
              style={{ width: `${(coldCount / Math.max(allCombinedLeads.length, 1)) * 100}%` }} 
              className="bg-blue-500 h-full transition-all"
              title={`Cold: ${coldCount}`}
            />
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-zinc-300">🔥 Hot ({hotCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-zinc-300">⚡ Warm ({warmCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-zinc-300">❄️ Cold ({coldCount})</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-[#1E222D] overflow-x-auto pb-px">
          {[
            { id: "overview", label: "Team Overview", icon: BarChart3 },
            { id: "leads", label: `All 12 Salespersons Leads (${allCombinedLeads.length})`, icon: Users },
            { id: "leaderboard", label: "Salesperson Leaderboard (12)", icon: Award },
            { id: "visits", label: `VIP Site Visits (${visits.length})`, icon: Calendar },
            { id: "followups", label: `Follow-up Audit (${allFollowUps.length})`, icon: Clock },
            { id: "properties", label: "Property Inventory (View)", icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
                  active 
                    ? "border-purple-400 text-purple-300 bg-purple-500/5 font-bold"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1 & 2: ALL TEAM LEADS */}
        {(activeTab === "leads" || activeTab === "overview") && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#111319] p-3.5 rounded-xl border border-[#232733]">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[240px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchLead}
                    onChange={(e) => setSearchLead(e.target.value)}
                    placeholder="Search customer, location, salesperson..."
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                {/* Filter by Assigned Salesperson (All 12 Salespersons) */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400 font-medium">Salesperson:</span>
                  <select
                    value={selectedSalespersonFilter}
                    onChange={(e) => setSelectedSalespersonFilter(e.target.value)}
                    className="bg-[#181B24] border border-[#262A36] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-400 max-w-[260px] truncate"
                  >
                    <option value="all">All 12 Salespersons</option>
                    {APPROVED_SALES_PERSONS.map((sp) => (
                      <option key={sp.email} value={sp.name}>
                        {sp.name} ({sp.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by score category */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400 font-medium">Category:</span>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-[#181B24] border border-[#262A36] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-400"
                  >
                    <option value="">All Scores</option>
                    <option value="HOT">🔥 Hot Leads (≥70)</option>
                    <option value="WARM">⚡ Warm Leads (40-69)</option>
                    <option value="COLD">❄️ Cold Leads (&lt;40)</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-zinc-400 font-mono">
                Showing <strong className="text-white">{filteredLeads.length}</strong> of {allCombinedLeads.length} leads
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-[#111319] border border-[#232733] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151720] text-zinc-400 uppercase tracking-wider border-b border-[#232733] font-mono">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">Assigned Customer</th>
                      <th className="px-4 py-3.5 font-semibold">Assigned Salesperson</th>
                      <th className="px-4 py-3.5 font-semibold">Requirement &amp; Location</th>
                      <th className="px-4 py-3.5 font-semibold">Budget (AED)</th>
                      <th className="px-4 py-3.5 font-semibold">Lead Score</th>
                      <th className="px-4 py-3.5 font-semibold">Stage</th>
                      <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E222D]">
                    {filteredLeads.map((lead) => {
                      const isHot = lead.lead_category === "HOT";
                      const isWarm = lead.lead_category === "WARM";
                      return (
                        <tr key={lead.id} className="hover:bg-purple-500/[0.03] transition">
                          {/* Column 1: Assigned Customer */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white text-sm">{lead.customer_name}</div>
                            <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              {lead.phone && <span className="font-mono text-zinc-300">{lead.phone}</span>}
                              {lead.email && <span className="text-zinc-500">• {lead.email}</span>}
                            </div>
                          </td>

                          {/* Column 2: Assigned Salesperson (Second Column) */}
                          <td className="px-4 py-3.5">
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181B24] border border-[#262A36] text-white">
                                <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span className="font-semibold text-xs text-zinc-200">
                                  {lead.assigned_agent_name || "Unassigned"}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 mt-1 pl-0.5 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-[#C5A869] shrink-0" />
                                <span className="truncate max-w-[200px]">
                                  {lead.assigned_specialty || lead.locality || "Dubai Specialist"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 3: Requirement & Location */}
                          <td className="px-4 py-3.5">
                            <div className="text-zinc-200 font-medium">
                              {lead.bhk ? `${lead.bhk} BHK ` : ""}{lead.property_type}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              {lead.locality || "Dubai"}
                            </div>
                          </td>

                          {/* Column 4: Budget */}
                          <td className="px-4 py-3.5 font-mono text-[#E1CB8E] font-bold">
                            {lead.budget_max ? formatCurrency(lead.budget_max, currency) : "Flexible"}
                          </td>

                          {/* Column 5: Lead Score & Category */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-black font-mono flex items-center gap-1 border ${
                                isHot 
                                  ? "bg-red-500/20 text-red-300 border-red-500/40" 
                                  : isWarm 
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                                  : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                              }`}>
                                {isHot ? <Flame className="w-3 h-3 text-red-400" /> : isWarm ? <Zap className="w-3 h-3 text-amber-400" /> : <Snowflake className="w-3 h-3 text-blue-400" />}
                                {lead.lead_score} / 100
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                                {lead.lead_category}
                              </span>
                            </div>
                          </td>

                          {/* Column 6: Pipeline Stage (Interactive) */}
                          <td className="px-4 py-3.5">
                            {(() => {
                              const isConverted = (lead.pipeline_status || "").toLowerCase().includes("convert");
                              return (
                                <select
                                  value={lead.pipeline_status || "New"}
                                  onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                                  className={`rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold focus:outline-none border transition cursor-pointer ${
                                    isConverted
                                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-600 shadow-sm shadow-emerald-500/10"
                                      : "bg-[#181B24] text-zinc-200 border-[#262A36] focus:border-purple-400"
                                  }`}
                                >
                                  <option value="New">New</option>
                                  <option value="Contacted">Contacted</option>
                                  <option value="Interested">Interested</option>
                                  <option value="Viewing Scheduled">Viewing Scheduled</option>
                                  <option value="Negotiation">Negotiation</option>
                                  <option value="Converted">🎉 Converted</option>
                                  <option value="Lost">Lost</option>
                                </select>
                              );
                            })()}
                          </td>

                          {/* Column 7: Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                if (lead.assigned_to_email) {
                                  setTargetSalespersonEmail(lead.assigned_to_email);
                                }
                                setActionSuccess(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-semibold transition cursor-pointer"
                            >
                              Audit &amp; Reassign
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ALL 12 SALESPERSONS LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <div className="bg-[#111319] border border-[#232733] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    12 Salespersons Performance Leaderboard
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Individual monitoring of total assigned workload, hot leads, average qualification score, and client conversion rates.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151720] text-zinc-400 uppercase tracking-wider border-b border-[#232733] font-mono">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Salesperson &amp; Territory</th>
                      <th className="px-4 py-3 font-semibold">Total Leads</th>
                      <th className="px-4 py-3 font-semibold">Hot Leads</th>
                      <th className="px-4 py-3 font-semibold">Avg Lead Score</th>
                      <th className="px-4 py-3 font-semibold">Converted</th>
                      <th className="px-4 py-3 font-semibold">Conversion Rate</th>
                      <th className="px-4 py-3 font-semibold">Pending Follow-ups</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E222D]">
                    {salespersonLeaderboard.map((sp, idx) => (
                      <tr key={sp.email} className="hover:bg-zinc-800/20">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs font-mono border border-purple-500/30">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{sp.salesperson_name}</div>
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-[#C5A869]" />
                                <span>{sp.specialty}</span>
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{sp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white text-sm font-mono">{sp.total_leads}</td>
                        <td className="px-4 py-3.5 text-red-400 font-bold text-sm font-mono">{sp.hot_leads}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono font-bold border border-zinc-700">
                            {sp.avg_lead_score} / 100
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-emerald-400 font-bold text-sm font-mono">{sp.converted}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-zinc-800 overflow-hidden">
                              <div 
                                style={{ width: `${Math.min(100, sp.conversion_rate)}%` }} 
                                className="h-full bg-emerald-500" 
                              />
                            </div>
                            <span className="font-semibold text-emerald-400 font-mono">{sp.conversion_rate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                            {sp.pending_followups} due
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FOLLOW-UP AUDIT */}
        {activeTab === "followups" && (
          <div className="space-y-4">
            <div className="bg-[#111319] border border-[#232733] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Team Follow-up Activity Stream
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Audit scheduled client callbacks, on-site viewings, and offer negotiations across the sales team.
              </p>

              <div className="space-y-3">
                {allFollowUps.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">No pending follow-ups due today.</div>
                ) : (
                  allFollowUps.map((fu) => (
                    <div key={fu.id} className="p-4 rounded-xl bg-[#151720] border border-[#262A36] flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                            {fu.agent_name || "Salesperson"}
                          </span>
                          <span className="text-xs text-zinc-400">
                            Lead #{fu.lead_id}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(fu.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-200 mt-1">{fu.note}</p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          fu.status === "completed" 
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}>
                          {fu.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROPERTY LISTINGS (VIEW ONLY FOR MANAGERS) */}
        {activeTab === "properties" && (
          <div className="space-y-4">
            <div className="bg-[#111319] border border-[#232733] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#C5A869]" />
                    Property Catalog (Read-Only)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Browse property inventory and match customer budgets. Full CRUD requires System Administrator privilege.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                  Read-Only Inventory Access
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map((p) => (
                  <div key={p.id} className="rounded-xl bg-[#151720] border border-[#262A36] overflow-hidden p-4 space-y-2">
                    <div className="font-semibold text-white text-sm truncate">{p.title}</div>
                    <div className="text-xs text-zinc-400">{p.locality}, {p.city}</div>
                    <div className="text-xs font-mono text-[#E1CB8E] font-bold">
                      {formatCurrency(p.price, currency)}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {p.bhk} BHK • {p.super_area_sqft} sqft • {p.property_type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: VIP SITE VISITS */}
        {activeTab === "visits" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111319] p-4 rounded-2xl border border-[#232733]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  Scheduled Site Visits &amp; VIP Tours
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time database records of client bookings across Dubai property listings
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-3 py-1 rounded-lg bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30">
                  {visits.length} Total Tours
                </span>
                <span className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                  {visits.filter(v => v.status === "confirmed").length} Confirmed
                </span>
              </div>
            </div>

            {visits.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#111319] border border-zinc-800 text-zinc-400 text-sm">
                No site visits recorded in the database yet.
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((v) => (
                  <div
                    key={v.id}
                    className="p-5 rounded-2xl bg-[#111319] border border-[#232733] hover:border-purple-500/40 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          v.status === "confirmed"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : v.status === "completed"
                            ? "bg-blue-950 text-blue-400 border border-blue-800"
                            : v.status === "cancelled"
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}>
                          {v.status}
                        </span>
                        {v.property && (
                          <Link 
                            href={`/properties/${v.property.id}`}
                            className="text-xs font-semibold text-[#E1CB8E] hover:underline flex items-center gap-1"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            {v.property.title} ({v.property.locality})
                          </Link>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-base">{v.customer_name}</h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-zinc-500" /> {v.contact_phone}
                        </span>
                        {v.contact_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" /> {v.contact_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-purple-300">
                          <Calendar className="w-3.5 h-3.5" /> {v.preferred_date} at {v.preferred_time}
                        </span>
                      </div>

                      {v.notes && (
                        <p className="text-xs text-zinc-400 bg-[#161822] p-2 rounded-lg border border-zinc-800 mt-1">
                          <span className="text-zinc-500 font-semibold">Client Note:</span> {v.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center flex-wrap gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-800">
                      <select
                        value={v.status}
                        onChange={(e) => handleUpdateVisitStatus(v.id, e.target.value)}
                        className="bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <a
                        href={`https://wa.me/${v.contact_phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 font-semibold text-xs transition flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* DETAIL & REASSIGNMENT MODAL DRAWER */}
      {selectedLead && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedLead(null)}
        >
          <div 
            className="w-full max-w-xl bg-[#0D0F15] border-l border-zinc-800 h-full overflow-y-auto p-6 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
              <div>
                <span className="text-[10px] font-mono uppercase text-purple-400 font-bold">
                  Assigned Customer Lead Audit
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">{selectedLead.customer_name}</h3>
                <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                  {selectedLead.phone && <span>{selectedLead.phone}</span>}
                  {selectedLead.email && <span>• {selectedLead.email}</span>}
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Pipeline Stage & Conversion Control */}
            <div className="p-4 rounded-xl bg-[#151720] border border-[#262A36] mb-4 space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Update Pipeline Stage &amp; Conversion Status:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  value={selectedLead.pipeline_status || "New"}
                  onChange={(e) => handleUpdateLeadStatus(selectedLead.id, e.target.value)}
                  className="flex-1 bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white font-mono"
                >
                  <option value="New">New Enquiry</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Viewing Scheduled">Viewing Scheduled</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Converted">🎉 Converted (Deal Closed)</option>
                  <option value="Lost">Lost</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const isConv = (selectedLead.pipeline_status || "").toLowerCase().includes("convert");
                    handleUpdateLeadStatus(selectedLead.id, isConv ? "Negotiation" : "Converted");
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    (selectedLead.pipeline_status || "").toLowerCase().includes("convert")
                      ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                      : "bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30"
                  }`}
                >
                  {(selectedLead.pipeline_status || "").toLowerCase().includes("convert") ? "Reopen Lead" : "Convert Lead"}
                </button>
              </div>
            </div>

            {/* Reassignment Control across all 12 salespersons */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-6 space-y-2">
              <label className="block text-xs font-semibold text-purple-300">
                Reassign this lead to another salesperson:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  value={targetSalespersonEmail}
                  onChange={(e) => setTargetSalespersonEmail(e.target.value)}
                  className="flex-1 bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  {APPROVED_SALES_PERSONS.map((sp) => (
                    <option key={sp.email} value={sp.email}>
                      {sp.name} — {sp.specialty}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleReassignLead(selectedLead.id)}
                  disabled={reassigning}
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer shadow"
                >
                  {reassigning ? "Updating..." : "Save Assignment"}
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
              <div className="p-3 rounded-lg bg-[#151720] border border-[#262A36]">
                <span className="text-zinc-500 block">Lead Score &amp; Tier</span>
                <span className="text-base font-bold text-white font-mono">
                  {selectedLead.lead_score} / 100 ({selectedLead.lead_category})
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#151720] border border-[#262A36]">
                <span className="text-zinc-500 block">Assigned Salesperson</span>
                <span className="text-base font-bold text-purple-300">
                  {selectedLead.assigned_agent_name || "Unassigned"}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  {selectedLead.assigned_specialty}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#151720] border border-[#262A36]">
                <span className="text-zinc-500 block">Requirement Target</span>
                <span className="text-sm font-semibold text-white">
                  {selectedLead.bhk ? `${selectedLead.bhk} BHK ` : ""}{selectedLead.property_type} in {selectedLead.locality || "Dubai"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#151720] border border-[#262A36]">
                <span className="text-zinc-500 block">Budget Ceiling</span>
                <span className="text-sm font-semibold text-[#E1CB8E] font-mono font-bold">
                  {selectedLead.budget_max ? formatCurrency(selectedLead.budget_max, currency) : "Flexible"}
                </span>
              </div>
            </div>

            {/* Customer Notes */}
            {selectedLead.notes && (
              <div className="p-4 rounded-xl bg-[#151720] border border-[#262A36] mb-6">
                <span className="text-xs font-semibold text-[#E1CB8E] block mb-1">Customer Inquiry Notes</span>
                <p className="text-xs text-zinc-300 leading-relaxed italic">&ldquo;{selectedLead.notes}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK ADD LEAD MODAL */}
      {addLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#111319] border border-purple-500/40 rounded-2xl p-6 text-zinc-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232733] mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Lead</h3>
                  <p className="text-[11px] text-zinc-400">Add and assign prospective buyer/investor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddLeadOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newLeadData.customer_name}
                    onChange={(e) => setNewLeadData({ ...newLeadData, customer_name: e.target.value })}
                    placeholder="e.g. Sultan Mansoori"
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newLeadData.phone}
                    onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                    placeholder="+971 50 123 4567"
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newLeadData.email}
                    onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                    placeholder="customer@domain.com"
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Target Locality</label>
                  <input
                    type="text"
                    value={newLeadData.locality}
                    onChange={(e) => setNewLeadData({ ...newLeadData, locality: e.target.value })}
                    placeholder="Downtown Dubai, Palm Jumeirah..."
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Property Type</label>
                  <select
                    value={newLeadData.property_type}
                    onChange={(e) => setNewLeadData({ ...newLeadData, property_type: e.target.value })}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Villa">Villa</option>
                    <option value="Townhouse">Townhouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">BHK</label>
                  <select
                    value={newLeadData.bhk}
                    onChange={(e) => setNewLeadData({ ...newLeadData, bhk: Number(e.target.value) })}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  >
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="5">5+ BHK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Budget (AED)</label>
                  <input
                    type="number"
                    value={newLeadData.budget_max}
                    onChange={(e) => setNewLeadData({ ...newLeadData, budget_max: Number(e.target.value) })}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Assign Salesperson *</label>
                  <select
                    value={newLeadData.assigned_to_email}
                    onChange={(e) => setNewLeadData({ ...newLeadData, assigned_to_email: e.target.value })}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    {APPROVED_SALES_PERSONS.map((sp) => (
                      <option key={sp.email} value={sp.email}>
                        {sp.name} ({sp.specialty})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Initial Pipeline Status</label>
                  <select
                    value={newLeadData.pipeline_status}
                    onChange={(e) => setNewLeadData({ ...newLeadData, pipeline_status: e.target.value })}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested">Interested</option>
                    <option value="Viewing Scheduled">Viewing Scheduled</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Converted">🎉 Converted</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#232733]">
                <button
                  type="button"
                  onClick={() => setAddLeadOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg transition cursor-pointer"
                >
                  Create &amp; Assign Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
