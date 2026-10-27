"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Bed, 
  Bath, 
  Maximize, 
  MapPin, 
  Heart, 
  Sparkles, 
  Calendar, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { Property } from "@/lib/types";
import { formatCurrency, Currency } from "@/lib/currency";
import { api } from "@/lib/api";
import { getPropertyImageUrl } from "@/lib/propertyImage";

interface PropertyCardProps {
  property: Property;
  matchScore?: number;
  matchReasons?: string[];
  currency?: Currency;
  onScheduleVisit?: (p: Property) => void;
  isSaved?: boolean;
}

export default function PropertyCard({
  property,
  matchScore,
  matchReasons,
  currency = "AED",
  onScheduleVisit,
  isSaved = false
}: PropertyCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [loadingSave, setLoadingSave] = useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingSave(true);
    try {
      const res = await api.toggleSavedProperty(property.id);
      setSaved(res.saved);
    } catch {
      setSaved(!saved);
    } finally {
      setLoadingSave(false);
    }
  };

  const handleScheduleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onScheduleVisit?.(property);
  };

  return (
    <div className="group relative bg-[#111319] rounded-2xl border border-[#232733] hover:border-[#C5A869]/60 shadow-lg hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col overflow-hidden">
      {/* Property Image & Overlays */}
      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
        <img
          src={getPropertyImageUrl(property.image_url, property.locality, property.city, property.id)}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Match Score Badge */}
            {matchScore !== undefined && (
              <span className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[#D4AF37] to-[#9E8042] text-black shadow-md font-mono">
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                {matchScore}% Match
              </span>
            )}

            {/* Dataset vs Demo distinction badge */}
            {property.is_dataset_record ? (
              <span className="pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800 backdrop-blur-sm">
                <ShieldCheck className="w-3 h-3" />
                Verified Market Data
              </span>
            ) : (
              <span className="pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800 backdrop-blur-sm">
                Demo Listing
              </span>
            )}
          </div>

          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={loadingSave}
            className={`pointer-events-auto p-2 rounded-full backdrop-blur-md transition-all ${
              saved
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-black/40 text-white/80 hover:text-white hover:bg-black/60 border border-white/10"
            }`}
          >
            <Heart className={`w-4 h-4 ${saved ? "fill-red-500" : ""}`} />
          </button>
        </div>

        {/* Bottom Price in Image overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <span className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider block">
              {property.property_type} • {property.availability}
            </span>
            <span className="text-xl font-extrabold text-white tracking-tight drop-shadow">
              {formatCurrency(property.price, currency)}
            </span>
          </div>
          {property.price_per_sqft && (
            <span className="text-xs text-zinc-300 font-mono bg-black/50 px-2 py-0.5 rounded border border-white/10">
              {property.currency === "INR" ? `₹${Math.round(property.price_per_sqft)}/sqft` : `${Math.round(property.price_per_sqft)} AED/sqft`}
            </span>
          )}
        </div>
      </div>

      {/* Property Details Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-[#C5A869] font-medium mb-1.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{property.locality}, {property.city}</span>
          </div>

          {/* Title */}
          <Link href={`/properties/${property.id}`}>
            <h3 className="font-semibold text-white text-base line-clamp-1 hover:text-[#E1CB8E] transition">
              {property.title}
            </h3>
          </Link>

          {/* Key Specs Row */}
          <div className="grid grid-cols-3 gap-2 py-3 mt-2 border-y border-zinc-800 text-xs text-zinc-300">
            <div className="flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-zinc-400" />
              <span>{property.bhk === 0 ? "Studio" : `${property.bhk} BHK`}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bath className="w-4 h-4 text-zinc-400" />
              <span>{property.bathrooms} Baths</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Maximize className="w-4 h-4 text-zinc-400" />
              <span>{Math.round(property.super_area_sqft).toLocaleString()} sqft</span>
            </div>
          </div>

          {/* AI Match Reasons snippet if present */}
          {matchReasons && matchReasons.length > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-[#C5A869]/10 border border-[#C5A869]/20 text-[11px] text-zinc-300 space-y-1">
              <div className="font-semibold text-[#E1CB8E] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#C5A869]" /> AI Match Rationale:
              </div>
              {matchReasons.slice(0, 2).map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  <span className="line-clamp-1">{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 flex items-center gap-2">
          <Link
            href={`/properties/${property.id}`}
            className="flex-1 py-2 text-center text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-xl transition border border-zinc-700/60"
          >
            View Details
          </Link>
          <button
            type="button"
            onClick={handleScheduleClick}
            className="px-3.5 py-2 text-xs font-semibold text-black bg-[#C5A869] hover:bg-[#E1CB8E] rounded-xl transition flex items-center gap-1.5 shadow"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Visit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
