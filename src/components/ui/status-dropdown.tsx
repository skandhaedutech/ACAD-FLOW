"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  label: string;
  value: string;
  badgeColor?: string; // CSS color class (e.g. text-amber-500)
}

interface StatusDropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

export function StatusDropdown({ value, options, onChange, className = "" }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper to resolve clean styles for each status type
  const getStatusStyles = (colorClass: string) => {
    const normalized = (colorClass || "").toLowerCase();
    if (normalized.includes("amber")) {
      return {
        button: "bg-amber-50 text-amber-700 border-amber-200/40 hover:bg-amber-100/50",
        dot: "bg-amber-500"
      };
    }
    if (normalized.includes("emerald") || normalized.includes("green") || normalized.includes("d3f46f")) {
      return {
        button: "bg-emerald-50 text-emerald-700 border-emerald-200/40 hover:bg-emerald-100/50",
        dot: "bg-emerald-500"
      };
    }
    if (normalized.includes("rose") || normalized.includes("red")) {
      return {
        button: "bg-rose-50 text-rose-700 border-rose-200/40 hover:bg-rose-100/50",
        dot: "bg-rose-500"
      };
    }
    if (normalized.includes("blue")) {
      return {
        button: "bg-blue-50 text-blue-700 border-blue-200/40 hover:bg-blue-100/50",
        dot: "bg-blue-500"
      };
    }
    return {
      button: "bg-slate-100 text-slate-800 border-slate-300/60 hover:bg-slate-200/85",
      dot: "bg-slate-500"
    };
  };

  const styles = getStatusStyles(selectedOption.badgeColor || "");

  // Helper to strip emoji indicators from raw labels (e.g. 🟢 Admitted -> Admitted)
  const cleanLabel = (lbl: string) => lbl.replace(/^[🟢🔴⚪🔵🟡⚫]/g, '').trim();

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer transition-all duration-150 outline-none select-none shadow-sm ${styles.button}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
        <span className="truncate">{cleanLabel(selectedOption.label)}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Dropdown Options Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-40 rounded-xl bg-white border border-slate-100/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => {
            const isSelected = option.value === value;
            const optionStyles = getStatusStyles(option.badgeColor || "");
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-[11px] font-semibold hover:bg-slate-50/60 transition-colors duration-150 outline-none ${
                  isSelected ? "bg-slate-50 text-slate-800" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${optionStyles.dot}`} />
                  <span>{cleanLabel(option.label)}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-slate-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
