"use client";

import React, { useState, useEffect } from "react";
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
  Calendar
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
import { DISALLOWED_MOCK_EMAILS } from "@/lib/staff";

export default function SalesManagerDashboardPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("AED");
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [teamLeads, setTeamLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [allFollowUps, setAllFollowUps] = useState<FollowUpNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");
  const [searchLead, setSearchLead] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "leaderboard" | "visits" | "followups" | "analytics" | "properties">("overview");

  // Lead detail drawer & reassignment
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [targetAgentId, setTargetAgentId] = useState<number>(1);
  const [reassigning, setReassigning] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("propai_user");
    if (!stored) {
      router.replace("/portal");
      return;
    }
    try {
      const u = JSON.parse(stored);
      const cleanEmail = (u.email || "").toLowerCase().trim();

      // Reject mock emails
      if (DISALLOWED_MOCK_EMAILS.includes(cleanEmail) || !cleanEmail) {
        localStorage.removeItem("propai_user");
        localStorage.removeItem("propai_token");
        router.replace("/portal?error=mock_forbidden");
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
        router.replace("/portal");
        return;
      }

      setCurrentUser(u);
    } catch {
      router.replace("/portal");
      return;
    }
    fetchManagerData();
  }, [router]);

  const fetchManagerData = async () => {
    setLoading(true);
    try {
      // 1. Fetch team leads (all agents)
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

  const handleReassignLead = async (leadId: number) => {
    setReassigning(true);
    setActionSuccess(null);
    try {
      const updated = await api.assignLead(leadId, targetAgentId);
      setActionSuccess(`Lead reassigned successfully to ${updated.assigned_agent_name || "selected agent"}!`);
      setSelectedLead(updated);
      await fetchManagerData();
    } catch (err: any) {
      alert(err.message || "Failed to reassign lead");
    } finally {
      setReassigning(false);
    }
  };

  const filteredLeads = teamLeads.filter((lead) => {
    if (selectedAgentFilter === "all") return true;
    return String(lead.user_id) === selectedAgentFilter;
  });

  const hotCount = teamLeads.filter(l => l.lead_category === "HOT").length;
  const warmCount = teamLeads.filter(l => l.lead_category === "WARM").length;
  const coldCount = teamLeads.filter(l => l.lead_category === "COLD").length;
  const convertedCount = teamLeads.filter(l => l.pipeline_status === "converted").length;

  return (
    <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col selection:bg-[#C5A869]/30">
      <PortalNavbar
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        activeRoleTitle="Sales Oversight & Leaderboard"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Welcome & Overview Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E222D]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Sales Manager Dashboard
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30">
                Lyka Realty UAE
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Live monitoring of all agents&apos; leads, scores, reassignments, pipeline stages, and conversion performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchManagerData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-[#151720] hover:bg-[#1E222E] border border-[#262A36] text-xs font-medium text-zinc-300 transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
            <Link
              href="/assistant"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C5A869] to-[#DFCA93] text-black font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-[#C5A869]/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New AI Analysis
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
            <div className="text-2xl sm:text-3xl font-bold text-white">{teamLeads.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Across all real estate agents</div>
          </div>

          <div className="bg-[#111319] border border-red-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Hot Leads</span>
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-red-400">{hotCount}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Score ≥ 70 • Immediate timeline</div>
          </div>

          <div className="bg-[#111319] border border-emerald-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Team Conversions</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{convertedCount}</div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Rate: {analytics?.conversion_rate || 0}% overall
            </div>
          </div>

          <div className="bg-[#111319] border border-blue-500/20 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Follow-ups Today</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-400">{allFollowUps.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Pending agent activities</div>
          </div>
        </div>

        {/* Lead Temperature Distribution Bar */}
        <div className="bg-[#111319] border border-[#232733] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
            <span>Team Lead Temperature Distribution</span>
            <span>Total: {teamLeads.length} leads</span>
          </div>
          <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden flex">
            <div 
              style={{ width: `${(hotCount / Math.max(teamLeads.length, 1)) * 100}%` }} 
              className="bg-red-500 h-full transition-all"
              title={`Hot: ${hotCount}`}
            />
            <div 
              style={{ width: `${(warmCount / Math.max(teamLeads.length, 1)) * 100}%` }} 
              className="bg-amber-500 h-full transition-all"
              title={`Warm: ${warmCount}`}
            />
            <div 
              style={{ width: `${(coldCount / Math.max(teamLeads.length, 1)) * 100}%` }} 
              className="bg-blue-500 h-full transition-all"
              title={`Cold: ${coldCount}`}
            />
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-zinc-300">Hot ({hotCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-zinc-300">Warm ({warmCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-zinc-300">Cold ({coldCount})</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-[#1E222D] overflow-x-auto pb-px">
          {[
            { id: "overview", label: "Team Overview", icon: BarChart3 },
            { id: "leads", label: `All Team Leads (${teamLeads.length})`, icon: Users },
            { id: "leaderboard", label: "Agent Leaderboard", icon: Award },
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
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  active 
                    ? "border-purple-400 text-purple-300 bg-purple-500/5"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111319] p-3 rounded-xl border border-[#232733]">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchLead}
                    onChange={(e) => setSearchLead(e.target.value)}
                    placeholder="Search by customer name, location, email..."
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-purple-400 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                {/* Filter by assigned agent */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 hidden sm:inline">Agent:</span>
                  <select
                    value={selectedAgentFilter}
                    onChange={(e) => setSelectedAgentFilter(e.target.value)}
                    className="bg-[#181B24] border border-[#262A36] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-400"
                  >
                    <option value="all">All Agents</option>
                    <option value="1">Rajesh Sharma</option>
                    <option value="3">Sarah Jenkins</option>
                  </select>
                </div>

                {/* Filter by score category */}
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-[#181B24] border border-[#262A36] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-400"
                  >
                    <option value="">All Scores</option>
                    <option value="HOT">🔥 Hot Leads (≥70)</option>
                    <option value="WARM">⚡ Warm Leads (40-69)</option>
                    <option value="COLD">❄️ Cold Leads (&lt;40)</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-zinc-500">
                Showing {filteredLeads.length} of {teamLeads.length} leads
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-[#111319] border border-[#232733] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151720] text-zinc-400 uppercase tracking-wider border-b border-[#232733]">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">Client & Contact</th>
                      <th className="px-4 py-3.5 font-semibold">Assigned Agent</th>
                      <th className="px-4 py-3.5 font-semibold">Requirement</th>
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
                        <tr key={lead.id} className="hover:bg-purple-500/[0.02] transition">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-white">{lead.customer_name}</div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                              {lead.phone && <span>{lead.phone}</span>}
                              {lead.email && <span className="text-zinc-500">{lead.email}</span>}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181B24] border border-[#262A36] text-zinc-300">
                              <UserCheck className="w-3 h-3 text-purple-400" />
                              <span className="font-medium">{lead.assigned_agent_name || "Unassigned"}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-zinc-200">{lead.bhk ? `${lead.bhk} BHK ` : ""}{lead.property_type}</div>
                            <div className="text-[11px] text-zinc-500">{lead.locality || "Dubai"}</div>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-zinc-300">
                            {lead.budget_max ? formatCurrency(lead.budget_max, currency) : "Flexible"}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                isHot ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                                isWarm ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                                "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}>
                                {lead.lead_score} / 100
                              </div>
                              <span className="text-[11px] text-zinc-500 font-semibold">{lead.lead_category}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="capitalize px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300">
                              {lead.pipeline_status.replace("_", " ")}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => setSelectedLead(lead)}
                              className="px-3 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-medium transition"
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

        {/* TAB 3: AGENT LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <div className="bg-[#111319] border border-[#232733] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Agent Performance Leaderboard
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Comparative tracking of assigned workload, quality scores, conversion volume, and follow-up discipline.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151720] text-zinc-400 uppercase tracking-wider border-b border-[#232733]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Agent Name</th>
                      <th className="px-4 py-3 font-semibold">Total Leads</th>
                      <th className="px-4 py-3 font-semibold">Hot Leads</th>
                      <th className="px-4 py-3 font-semibold">Avg Lead Score</th>
                      <th className="px-4 py-3 font-semibold">Converted</th>
                      <th className="px-4 py-3 font-semibold">Conversion Rate</th>
                      <th className="px-4 py-3 font-semibold">Pending Follow-ups</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E222D]">
                    {analytics?.agent_leaderboard?.map((agent, idx) => (
                      <tr key={agent.agent_id} className="hover:bg-zinc-800/20">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-[10px]">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{agent.agent_name}</div>
                              <div className="text-[11px] text-zinc-500">{agent.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-zinc-200">{agent.total_leads}</td>
                        <td className="px-4 py-3.5 text-red-400 font-bold">{agent.hot_leads}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">
                            {agent.avg_lead_score} / 100
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-emerald-400 font-bold">{agent.converted_leads}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-zinc-800 overflow-hidden">
                              <div 
                                style={{ width: `${agent.conversion_rate}%` }} 
                                className="h-full bg-emerald-500" 
                              />
                            </div>
                            <span className="font-semibold text-emerald-400">{agent.conversion_rate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {agent.pending_follow_ups} due
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
                {allFollowUps.map((fu) => (
                  <div key={fu.id} className="p-4 rounded-xl bg-[#151720] border border-[#262A36] flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                          {fu.agent_name || "Agent"}
                        </span>
                        <span className="text-xs text-zinc-400">
                          Lead ID #{fu.lead_id}
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
                ))}
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
                    Sales Managers have read access to browse inventory and match customer budgets. Full CRUD requires System Administrator privilege.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  🔒 Modification Restricted to Admin
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
                    <div className="text-[11px] text-zinc-500">
                      {p.bhk} BHK • {p.super_area_sqft} sqft • {p.property_type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VIP SITE VISITS */}
        {activeTab === "visits" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111319] p-4 rounded-2xl border border-[#232733]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  Team-Wide Scheduled Site Visits &amp; VIP Tours
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time database records of all client bookings across Dubai property listings
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
                No site visits recorded in the database yet. When clients book property tours, they will appear here.
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

                    {/* Manager Status & Dispatch Actions */}
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

      {/* LEAD AUDIT & REASSIGN DRAWER */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#111319] border border-purple-500/40 rounded-2xl shadow-2xl p-6 text-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#232733] mb-4">
              <div>
                <span className="text-xs font-bold text-purple-400">LEAD AUDIT &amp; REASSIGNMENT</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{selectedLead.customer_name}</h3>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                {actionSuccess}
              </div>
            )}

            {/* Reassignment Control */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-6">
              <label className="block text-xs font-semibold text-purple-300 mb-2">
                Reassign this lead to another agent:
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={targetAgentId}
                  onChange={(e) => setTargetAgentId(Number(e.target.value))}
                  className="flex-1 bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  <option value={1}>Rajesh Sharma (Agent 1)</option>
                  <option value={3}>Sarah Jenkins (Agent 2)</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleReassignLead(selectedLead.id)}
                  disabled={reassigning}
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs transition disabled:opacity-50"
                >
                  {reassigning ? "Updating..." : "Save Assignment"}
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
              <div className="p-3 rounded-lg bg-[#151720] border border-[#262A36]">
                <span className="text-zinc-500 block">Lead Score &amp; Tier</span>
                <span className="text-base font-bold text-white">{selectedLead.lead_score} / 100 ({selectedLead.lead_category})</span>
              </div>
              <div className="p-3 rounded-lg bg-[#151720] border border-[#262A36]">
                <span className="text-zinc-500 block">Currently Assigned To</span>
                <span className="text-base font-bold text-purple-300">{selectedLead.assigned_agent_name || "Unassigned"}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#151720] border border-[#262A36]">
                <span className="text-zinc-500 block">Requirement Target</span>
                <span className="text-sm font-semibold text-white">{selectedLead.bhk} BHK {selectedLead.property_type} in {selectedLead.locality || "Dubai"}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#151720] border border-[#262A36]">
                <span className="text-zinc-500 block">Budget Ceiling</span>
                <span className="text-sm font-semibold text-white">{selectedLead.budget_max ? formatCurrency(selectedLead.budget_max, currency) : "Flexible"}</span>
              </div>
            </div>

            {/* AI Summary */}
            {selectedLead.ai_summary && (
              <div className="p-4 rounded-xl bg-[#151720] border border-[#262A36] mb-6">
                <span className="text-xs font-semibold text-[#E1CB8E] block mb-1">AI Qualification Dossier</span>
                <p className="text-xs text-zinc-300 leading-relaxed">{selectedLead.ai_summary}</p>
              </div>
            )}

            {/* Recommended Properties */}
            {selectedLead.recommended_properties && selectedLead.recommended_properties.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-zinc-400 block mb-2">Recommended Property Matches</span>
                <div className="space-y-2">
                  {selectedLead.recommended_properties.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#151720] border border-[#262A36] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-white">{item.property.title}</div>
                        <div className="text-[11px] text-zinc-400">{item.property.locality} • {formatCurrency(item.property.price, currency)}</div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {item.match_score}% Match
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
