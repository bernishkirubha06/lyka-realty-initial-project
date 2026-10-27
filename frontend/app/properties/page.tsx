"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  SlidersHorizontal, 
  Building2, 
  ArrowUpDown, 
  Check, 
  X, 
  MapPin, 
  Filter, 
  RotateCcw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import ScheduleVisitModal from "@/components/ScheduleVisitModal";
import AuthModal from "@/components/AuthModal";
import { Property, PropertyListResponse } from "@/lib/types";
import { Currency } from "@/lib/currency";
import { api } from "@/lib/api";
import { getSystemTimezoneLabel } from "@/lib/timezone";

export default function PropertiesCatalogPage() {
  const [currency, setCurrency] = useState<Currency>("AED");
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bhk, setBhk] = useState<number | undefined>(undefined);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [furnishing, setFurnishing] = useState("");
  const [parking, setParking] = useState<boolean | undefined>(undefined);
  const [isDatasetRecord, setIsDatasetRecord] = useState<boolean | undefined>(undefined);
  const [sort, setSort] = useState("newest");

  // Filter drawer toggle
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPropertyForVisit, setSelectedPropertyForVisit] = useState<Property | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  const fetchProperties = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await api.getProperties({
        city: city || undefined,
        locality: locality || undefined,
        property_type: propertyType || undefined,
        bhk: bhk,
        min_price: minPrice,
        max_price: maxPrice,
        furnishing: furnishing || undefined,
        parking: parking,
        is_dataset_record: isDatasetRecord,
        sort,
        page: targetPage,
        page_size: 12
      });
      setProperties(res.items);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.total_pages);

      if (locality || propertyType || bhk) {
        try {
          api.recordSearchHistory({
            locality: locality || undefined,
            property_title: propertyType ? `${bhk ? `${bhk} BHK ` : ""}${propertyType} search` : (locality ? `${locality} search` : undefined),
            bhk: bhk,
            price: maxPrice
          });
        } catch {}
      }
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(1);
  }, [city, locality, propertyType, bhk, minPrice, maxPrice, furnishing, parking, isDatasetRecord, sort]);

  const handleResetFilters = () => {
    setCity("");
    setLocality("");
    setPropertyType("");
    setBhk(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setFurnishing("");
    setParking(undefined);
    setIsDatasetRecord(undefined);
    setSort("newest");
    setPage(1);
  };

  const primeLocalities = [
    "Downtown Dubai",
    "Palm Jumeirah",
    "Dubai Marina",
    "Business Bay",
    "Jumeirah Lake Towers",
    "Dubai Hills Estate"
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
        {/* Page Title & Search Header */}
        <div className="space-y-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Dubai Property Portfolio
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Explore 1,900+ real estate assets with transparent market data, verified pricing, and AI recommendation matching.
            </p>
          </div>

          {/* Quick Locality Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => { setLocality(""); setCity(""); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                !locality && !city
                  ? "bg-[#C5A869] text-black"
                  : "bg-zinc-800 text-zinc-300 hover:text-white"
              }`}
            >
              All Regions
            </button>
            {primeLocalities.map((loc) => {
              const cleanLoc = loc;
              const isSelected = locality.toLowerCase() === cleanLoc.toLowerCase();
              return (
                <button
                  key={loc}
                  onClick={() => {
                    setLocality(cleanLoc);
                    setCity("Dubai");
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                    isSelected
                      ? "bg-[#C5A869] text-black"
                      : "bg-zinc-800 text-zinc-300 hover:text-white"
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  {loc}
                </button>
              );
            })}
          </div>

          {/* Search Bar & Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111319] p-3 rounded-2xl border border-zinc-800">
            {/* Search Input */}
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by neighborhood, community, or title..."
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full bg-[#171923] border border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]"
              />
            </div>

            {/* Filter Toggle & Sorting */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition ${
                  filtersOpen
                    ? "bg-[#C5A869] text-black border-[#C5A869]"
                    : "bg-[#171923] text-zinc-300 hover:text-white border-zinc-700"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {(bhk !== undefined || minPrice !== undefined || propertyType || isDatasetRecord !== undefined) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#171923] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-[#171923]">Newest Added</option>
                  <option value="price_asc" className="bg-[#171923]">Price: Low to High</option>
                  <option value="price_desc" className="bg-[#171923]">Price: High to Low</option>
                  <option value="area_desc" className="bg-[#171923]">Largest Area</option>
                </select>
              </div>
            </div>
          </div>

          {/* Advanced Filters Expandable Drawer */}
          {filtersOpen && (
            <div className="bg-[#12141D] border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#C5A869]" /> Refine Property Listings
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Property Type */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Property Type</label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                  >
                    <option value="">All Types</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Villa">Villa</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Studio">Studio</option>
                  </select>
                </div>

                {/* BHK / Bedrooms */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Bedrooms (BHK)</label>
                  <select
                    value={bhk !== undefined ? String(bhk) : ""}
                    onChange={(e) => setBhk(e.target.value === "" ? undefined : Number(e.target.value))}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                  >
                    <option value="">Any Bedrooms</option>
                    <option value="0">Studio (0 BHK)</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4+ BHK</option>
                  </select>
                </div>

                {/* Minimum Price */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Min Budget ({currency})
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1000000"
                    value={minPrice !== undefined ? minPrice : ""}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                  />
                </div>

                {/* Maximum Price */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Max Budget ({currency})
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5000000"
                    value={maxPrice !== undefined ? maxPrice : ""}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                  />
                </div>

                {/* Data Source Distinction (Section 7) */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Data Origin</label>
                  <select
                    value={isDatasetRecord !== undefined ? String(isDatasetRecord) : ""}
                    onChange={(e) => setIsDatasetRecord(e.target.value === "" ? undefined : e.target.value === "true")}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                  >
                    <option value="">All Inventory (1,920 records)</option>
                    <option value="true">Verified Dubai Dataset Only</option>
                    <option value="false">Demo Listings Only (Synthetic)</option>
                  </select>
                </div>

                {/* Furnishing */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Furnishing Status</label>
                  <select
                    value={furnishing}
                    onChange={(e) => setFurnishing(e.target.value)}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                  >
                    <option value="">Any Furnishing</option>
                    <option value="Furnished">Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6 text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-white">{properties.length}</strong> of <strong className="text-white">{total.toLocaleString()}</strong> properties
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Time: {getSystemTimezoneLabel()} • DB: Dubai (GST)
            </span>
          </div>
          {locality && (
            <span className="text-[#C5A869]">
              Filtered by: <strong>{locality}</strong>
            </span>
          )}
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-[#111319] border border-zinc-800 animate-pulse p-4 flex flex-col justify-between">
                <div className="w-full h-48 bg-zinc-800 rounded-xl" />
                <div className="space-y-2 mt-4">
                  <div className="w-3/4 h-4 bg-zinc-800 rounded" />
                  <div className="w-1/2 h-4 bg-zinc-800 rounded" />
                </div>
                <div className="w-full h-8 bg-zinc-800 rounded mt-4" />
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20 bg-[#111319] rounded-2xl border border-zinc-800 p-8 space-y-4">
            <Building2 className="w-12 h-12 text-[#C5A869] mx-auto opacity-60" />
            <h3 className="text-xl font-bold text-white">No Properties Found</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              We couldn't find any properties matching your current filter criteria. Try expanding your budget range or selecting all regions.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-[#C5A869] text-black font-semibold text-xs hover:bg-[#E1CB8E] transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                currency={currency}
                onScheduleVisit={(p) => setSelectedPropertyForVisit(p)}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchProperties(page - 1)}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-4 py-2 text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl">
              Page <strong className="text-[#C5A869]">{page}</strong> of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => fetchProperties(page + 1)}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
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
