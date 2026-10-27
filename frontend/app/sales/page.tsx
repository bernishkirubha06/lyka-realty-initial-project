"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building2, 
  ExternalLink, 
  Eye, 
  Heart, 
  Plus, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  MapPin,
  Flame,
  ArrowRight,
  Send,
  Lock,
  LogOut,
  Sparkles,
  UserCheck,
  Snowflake,
  Zap
} from "lucide-react";
import PortalNavbar from "@/components/PortalNavbar";
import Footer from "@/components/Footer";
import { 
  firebaseService, 
  SalesLead, 
  CustomerActivityEvent, 
  SalesFollowUp, 
  SalesSiteVisit, 
  APPROVED_SALESPERSON_EMAILS,
  isLiveFirebaseConfigured 
} from "@/lib/firebase";
import { APPROVED_SALES_PERSONS, DISALLOWED_MOCK_EMAILS } from "@/lib/staff";
import { Currency, formatCurrency } from "@/lib/currency";
import { api } from "@/lib/api";
import { Property, RecommendationItem } from "@/lib/types";
import { formatDualTime, getSystemTimezoneLabel } from "@/lib/timezone";
import { getPropertyImageUrl } from "@/lib/propertyImage";

export default function SalesPersonDashboard() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("AED");
  
  // Salesperson Auth & Identity State
  const [activeSalespersonEmail, setActiveSalespersonEmail] = useState<string>("");
  const [activeSalespersonName, setActiveSalespersonName] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Core Data Collections
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [activities, setActivities] = useState<CustomerActivityEvent[]>([]);
  const [followUps, setFollowUps] = useState<SalesFollowUp[]>([]);
  const [siteVisits, setSiteVisits] = useState<SalesSiteVisit[]>([]);
  const [dbProperties, setDbProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<"leads" | "activities" | "followups" | "visits" | "inventory">("leads");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [budgetFilter, setBudgetFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all"); // "all" | "HOT" | "WARM" | "COLD"

  // Selected Customer Details Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<SalesLead | null>(null);
  const [drawerTab, setDrawerTab] = useState<"dossier" | "activity" | "recommendations" | "followups" | "visits">("dossier");

  // Follow-up Form Inside Drawer
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState<SalesFollowUp["type"]>("call");
  const [newNoteDueDate, setNewNoteDueDate] = useState("");
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);

  // Schedule Visit Form Inside Drawer
  const [newVisitPropId, setNewVisitPropId] = useState<number>(1905);
  const [newVisitDate, setNewVisitDate] = useState("");
  const [newVisitTime, setNewVisitTime] = useState("11:00 AM");
  const [newVisitNotes, setNewVisitNotes] = useState("");
  const [isSchedulingVisit, setIsSchedulingVisit] = useState(false);

  // Status Action Message
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Client-safe timestamp to prevent Next.js prerender evaluation errors
  const [clientNow, setClientNow] = useState<Date | null>(null);

  // 1. Initialize user from session or block unauthorized/mock accounts
  useEffect(() => {
    setClientNow(new Date());
    firebaseService.seedInitialDataIfEmpty();

    const stored = localStorage.getItem("propai_user");
    if (!stored) {
      setAuthError("No active staff session. Please authenticate via the Staff Portal.");
      setIsAuthenticated(false);
      setLoading(false);
      router.replace("/");
      return;
    }

    try {
      const u = JSON.parse(stored);
      const cleanEmail = (u.email || "").toLowerCase().trim();

      // Explicitly reject and clear mock emails
      if (DISALLOWED_MOCK_EMAILS.includes(cleanEmail) || !cleanEmail) {
        localStorage.removeItem("propai_user");
        localStorage.removeItem("propai_token");
        setAuthError("Access Restricted: Mock email accounts are strictly prohibited. Please sign in with your official corporate email.");
        setIsAuthenticated(false);
        setLoading(false);
        router.replace("/");
        return;
      }

      // Bar customer accounts from staff portal
      if (u.role === "customer") {
        router.replace("/dashboard");
        return;
      }

      // Role authorization
      if (u.role === "agent") {
        if (!firebaseService.isApprovedSalesperson(cleanEmail)) {
          setAuthError(`Email ${cleanEmail} is not authorized for salesperson dashboard access.`);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        // Firmly lock salesperson to their own official email
        setActiveSalespersonEmail(cleanEmail);
        setActiveSalespersonName(u.full_name || "Sales Representative");
        setCurrentUserRole("agent");
        setIsAuthenticated(true);
      } else if (u.role === "manager" || u.role === "admin") {
        // Manager or Admin conducting sales oversight
        setActiveSalespersonEmail(APPROVED_SALES_PERSONS[0].email);
        setActiveSalespersonName(APPROVED_SALES_PERSONS[0].name);
        setCurrentUserRole(u.role);
        setIsAuthenticated(true);
      } else {
        setAuthError("Unauthorized role for Salesperson Dashboard.");
        setIsAuthenticated(false);
        setLoading(false);
        router.replace("/");
        return;
      }
    } catch {
      setAuthError("Session invalid. Please sign in again.");
      setIsAuthenticated(false);
      setLoading(false);
      router.replace("/");
      return;
    }

    // Load actual properties from SQLite backend for recommendations
    api.getProperties({ page_size: 40 }).then(res => {
      if (res && res.items) setDbProperties(res.items);
    }).catch(e => console.warn("Property load note:", e));
  }, [router]);

  // 2. Real-time subscriptions to Firestore collections (strictly isolated per salesperson)
  useEffect(() => {
    if (!activeSalespersonEmail) return;
    setLoading(true);

    // Subscribe to Leads assigned to this salesperson
    const unsubLeads = firebaseService.subscribeAssignedLeads(
      activeSalespersonEmail, 
      (data) => {
        setLeads(data);
        setLoading(false);
      },
      false
    );

    // Subscribe to Customer Activities
    const unsubActivities = firebaseService.subscribeCustomerActivities((data) => {
      setActivities(data);
    });

    // Subscribe to Follow-ups (strictly filtered by activeSalespersonEmail)
    const unsubFollowUps = firebaseService.subscribeFollowUps(activeSalespersonEmail, (data) => {
      setFollowUps(data);
    });

    // Subscribe to Site Visits (strictly filtered by activeSalespersonEmail)
    const unsubVisits = firebaseService.subscribeSiteVisits(activeSalespersonEmail, (data) => {
      setSiteVisits(data);
    });

    // Sync backend database leads assigned to this salesperson (including enrolled customers)
    api.getLeads({ scope: "mine" }).then((dbLeads) => {
      if (dbLeads && dbLeads.length > 0) {
        dbLeads.forEach(al => {
          firebaseService.saveLead({
            id: `lead_db_${al.id}`,
            customer_name: al.customer_name || "Valued Client",
            email: al.email,
            phone: al.phone,
            city: al.city || "Dubai",
            locality: al.locality || "Downtown Dubai",
            property_type: al.property_type || "Apartment",
            bhk: al.bhk || 2,
            budget_min: al.budget_min || 1000000,
            budget_max: al.budget_max || 3000000,
            currency: al.currency || "AED",
            purchase_timeline: al.purchase_timeline || "Within 3 months",
            preferred_features: al.preferred_features || ["Enrolled Customer"],
            pipeline_status: (al.pipeline_status as any) || "New",
            purpose: al.purpose || "Investment",
            lead_type: al.lead_type || "Buyer",
            assigned_to_email: activeSalespersonEmail,
            assigned_agent_name: activeSalespersonName,
            notes: al.ai_summary || al.lead_explanation || "Customer enrolled via portal.",
            is_demo: false
          });
        });
      }
    }).catch(() => {});

    return () => {
      unsubLeads();
      unsubActivities();
      unsubFollowUps();
      unsubVisits();
    };
  }, [activeSalespersonEmail]);

  // Keep selectedCustomer in sync with real-time updates
  useEffect(() => {
    if (selectedCustomer) {
      const updated = leads.find(l => l.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
    }
  }, [leads]);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Switch Salesperson Profile (Only permitted for manager or admin oversight)
  const handleSwitchSalesperson = (email: string, name: string) => {
    if (currentUserRole === "agent") {
      setAuthError("Access Restricted: Individual salespersons are strictly isolated to their own assigned dashboard.");
      return;
    }
    if (!firebaseService.isApprovedSalesperson(email)) {
      setAuthError(`Email ${email} is not authorized for salesperson dashboard access.`);
      return;
    }
    setActiveSalespersonEmail(email);
    setActiveSalespersonName(name);
    setAuthError(null);
    showNotification(`Switched active salesperson workspace to ${name} (${email})`);
  };

  // Update lead pipeline status
  const handleUpdateStatus = async (leadId: string, newStatus: SalesLead["pipeline_status"]) => {
    await firebaseService.updateLeadStatus(leadId, newStatus);
    showNotification(`Lead status updated to "${newStatus}"`);
  };

  // Add a follow-up note
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !newNote.trim()) return;

    setIsAddingFollowUp(true);
    try {
      const dueDate = newNoteDueDate ? new Date(newNoteDueDate).toISOString() : new Date(Date.now() + 86400000).toISOString();
      await firebaseService.addFollowUp({
        lead_id: selectedCustomer.id,
        customer_name: selectedCustomer.customer_name,
        agent_email: activeSalespersonEmail,
        agent_name: activeSalespersonName,
        note: newNote.trim(),
        type: newNoteType,
        due_date: dueDate,
        status: "pending"
      });

      setNewNote("");
      setNewNoteDueDate("");
      showNotification("Follow-up note added successfully!");
    } finally {
      setIsAddingFollowUp(false);
    }
  };

  // Toggle follow-up status (pending <-> completed)
  const handleToggleFollowUp = async (id: string, currentStatus: "pending" | "completed") => {
    const next = currentStatus === "pending" ? "completed" : "pending";
    await firebaseService.updateFollowUpStatus(id, next);
    showNotification(`Follow-up marked as ${next}`);
  };

  // Schedule a new site visit from drawer
  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setIsSchedulingVisit(true);
    try {
      const targetProp = dbProperties.find(p => p.id === newVisitPropId) || dbProperties[0];
      await firebaseService.saveSiteVisit({
        lead_id: selectedCustomer.id,
        customer_name: selectedCustomer.customer_name,
        contact_phone: selectedCustomer.phone || "+971 50 123 4567",
        contact_email: selectedCustomer.email || null,
        property_id: targetProp ? targetProp.id : 1905,
        property_title: targetProp ? targetProp.title : "Luxury Residence",
        property_locality: targetProp ? targetProp.locality : "Downtown Dubai",
        property_price: targetProp ? targetProp.price : 2500000,
        property_image: targetProp?.image_url,
        preferred_date: newVisitDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
        preferred_time: newVisitTime,
        notes: newVisitNotes.trim() || undefined,
        status: "confirmed",
        assigned_to_email: activeSalespersonEmail
      });

      // Also record activity event
      await firebaseService.recordActivity({
        customer_name: selectedCustomer.customer_name,
        customer_email: selectedCustomer.email,
        activity_type: "site_visit_requested",
        property_id: targetProp?.id,
        property_title: targetProp?.title,
        details: `Viewing booked for ${targetProp?.title} on ${newVisitDate || "scheduled date"}`
      });

      setNewVisitNotes("");
      setNewVisitDate("");
      showNotification("Site visit scheduled and confirmed!");
    } finally {
      setIsSchedulingVisit(false);
    }
  };

  // Lead Temperature Category & Score Helpers
  const getLeadCategory = (lead: SalesLead): "HOT" | "WARM" | "COLD" => {
    if (lead.lead_category) return lead.lead_category;
    if (typeof lead.lead_score === "number") {
      if (lead.lead_score >= 70) return "HOT";
      if (lead.lead_score >= 40) return "WARM";
      return "COLD";
    }
    const status = (lead.pipeline_status || "").toLowerCase();
    if (status === "viewing scheduled" || status === "negotiation" || (lead.budget_max && lead.budget_max >= 3000000)) {
      return "HOT";
    }
    if (status === "interested" || status === "contacted" || lead.purchase_timeline?.toLowerCase().includes("3 months")) {
      return "WARM";
    }
    return "COLD";
  };

  const getLeadScore = (lead: SalesLead): number => {
    if (typeof lead.lead_score === "number") return lead.lead_score;
    const cat = getLeadCategory(lead);
    if (cat === "HOT") return 85;
    if (cat === "WARM") return 55;
    return 30;
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalAssigned = leads.length;
    const hotLeads = leads.filter(l => getLeadCategory(l) === "HOT").length;
    const warmLeads = leads.filter(l => getLeadCategory(l) === "WARM").length;
    const coldLeads = leads.filter(l => getLeadCategory(l) === "COLD").length;
    const newEnquiries = leads.filter(l => l.pipeline_status === "New").length;
    const contacted = leads.filter(l => l.pipeline_status === "Contacted").length;
    
    // Follow-ups due today or overdue
    const todayStr = clientNow ? clientNow.toISOString().split("T")[0] : "";
    const followUpsDueCount = clientNow ? followUps.filter(f => {
      if (f.status === "completed") return false;
      const fDate = f.due_date.split("T")[0];
      return fDate <= todayStr;
    }).length : 0;

    // Site visits scheduled
    const visitsScheduledCount = siteVisits.filter(v => v.status === "pending" || v.status === "confirmed").length;

    return {
      totalAssigned,
      hotLeads,
      warmLeads,
      coldLeads,
      newEnquiries,
      contacted,
      followUpsDueCount,
      visitsScheduledCount
    };
  }, [leads, followUps, siteVisits, clientNow]);

  // Unique localities for filter
  const localities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.locality) set.add(l.locality);
    });
    return Array.from(set);
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.customer_name.toLowerCase().includes(q);
        const matchesEmail = lead.email ? lead.email.toLowerCase().includes(q) : false;
        const matchesPhone = lead.phone ? lead.phone.includes(q) : false;
        const matchesLoc = lead.locality ? lead.locality.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesLoc) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "all" && lead.pipeline_status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 3. Location Filter
      if (locationFilter !== "all" && lead.locality !== locationFilter) {
        return false;
      }

      // 4. Budget Filter
      if (budgetFilter !== "all") {
        const bMax = lead.budget_max || 0;
        if (budgetFilter === "under_1.5m" && bMax > 1500000) return false;
        if (budgetFilter === "1.5m_3m" && (bMax < 1500000 || bMax > 3000000)) return false;
        if (budgetFilter === "3m_5m" && (bMax < 3000000 || bMax > 5000000)) return false;
        if (budgetFilter === "above_5m" && bMax < 5000000) return false;
      }

      // 5. Follow-up Filter
      if (followUpFilter !== "all") {
        const leadNotes = followUps.filter(f => f.lead_id === lead.id && f.status === "pending");
        if (followUpFilter === "has_followup" && leadNotes.length === 0) return false;
        if (followUpFilter === "due_today") {
          const today = clientNow ? clientNow.toISOString().split("T")[0] : "";
          const hasToday = leadNotes.some(n => n.due_date.split("T")[0] === today);
          if (!hasToday) return false;
        }
        if (followUpFilter === "overdue") {
          const hasOverdue = clientNow ? leadNotes.some(n => new Date(n.due_date) < clientNow) : false;
          if (!hasOverdue) return false;
        }
      }

      // 6. Category Filter (HOT / WARM / COLD)
      if (categoryFilter !== "all") {
        if (getLeadCategory(lead) !== categoryFilter.toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [leads, searchQuery, statusFilter, locationFilter, budgetFilter, followUpFilter, categoryFilter, followUps, clientNow]);

  // Customer activity for currently selected customer
  const selectedCustomerActivities = useMemo(() => {
    if (!selectedCustomer) return [];
    return activities.filter(a => {
      const matchEmail = selectedCustomer.email && a.customer_email && 
        selectedCustomer.email.toLowerCase() === a.customer_email.toLowerCase();
      const matchName = a.customer_name && 
        selectedCustomer.customer_name.toLowerCase() === a.customer_name.toLowerCase();
      return matchEmail || matchName;
    });
  }, [selectedCustomer, activities]);

  // Total active time spent by customer on property pages
  const totalEngagementTimeFormatted = useMemo(() => {
    const totalSeconds = selectedCustomerActivities.reduce((acc, a) => acc + (a.time_spent_seconds || 0), 0);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  }, [selectedCustomerActivities]);

  // Matching properties using actual records from database (Feature 6: Never invent properties)
  const matchedRealProperties = useMemo(() => {
    if (!selectedCustomer || dbProperties.length === 0) return [];
    
    return dbProperties
      .map(p => {
        let score = 50;
        const reasons: string[] = [];

        // Budget match
        if (selectedCustomer.budget_max && p.price <= selectedCustomer.budget_max) {
          score += 25;
          reasons.push(`Within budget ceiling (AED ${p.price.toLocaleString()})`);
        } else if (selectedCustomer.budget_max && p.price <= selectedCustomer.budget_max * 1.15) {
          score += 10;
          reasons.push("Slightly above stated budget (+15% luxury tolerance)");
        }

        // Locality match
        if (selectedCustomer.locality && p.locality && 
            p.locality.toLowerCase().includes(selectedCustomer.locality.toLowerCase())) {
          score += 25;
          reasons.push(`Direct location match: ${p.locality}`);
        }

        // BHK match
        if (selectedCustomer.bhk && p.bhk === selectedCustomer.bhk) {
          score += 15;
          reasons.push(`Exact ${p.bhk} BHK layout`);
        }

        return {
          property: p,
          match_score: Math.min(score, 99),
          reasons
        };
      })
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 6);
  }, [selectedCustomer, dbProperties]);

  // Selected customer follow-ups
  const selectedCustomerFollowUps = useMemo(() => {
    if (!selectedCustomer) return [];
    return followUps.filter(f => f.lead_id === selectedCustomer.id);
  }, [selectedCustomer, followUps]);

  // Selected customer visits
  const selectedCustomerVisits = useMemo(() => {
    if (!selectedCustomer) return [];
    return siteVisits.filter(v => v.lead_id === selectedCustomer.id || 
      (v.contact_email && selectedCustomer.email && v.contact_email.toLowerCase() === selectedCustomer.email.toLowerCase()));
  }, [selectedCustomer, siteVisits]);

  // Filter activities to only this salesperson's assigned customers (for agents)
  const agentAssignedActivities = useMemo(() => {
    if (currentUserRole === "manager" || currentUserRole === "admin") {
      return activities;
    }
    const customerEmails = new Set(leads.map(l => l.email?.toLowerCase()).filter(Boolean));
    const customerNames = new Set(leads.map(l => l.customer_name?.toLowerCase()).filter(Boolean));
    return activities.filter(a => 
      (a.customer_email && customerEmails.has(a.customer_email.toLowerCase())) ||
      (a.customer_name && customerNames.has(a.customer_name.toLowerCase()))
    );
  }, [activities, leads, currentUserRole]);

  // Status Badge Helper
  const getStatusBadge = (status: SalesLead["pipeline_status"]) => {
    switch (status) {
      case "New":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "Contacted":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "Interested":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "Viewing Scheduled":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "Negotiation":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "Converted":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "Lost":
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  // If unauthenticated or loading session, render protective access gate
  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-[#08090C] text-zinc-100 flex flex-col selection:bg-[#C5A869]/30">
        <PortalNavbar 
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
          activeRoleTitle="Salesperson Workspace"
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#111319] border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-[#C5A869]">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Salesperson Authentication Required</h2>
            <p className="text-xs text-zinc-400">
              {authError || "Only official authorized Lyka Realty sales person emails are permitted. Please sign in to access your assigned pipeline."}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C5A869] text-black font-semibold text-xs hover:bg-[#d6ba7c] transition"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090C] text-zinc-100 flex flex-col selection:bg-[#C5A869]/30">
      <PortalNavbar 
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        activeRoleTitle="Salesperson Workspace"
      />

      {/* Action Notification Banner */}
      {actionSuccessMsg && (
        <div className="fixed top-24 right-6 z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="ml-2 text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Access Denied / Auth Error Banner */}
      {authError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{authError}</span>
            </div>
            <button onClick={() => setAuthError(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header: Salesperson Identity & Firebase Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#C5A869]">
                Sales Person Dashboard
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40 font-mono">
                Firebase Firestore Real-time
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isLiveFirebaseConfigured ? "Live Cloud Firestore" : "Firestore Reactive Client (Connected)"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              <span>Welcome back, {activeSalespersonName}</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Real-time assigned customer enquiries, live customer activity tracking, automated inventory matching, and follow-up reminders.
            </p>
          </div>

          {/* Salesperson Identity Badge (Strictly locked for agent, selector for manager/admin) */}
          {currentUserRole === "agent" ? (
            <div className="flex items-center gap-2.5 bg-[#101218] px-4 py-2.5 rounded-2xl border border-[#C5A869]/40 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{activeSalespersonName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#C5A869]/20 text-[#E1CB8E] font-mono border border-[#C5A869]/40">
                    Official Sales Advisor
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {activeSalespersonEmail}
                </div>
                <div className="text-[10px] text-[#C5A869] font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-[#C5A869]" />
                  <span>Allotted Territory: {APPROVED_SALES_PERSONS.find(sp => sp.email.toLowerCase() === (activeSalespersonEmail || "").toLowerCase())?.specialty || "Dubai Prime Residential"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#101218] p-2 rounded-2xl border border-zinc-800 shadow-md">
              <span className="text-[11px] text-zinc-400 font-mono pl-1 hidden sm:inline">
                {currentUserRole === "admin" ? "Admin Oversight:" : "Manager Oversight:"}
              </span>
              <div className="relative">
                <select
                  value={activeSalespersonEmail}
                  onChange={(e) => {
                    const selected = APPROVED_SALES_PERSONS.find(sp => sp.email === e.target.value);
                    if (selected) {
                      handleSwitchSalesperson(selected.email, selected.name);
                    }
                  }}
                  className="bg-zinc-900 border border-zinc-700 hover:border-[#C5A869]/60 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5A869] appearance-none cursor-pointer"
                >
                  {APPROVED_SALES_PERSONS.map((sp, idx) => (
                    <option key={sp.email} value={sp.email}>
                      {idx + 1}. {sp.name} — {sp.email}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-400 absolute right-2.5 top-2 pointer-events-none">▼</span>
              </div>
            </div>
          )}
        </div>

        {/* FEATURE 1: DASHBOARD OVERVIEW KPI CARDS */}
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {/* Card 1: Total Assigned Leads */}
          <div 
            onClick={() => { setActiveTab("leads"); setStatusFilter("all"); setCategoryFilter("all"); }}
            className={`p-4 sm:p-5 rounded-2xl bg-[#111319] border transition cursor-pointer shadow-lg space-y-1.5 group ${
              categoryFilter === "all" && statusFilter === "all" ? "border-[#C5A869] bg-[#C5A869]/5" : "border-zinc-800 hover:border-[#C5A869]/50"
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>Total Assigned</span>
              <Users className="w-4 h-4 text-[#C5A869] group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {metrics.totalAssigned}
            </div>
            <div className="text-[10px] text-zinc-400">Assigned customer accounts</div>
          </div>

          {/* Card 2: Hot Leads */}
          <div 
            onClick={() => { setActiveTab("leads"); setCategoryFilter("HOT"); }}
            className={`p-4 sm:p-5 rounded-2xl bg-[#111319] border transition cursor-pointer shadow-lg space-y-1.5 group ${
              categoryFilter === "HOT" ? "border-red-500 bg-red-950/30" : "border-red-900/30 hover:border-red-500/60"
            }`}
          >
            <div className="flex items-center justify-between text-red-400 text-xs font-mono">
              <span>🔥 Hot Leads</span>
              <Flame className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-400 font-mono">
              {metrics.hotLeads}
            </div>
            <div className="text-[10px] text-zinc-400">Score ≥ 70 • High urgency</div>
          </div>

          {/* Card 3: Warm Leads */}
          <div 
            onClick={() => { setActiveTab("leads"); setCategoryFilter("WARM"); }}
            className={`p-4 sm:p-5 rounded-2xl bg-[#111319] border transition cursor-pointer shadow-lg space-y-1.5 group ${
              categoryFilter === "WARM" ? "border-amber-500 bg-amber-950/30" : "border-amber-900/30 hover:border-amber-500/60"
            }`}
          >
            <div className="flex items-center justify-between text-amber-400 text-xs font-mono">
              <span>⚡ Warm Leads</span>
              <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {metrics.warmLeads}
            </div>
            <div className="text-[10px] text-zinc-400">Score 40–69 • Active interest</div>
          </div>

          {/* Card 4: Cold Leads */}
          <div 
            onClick={() => { setActiveTab("leads"); setCategoryFilter("COLD"); }}
            className={`p-4 sm:p-5 rounded-2xl bg-[#111319] border transition cursor-pointer shadow-lg space-y-1.5 group ${
              categoryFilter === "COLD" ? "border-blue-500 bg-blue-950/30" : "border-blue-900/30 hover:border-blue-500/60"
            }`}
          >
            <div className="flex items-center justify-between text-blue-400 text-xs font-mono">
              <span>❄️ Cold Leads</span>
              <Snowflake className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-mono">
              {metrics.coldLeads}
            </div>
            <div className="text-[10px] text-zinc-400">Score &lt; 40 • Discovery stage</div>
          </div>

          {/* Card 5: Follow-ups Due */}
          <div 
            onClick={() => { setActiveTab("followups"); setFollowUpFilter("due_today"); }}
            className="p-4 sm:p-5 rounded-2xl bg-[#111319] border border-amber-900/30 hover:border-amber-500/60 transition cursor-pointer shadow-lg space-y-1.5 group"
          >
            <div className="flex items-center justify-between text-amber-400 text-xs font-mono">
              <span>Follow-ups Due</span>
              <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#E1CB8E] font-mono">
              {metrics.followUpsDueCount}
            </div>
            <div className="text-[10px] text-zinc-400">Due today or overdue</div>
          </div>

          {/* Card 6: Site Visits Scheduled */}
          <div 
            onClick={() => setActiveTab("visits")}
            className="p-4 sm:p-5 rounded-2xl bg-[#111319] border border-emerald-900/30 hover:border-emerald-500/60 transition cursor-pointer shadow-lg space-y-1.5 group col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs font-mono">
              <span>Site Visits</span>
              <Calendar className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {metrics.visitsScheduledCount}
            </div>
            <div className="text-[10px] text-zinc-400">Confirmed property tours</div>
          </div>
        </section>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "leads"
                ? "bg-[#C5A869] text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Assigned Customers ({leads.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activities")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "activities"
                ? "bg-[#C5A869] text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Live Customer Activity Stream ({agentAssignedActivities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("followups")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "followups"
                ? "bg-[#C5A869] text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Follow-up Reminders ({followUps.filter(f => f.status === "pending").length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("visits")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "visits"
                ? "bg-[#C5A869] text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Site Visits ({siteVisits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "inventory"
                ? "bg-[#C5A869] text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Real Inventory Catalog ({dbProperties.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ASSIGNED CUSTOMERS & LEADS (Features 2, 4, 9) */}
        {/* ========================================================================= */}
        {activeTab === "leads" && (
          <div className="space-y-4 animate-fade-in">
            {/* Search and Filters Bar (Feature 9) */}
            <div className="p-4 rounded-2xl bg-[#111319] border border-zinc-800 space-y-3 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Search Input */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by customer name, email, phone, location..."
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs">✕</button>
                  )}
                </div>

                {/* Lead Category Filter (HOT / WARM / COLD) */}
                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none transition font-semibold"
                  >
                    <option value="all">All Temperatures (Hot/Warm/Cold)</option>
                    <option value="HOT">🔥 Hot Leads ({metrics.hotLeads})</option>
                    <option value="WARM">⚡ Warm Leads ({metrics.warmLeads})</option>
                    <option value="COLD">❄️ Cold Leads ({metrics.coldLeads})</option>
                  </select>
                </div>

                {/* Lead Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none transition"
                  >
                    <option value="all">All Lead Statuses</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="interested">Interested</option>
                    <option value="viewing scheduled">Viewing Scheduled</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>

                {/* Location Filter */}
                <div>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none transition"
                  >
                    <option value="all">All Locations</option>
                    {localities.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Budget Range Filter */}
                <div>
                  <select
                    value={budgetFilter}
                    onChange={(e) => setBudgetFilter(e.target.value)}
                    className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none transition"
                  >
                    <option value="all">All Budget Ranges</option>
                    <option value="under_1.5m">Under 1.5M AED</option>
                    <option value="1.5m_3m">1.5M – 3.0M AED</option>
                    <option value="3m_5m">3.0M – 5.0M AED</option>
                    <option value="above_5m">Above 5.0M AED</option>
                  </select>
                </div>
              </div>

              {/* Sub-filter pills (Hot/Warm/Cold, Follow-ups & Active Filters Reset) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-500 uppercase font-mono">Category:</span>
                    {[
                      { id: "all", label: "All" },
                      { id: "HOT", label: `🔥 Hot (${metrics.hotLeads})` },
                      { id: "WARM", label: `⚡ Warm (${metrics.warmLeads})` },
                      { id: "COLD", label: `❄️ Cold (${metrics.coldLeads})` }
                    ].map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCategoryFilter(c.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                          categoryFilter === c.id
                            ? c.id === "HOT"
                              ? "bg-red-500/20 text-red-400 border border-red-500/50 font-bold"
                              : c.id === "WARM"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold"
                              : c.id === "COLD"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/50 font-bold"
                              : "bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40 font-bold"
                            : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Follow-up Pills */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-500 uppercase font-mono">Follow-up:</span>
                    {[
                      { id: "all", label: "All" },
                      { id: "due_today", label: "Due Today" },
                      { id: "overdue", label: "Overdue" },
                      { id: "has_followup", label: "Has Pending" }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFollowUpFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                          followUpFilter === f.id
                            ? "bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40 font-bold"
                            : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-mono text-[11px]">
                    Showing {filteredLeads.length} of {leads.length} Customers
                  </span>
                  {(searchQuery || statusFilter !== "all" || categoryFilter !== "all" || locationFilter !== "all" || budgetFilter !== "all" || followUpFilter !== "all") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setCategoryFilter("all");
                        setLocationFilter("all");
                        setBudgetFilter("all");
                        setFollowUpFilter("all");
                      }}
                      className="text-xs text-[#C5A869] hover:underline font-semibold"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Assigned Customers Table (Feature 2) */}
            <div className="bg-[#111319] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151720] text-zinc-400 uppercase font-mono border-b border-zinc-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Customer</th>
                      <th className="py-3.5 px-4 font-semibold">Category / Temp</th>
                      <th className="py-3.5 px-4 font-semibold">Requirements</th>
                      <th className="py-3.5 px-4 font-semibold">Budget Range</th>
                      <th className="py-3.5 px-4 font-semibold">Enquiry Date</th>
                      <th className="py-3.5 px-4 font-semibold">Lead Status</th>
                      <th className="py-3.5 px-4 font-semibold">Engagement</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500">
                          <Users className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                          <p className="font-semibold text-zinc-400">No customers found matching current filters</p>
                          <p className="text-[11px] mt-1">Try clearing your search term or adjusting filter options.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => {
                        // Check customer activity count
                        const custActs = activities.filter(a => 
                          (lead.email && a.customer_email && lead.email.toLowerCase() === a.customer_email.toLowerCase()) ||
                          (a.customer_name && lead.customer_name.toLowerCase() === a.customer_name.toLowerCase())
                        );
                        const viewsCount = custActs.filter(a => a.activity_type === "property_view").length;
                        const savedCount = custActs.filter(a => a.activity_type === "property_save").length;

                        // Check pending follow-up
                        const pendingFollowUps = followUps.filter(f => f.lead_id === lead.id && f.status === "pending");
                        const nextDue = pendingFollowUps.length > 0 ? pendingFollowUps[0] : null;

                        return (
                          <tr
                            key={lead.id}
                            className="hover:bg-zinc-800/40 transition group cursor-pointer"
                            onClick={() => {
                              setSelectedCustomer(lead);
                              setDrawerTab("dossier");
                            }}
                          >
                            {/* Customer Name & Contacts */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#C5A869]/20 text-[#E1CB8E] font-bold text-xs flex items-center justify-center border border-[#C5A869]/40 shrink-0">
                                  {lead.customer_name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-sm group-hover:text-[#E1CB8E] transition flex items-center gap-1.5">
                                    <span>{lead.customer_name}</span>
                                    {lead.is_demo && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                                        DEMO
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                                    {lead.phone && <span className="font-mono">{lead.phone}</span>}
                                    {lead.email && <span>• {lead.email}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Temperature Category & Score (HOT / WARM / COLD) */}
                            <td className="py-4 px-4">
                              {getLeadCategory(lead) === "HOT" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-950/80 text-red-400 border border-red-800/80 font-mono shadow-sm">
                                  <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  <span>HOT • {getLeadScore(lead)}</span>
                                </span>
                              )}
                              {getLeadCategory(lead) === "WARM" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono shadow-sm">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>WARM • {getLeadScore(lead)}</span>
                                </span>
                              )}
                              {getLeadCategory(lead) === "COLD" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950/60 text-blue-300 border border-blue-800/80 font-mono shadow-sm">
                                  <Snowflake className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  <span>COLD • {getLeadScore(lead)}</span>
                                </span>
                              )}
                            </td>

                            {/* Requirements (Customer Tab) */}
                            <td className="py-4 px-4">
                              <div className="text-zinc-200 font-medium">
                                {lead.bhk ? `${lead.bhk} BHK ` : ""}{lead.property_type || "Property"}
                              </div>
                              <div className="text-[11px] text-[#C5A869] flex items-center gap-1 mt-0.5 font-mono">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{lead.locality || "Any Community"}, {lead.city}</span>
                              </div>
                              {lead.purchase_timeline && (
                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                  Timeline: {lead.purchase_timeline}
                                </div>
                              )}
                            </td>

                            {/* Budget Range */}
                            <td className="py-4 px-4 font-mono font-bold text-white">
                              {lead.budget_min && lead.budget_max
                                ? `${formatCurrency(lead.budget_min, currency)} – ${formatCurrency(lead.budget_max, currency)}`
                                : lead.budget_max
                                ? `Up to ${formatCurrency(lead.budget_max, currency)}`
                                : "Flexible"}
                            </td>

                            {/* Enquiry Date */}
                            <td className="py-4 px-4 font-mono text-[11px] text-zinc-400">
                              {formatDualTime(lead.created_at)}
                            </td>

                            {/* Lead Management Status (Feature 4) */}
                            <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={lead.pipeline_status}
                                onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none transition font-mono ${getStatusBadge(lead.pipeline_status)}`}
                              >
                                <option value="New" className="bg-zinc-900 text-white">New</option>
                                <option value="Contacted" className="bg-zinc-900 text-white">Contacted</option>
                                <option value="Interested" className="bg-zinc-900 text-white">Interested</option>
                                <option value="Viewing Scheduled" className="bg-zinc-900 text-white">Viewing Scheduled</option>
                                <option value="Negotiation" className="bg-zinc-900 text-white">Negotiation</option>
                                <option value="Converted" className="bg-zinc-900 text-white">Converted</option>
                                <option value="Lost" className="bg-zinc-900 text-white">Lost</option>
                              </select>
                            </td>

                            {/* Engagement Tracking Counters (Feature 3) */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2 text-[11px] font-mono">
                                <span className="flex items-center gap-1 text-zinc-300" title="Properties viewed">
                                  <Eye className="w-3.5 h-3.5 text-[#C5A869]" />
                                  <span>{viewsCount}</span>
                                </span>
                                <span className="flex items-center gap-1 text-zinc-300" title="Saved properties">
                                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                                  <span>{savedCount}</span>
                                </span>
                              </div>
                              {nextDue && (
                                <div className="text-[10px] text-amber-300 mt-1 flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Due: {nextDue.due_date.split("T")[0]}</span>
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(lead);
                                  setDrawerTab("dossier");
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#C5A869] text-black font-bold text-xs hover:bg-[#E1CB8E] transition shadow inline-flex items-center gap-1"
                              >
                                <span>View Dossier</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LIVE CUSTOMER ACTIVITY TRACKING (Feature 3) */}
        {/* ========================================================================= */}
        {activeTab === "activities" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#111319] border border-zinc-800 rounded-2xl shadow-lg">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#C5A869]" /> Customer Activity &amp; Page Engagement Stream
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Live real-time feed tracking page visits, property views, active engagement times, and saved homes from the Customer Tab.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5 self-start sm:self-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Listening to Firestore Real-time
              </span>
            </div>

            <div className="bg-[#111319] border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-3">
              {agentAssignedActivities.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  <p className="font-semibold text-zinc-400">No customer activity recorded for your assigned pipeline yet</p>
                  <p className="text-zinc-500 mt-1">When your assigned customers browse or save properties, real-time activity events will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agentAssignedActivities.map((act) => {
                    return (
                      <div
                        key={act.id}
                        className="p-4 rounded-xl bg-[#161822] border border-zinc-800/80 hover:border-[#C5A869]/40 transition flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`p-2.5 rounded-xl border shrink-0 ${
                            act.activity_type === "property_view"
                              ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                              : act.activity_type === "property_save"
                              ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                              : act.activity_type === "site_visit_requested"
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : "bg-[#C5A869]/15 border-[#C5A869]/30 text-[#E1CB8E]"
                          }`}>
                            {act.activity_type === "property_view" && <Eye className="w-4 h-4" />}
                            {act.activity_type === "property_save" && <Heart className="w-4 h-4 fill-rose-400" />}
                            {act.activity_type === "site_visit_requested" && <Calendar className="w-4 h-4" />}
                            {act.activity_type === "enquiry_submitted" && <Sparkles className="w-4 h-4" />}
                            {act.activity_type === "search" && <Search className="w-4 h-4" />}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-sm">{act.customer_name}</span>
                              {act.customer_email && (
                                <span className="text-xs text-zinc-400 font-mono">({act.customer_email})</span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
                                {act.activity_type.replace("_", " ")}
                              </span>
                              {act.is_demo && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                                  DEMO EVENT
                                </span>
                              )}
                            </div>

                            {/* Details of Property Viewed / Searched */}
                            <div className="mt-1 text-xs text-zinc-300">
                              {act.property_title && (
                                <span className="font-semibold text-white">
                                  {act.property_title}
                                </span>
                              )}
                              {act.property_locality && (
                                <span className="text-zinc-400 font-mono"> in {act.property_locality}</span>
                              )}
                              {act.property_price && (
                                <span className="text-[#E1CB8E] font-mono"> • {formatCurrency(act.property_price, currency)}</span>
                              )}
                              {act.search_query && (
                                <span className="italic text-zinc-400">“{act.search_query}”</span>
                              )}
                              {act.details && (
                                <span className="text-zinc-300"> — {act.details}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Timing and Engagement Duration (Feature 3) */}
                        <div className="flex items-center gap-3 shrink-0 self-start md:self-center font-mono text-xs">
                          {act.time_spent_seconds && (
                            <span className="px-2.5 py-1 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-800/80 font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-blue-400" />
                              <span>Active Time: {act.time_spent_seconds}s</span>
                            </span>
                          )}
                          <span className="text-zinc-400 text-[11px]">
                            {formatDualTime(act.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FOLLOW-UPS & REMINDERS (Feature 5) */}
        {/* ========================================================================= */}
        {activeTab === "followups" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#111319] border border-zinc-800 rounded-2xl shadow-lg">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#C5A869]" /> Customer Follow-ups &amp; Action Reminders
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Keep track of all client communication commitments, WhatsApp follow-ups, calls, and reminder dates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followUps.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-zinc-500 text-xs bg-[#111319] rounded-2xl border border-zinc-800">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  <p className="font-semibold text-zinc-400">No follow-ups recorded</p>
                  <p className="text-zinc-500 mt-1">Open any customer from the Assigned Customers tab to log a note or reminder.</p>
                </div>
              ) : (
                followUps.map((fup) => {
                  const isDone = fup.status === "completed";
                  const isOverdue = !isDone && clientNow ? new Date(fup.due_date) < clientNow : false;

                  return (
                    <div
                      key={fup.id}
                      className={`p-5 rounded-2xl border transition shadow-lg space-y-3 ${
                        isDone 
                          ? "bg-[#111319]/70 border-zinc-800/60 opacity-70"
                          : isOverdue
                          ? "bg-red-950/20 border-red-800/60"
                          : "bg-[#111319] border-zinc-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base">{fup.customer_name}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded uppercase font-mono bg-zinc-900 border border-zinc-800 text-zinc-300">
                              {fup.type}
                            </span>
                            {fup.is_demo && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                                DEMO
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Assigned to: <strong className="text-white">{fup.agent_name}</strong>
                          </p>
                        </div>

                        <span className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono ${
                          isDone 
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800" 
                            : isOverdue 
                            ? "bg-red-950 text-red-300 border border-red-800 animate-pulse" 
                            : "bg-amber-950 text-amber-300 border border-amber-800"
                        }`}>
                          {isDone ? "Completed" : isOverdue ? "OVERDUE" : "Pending"}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                        "{fup.note}"
                      </p>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80 font-mono">
                        <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#C5A869]" />
                          Due: {fup.due_date.split("T")[0]}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleFollowUp(fup.id, fup.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            isDone 
                              ? "bg-zinc-800 text-zinc-400 hover:text-white"
                              : "bg-[#C5A869] text-black hover:bg-[#E1CB8E] font-bold shadow"
                          }`}
                        >
                          {isDone ? "Mark Pending" : "Mark Completed ✓"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SITE VISITS (Feature 7) */}
        {/* ========================================================================= */}
        {activeTab === "visits" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#111319] border border-zinc-800 rounded-2xl shadow-lg">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#C5A869]" /> Property Site Visits &amp; Escorts
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage private VIP site viewings booked through the Customer Tab or scheduled by salespeople.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {siteVisits.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs bg-[#111319] rounded-2xl border border-zinc-800">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  <p className="font-semibold text-zinc-400">No scheduled visits</p>
                </div>
              ) : (
                siteVisits.map((vis) => {
                  return (
                    <div
                      key={vis.id}
                      className="p-5 rounded-2xl bg-[#111319] border border-zinc-800 hover:border-[#C5A869]/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase font-mono ${
                            vis.status === "confirmed"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : vis.status === "completed"
                              ? "bg-blue-950 text-blue-300 border border-blue-800"
                              : vis.status === "cancelled"
                              ? "bg-red-950 text-red-300 border border-red-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}>
                            {vis.status}
                          </span>
                          <span className="text-xs text-[#E1CB8E] font-mono flex items-center gap-1 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-[#C5A869]" />
                            {vis.preferred_date} at {vis.preferred_time}
                          </span>
                          {vis.is_demo && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                              DEMO
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-white text-base">
                          {vis.property_title || `Property #${vis.property_id}`}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Customer: <strong className="text-white">{vis.customer_name}</strong> • Phone: <span className="font-mono text-zinc-300">{vis.contact_phone}</span>
                        </p>
                        {vis.notes && (
                          <p className="text-[11px] text-zinc-400 italic">
                            Notes: "{vis.notes}"
                          </p>
                        )}
                      </div>

                      {/* Status Update Dropdown */}
                      <div className="flex items-center gap-2 self-start md:self-center">
                        <select
                          value={vis.status}
                          onChange={(e) => {
                            firebaseService.updateSiteVisitStatus(vis.id, e.target.value as any);
                            showNotification(`Site visit status updated to ${e.target.value}`);
                          }}
                          className="bg-[#181B24] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>

                        <a
                          href={`https://wa.me/${vis.contact_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                        >
                          WhatsApp Customer
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: REAL PROPERTY INVENTORY CATALOG (Feature 6: Real Records) */}
        {/* ========================================================================= */}
        {activeTab === "inventory" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#111319] border border-zinc-800 rounded-2xl shadow-lg">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#C5A869]" /> Verified Dubai Property Portfolio
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Actual live property records from Lyka Realty database. Never hallucinated or mock prices.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dbProperties.map(prop => (
                <div key={prop.id} className="bg-[#111319] border border-zinc-800 hover:border-[#C5A869]/50 rounded-2xl overflow-hidden shadow-lg transition flex flex-col justify-between">
                  <div>
                    <div className="h-44 bg-zinc-900 relative overflow-hidden">
                      <img
                        src={getPropertyImageUrl(prop.image_url, prop.locality, prop.city, prop.id)}
                        alt={prop.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-mono text-[#E1CB8E] border border-white/10 font-bold">
                        {prop.bhk} BHK • {prop.property_type}
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5">
                      <span className="text-[10px] text-[#C5A869] font-mono block uppercase">
                        {prop.locality}, {prop.city}
                      </span>
                      <h4 className="font-bold text-white text-sm line-clamp-1">{prop.title}</h4>
                      <p className="text-base font-extrabold text-[#E1CB8E] font-mono">
                        {formatCurrency(prop.price, currency)}
                      </p>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{prop.description}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <Link
                      href={`/properties/${prop.id}`}
                      target="_blank"
                      className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <span>View Full Listing</span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* FEATURE 8: CUSTOMER DETAILS DOSSIER DRAWER (Full Profile Slide-Over) */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedCustomer(null)}
        >
          <div 
            className="w-full max-w-2xl bg-[#0D0F15] border-l border-zinc-800 h-full overflow-y-auto shadow-2xl flex flex-col text-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 bg-[#111319] border-b border-zinc-800 sticky top-0 z-20 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#C5A869]/20 text-[#E1CB8E] font-black text-lg flex items-center justify-center border border-[#C5A869]/40">
                    {selectedCustomer.customer_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">{selectedCustomer.customer_name}</h2>
                      {selectedCustomer.is_demo && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                          DEMO CLIENT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 flex flex-wrap items-center gap-2">
                      {selectedCustomer.phone && <span className="font-mono text-zinc-300">{selectedCustomer.phone}</span>}
                      {selectedCustomer.email && <span>• {selectedCustomer.email}</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Contact & Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 uppercase font-mono">Pipeline Status:</span>
                  <select
                    value={selectedCustomer.pipeline_status}
                    onChange={(e) => handleUpdateStatus(selectedCustomer.id, e.target.value as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none transition font-mono ${getStatusBadge(selectedCustomer.pipeline_status)}`}
                  >
                    <option value="New" className="bg-zinc-900 text-white">New</option>
                    <option value="Contacted" className="bg-zinc-900 text-white">Contacted</option>
                    <option value="Interested" className="bg-zinc-900 text-white">Interested</option>
                    <option value="Viewing Scheduled" className="bg-zinc-900 text-white">Viewing Scheduled</option>
                    <option value="Negotiation" className="bg-zinc-900 text-white">Negotiation</option>
                    <option value="Converted" className="bg-zinc-900 text-white">Converted</option>
                    <option value="Lost" className="bg-zinc-900 text-white">Lost</option>
                  </select>
                </div>

                {/* Quick Outreach Buttons */}
                <div className="flex items-center gap-2">
                  {selectedCustomer.phone && (
                    <a
                      href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  {selectedCustomer.phone && (
                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs border border-zinc-700 transition flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#C5A869]" />
                      <span>Call</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Drawer Navigation Sub-tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setDrawerTab("dossier")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                    drawerTab === "dossier"
                      ? "bg-[#C5A869] text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                  }`}
                >
                  Requirements Dossier
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("activity")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                    drawerTab === "activity"
                      ? "bg-[#C5A869] text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                  }`}
                >
                  Activity Tracking ({selectedCustomerActivities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("recommendations")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                    drawerTab === "recommendations"
                      ? "bg-[#C5A869] text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                  }`}
                >
                  AI Recommendations ({matchedRealProperties.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("followups")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                    drawerTab === "followups"
                      ? "bg-[#C5A869] text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                  }`}
                >
                  Follow-ups ({selectedCustomerFollowUps.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("visits")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                    drawerTab === "visits"
                      ? "bg-[#C5A869] text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                  }`}
                >
                  Site Visits ({selectedCustomerVisits.length})
                </button>
              </div>
            </div>

            {/* Drawer Body Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* SUBTAB 1: REQUIREMENTS DOSSIER */}
              {drawerTab === "dossier" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Lead Temperature & Scoring Assessment */}
                  {(() => {
                    const temp = getLeadCategory(selectedCustomer);
                    const score = getLeadScore(selectedCustomer);
                    const tempConfig = {
                      HOT: {
                        bg: "bg-red-500/10 border-red-500/30 text-red-400",
                        badge: "bg-red-500/20 text-red-300 border-red-500/40",
                        icon: Flame,
                        label: "HOT LEAD",
                        desc: "High buyer readiness, premium budget or active scheduled viewing. Immediate outreach recommended."
                      },
                      WARM: {
                        bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
                        badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                        icon: Sparkles,
                        label: "WARM LEAD",
                        desc: "Active interest, mid-term purchase timeline (within 3 months). Nurture with curated listings."
                      },
                      COLD: {
                        bg: "bg-blue-500/10 border-blue-500/30 text-blue-400",
                        badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                        icon: Snowflake,
                        label: "COLD LEAD",
                        desc: "Early exploratory stage or lower engagement. Automated updates and drip follow-up recommended."
                      }
                    }[temp];
                    const TempIcon = tempConfig.icon;

                    return (
                      <div className={`p-4 rounded-2xl border ${tempConfig.bg} space-y-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${tempConfig.badge}`}>
                              <TempIcon className="w-3.5 h-3.5" />
                              {tempConfig.label}
                            </span>
                            <span className="text-xs font-mono text-zinc-400">
                              Lead Score: <strong className="text-white font-bold">{score}</strong>/100
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400">
                            Territory: <strong className="text-zinc-200">{selectedCustomer.locality || "All Territories"}</strong>
                          </span>
                        </div>

                        {/* Visual Score Bar */}
                        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              temp === "HOT"
                                ? "bg-gradient-to-r from-orange-500 to-red-500"
                                : temp === "WARM"
                                ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                                : "bg-gradient-to-r from-blue-400 to-cyan-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
                          />
                        </div>

                        <p className="text-xs text-zinc-300">
                          {tempConfig.desc}
                        </p>
                      </div>
                    );
                  })()}

                  <div className="p-5 rounded-2xl bg-[#111319] border border-zinc-800 space-y-4">
                    <h3 className="font-bold text-sm text-white uppercase font-mono tracking-wider text-[#C5A869] flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Requirements Captured via Customer Tab
                    </h3>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-500 uppercase font-mono text-[10px] block">Location</span>
                        <span className="font-bold text-white">{selectedCustomer.locality || "Any Community"}, {selectedCustomer.city}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-500 uppercase font-mono text-[10px] block">Target Budget</span>
                        <span className="font-bold text-[#E1CB8E] font-mono">
                          {selectedCustomer.budget_min && selectedCustomer.budget_max
                            ? `${formatCurrency(selectedCustomer.budget_min, currency)} – ${formatCurrency(selectedCustomer.budget_max, currency)}`
                            : selectedCustomer.budget_max
                            ? `Up to ${formatCurrency(selectedCustomer.budget_max, currency)}`
                            : "Flexible"}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-500 uppercase font-mono text-[10px] block">Layout / Type</span>
                        <span className="font-bold text-white">
                          {selectedCustomer.bhk ? `${selectedCustomer.bhk} BHK ` : ""}{selectedCustomer.property_type}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-500 uppercase font-mono text-[10px] block">Move-in Timeline</span>
                        <span className="font-bold text-white">{selectedCustomer.purchase_timeline || "Exploratory"}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-500 uppercase font-mono text-[10px] block">Purchase Purpose</span>
                        <span className="font-bold text-white">{selectedCustomer.purpose || "Investment"}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-500 uppercase font-mono text-[10px] block">Assigned Salesperson</span>
                        <span className="font-bold text-white">{selectedCustomer.assigned_agent_name || activeSalespersonName}</span>
                      </div>
                    </div>

                    {selectedCustomer.preferred_features && selectedCustomer.preferred_features.length > 0 && (
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-2">Preferred Amenities &amp; Features:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCustomer.preferred_features.map((f, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedCustomer.notes && (
                      <div className="pt-2 border-t border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">Customer Inquiry Notes:</span>
                        <p className="text-xs text-zinc-300 italic bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                          "{selectedCustomer.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: CUSTOMER ACTIVITY TRACKING (Feature 3) */}
              {drawerTab === "activity" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-zinc-900 border border-blue-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase font-mono block">Active Engagement Time</span>
                      <span className="text-xl font-black text-white font-mono mt-0.5 block">
                        {totalEngagementTimeFormatted}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-zinc-400 uppercase font-mono block">Events Logged</span>
                      <span className="text-xl font-black text-[#E1CB8E] font-mono mt-0.5 block">
                        {selectedCustomerActivities.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedCustomerActivities.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-xs bg-[#111319] rounded-2xl border border-zinc-800">
                        No browsing events recorded for this customer yet.
                      </div>
                    ) : (
                      selectedCustomerActivities.map((act) => (
                        <div key={act.id} className="p-3.5 rounded-xl bg-[#141620] border border-zinc-800/80 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white uppercase text-[10px] font-mono tracking-wider text-[#C5A869]">
                              {act.activity_type.replace("_", " ")}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {formatDualTime(act.timestamp)}
                            </span>
                          </div>

                          <div className="text-zinc-200">
                            {act.property_title && <span>Viewed <strong>{act.property_title}</strong></span>}
                            {act.property_locality && <span className="text-zinc-400"> ({act.property_locality})</span>}
                            {act.search_query && <span>Searched for: "<em>{act.search_query}</em>"</span>}
                            {act.details && <span>{act.details}</span>}
                          </div>

                          {act.time_spent_seconds && (
                            <div className="text-[10px] font-mono text-blue-300">
                              Active browsing duration: {act.time_spent_seconds} seconds
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 3: PROPERTY RECOMMENDATIONS (Feature 6: Real Records) */}
              {drawerTab === "recommendations" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl bg-[#111319] border border-zinc-800 text-xs text-zinc-400">
                    Showing actual verified Dubai properties algorithmically matched to this customer's requirements.
                  </div>

                  <div className="space-y-4">
                    {matchedRealProperties.map(({ property, match_score, reasons }) => (
                      <div key={property.id} className="p-4 rounded-2xl bg-[#141620] border border-zinc-800 hover:border-[#C5A869]/50 transition flex flex-col sm:flex-row gap-4 shadow-md">
                        <div className="w-full sm:w-36 h-28 rounded-xl overflow-hidden bg-zinc-900 shrink-0 relative">
                          <img
                            src={getPropertyImageUrl(property.image_url, property.locality, property.city, property.id)}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#C5A869] text-black font-mono">
                            {match_score}% Match
                          </span>
                        </div>

                        <div className="flex-1 space-y-1.5">
                          <span className="text-[10px] text-[#C5A869] font-mono uppercase block">
                            {property.locality}, {property.city} • Demo #{property.id}
                          </span>
                          <h4 className="font-bold text-white text-sm line-clamp-1">{property.title}</h4>
                          <p className="text-sm font-black text-[#E1CB8E] font-mono">
                            {formatCurrency(property.price, currency)} • {property.bhk} BHK • {property.super_area_sqft} sqft
                          </p>

                          <div className="space-y-1 pt-1 text-[11px] text-zinc-300">
                            {reasons.map((r, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNewVisitPropId(property.id);
                                setDrawerTab("visits");
                              }}
                              className="px-3 py-1 rounded-lg bg-[#C5A869] text-black font-bold text-xs hover:bg-[#E1CB8E] transition"
                            >
                              Schedule Viewing for This
                            </button>
                            <Link
                              href={`/properties/${property.id}`}
                              target="_blank"
                              className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700 transition"
                            >
                              Open Listing →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB 4: FOLLOW-UPS & REMINDERS (Feature 5) */}
              {drawerTab === "followups" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Add Follow-Up Form */}
                  <form onSubmit={handleAddFollowUp} className="p-4 rounded-2xl bg-[#111319] border border-zinc-800 space-y-3">
                    <h4 className="font-bold text-xs text-white uppercase font-mono text-[#C5A869]">
                      Add Follow-Up Note &amp; Reminder
                    </h4>

                    <div>
                      <textarea
                        required
                        rows={2}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Log contact outcome or next scheduled step with customer..."
                        className="w-full bg-[#181B24] border border-[#262A36] focus:border-[#C5A869] rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Contact Channel</label>
                        <select
                          value={newNoteType}
                          onChange={(e) => setNewNoteType(e.target.value as any)}
                          className="w-full bg-[#181B24] border border-[#262A36] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                        >
                          <option value="call">Phone Call</option>
                          <option value="whatsapp">WhatsApp Message</option>
                          <option value="email">Email</option>
                          <option value="meeting">In-Person Meeting</option>
                          <option value="general">Internal Note</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={newNoteDueDate}
                          onChange={(e) => setNewNoteDueDate(e.target.value)}
                          className="w-full bg-[#181B24] border border-[#262A36] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAddingFollowUp || !newNote.trim()}
                      className="w-full py-2.5 rounded-xl bg-[#C5A869] text-black font-bold text-xs hover:bg-[#E1CB8E] transition disabled:opacity-50 shadow"
                    >
                      {isAddingFollowUp ? "Saving..." : "+ Save Follow-up Note"}
                    </button>
                  </form>

                  {/* Existing Follow-ups for this Customer */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs text-zinc-400 uppercase font-mono">
                      Contact History &amp; Past Notes ({selectedCustomerFollowUps.length})
                    </h4>
                    {selectedCustomerFollowUps.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No notes logged for this customer yet.</p>
                    ) : (
                      selectedCustomerFollowUps.map(n => (
                        <div key={n.id} className="p-3.5 rounded-xl bg-[#141620] border border-zinc-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#E1CB8E] font-mono uppercase text-[10px]">{n.type} Note</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${n.status === "completed" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-300"}`}>
                              {n.status}
                            </span>
                          </div>
                          <p className="text-zinc-200">"{n.note}"</p>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1 border-t border-zinc-800/80">
                            <span>Due: {n.due_date.split("T")[0]}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleFollowUp(n.id, n.status)}
                              className="text-[#C5A869] hover:underline font-bold"
                            >
                              {n.status === "completed" ? "Mark Pending" : "Mark Completed ✓"}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 5: SITE VISITS (Feature 7) */}
              {drawerTab === "visits" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Schedule New Viewing Form */}
                  <form onSubmit={handleScheduleVisit} className="p-4 rounded-2xl bg-[#111319] border border-zinc-800 space-y-3">
                    <h4 className="font-bold text-xs text-white uppercase font-mono text-[#C5A869]">
                      Schedule Property Site Viewing
                    </h4>

                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Target Property</label>
                      <select
                        value={newVisitPropId}
                        onChange={(e) => setNewVisitPropId(Number(e.target.value))}
                        className="w-full bg-[#181B24] border border-[#262A36] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                      >
                        {dbProperties.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.locality} - AED {p.price.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Viewing Date</label>
                        <input
                          type="date"
                          required
                          value={newVisitDate}
                          onChange={(e) => setNewVisitDate(e.target.value)}
                          className="w-full bg-[#181B24] border border-[#262A36] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Time Slot</label>
                        <select
                          value={newVisitTime}
                          onChange={(e) => setNewVisitTime(e.target.value)}
                          className="w-full bg-[#181B24] border border-[#262A36] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                        >
                          <option value="10:00 AM">10:00 AM</option>
                          <option value="11:30 AM">11:30 AM</option>
                          <option value="02:00 PM">02:00 PM</option>
                          <option value="04:00 PM">04:00 PM</option>
                          <option value="06:00 PM">06:00 PM</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Special Escort Notes</label>
                      <input
                        type="text"
                        value={newVisitNotes}
                        onChange={(e) => setNewVisitNotes(e.target.value)}
                        placeholder="e.g. VIP chauffeur requested from client hotel..."
                        className="w-full bg-[#181B24] border border-[#262A36] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSchedulingVisit}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow"
                    >
                      {isSchedulingVisit ? "Booking..." : "Confirm & Schedule Tour"}
                    </button>
                  </form>

                  {/* Scheduled Visits for this Customer */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs text-zinc-400 uppercase font-mono">
                      Booked Tours for this Client ({selectedCustomerVisits.length})
                    </h4>
                    {selectedCustomerVisits.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No site visits scheduled for this customer yet.</p>
                    ) : (
                      selectedCustomerVisits.map(v => (
                        <div key={v.id} className="p-3.5 rounded-xl bg-[#141620] border border-zinc-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">{v.property_title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                              {v.status}
                            </span>
                          </div>
                          <div className="text-zinc-400 font-mono text-[11px]">
                            📅 {v.preferred_date} at {v.preferred_time}
                          </div>
                          {v.notes && <div className="text-zinc-300 italic">"{v.notes}"</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
