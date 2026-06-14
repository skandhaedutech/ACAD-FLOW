import { useState } from "react";
import { RefreshCw, Database } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";

export function GoogleSheetsSyncStatus() {
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState("Just now");
  const [error, setError] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setError(false);
    try {
      const res = await fetch(`${BACKEND_URL}/api/sync-sheet`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Sync failed");
      
      setLastSynced("Just now");
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100/80 flex items-center justify-between mb-2">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center relative bg-[#0f5a3e]/10 border border-[#0f5a3e]/20">
          <Database className={`w-5 h-5 ${error ? 'text-rose-500' : 'text-[#0f5a3e]'}`} />
        </div>
        <div>
          <h4 className="text-slate-800 font-extrabold text-sm">Google Sheets Live Sync</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span className={`text-[10px] font-semibold ${error ? 'text-rose-500' : 'text-slate-400'}`}>
              {error ? 'Sync Connection Error' : 'Connected • Automatic sync active'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <p className="text-[10px] font-semibold text-slate-400 hidden md:block">Last checked: {lastSynced}</p>
        <button 
          onClick={handleSync}
          disabled={syncing}
          className="bg-[#0f5a3e] hover:bg-[#0a3f2b] disabled:opacity-50 text-white text-xs font-black px-4.5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-[#0f5a3e]/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
}
