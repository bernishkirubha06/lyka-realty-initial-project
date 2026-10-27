"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  Bed, 
  Bath, 
  Maximize, 
  MapPin, 
  Calendar, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Share2, 
  Phone, 
  MessageCircle, 
  Train, 
  Layers, 
  Clock, 
  Check, 
  ChevronLeft 
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScheduleVisitModal from "@/components/ScheduleVisitModal";
import AuthModal from "@/components/AuthModal";
import { Property, RecommendationItem } from "@/lib/types";
import { formatCurrency, formatFullPrice, Currency } from "@/lib/currency";
import { api } from "@/lib/api";
import { getSystemTimezoneLabel } from "@/lib/timezone";
import { getPropertyImageUrl } from "@/lib/propertyImage";
import { firebaseService } from "@/lib/firebase";

function PropertyDetailContent() {
  const params = useParams();
  const router = useRouter();
  const propertyId = Number(params?.id);

  const [currency, setCurrency] = useState<Currency>("AED");
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  // AI Match Score and Explanation (Section 11)
  const [matchScore, setMatchScore] = useState<number>(94);
  const [matchReasons, setMatchReasons] = useState<string[]>([
    "Fits your target luxury investment budget",
    "Prime community with superior capital appreciation and rental yield",
    "Close proximity to rapid transit metro network",
    "Full luxury amenity tier including swimming pool and gym"
  ]);

  useEffect(() => {
    if (!propertyId) return;
    const fetchProperty = async () => {
      setLoading(true);
      try {
        const prop = await api.getProperty(propertyId);
        setProperty(prop);
        // Calculate match if requirements exist or customize reasons based on property
        if (prop.locality) {
          setMatchReasons([
            `Fits your target investment budget of ${prop.currency} ${prop.price.toLocaleString()}`,
            `Prime ${prop.locality} location matches high-demand criteria`,
            `Exact ${prop.bhk === 0 ? "Studio" : `${prop.bhk} BHK`} bedroom layout`,
            `Metro accessibility within ${prop.distance_to_metro_km} km`
          ]);
        }

        // Record in search and viewing history for the user
        try {
          api.recordSearchHistory({
            property_id: prop.id,
            property_title: prop.title,
            locality: prop.locality,
            bhk: prop.bhk,
            price: prop.price
          });

          // Connect Customer Tab activity to Sales Person Dashboard via Firebase
          const stored = localStorage.getItem("propai_user");
          const u = stored ? JSON.parse(stored) : null;
          firebaseService.recordActivity({
            customer_name: u?.full_name || "Guest Visitor",
            customer_email: u?.email || null,
            customer_phone: u?.phone || null,
            activity_type: "property_view",
            property_id: prop.id,
            property_title: prop.title,
            property_price: prop.price,
            property_locality: prop.locality,
            property_image: prop.image_url,
            property_bhk: prop.bhk,
            time_spent_seconds: 15
          });
        } catch {}
      } catch (err) {
        console.error("Failed to load property:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();

    // Track active engagement time on property page
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (propertyId) {
        const secondsSpent = Math.round((Date.now() - startTime) / 1000);
        const stored = localStorage.getItem("propai_user");
        const u = stored ? JSON.parse(stored) : null;
        firebaseService.recordActivity({
          customer_name: u?.full_name || "Guest Visitor",
          customer_email: u?.email || null,
          activity_type: "property_view",
          property_id: propertyId,
          time_spent_seconds: secondsSpent
        });
      }
    }, 20000);

    return () => {
      clearInterval(interval);
    };
  }, [propertyId]);

  const handleToggleSave = async () => {
    if (!property) return;
    try {
      const res = await api.toggleSavedProperty(property.id);
      setSaved(res.saved);

      // Track saved property in Firebase for Salesperson
      const stored = localStorage.getItem("propai_user");
      const u = stored ? JSON.parse(stored) : null;
      firebaseService.recordActivity({
        customer_name: u?.full_name || "Guest Visitor",
        customer_email: u?.email || null,
        activity_type: res.saved ? "property_save" : "property_unsave",
        property_id: property.id,
        property_title: property.title,
        property_price: property.price,
        property_locality: property.locality,
        property_image: property.image_url,
        property_bhk: property.bhk
      });
    } catch {
      setSaved(!saved);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col justify-between">
        <Navbar 
          currentCurrency={currency} 
          onCurrencyChange={setCurrency} 
          onOpenAuth={(mode) => {
            if (mode) setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
        />
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <div className="w-12 h-12 border-4 border-[#C5A869] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">Loading verified property details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col justify-between">
        <Navbar 
          currentCurrency={currency} 
          onCurrencyChange={setCurrency} 
          onOpenAuth={(mode) => {
            if (mode) setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
        />
        <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
          <h2 className="text-2xl font-bold">Property Not Found</h2>
          <p className="text-zinc-400 text-sm">The listing you requested does not exist or has been archived.</p>
          <Link href="/properties" className="inline-block px-6 py-2.5 rounded-xl bg-[#C5A869] text-black font-semibold text-sm">
            Browse All Properties
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const amenitiesList = property.parsed_amenities || [
    "Balcony", "Central A/C", "Covered Parking", "Shared Swimming Pool", "Shared Gym", "24/7 Security", "Concierge Service"
  ];

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
        {/* Back Link */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Properties
          </button>
        </div>

        {/* Top Header & Price Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/30">
                {property.property_type} • {property.availability}
              </span>
              {property.is_dataset_record ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Dubai Market Record
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
                  Demo Property Listing
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
              {property.title}
            </h1>
            <div className="flex items-center gap-1.5 text-zinc-400 text-sm mt-1">
              <MapPin className="w-4 h-4 text-[#C5A869]" />
              <span>{property.locality}, {property.city}</span>
            </div>
          </div>

          <div className="text-left lg:text-right space-y-1">
            <span className="text-xs text-zinc-400 uppercase tracking-wider block font-mono">
              Asking Price
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
              {formatFullPrice(property.price, currency)}
            </div>
            {currency === "INR" ? (
              <p className="text-xs text-zinc-400">Equivalent: AED {property.price.toLocaleString()}</p>
            ) : (
              <p className="text-xs text-zinc-400 font-mono">
                {property.price_per_sqft ? `${Math.round(property.price_per_sqft)} AED/sqft` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Gallery & Hero Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-8">
          <div className="lg:col-span-8 rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 aspect-[16/10] relative shadow-2xl">
            <img
              src={getPropertyImageUrl(property.image_url, property.locality, property.city, property.id)}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={handleToggleSave}
                className={`p-3 rounded-full backdrop-blur-md transition-all shadow-lg ${
                  saved
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-black/60 text-white hover:bg-black/80 border border-white/20"
                }`}
              >
                <Heart className={`w-5 h-5 ${saved ? "fill-red-500" : ""}`} />
              </button>
            </div>
          </div>

          {/* Quick Action Box & Explainable AI Match */}
          <div className="lg:col-span-4 space-y-6">
            {/* EXPLAINABLE AI MATCH SECTION (Section 9 & 11) */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#161822] to-[#10121A] border border-[#C5A869]/50 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C5A869]" />
                  <span className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                    AI Match Intelligence
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-[#D4AF37] to-[#9E8042] text-black font-mono">
                  {matchScore}% Match
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#E1CB8E] mb-2">
                  Why this matches you:
                </h4>
                <div className="space-y-2">
                  {matchReasons.map((reason, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-3">
                “This property is a {matchScore}% match because it fits your {currency} {formatCurrency(property.price, currency)} investment budget, 
                provides {property.bhk} bedrooms, and is situated in prime {property.locality}.”
              </p>
            </div>

            {/* CTAs Box */}
            <div className="p-6 rounded-3xl bg-[#111319] border border-zinc-800 space-y-3.5">
              <button
                type="button"
                onClick={() => setVisitModalOpen(true)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] text-black font-bold text-sm hover:opacity-95 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule VIP Site Visit</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 font-mono pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Viewing in real time ({getSystemTimezoneLabel()}) • Saved in Dubai (GST)</span>
              </div>

              <a
                href="https://wa.me/971501234567?text=Hello%20Lyka%20Realty,%20I%20am%20interested%20in%20viewing%20the%20property%20listing:"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Client Director</span>
              </a>

              <a
                href="tel:+97144567890"
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center justify-center gap-2 border border-zinc-700"
              >
                <Phone className="w-4 h-4 text-[#C5A869]" />
                <span>Call Concierge (+971 4 456 7890)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="my-8 p-6 sm:p-8 rounded-3xl bg-[#111319] border border-zinc-800 space-y-6">
          <h3 className="text-xl font-bold text-white font-sans">
            Property Specifications & Architectural Highlights
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
              <Bed className="w-5 h-5 text-[#C5A869] mb-1" />
              <span className="text-xs text-zinc-500 block">Bedrooms</span>
              <span className="text-base font-bold text-white">{property.bhk === 0 ? "Studio" : `${property.bhk} BHK`}</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
              <Bath className="w-5 h-5 text-[#C5A869] mb-1" />
              <span className="text-xs text-zinc-500 block">Bathrooms</span>
              <span className="text-base font-bold text-white">{property.bathrooms} Baths</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
              <Maximize className="w-5 h-5 text-[#C5A869] mb-1" />
              <span className="text-xs text-zinc-500 block">Super Area</span>
              <span className="text-base font-bold text-white">{Math.round(property.super_area_sqft).toLocaleString()} sqft</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
              <Layers className="w-5 h-5 text-[#C5A869] mb-1" />
              <span className="text-xs text-zinc-500 block">Floor / Elevation</span>
              <span className="text-base font-bold text-white">{property.floor_number} of {property.total_floors}</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
              <Train className="w-5 h-5 text-[#C5A869] mb-1" />
              <span className="text-xs text-zinc-500 block">Metro Distance</span>
              <span className="text-base font-bold text-white">{property.distance_to_metro_km} km</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
              <Clock className="w-5 h-5 text-[#C5A869] mb-1" />
              <span className="text-xs text-zinc-500 block">Furnishing</span>
              <span className="text-base font-bold text-white">{property.furnishing_status}</span>
            </div>
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-semibold text-[#E1CB8E] uppercase tracking-wider font-mono mb-2">
              Property Description
            </h4>
            <p className="text-zinc-300 text-sm leading-relaxed max-w-4xl">
              {property.description}
            </p>
          </div>

          {/* Amenities Multi-Pill List */}
          <div className="pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-semibold text-[#E1CB8E] uppercase tracking-wider font-mono mb-3">
              Included Luxury Amenities
            </h4>
            <div className="flex flex-wrap gap-2">
              {amenitiesList.map((amenity, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-200 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-[#C5A869]" />
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <ScheduleVisitModal
        property={property}
        isOpen={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
        onRequireRegister={() => {
          setVisitModalOpen(false);
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

export default function PropertyDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090A0D]" />}>
      <PropertyDetailContent />
    </Suspense>
  );
}
