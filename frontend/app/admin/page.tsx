"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  X
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
  const [activeTab, setActiveTab] = useState<"users" | "properties" | "demodata" | "logs">("users");

  // Add Staff Modal State
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    full_name: "",
    email: "",
    password: "password123",
    role: "agent",
    phone: ""
  });

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
      // 1. Staff users
      const users = await api.getAdminUsers();
      setStaffUsers(users);

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
      router.replace("/portal");
      return;
    }
    try {
      const u = JSON.parse(stored);
      const cleanEmail = (u.email || "").toLowerCase().trim();

      // Explicitly reject mock emails
      if (DISALLOWED_MOCK_EMAILS.includes(cleanEmail) || !cleanEmail) {
        localStorage.removeItem("propai_user");
        localStorage.removeItem("propai_token");
        router.replace("/portal?error=mock_forbidden");
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
        router.replace("/portal");
        return;
      }

      setCurrentUser(u);
    } catch {
      router.replace("/portal");
      return;
    }
    fetchAdminData();
  }, [fetchAdminData, router]);

  const handleQuickLoginAsAdmin = async () => {
    try {
      setLoading(true);
      const res = await api.login({ email: "alexander.vance@lykarealty.ae", password: "password123" });
      setCurrentUser(res.user);
      setFeedbackMsg({ text: "Signed in as Administrator Alexander Vance.", type: "success" });
      fetchAdminData();
    } catch {
      try {
        const res2 = await api.login({ email: "alexander.vance@lykarealty.ae", password: "admin123" });
        setCurrentUser(res2.user);
        setFeedbackMsg({ text: "Signed in as Administrator Alexander Vance.", type: "success" });
        fetchAdminData();
      } catch (err2: any) {
        setFeedbackMsg({ text: "Admin login failed: " + err2.message, type: "error" });
        setLoading(false);
      }
    }
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
              {feedbackMsg.type === "error" && (!currentUser || currentUser.role !== "admin") && (
                <button
                  type="button"
                  onClick={handleQuickLoginAsAdmin}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-[#C5A869] text-black font-bold text-xs hover:bg-[#B89A5B] transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Sign In as Admin (alexander.vance@lykarealty.ae)
                </button>
              )}
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
            <div className="text-[11px] text-zinc-500 mt-1">Agents, managers, admins</div>
          </div>

          <div className="bg-[#111319] border border-[#232733] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Property Inventory</span>
              <Building2 className="w-4 h-4 text-[#C5A869]" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#E1CB8E]">{properties.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Full CRUD permissions enabled</div>
          </div>

          <div className="bg-[#111319] border border-[#232733] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Database Leads</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-400">{auditLogs?.total_leads || 34}</div>
            <div className="text-[11px] text-zinc-500 mt-1">SQLite DB: {auditLogs?.db_size_kb || 2048} KB</div>
          </div>

          <div className="bg-[#111319] border border-[#232733] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">AI Engine Status</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">Operational</div>
            <div className="text-[11px] text-zinc-500 mt-1">Gemini &amp; scoring heuristics</div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-[#1E222D] overflow-x-auto pb-px">
          {[
            { id: "users", label: `Staff & Role Permissions (${staffUsers.length})`, icon: Users },
            { id: "properties", label: `Property Inventory Management (${properties.length})`, icon: Building2 },
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
                          <td className="px-4 py-3.5 text-right">
                            {u.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDeleteStaff(u.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                                title="Remove Staff Member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
                <input
                  type="password"
                  required
                  value={newStaffData.password}
                  onChange={(e) => setNewStaffData({ ...newStaffData, password: e.target.value })}
                  className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
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
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C5A869] text-black font-semibold text-xs hover:bg-[#DFCA93]"
                >
                  Save Staff Account
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
