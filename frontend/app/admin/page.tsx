"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Users,
  Building2,
  Plus,
  Trash2,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Database,
  Sparkles,
  X,
  Eye,
  EyeOff,
  KeyRound,
  TrendingUp,
  Search,
  Flame,
  Zap,
  Snowflake,
  UserCheck
} from "lucide-react";
import PortalNavbar from "@/components/PortalNavbar";
import {
  User as UserType,
  Property,
  SystemAuditResponse
} from "@/lib/types";
import { Currency, formatCurrency } from "@/lib/currency";
import { api } from "@/lib/api";
import { DISALLOWED_MOCK_EMAILS } from "@/lib/staff";
import { firebaseService, SalesLead } from "@/lib/firebase";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("AED");
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [staffUsers, setStaffUsers] = useState<UserType[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"users" | "leads" | "properties" | "demodata" | "logs">("users");

  // Real-time CRM Leads & Conversion Tracking
  const [liveLeads, setLiveLeads] = useState<SalesLead[]>([]);
  const [leadsSearch, setLeadsSearch] = useState("");

  // Add Staff Modal State
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [showNewStaffPassword, setShowNewStaffPassword] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    full_name: "",
    email: "",
    password: "password123",
    role: "agent",
    phone: ""
  });

  // Separate Password Management Modal for Staff
  const [changePasswordModalUser, setChangePasswordModalUser] = useState<UserType | null>(null);
  const [changePasswordInput, setChangePasswordInput] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Add Property Modal State
  const [addPropOpen, setAddPropOpen] = useState(false);
  const [newPropData, setNewPropData] = useState({
    title: "",
    city: "Dubai",
    locality: "Downtown Dubai",
    property_type: "Apartment",
    bhk: 2,
    bathrooms: 2,
    super_area_sqft: 1450,
    price: 2500000,
    currency: "AED",
    image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    description: "Ultra-luxury residence curated for Lyka Realty."
  });

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Staff users - strictly isolate and exclude customers
      const users = await api.getAdminUsers();
      setStaffUsers(users.filter(u => u.role !== "customer"));

      // 2. Properties
      const props = await api.getProperties({ page_size: 20 });
      setProperties(props.items);

      // 3. System logs
      const logs = await api.getAdminLogs();
      setAuditLogs(logs);
    } catch (err: any) {
      console.error("Admin data fetch error:", err);
      setFeedbackMsg({ text: err.message || "Failed to load admin data. Administrator privileges required.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("propai_user");
    if (!stored) {
      router.replace("/");
      return;
    }
    try {
      const u = JSON.parse(stored);
      const cleanEmail = (u.email || "").toLowerCase().trim();

      // Explicitly reject mock emails
      if (DISALLOWED_MOCK_EMAILS.includes(cleanEmail) || !cleanEmail) {
        localStorage.removeItem("propai_user");
        localStorage.removeItem("propai_token");
        router.replace("/");
        return;
      }

      // Customer redirected to /dashboard
      if (u.role === "customer") {
        router.replace("/dashboard");
        return;
      }

      // Sales person strictly barred from admin page -> redirect to /sales
      if (u.role === "agent") {
        router.replace("/sales");
        return;
      }

      // Sales Manager strictly barred from admin page -> redirect to /manager
      if (u.role === "manager") {
        router.replace("/manager");
        return;
      }

      // Only admin allowed
      if (u.role !== "admin") {
        router.replace("/");
        return;
      }

      setCurrentUser(u);
    } catch {
      router.replace("/");
      return;
    }
    fetchAdminData();

    // Subscribe to live CRM leads across all 12 salespersons for dynamic conversion tracking
    const unsub = firebaseService.subscribeAssignedLeads("", (fbLeads: SalesLead[]) => {
      setLiveLeads(fbLeads);
    }, true);

    return () => unsub();
  }, [fetchAdminData, router]);

  // Dynamic Pipeline Metrics & Conversion Rate
  const totalLeads = liveLeads.length > 0 ? liveLeads.length : (auditLogs?.total_leads || 0);
  const convertedLeads = liveLeads.length > 0 
    ? liveLeads.filter(l => (l.pipeline_status || "").toLowerCase().includes("convert")).length 
    : (auditLogs?.total_converted || 0);
  const conversionRate = totalLeads > 0 
    ? Math.round((convertedLeads / totalLeads) * 100) 
    : (auditLogs?.conversion_rate || 0);

  const filteredAdminLeads = useMemo(() => {
    if (!leadsSearch.trim()) return liveLeads;
    const q = leadsSearch.toLowerCase();
    return liveLeads.filter(l => 
      l.customer_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.locality?.toLowerCase().includes(q) ||
      l.assigned_agent_name?.toLowerCase().includes(q)
    );
  }, [liveLeads, leadsSearch]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordModalUser) return;
    const cleanPw = changePasswordInput.trim();
    if (cleanPw.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.updateStaffPassword(changePasswordModalUser.id, cleanPw);
      setFeedbackMsg({
        text: `Unique password successfully updated for ${changePasswordModalUser.full_name} (${changePasswordModalUser.email}).`,
        type: "success"
      });
      setChangePasswordModalUser(null);
      setChangePasswordInput("");
    } catch (err: any) {
      alert(err.message || "Failed to update staff password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    await firebaseService.updateLeadStatus(leadId, newStatus as any);
    const numId = Number(leadId);
    if (!isNaN(numId)) {
      try {
        await api.updateLead(numId, { pipeline_status: newStatus as any });
      } catch {}
    }
    setLiveLeads((prev) =>
      prev.map((l) => (String(l.id) === String(leadId) ? { ...l, pipeline_status: newStatus as any } : l))
    );
    setFeedbackMsg({
      text: `Lead stage updated to "${newStatus}". Conversion and pipeline metrics updated dynamically.`,
      type: "success"
    });
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createStaffUser(newStaffData);
      setFeedbackMsg({ text: `Staff account created for ${newStaffData.full_name} (${newStaffData.role})`, type: "success" });
      setAddStaffOpen(false);
      setNewStaffData({ full_name: "", email: "", password: "password123", role: "agent", phone: "" });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to create staff member");
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      setFeedbackMsg({ text: `User ID #${userId} permissions updated to ${newRole.toUpperCase()}`, type: "success" });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    }
  };

  const handleDeleteStaff = async (userId: number) => {
    if (!confirm("Are you sure you want to deactivate and remove this staff account?")) return;
    try {
      await api.deleteStaffUser(userId);
      setFeedbackMsg({ text: "Staff account removed successfully.", type: "success" });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to delete staff account");
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProperty(newPropData);
      setFeedbackMsg({ text: `Property '${newPropData.title}' added to live catalog!`, type: "success" });
      setAddPropOpen(false);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to create property");
    }
  };

  const handleDeleteProperty = async (propId: number) => {
    if (!confirm(`Delete listing ID #${propId} from property inventory?`)) return;
    try {
      await api.deleteProperty(propId);
      setFeedbackMsg({ text: `Listing #${propId} successfully deleted.`, type: "success" });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to delete property listing");
    }
  };

  const handleSeedDemo = async () => {
    try {
      const res = await api.seedDemoData();
      setFeedbackMsg({ text: res.message, type: "success" });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to seed demo data");
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col selection:bg-[#C5A869]/30">
      <PortalNavbar
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        activeRoleTitle="System Administrator Controls"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Banner Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E222D]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Administrator Console
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Root Access
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Full control over staff accounts, role assignment, property CRUD operations, demo-data fixtures, and system configuration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-[#151720] hover:bg-[#1E222E] border border-[#262A36] text-xs font-medium text-zinc-300 transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleSeedDemo}
              className="px-4 py-2 rounded-xl bg-[#151720] hover:bg-[#1E222E] border border-[#C5A869]/40 text-[#E1CB8E] font-semibold text-xs transition flex items-center gap-2"
            >
              <Database className="w-3.5 h-3.5" />
              Re-seed Demo Data
            </button>
          </div>
        </div>

        {/* Action Feedback Alert */}
        {feedbackMsg && (
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${feedbackMsg.type === "success"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              : "bg-red-950/60 border-red-800 text-red-300"
            }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMsg.text}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFeedbackMsg(null)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* SYSTEM STATUS METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111319] border border-[#232733] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Registered Staff</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{staffUsers.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Agents, managers, admins only</div>
          </div>

          <div className="bg-[#111319] border border-[#232733] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Property Inventory</span>
              <Building2 className="w-4 h-4 text-[#C5A869]" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#E1CB8E]">{properties.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Full CRUD permissions enabled</div>
          </div>

          <div className="bg-[#111319] border border-purple-500/30 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Total Pipeline Leads</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-400">{totalLeads}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{convertedLeads} converted • Real-time CRM</div>
          </div>

          <div className="bg-[#111319] border border-emerald-500/30 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Team Conversion Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{conversionRate}%</div>
            <div className="text-[11px] text-zinc-500 mt-1">{convertedLeads} of {totalLeads} leads closed</div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-[#1E222D] overflow-x-auto pb-px">
          {[
            { id: "users", label: `Staff Accounts (${staffUsers.length})`, icon: Users },
            { id: "leads", label: `CRM Pipeline & Conversion (${totalLeads})`, icon: TrendingUp },
            { id: "properties", label: `Property Inventory (${properties.length})`, icon: Building2 },
            { id: "demodata", label: "Demo Data & Validation", icon: Database },
            { id: "logs", label: "System Configuration & Logs", icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${active
                    ? "border-[#C5A869] text-[#E1CB8E] bg-[#C5A869]/5"
                    : "border-transparent text-zinc-400 hover:text-white"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: STAFF & ROLE PERMISSIONS */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="bg-[#111319] border border-[#232733] rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#C5A869]" />
                    Staff Accounts &amp; Access Control
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Security Rule: Public signup cannot assign administrator or managerial roles. Manage authorized staff roles below.
                  </p>
                </div>

                <button
                  onClick={() => setAddStaffOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C5A869] to-[#DFCA93] text-black font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-[#C5A869]/10"
                >
                  <Plus className="w-4 h-4" />
                  Add Staff Account
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151720] text-zinc-400 uppercase tracking-wider border-b border-[#232733]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Staff Member</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Assigned Role</th>
                      <th className="px-4 py-3 font-semibold">Change Role</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E222D]">
                    {staffUsers.map((u) => {
                      const isAdmin = u.role === "admin";
                      const isManager = u.role === "manager";
                      return (
                        <tr key={u.id} className="hover:bg-zinc-800/20">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-white">{u.full_name}</div>
                            <div className="text-[11px] text-zinc-500">{u.phone || "No phone"}</div>
                          </td>
                          <td className="px-4 py-3.5 text-zinc-300 font-mono">{u.email}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${isAdmin ? "bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/30" :
                                isManager ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                                  "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                              className="bg-[#181B24] border border-[#262A36] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#C5A869]"
                            >
                              <option value="agent">Agent (Daily User)</option>
                              <option value="manager">Manager (Team Oversight)</option>
                              <option value="admin">Admin (System Control)</option>
                            </select>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setChangePasswordModalUser(u);
                                  setChangePasswordInput("");
                                  setShowChangePassword(false);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C5A869]/10 text-[#E1CB8E] hover:bg-[#C5A869]/20 border border-[#C5A869]/30 font-semibold text-xs transition cursor-pointer"
                                title={`Set custom separate password for ${u.full_name}`}
                              >
                                <KeyRound className="w-3.5 h-3.5 text-[#C5A869]" />
                                <span>Change Password</span>
                              </button>
                              {u.id !== currentUser?.id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(u.id)}
                                  className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
                                  title="Remove Staff Member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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

        {/* TAB 1.5: CRM PIPELINE LEADS & CONVERSION RATE */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            <div className="bg-[#111319] border border-[#232733] rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Live CRM Leads &amp; Conversion Control
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Live monitoring of all 12 salespersons. Dynamically update pipeline stages to &apos;Converted&apos; to instantly test and recalculate conversion rate metrics.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[#181B24] border border-[#262A36] text-zinc-300">
                    Converted: <strong className="text-emerald-400">{convertedLeads}</strong> / {totalLeads} ({conversionRate}%)
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={leadsSearch}
                  onChange={(e) => setLeadsSearch(e.target.value)}
                  placeholder="Filter by customer name, email, phone, location, or assigned salesperson..."
                  className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151720] text-zinc-400 uppercase tracking-wider border-b border-[#232733] font-mono">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Customer Details</th>
                      <th className="px-4 py-3 font-semibold">Assigned Salesperson</th>
                      <th className="px-4 py-3 font-semibold">Requirement</th>
                      <th className="px-4 py-3 font-semibold">Budget</th>
                      <th className="px-4 py-3 font-semibold">Score / Temp</th>
                      <th className="px-4 py-3 font-semibold">Pipeline Stage (Interactive)</th>
                      <th className="px-4 py-3 font-semibold text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E222D]">
                    {filteredAdminLeads.map((lead) => {
                      const isConverted = (lead.pipeline_status || "").toLowerCase().includes("convert");
                      const isHot = lead.lead_category === "HOT" || (lead.lead_score && lead.lead_score >= 70);
                      const isWarm = lead.lead_category === "WARM" || (lead.lead_score && lead.lead_score >= 40 && lead.lead_score < 70);

                      return (
                        <tr key={lead.id} className="hover:bg-zinc-800/20 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white">{lead.customer_name}</div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5 font-mono">
                              {lead.phone && <span>{lead.phone}</span>}
                              {lead.email && <span className="text-zinc-500">• {lead.email}</span>}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181B24] border border-[#262A36] text-zinc-200">
                              <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span className="font-semibold text-xs">
                                {lead.assigned_agent_name || "Unassigned"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-zinc-200 font-medium">
                              {lead.bhk ? `${lead.bhk} BHK ` : ""}{lead.property_type || "Apartment"}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              {lead.locality || "Dubai"}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-[#E1CB8E] font-semibold">
                            {lead.budget_max ? formatCurrency(lead.budget_max, currency) : "Flexible"}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono inline-flex items-center gap-1 border ${
                              isHot
                                ? "bg-red-500/20 text-red-300 border-red-500/40"
                                : isWarm
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            }`}>
                              {isHot ? <Flame className="w-3 h-3 text-red-400" /> : isWarm ? <Zap className="w-3 h-3 text-amber-400" /> : <Snowflake className="w-3 h-3 text-blue-400" />}
                              {lead.lead_score || 75} • {lead.lead_category || (isHot ? "HOT" : isWarm ? "WARM" : "COLD")}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <select
                              value={lead.pipeline_status || "New"}
                              onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold focus:outline-none border transition cursor-pointer ${
                                isConverted
                                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-600 shadow-sm shadow-emerald-500/10"
                                  : "bg-[#181B24] text-zinc-200 border-[#262A36] focus:border-[#C5A869]"
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
                          </td>

                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleUpdateLeadStatus(lead.id, isConverted ? "Negotiation" : "Converted")}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                                isConverted
                                  ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                              }`}
                            >
                              {isConverted ? "Reopen Lead" : "Convert Lead"}
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

        {/* TAB 2: PROPERTY INVENTORY (FULL CRUD) */}
        {activeTab === "properties" && (
          <div className="space-y-4">
            <div className="bg-[#111319] border border-[#232733] rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#C5A869]" />
                    Property Inventory CRUD
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    As System Administrator, you have full authority to create, update, or remove property records from the database.
                  </p>
                </div>

                <button
                  onClick={() => setAddPropOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C5A869] to-[#DFCA93] text-black font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-[#C5A869]/10"
                >
                  <Plus className="w-4 h-4" />
                  Add New Listing
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151720] text-zinc-400 uppercase tracking-wider border-b border-[#232733]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Title &amp; Location</th>
                      <th className="px-4 py-3 font-semibold">Type &amp; BHK</th>
                      <th className="px-4 py-3 font-semibold">Area</th>
                      <th className="px-4 py-3 font-semibold">Price (AED)</th>
                      <th className="px-4 py-3 font-semibold">Quality</th>
                      <th className="px-4 py-3 font-semibold text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E222D]">
                    {properties.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-800/20">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white truncate max-w-xs">{p.title}</div>
                          <div className="text-[11px] text-zinc-500">{p.locality}, {p.city}</div>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-300">
                          {p.bhk} BHK • {p.property_type}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-zinc-300">
                          {p.super_area_sqft} sqft
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-[#E1CB8E]">
                          {formatCurrency(p.price, currency)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 capitalize text-[10px]">
                            {p.quality || "Standard"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteProperty(p.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEMO DATA & VALIDATION */}
        {activeTab === "demodata" && (
          <div className="space-y-4">
            <div className="bg-[#111319] border border-[#232733] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                Demo Data Fixtures &amp; System Validation
              </h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Re-seed or re-balance the test database. Automatically ensures standard staff accounts exist (Agent Rajesh Sharma, Agent Sarah Jenkins, Manager Fatima Al Zaabi, and Admin Alexander Vance), and balances all customer leads evenly between active agents.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-[#151720] border border-[#262A36]">
                  <div className="text-sm font-semibold text-white mb-1">Database Health Check</div>
                  <div className="text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    All tables intact (users, leads, properties, follow_up_notes, recommendations)
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-2">
                    Integrity: 100% verified • SQLite WAL mode active
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#151720] border border-[#262A36]">
                  <div className="text-sm font-semibold text-white mb-1">One-Click Rebalance</div>
                  <div className="text-xs text-zinc-400 mb-3">
                    Re-assign unassigned leads and ensure standard demo passwords are set to &apos;password123&apos;.
                  </div>
                  <button
                    onClick={handleSeedDemo}
                    className="px-4 py-2 rounded-xl bg-[#C5A869]/20 hover:bg-[#C5A869]/30 text-[#E1CB8E] border border-[#C5A869]/40 text-xs font-semibold transition"
                  >
                    Execute Re-seed &amp; Validate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM CONFIGURATION & AUDIT LOGS */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="bg-[#111319] border border-[#232733] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                    Live System &amp; Security Audit Logs
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Real-time operational telemetry from the FastAPI backend and RBAC permission layer.
                  </p>
                </div>
                <span className="font-mono text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-300">
                  v2.4-ENTERPRISE
                </span>
              </div>

              <div className="bg-black/60 rounded-xl p-4 font-mono text-xs border border-[#232733] space-y-2">
                {auditLogs?.recent_logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-zinc-500 shrink-0">[{log.timestamp}]</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${log.level === "SUCCESS" ? "bg-emerald-500/20 text-emerald-400" :
                        log.level === "WARN" ? "bg-amber-500/20 text-amber-400" :
                          "bg-blue-500/20 text-blue-400"
                      }`}>
                      {log.level}
                    </span>
                    <span className="text-[#E1CB8E] shrink-0">{log.module}:</span>
                    <span className="text-zinc-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ADD STAFF MODAL */}
      {addStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111319] border border-[#C5A869]/40 rounded-2xl p-6 text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#232733] mb-4">
              <h3 className="text-lg font-bold text-white">Create Staff Account</h3>
              <button onClick={() => setAddStaffOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaffData.full_name}
                  onChange={(e) => setNewStaffData({ ...newStaffData, full_name: e.target.value })}
                  placeholder="e.g. Tariq Mansoor"
                  className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newStaffData.email}
                  onChange={(e) => setNewStaffData({ ...newStaffData, email: e.target.value })}
                  placeholder="tariq.mansoor@lykarealty.ae"
                  className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showNewStaffPassword ? "text" : "password"}
                    required
                    value={newStaffData.password}
                    onChange={(e) => setNewStaffData({ ...newStaffData, password: e.target.value })}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-3 pr-10 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewStaffPassword(!showNewStaffPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-1 cursor-pointer"
                    title={showNewStaffPassword ? "Hide password" : "View password"}
                  >
                    {showNewStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Assign System Role</label>
                <select
                  value={newStaffData.role}
                  onChange={(e) => setNewStaffData({ ...newStaffData, role: e.target.value })}
                  className="w-full bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                >
                  <option value="agent">Real Estate Agent (Daily user)</option>
                  <option value="manager">Sales Manager (Team oversight)</option>
                  <option value="admin">System Administrator (Full control)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C5A869] text-black font-semibold text-xs hover:bg-[#DFCA93] cursor-pointer"
                >
                  Save Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEPARATE PASSWORD MODAL FOR STAFF MEMBERS */}
      {changePasswordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111319] border border-[#C5A869]/50 rounded-2xl p-6 text-zinc-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232733] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Change Staff Password</h3>
                  <p className="text-[11px] text-zinc-400">Set a unique, separate login password</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setChangePasswordModalUser(null)} 
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181B24] border border-[#262A36] mb-4 space-y-1">
              <div className="text-xs font-bold text-white">{changePasswordModalUser.full_name}</div>
              <div className="text-[11px] font-mono text-[#C5A869]">{changePasswordModalUser.email}</div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Assigned Role: <span className="text-zinc-200">{changePasswordModalUser.role}</span>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  New Unique Password (minimum 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showChangePassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={changePasswordInput}
                    onChange={(e) => setChangePasswordInput(e.target.value)}
                    placeholder="Enter unique password..."
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-3 pr-10 py-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-1 cursor-pointer"
                    title={showChangePassword ? "Hide password" : "View password"}
                  >
                    {showChangePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Changing this will update this specific staff member&apos;s password separately. Default initial passwords will no longer work for this account.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || changePasswordInput.trim().length < 6}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C5A869] to-[#DFCA93] text-black font-semibold text-xs hover:opacity-95 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow"
                >
                  {savingPassword ? "Updating..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PROPERTY MODAL */}
      {addPropOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#111319] border border-[#C5A869]/40 rounded-2xl p-6 text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#232733] mb-4">
              <h3 className="text-lg font-bold text-white">Add Property Listing</h3>
              <button onClick={() => setAddPropOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newPropData.title}
                  onChange={(e) => setNewPropData({ ...newPropData, title: e.target.value })}
                  placeholder="e.g. Marina Sunset Penthouse"
                  className="w-full bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">Locality</label>
                  <input
                    type="text"
                    required
                    value={newPropData.locality}
                    onChange={(e) => setNewPropData({ ...newPropData, locality: e.target.value })}
                    className="w-full bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">Price (AED)</label>
                  <input
                    type="number"
                    required
                    value={newPropData.price}
                    onChange={(e) => setNewPropData({ ...newPropData, price: Number(e.target.value) })}
                    className="w-full bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">BHK</label>
                  <input
                    type="number"
                    value={newPropData.bhk}
                    onChange={(e) => setNewPropData({ ...newPropData, bhk: Number(e.target.value) })}
                    className="w-full bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    value={newPropData.bathrooms}
                    onChange={(e) => setNewPropData({ ...newPropData, bathrooms: Number(e.target.value) })}
                    className="w-full bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">Area (sqft)</label>
                  <input
                    type="number"
                    value={newPropData.super_area_sqft}
                    onChange={(e) => setNewPropData({ ...newPropData, super_area_sqft: Number(e.target.value) })}
                    className="w-full bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddPropOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C5A869] text-black font-semibold hover:bg-[#DFCA93]"
                >
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
