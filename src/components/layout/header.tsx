"use client";

import { Search, User as UserIcon, LogOut } from "lucide-react";
import { ThemeToggle } from "../theme-toggle";
import { logout, getUser } from "@/app/login/actions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const Header = () => {
  const router = useRouter();
  const [username, setUsername] = useState<string>("Admin");

  useEffect(() => {
    async function fetchUser() {
      const user = await getUser();
      if (user) {
        // Capitalize first letter
        setUsername(user.charAt(0).toUpperCase() + user.slice(1));
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 z-10 print:hidden text-slate-800 dark:text-slate-100 relative">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">Welcome back, {username} 👋</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-[300px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search leads..." 
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full py-2 pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0f5a3e] dark:focus:ring-[#d3f46f] focus:border-transparent text-slate-800 dark:text-slate-100 shadow-sm transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        
        <ThemeToggle />

        <button 
          onClick={handleLogout}
          title="Sign Out"
          className="w-9 h-9 rounded-full bg-[#0f5a3e] overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800 hover:scale-105 transition-transform shadow-md shadow-[#0f5a3e]/10 cursor-pointer"
        >
           <LogOut className="w-4 h-4 text-white ml-0.5" />
        </button>
      </div>
    </header>
  );
};
