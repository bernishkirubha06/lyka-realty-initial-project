"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { Country, COUNTRIES } from "@/lib/countries";

interface CountryCodePickerProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
  showFullCountryName?: boolean;
}

export default function CountryCodePicker({
  selectedCountry,
  onSelectCountry,
  showFullCountryName = false
}: CountryCodePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredCountries = COUNTRIES.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.dialCode.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#181A24] border border-zinc-700 rounded-xl text-xs font-semibold text-white hover:border-[#C5A869] transition h-full focus:outline-none"
        title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="font-mono text-zinc-300">{selectedCountry.dialCode}</span>
        {showFullCountryName && (
          <span className="text-zinc-400 max-w-[90px] truncate hidden sm:inline">
            {selectedCountry.name}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-[#12141C] border border-[#C5A869]/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Search Header on top */}
          <div className="p-2.5 border-b border-zinc-800 bg-[#161822] sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search country or code (A-Z)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0D0E14] border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5 px-1 font-mono uppercase tracking-wider">
              Alphabetical A–Z Countries ({filteredCountries.length})
            </p>
          </div>

          {/* Scrollable A-Z Countries List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/60 p-1">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No matching country found.
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onSelectCountry(c);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition ${
                      isSelected
                        ? "bg-[#C5A869]/20 text-[#E1CB8E] font-bold"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px] text-zinc-400">
                      <span>{c.dialCode}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#C5A869]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
