"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ArrowRight, 
  Mic, 
  Building2, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Search, 
  CheckCircle2, 
  Cpu, 
  SlidersHorizontal,
  ChevronRight,
  Flame,
  Zap,
  Globe,
  Award
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import ScheduleVisitModal from "@/components/ScheduleVisitModal";
import AuthModal from "@/components/AuthModal";
import { Property } from "@/lib/types";
import { Currency } from "@/lib/currency";
import { api } from "@/lib/api";

export default function LandingPage() {
  const [currency, setCurrency] = useState<Currency>("AED");
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [selectedPropertyForVisit, setSelectedPropertyForVisit] = useState<Property | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");



  useEffect(() => {
    // Fetch initial featured properties
    const fetchFeatured = async () => {
      try {
        const res = await api.getProperties({
          city: "Dubai",
          page_size: 6
        });
        if (res && res.items) {
          setFeaturedProperties(res.items);
        }
      } catch (err) {
        console.warn("Could not load featured properties on initial render, retrying...", err);
        setTimeout(async () => {
          try {
            const retryRes = await api.getProperties({
              city: "Dubai",
              page_size: 6
            });
            if (retryRes && retryRes.items) {
              setFeaturedProperties(retryRes.items);
            }
          } catch {}
        }, 1500);
      }
    };
    fetchFeatured();
  }, []);

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

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden border-b border-[#1E222D]">
          {/* Ambient Gold Glow Backgrounds */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-[#C5A869]/15 via-[#9E8042]/10 to-transparent blur-3xl pointer-events-none rounded-full" />
          <div className="absolute top-10 right-10 w-96 h-96 bg-amber-500/5 blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              {/* Brand Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A869]" />
                <span>Lyka Realty • Next-Gen AI Real Estate Intelligence</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] font-sans">
                Find Your Perfect Property with{" "}
                <span className="bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] bg-clip-text text-transparent">
                  AI
                </span>
              </h1>

              <p className="text-zinc-300 text-lg sm:text-xl font-normal leading-relaxed max-w-2xl mx-auto">
                Tell our AI what you need. We understand your requirements, analyze your lifestyle preferences, 
                and recommend properties that match your budget, location and lifestyle.
              </p>

              {/* Primary and Secondary CTA Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/assistant"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-black font-bold text-base bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] hover:opacity-95 shadow-[0_0_25px_rgba(197,168,105,0.4)] transition-all transform active:scale-95"
                >
                  <Sparkles className="w-5 h-5 fill-black" />
                  <span>Talk to AI</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <Link
                  href="/properties"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-zinc-200 font-semibold text-base bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-700/80 hover:border-zinc-500 transition-all"
                >
                  <Building2 className="w-5 h-5 text-[#C5A869]" />
                  <span>Explore Properties</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-8 grid grid-cols-3 gap-6 border-t border-zinc-800/80 max-w-2xl mx-auto text-center">
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">1,900+</p>
                  <p className="text-xs text-zinc-400 mt-1">Verified Dubai Listings</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#E1CB8E] font-mono">98.4%</p>
                  <p className="text-xs text-zinc-400 mt-1">AI Match Accuracy</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">AED & ₹</p>
                  <p className="text-xs text-zinc-400 mt-1">Multi-Currency Engine</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="py-20 bg-[#0B0C10] border-b border-[#1E222D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#C5A869]">
                Interactive Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                How PropAI Delivers Personalized Real Estate Intelligence
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base">
                Experience seamless discovery driven by natural conversational language, 
                explainable matching algorithms, and personalized luxury recommendations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  title: "Speak or Type",
                  desc: "Use voice or natural text to describe what you're looking for, in your own words without rigid dropdowns.",
                  icon: Mic
                },
                {
                  step: "02",
                  title: "NLP Requirement Extraction",
                  desc: "PropAI parses localities, budgets, BHKs, timelines, and amenities into structured data without inventing missing fields.",
                  icon: Cpu
                },
                {
                  step: "03",
                  title: "Smart Inventory Matching",
                  desc: "PropAI scans verified Dubai listings against your exact budget, layout, locality, and lifestyle requirements in real time.",
                  icon: TrendingUp
                },
                {
                  step: "04",
                  title: "Explainable Recommendations",
                  desc: "Receive top inventory ranked with transparent percentage scores and clear reasons explaining why each property fits.",
                  icon: Sparkles
                }
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="relative p-6 rounded-2xl bg-[#111319] border border-[#232733] hover:border-[#C5A869]/50 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-black text-[#C5A869]/40 group-hover:text-[#C5A869] transition font-mono">
                          {item.step}
                        </span>
                        <div className="p-2.5 rounded-xl bg-[#191B24] group-hover:bg-[#C5A869]/20 transition text-[#C5A869]">
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FEATURED PROPERTIES SECTION */}
        <section className="py-20 bg-[#090A0D] border-b border-[#1E222D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#C5A869] block mb-2">
                  Prime Portfolio
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                  Featured Residences & Investments
                </h2>
                <p className="text-zinc-400 text-sm mt-1 max-w-xl">
                  Explore verified secondary and off-plan assets in Dubai.
                </p>
              </div>

            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((prop) => (
                <PropertyCard
                  key={prop.id}
                  property={prop}
                  currency={currency}
                  onScheduleVisit={(p) => setSelectedPropertyForVisit(p)}
                />
              ))}
            </div>

            {/* View All CTA */}
            <div className="text-center mt-12">
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-[#C5A869] transition"
              >
                <span>Browse All 1,900+ Available Properties</span>
                <ArrowRight className="w-4 h-4 text-[#C5A869]" />
              </Link>
            </div>
          </div>
        </section>

        {/* DUAL VALUE PROPOSITIONS: CUSTOMER & REAL ESTATE AGENT */}
        <section className="py-20 bg-[#0B0C10] border-b border-[#1E222D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Customer Benefits Card */}
              <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#12141D] to-[#0A0B0E] border border-zinc-800 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 mb-4">
                    <Users className="w-3.5 h-3.5" /> For Property Buyers & NRI Investors
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                    Natural Property Search With Zero Friction
                  </h3>
                  <ul className="space-y-3.5 text-zinc-300 text-sm mb-8">
                    {[
                      "Speak naturally or type casually in English or conversational terms.",
                      "Never get spammed with irrelevant listings outside your budget or timeline.",
                      "Transparent explainability: understand why each property is recommended.",
                      "Seamlessly convert AED to INR for cross-border UAE and India investment decisions.",
                      "Book private chauffeur viewings and VIP site visits in one click."
                    ].map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#E1CB8E] hover:text-white transition"
                >
                  Start Your Advisory Session <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Real Estate Agent Benefits Card */}
              <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#16141D] to-[#0D0B12] border border-[#C5A869]/30 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/40 mb-4">
                    <ShieldCheck className="w-3.5 h-3.5" /> For Real Estate Agents & Brokers
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                    Automated Lead Qualification & High-Intent Pipeline
                  </h3>
                  <ul className="space-y-3.5 text-zinc-300 text-sm mb-8">
                    {[
                      "Instant Hot/Warm/Cold lead scoring eliminates wasted hours on low-intent inquiries.",
                      "AI auto-generates comprehensive lead summaries before you pick up the phone.",
                      "Track the full conversion pipeline from AI Qualified to Site Visit to Close.",
                      "Manage property inventory, sync dataset records, and monitor CRM analytics.",
                      "RERA-aligned compliance tools tailored to the Dubai and Indian market."
                    ].map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#C5A869] flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#E1CB8E] hover:text-white transition"
                >
                  Explore Verified Inventory <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Modals */}
      <ScheduleVisitModal
        property={selectedPropertyForVisit}
        isOpen={!!selectedPropertyForVisit}
        onClose={() => setSelectedPropertyForVisit(null)}
        onRequireRegister={() => {
          setSelectedPropertyForVisit(null);
          setAuthModalMode("register");
          setAuthModalOpen(true);
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
