"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  User, 
  Sparkles, 
  Building2, 
  Heart, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ArrowRight,
  ClipboardList,
  Phone,
  Mail,
  Globe,
  Search,
  History,
  XCircle,
  AlertCircle,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  Bed,
  Bath,
  Maximize
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import ScheduleVisitModal from "@/components/ScheduleVisitModal";
import AuthModal from "@/components/AuthModal";
import RequirementFormModal from "@/components/RequirementFormModal";
import { 
  Property, 
  Lead, 
  SiteVisit, 
  User as UserType, 
  SearchHistoryItem 
} from "@/lib/types";
import { Currency, formatCurrency } from "@/lib/currency";
import { api } from "@/lib/api";
import { formatSystemDateTime, formatDualTime, getSystemTimezoneLabel } from "@/lib/timezone";
import { getPropertyImageUrl } from "@/lib/propertyImage";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("AED");
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [myVisits, setMyVisits] = useState<SiteVisit[]>([]);
  const [recommendedProperties, setRecommendedProperties] = useState<Property[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<"overview" | "recs" | "saved" | "visits" | "history">("overview");
  const [selectedLeadFilter, setSelectedLeadFilter] = useState<number | "all">("all");
  const [selectedVisitProperty, setSelectedVisitProperty] = useState<Property | null>(null);
  
  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);

  // Visit cancellation state
  const [cancellingVisitId, setCancellingVisitId] = useState<number | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("propai_user");
      let parsedUser: UserType | null = null;
      if (stored) {
        try {
          parsedUser = JSON.parse(stored);
          setCurrentUser(parsedUser);
        } catch {}
      }

      // If user is logged out, clear all profile data and keep all lists strictly empty
      if (!parsedUser) {
        setCurrentUser(null);
        setMyLeads([]);
        setRecommendedProperties([]);
        setSavedProperties([]);
        setMyVisits([]);
        setSearchHistory([]);
        setLoading(false);
        return;
      }

      // STRICT ENTERPRISE RULE: Staff members must NOT see customer dashboard!
      // Only real customers can see this page. Redirect staff to their portals:
      if (parsedUser.role === "agent") {
        router.replace("/sales");
        return;
      }
      if (parsedUser.role === "manager") {
        router.replace("/manager");
        return;
      }
      if (parsedUser.role === "admin") {
        router.replace("/admin");
        return;
      }

      // 1. Fetch user leads (all submitted requirements from 1st to multiple times)
      try {
        const leads = await api.getMyLeads();
        setMyLeads(leads || []);

        // Gather all recommended properties across all registered requirements
        const allRecProps: Property[] = [];
        if (leads && leads.length > 0) {
          for (const l of leads) {
            if (l.recommended_properties && l.recommended_properties.length > 0) {
              for (const r of l.recommended_properties) {
                if (!allRecProps.some(p => p.id === r.property.id)) {
                  allRecProps.push(r.property);
                }
              }
            } else if (l.locality) {
              try {
                const matchRes = await api.getProperties({ locality: l.locality, page_size: 4 });
                for (const m of matchRes.items) {
                  if (!allRecProps.some(p => p.id === m.id)) {
                    allRecProps.push(m);
                  }
                }
              } catch {}
            }
          }
        }
        setRecommendedProperties(allRecProps);
      } catch {
        setMyLeads([]);
        setRecommendedProperties([]);
      }

      // 2. Fetch user's saved properties
      try {
        const saved = await api.getSavedProperties();
        setSavedProperties(saved || []);
      } catch {
        setSavedProperties([]);
      }

      // 3. Fetch user's scheduled site visits (cancelled visits disappear and are removed)
      try {
        const visits = await api.getMySiteVisits();
        const activeVisits = (visits || []).filter(v => v.status !== "cancelled");
        setMyVisits(activeVisits);
      } catch {
        setMyVisits([]);
      }

      // 4. Fetch search and viewed property history with dates
      try {
        const history = await api.getSearchHistory();
        setSearchHistory(history || []);
      } catch {
        setSearchHistory([]);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  // Handle Cancel Site Visit (once cancelled, disappears and removed)
  const handleCancelVisit = async (visitId: number) => {
    if (!confirm("Are you sure you want to cancel this scheduled site visit? It will be removed from your scheduled visits.")) {
      return;
    }

    setCancellingVisitId(visitId);
    setCancelFeedback(null);
    try {
      await api.cancelSiteVisit(visitId);
      // Remove immediately so it disappears from the scheduled visits list
      setMyVisits(prev => prev.filter(v => v.id !== visitId));
      setCancelFeedback("Site visit has been successfully cancelled and removed from your scheduled visits.");
      setTimeout(() => setCancelFeedback(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to cancel site visit. Please try again.");
    } finally {
      setCancellingVisitId(null);
    }
  };

  // Filter recommendations based on selected requirement
  const displayedRecommendations = React.useMemo(() => {
    if (selectedLeadFilter === "all") {
      return recommendedProperties;
    }
    const targetLead = myLeads.find(l => l.id === selectedLeadFilter);
    if (!targetLead || !targetLead.recommended_properties) {
      return recommendedProperties;
    }
    return targetLead.recommended_properties.map(r => r.property);
  }, [selectedLeadFilter, myLeads, recommendedProperties]);

  // Deduplicate search history by property or query to never repeat same property in UI
  const uniqueSearchHistory = React.useMemo(() => {
    const map = new Map<string, typeof searchHistory[0]>();
    for (const item of searchHistory) {
      const key = item.property_id 
        ? `prop_${item.property_id}` 
        : `query_${item.search_query || item.property_title || item.locality || item.id}`;
      if (!map.has(key)) {
        map.set(key, { ...item, visit_count: item.visit_count || 1 });
      } else {
        const existing = map.get(key)!;
        existing.visit_count = (existing.visit_count || 1) + (item.visit_count || 1);
        if (new Date(item.created_at).getTime() > new Date(existing.created_at).getTime()) {
          existing.created_at = item.created_at;
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [searchHistory]);

  const lastSearchedItem = uniqueSearchHistory.length > 0 ? uniqueSearchHistory[0] : null;

  return (
    <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col selection:bg-[#C5A869]/30">
      <Navbar
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        onOpenAuth={(mode) => {
          if (mode) setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-[#C5A869] uppercase tracking-wider">
                Client Portal
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/30">
                {currentUser ? "Registered Member" : "Guest View"}
              </span>
              {myLeads.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  {myLeads.length} {myLeads.length === 1 ? "Requirement" : "Requirements"} Active
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {currentUser ? `Welcome back, ${currentUser.full_name}` : "Welcome to Lyka Realty Concierge"}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {currentUser 
                ? "Your real-time personalized property requirements, AI matches, viewing history, and site visits."
                : "Create or log in to your account to track property searches, requirements, and scheduled tours."}
            </p>

            {currentUser && (
              <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-zinc-400">
                {currentUser.email && (
                  <span className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                    <Mail className="w-3.5 h-3.5 text-[#C5A869]" />
                    {currentUser.email}
                  </span>
                )}
                {currentUser.phone && (
                  <span className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                    <Phone className="w-3.5 h-3.5 text-[#C5A869]" />
                    {currentUser.phone}
                  </span>
                )}
                {currentUser.country && (
                  <span className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                    <Globe className="w-3.5 h-3.5 text-[#C5A869]" />
                    {currentUser.country}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Signed In • {getSystemTimezoneLabel()}
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] text-[#E1CB8E] font-mono">
                  <Clock className="w-3 h-3 text-[#C5A869]" />
                  Database Time: Dubai (GST UTC+4)
                </span>
                {currentUser.created_at && (
                  <span className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] text-zinc-300 font-mono">
                    <Clock className="w-3 h-3 text-[#C5A869]" />
                    Account Created: {formatDualTime(currentUser.created_at)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!currentUser && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition border border-zinc-700"
              >
                Sign In / Register
              </button>
            )}
            <button
              onClick={() => setRequirementModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#141722] to-[#1C1F2E] hover:border-[#C5A869] border border-[#C5A869]/40 text-[#E1CB8E] font-semibold text-xs transition shadow"
            >
              <PlusCircle className="w-4 h-4 text-[#C5A869]" />
              <span>{myLeads.length > 0 ? "+ Add Additional Requirement Form" : "Fill Requirement Form"}</span>
            </button>
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] text-black font-bold text-xs shadow-md hover:opacity-95 transition"
            >
              <Sparkles className="w-4 h-4 fill-black" />
              <span>Chat with AI Advisor</span>
            </Link>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {cancelFeedback && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{cancelFeedback}</span>
            </div>
            <button onClick={() => setCancelFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Last Searched Property Quick Banner (Requirement 1) */}
        {lastSearchedItem && (
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#151722] to-[#111319] border border-[#C5A869]/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
            <Link
              href={lastSearchedItem.property?.id ? `/properties/${lastSearchedItem.property.id}` : `/properties?locality=${encodeURIComponent(lastSearchedItem.locality || "")}`}
              className="flex items-center gap-3.5 group flex-1"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-[#C5A869]/30 flex-shrink-0 relative">
                <img
                  src={getPropertyImageUrl(lastSearchedItem.property?.image_url, lastSearchedItem.locality, lastSearchedItem.property?.city, lastSearchedItem.property?.id || lastSearchedItem.id)}
                  alt="Property"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-[#E1CB8E] uppercase tracking-wider font-mono">
                    Last Searched Property
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40 font-bold">
                    Visited {lastSearchedItem.visit_count || 1}x
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    • Last viewed: {formatDualTime(lastSearchedItem.created_at)}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#E1CB8E] transition mt-0.5">
                  {lastSearchedItem.property?.title || lastSearchedItem.property_title || (lastSearchedItem.locality ? `${lastSearchedItem.locality} Properties` : "Luxury Property Search")}
                </h4>
                <p className="text-xs text-zinc-400">
                  {lastSearchedItem.locality || "Dubai"} {lastSearchedItem.bhk ? `• ${lastSearchedItem.bhk} BHK` : ""} {lastSearchedItem.price ? `• AED ${lastSearchedItem.price.toLocaleString()}` : ""}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 flex-shrink-0">
              {lastSearchedItem.property && (
                <Link
                  href={`/properties/${lastSearchedItem.property.id}`}
                  className="px-3.5 py-1.5 rounded-lg bg-[#C5A869] text-black font-semibold text-xs transition hover:bg-[#E1CB8E] shadow"
                >
                  View Property Details →
                </Link>
              )}
              <button
                onClick={() => setActiveTab("history")}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition"
              >
                All Search History ({uniqueSearchHistory.length})
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 my-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Overview &amp; Requirements ({myLeads.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recs")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "recs"
                ? "bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Recommendations ({recommendedProperties.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("visits")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "visits"
                ? "bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Scheduled Site Visits ({myVisits.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "saved"
                ? "bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Saved Properties ({savedProperties.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Previously Searched ({uniqueSearchHistory.length})</span>
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            {/* Top Overview Cards (Requirement Overview + Concierge Desk) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Client Portfolio Overview */}
              <div className="p-6 rounded-3xl bg-[#111319] border border-[#C5A869]/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#C5A869]" />
                    <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                      Portfolio Requirements Overview
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#E1CB8E] bg-[#C5A869]/15 px-2.5 py-0.5 rounded-full border border-[#C5A869]/30">
                    {myLeads.length} {myLeads.length === 1 ? "Requirement" : "Requirements"} Registered
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-400 uppercase font-mono">Inquiries</p>
                    <p className="text-xl font-black text-white mt-0.5">{myLeads.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-400 uppercase font-mono">Scheduled Tours</p>
                    <p className="text-xl font-black text-white mt-0.5">{myVisits.filter(v => v.status !== "cancelled").length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-400 uppercase font-mono">AI Matches</p>
                    <p className="text-xl font-black text-[#E1CB8E] mt-0.5">{recommendedProperties.length}</p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-zinc-400">
                    Looking for another investment or second residence?
                  </p>
                  <button
                    type="button"
                    onClick={() => setRequirementModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#C5A869] text-black font-bold text-xs hover:bg-[#E1CB8E] transition shadow"
                  >
                    + Add An Additional Requirement Form
                  </button>
                </div>
              </div>

              {/* Card 2: Dedicated Concierge Desk */}
              <div className="p-6 rounded-3xl bg-[#111319] border border-zinc-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                      Dedicated Advisory Concierge
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Support
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#C5A869]/20 text-[#E1CB8E] flex items-center justify-center font-bold text-xs border border-[#C5A869]/30">
                      LR
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Lyka Realty Concierge Desk</p>
                      <p className="text-[10px] text-[#C5A869]">Private Office • Barsha Heights, Dubai</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Assigned advisory specialist for all your registered property requirements, off-market opportunities, and private escort site tours.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href="https://wa.me/971501234567"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition text-center"
                  >
                    Direct WhatsApp Concierge
                  </a>
                  <a
                    href="tel:+97144567890"
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition border border-zinc-700 text-center"
                  >
                    Call Concierge
                  </a>
                </div>
              </div>
            </div>

            {/* Registered Requirements List (All submissions from 1st to multiple times) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#C5A869]" /> Registered Property Requirements
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    All property requirements registered under your account from 1st time to multiple inquiries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequirementModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[#E1CB8E] font-semibold text-xs border border-zinc-700 transition"
                >
                  <PlusCircle className="w-4 h-4 text-[#C5A869]" />
                  <span>Add Another Property Requirement</span>
                </button>
              </div>

              {myLeads.length === 0 ? (
                /* Only shown when user has literally 0 requirements */
                <div className="p-10 rounded-3xl bg-[#111319] border border-zinc-800 text-center space-y-4 max-w-2xl mx-auto shadow-2xl">
                  <div className="w-14 h-14 rounded-full bg-[#C5A869]/15 text-[#E1CB8E] flex items-center justify-center mx-auto border border-[#C5A869]/30">
                    <ClipboardList className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">No Property Requirements Registered Yet</h3>
                    <p className="text-xs text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                      Submit your target community, budget range, and preferred layout to receive real-time AI property recommendations.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setRequirementModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-[#C5A869] text-black font-bold text-xs hover:bg-[#E1CB8E] transition shadow"
                    >
                      Fill Requirements Form
                    </button>
                  </div>
                </div>
              ) : (
                /* User has 1 or multiple requirements: render list from 1st to Nth */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myLeads.map((lead, idx) => {
                    const reqNum = myLeads.length - idx;
                    const dateStr = lead.created_at
                      ? formatDualTime(lead.created_at)
                      : "Recently Added";

                    return (
                      <div
                        key={lead.id}
                        className="p-5 rounded-2xl bg-[#111319] border border-zinc-800 hover:border-[#C5A869]/50 transition-all shadow-lg space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#C5A869]/20 text-[#E1CB8E] flex items-center justify-center font-mono font-bold text-xs border border-[#C5A869]/40">
                              #{reqNum}
                            </span>
                            <h4 className="font-bold text-white text-sm">
                              {lead.bhk ? `${lead.bhk} BHK ` : ""}{lead.property_type || "Residence"}
                            </h4>
                          </div>
                          <span className="text-[11px] text-[#E1CB8E] font-mono bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-zinc-800">
                            Registered: {dateStr}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Location</span>
                            <span className="text-white font-medium">{lead.locality || "Any Community"}, {lead.city || "Dubai"}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Budget</span>
                            <span className="text-[#E1CB8E] font-medium font-mono">
                              {lead.budget_min || lead.budget_max
                                ? `${lead.budget_min ? formatCurrency(lead.budget_min, currency) : "Any"} – ${lead.budget_max ? formatCurrency(lead.budget_max, currency) : "Any"}`
                                : "Flexible"}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Timeline</span>
                            <span className="text-zinc-300 font-medium">{lead.purchase_timeline || "Flexible"}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Purpose</span>
                            <span className="text-zinc-300 font-medium">{lead.purpose || lead.lead_type || "Investment"}</span>
                          </div>
                        </div>

                        {lead.preferred_features && lead.preferred_features.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {lead.preferred_features.slice(0, 4).map((f, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800">
                                {f}
                              </span>
                            ))}
                            {lead.preferred_features.length > 4 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400">
                                +{lead.preferred_features.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
                          <span className="text-xs text-[#E1CB8E] font-medium flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-[#C5A869]" />
                            {lead.recommended_properties?.length || 0} Matched Listings
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeadFilter(lead.id);
                              setActiveTab("recs");
                            }}
                            className="text-xs text-[#C5A869] hover:underline font-semibold flex items-center gap-1"
                          >
                            View Matches →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Top Recommendations Section */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#C5A869]" /> AI Top Recommendations For You
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Curated luxury inventory algorithmically matched to your registered preferences.
                  </p>
                </div>
                {recommendedProperties.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedLeadFilter("all");
                      setActiveTab("recs");
                    }}
                    className="text-xs font-semibold text-[#E1CB8E] hover:underline"
                  >
                    View All ({recommendedProperties.length})
                  </button>
                )}
              </div>

              {recommendedProperties.length === 0 ? (
                <div className="p-8 text-center bg-[#111319] rounded-2xl border border-zinc-800 text-zinc-400 text-xs">
                  <Building2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="font-semibold text-zinc-300">No Matched Properties Yet</p>
                  <p className="mt-1 max-w-sm mx-auto text-zinc-500">
                    Tell our AI Advisor what properties you are searching for or submit a requirement above to view tailored matches.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendedProperties.slice(0, 3).map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      currency={currency}
                      onScheduleVisit={(p) => setSelectedVisitProperty(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI RECS TAB */}
        {activeTab === "recs" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C5A869]" /> AI Matched Recommendations
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Algorithmic inventory matches tailored to your specific submitted requirements.
                </p>
              </div>

              {/* Requirement Filter Pills (Requirement 5) */}
              {myLeads.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedLeadFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      selectedLeadFilter === "all"
                        ? "bg-[#C5A869] text-black shadow"
                        : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                    }`}
                  >
                    All Requirements ({recommendedProperties.length})
                  </button>
                  {myLeads.map((lead, idx) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLeadFilter(lead.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        selectedLeadFilter === lead.id
                          ? "bg-[#C5A869] text-black shadow"
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      Req #{myLeads.length - idx} ({lead.locality || lead.property_type})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {displayedRecommendations.length === 0 ? (
              <div className="p-12 text-center bg-[#111319] rounded-3xl border border-zinc-800 space-y-3">
                <Sparkles className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Recommendations Found</h3>
                <p className="text-zinc-400 text-xs max-w-md mx-auto">
                  Submit additional property requirements or broaden your budget criteria to unlock more matched Dubai properties.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setRequirementModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#C5A869] text-black text-xs font-bold hover:bg-[#E1CB8E] transition"
                  >
                    + Add An Additional Requirement Form
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedRecommendations.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    currency={currency}
                    onScheduleVisit={(p) => setSelectedVisitProperty(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SITE VISITS TAB (Requirement 2: Cancel Site Visit Button near Contact Escort) */}
        {activeTab === "visits" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#C5A869]" /> Scheduled VIP Site Visits
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Track and manage your upcoming private property viewings and client escort services.
                </p>
              </div>
            </div>

            {myVisits.length === 0 ? (
              <div className="p-12 text-center bg-[#111319] rounded-3xl border border-zinc-800 space-y-3">
                <Calendar className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Visits Scheduled Yet</h3>
                <p className="text-zinc-400 text-xs">
                  Schedule a private viewing from any property detail page or from your AI recommended listings.
                </p>
                <Link 
                  href="/properties" 
                  className="inline-block px-5 py-2 rounded-xl bg-[#C5A869] text-black text-xs font-semibold hover:bg-[#E1CB8E] transition"
                >
                  Browse Verified Listings
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myVisits.map((visit) => {
                  const isCancelled = visit.status === "cancelled";
                  const isPending = visit.status === "pending";
                  const isConfirmed = visit.status === "confirmed";

                  return (
                    <div
                      key={visit.id}
                      className="p-5 rounded-2xl bg-[#111319] border border-zinc-800 hover:border-[#C5A869]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase font-mono ${
                            isConfirmed
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}>
                            {visit.status}
                          </span>
                          <span className="text-xs text-zinc-300 font-mono flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#C5A869]" />
                            Tour: {visit.preferred_date} at {visit.preferred_time}
                          </span>
                          {visit.created_at && (
                            <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                              <Clock className="w-3 h-3 text-[#C5A869]" />
                              Scheduled: {formatDualTime(visit.created_at)}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-white text-base">
                          {visit.property?.title || `Property #${visit.property_id}`}
                        </h3>
                        <p className="text-xs text-zinc-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                          {visit.property?.locality || "Dubai"}, {visit.property?.city || "UAE"}
                        </p>

                        {visit.notes && (
                          <p className="text-[11px] text-zinc-500 italic">
                            Notes: "{visit.notes}"
                          </p>
                        )}
                      </div>

                      {/* Action Buttons: Contact Escort & Cancel Visit (Requirement 2) */}
                      <div className="flex flex-wrap items-center gap-2 sm:self-center">
                        <a
                          href="https://wa.me/971501234567"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Contact Escort</span>
                        </a>

                        <button
                          type="button"
                          disabled={cancellingVisitId === visit.id}
                          onClick={() => handleCancelVisit(visit.id)}
                          className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white font-semibold text-xs border border-red-800/80 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>{cancellingVisitId === visit.id ? "Cancelling..." : "Cancel Schedule Site Visit"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SAVED PROPERTIES TAB */}
        {activeTab === "saved" && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" /> Saved Properties
            </h2>
            {savedProperties.length === 0 ? (
              <div className="p-12 text-center bg-[#111319] rounded-3xl border border-zinc-800 space-y-3">
                <Heart className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Saved Properties Yet</h3>
                <p className="text-zinc-400 text-xs">Click the heart icon on any property card to save it for quick review.</p>
                <Link href="/properties" className="inline-block px-5 py-2 rounded-xl bg-[#C5A869] text-black text-xs font-semibold hover:bg-[#E1CB8E] transition">
                  Browse Properties
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    currency={currency}
                    isSaved={true}
                    onScheduleVisit={(p) => setSelectedVisitProperty(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* PREVIOUSLY SEARCHED TAB */}
        {activeTab === "history" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-[#C5A869]" /> Previously Searched Properties
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                History of properties you explored with real-time viewing history. Click any property card to view its full details.
              </p>
            </div>

            {uniqueSearchHistory.length === 0 ? (
              <div className="p-12 text-center bg-[#111319] rounded-3xl border border-zinc-800 space-y-3">
                <Search className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Search History Recorded</h3>
                <p className="text-zinc-400 text-xs max-w-sm mx-auto">
                  Explore properties or use filters in the property catalog to automatically record your searches and view them here.
                </p>
                <Link
                  href="/properties"
                  className="inline-block px-5 py-2 rounded-xl bg-[#C5A869] text-black text-xs font-semibold hover:bg-[#E1CB8E] transition"
                >
                  Explore Properties
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uniqueSearchHistory.map((item) => {
                  const visitCount = item.visit_count || 1;
                  const propId = item.property?.id || item.property_id;
                  const propHref = propId ? `/properties/${propId}` : `/properties?locality=${encodeURIComponent(item.locality || "")}`;
                  const title = item.property?.title || item.property_title || (item.locality ? `${item.locality} Luxury Property` : "Dubai Luxury Residence");
                  const locality = item.locality || item.property?.locality || "Dubai";
                  const city = item.property?.city || "Dubai";
                  const bhk = item.bhk !== undefined && item.bhk !== null ? item.bhk : item.property?.bhk;
                  const price = item.price || item.property?.price;
                  const pType = item.property?.property_type || "Luxury Property";
                  const imageUrl = getPropertyImageUrl(item.property?.image_url, locality, city, propId || item.id);

                  return (
                    <Link
                      key={item.id}
                      href={propHref}
                      className="group relative bg-[#111319] rounded-2xl border border-[#232733] hover:border-[#C5A869]/70 shadow-xl hover:shadow-[0_12px_36px_rgba(0,0,0,0.6)] transition-all duration-300 flex flex-col overflow-hidden"
                    >
                      {/* Property Image & Real-time Overlays */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1 pointer-events-none">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#C5A869] text-black shadow-md">
                            Visited times: {visitCount} ({visitCount}x)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-black/70 text-white backdrop-blur-md border border-white/20">
                            {pType}
                          </span>
                        </div>

                        {/* Bottom Real-time Timestamp Overlay */}
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-[#E1CB8E] font-mono">
                          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                            <Clock className="w-3 h-3 text-[#C5A869]" />
                            {formatDualTime(item.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <MapPin className="w-3.5 h-3.5 text-[#C5A869] flex-shrink-0" />
                            <span className="truncate">{locality}, {city}</span>
                          </div>

                          <h3 className="font-bold text-white text-base leading-snug group-hover:text-[#E1CB8E] transition-colors line-clamp-2">
                            {title}
                          </h3>

                          {/* Specifications Row */}
                          <div className="flex items-center gap-3 pt-1 text-xs text-zinc-300 font-mono">
                            {bhk !== undefined && bhk !== null && (
                              <span className="flex items-center gap-1">
                                <Bed className="w-3.5 h-3.5 text-[#C5A869]" />
                                {bhk === 0 ? "Studio" : `${bhk} BHK`}
                              </span>
                            )}
                            {item.property?.bathrooms && (
                              <span className="flex items-center gap-1">
                                <Bath className="w-3.5 h-3.5 text-[#C5A869]" />
                                {item.property.bathrooms} Baths
                              </span>
                            )}
                            {item.property?.super_area_sqft && (
                              <span className="flex items-center gap-1">
                                <Maximize className="w-3.5 h-3.5 text-[#C5A869]" />
                                {Math.round(item.property.super_area_sqft).toLocaleString()} sqft
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price & Action Row */}
                        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-mono block">Price</span>
                            <span className="text-base font-extrabold text-white font-sans">
                              {price ? formatCurrency(price, currency) : "Price on Request"}
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#C5A869]/20 group-hover:bg-[#C5A869] text-[#E1CB8E] group-hover:text-black font-bold text-xs transition shadow">
                            View Property →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Modals */}
      <ScheduleVisitModal
        property={selectedVisitProperty}
        isOpen={!!selectedVisitProperty}
        onClose={() => setSelectedVisitProperty(null)}
        onRequireRegister={() => {
          setSelectedVisitProperty(null);
          setAuthModalMode("register");
          setAuthModalOpen(true);
        }}
        onSuccess={async () => {
          try {
            const v = await api.getMySiteVisits();
            setMyVisits(v || []);
            setActiveTab("visits");
          } catch {}
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />

      <RequirementFormModal
        isOpen={requirementModalOpen}
        onClose={() => setRequirementModalOpen(false)}
        onSuccess={async (createdLead) => {
          try {
            // Refresh all requirements for this user
            const leads = await api.getMyLeads();
            setMyLeads(leads || []);

            // Refresh recommendations
            const allRecProps: Property[] = [];
            for (const l of (leads || [])) {
              if (l.recommended_properties && l.recommended_properties.length > 0) {
                for (const r of l.recommended_properties) {
                  if (!allRecProps.some(p => p.id === r.property.id)) {
                    allRecProps.push(r.property);
                  }
                }
              }
            }
            if (allRecProps.length > 0) {
              setRecommendedProperties(allRecProps);
            }

            setActiveTab("overview");
          } catch {}
        }}
      />
    </div>
  );
}
