"use client";

import { ShieldAlert, Fingerprint, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "./actions";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorParam = searchParams.get("error");
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(errorParam === "AccessDenied" ? "Session expired. Please log in again." : "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await login(username, password);
      if (result.success) {
        window.location.href = "/";
      } else {
        setError(result.error || "Authentication failed");
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1d21] flex items-center justify-center p-4">
      <div className="bg-[#24252a] border border-[#33343a] p-8 md:p-12 rounded-3xl w-full max-w-md shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-[#0f5a3e]/20 rounded-full flex items-center justify-center border border-[#0f5a3e]/30">
            <Fingerprint className="w-8 h-8 text-[#0f5a3e]" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">AcadFlow CRM</h1>
            <p className="text-sm text-slate-400 font-medium">Secure Personnel Access</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl w-full text-left">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-red-400 leading-relaxed">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full pt-4 space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-[#1c1d21] border border-[#33343a] rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0f5a3e] focus:ring-1 focus:ring-[#0f5a3e] transition-all"
                disabled={isLoading}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-[#1c1d21] border border-[#33343a] rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0f5a3e] focus:ring-1 focus:ring-[#0f5a3e] transition-all"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full flex items-center justify-center gap-2 bg-[#d3f46f] hover:bg-[#c1e655] text-[#1c1d21] py-3.5 px-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Secure Login
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1c1d21]" />}>
      <LoginContent />
    </Suspense>
  );
}
