import { DatabaseZap } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="h-full flex flex-col gap-6">
      <h2 className="text-2xl font-black text-[#1c1d21] tracking-tight mb-2">Connected Apps</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {/* Google Sheets */}
         <div className="bg-[#1c1d21] rounded-[24px] p-6 shadow-xl border border-[#d3f46f]/30 relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="absolute top-0 right-0 bg-[#d3f46f] text-[#1c1d21] text-[10px] font-black px-3 py-1 rounded-bl-xl">Active</div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
               <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-white font-bold mb-1">Google Sheets</h3>
            <p className="text-[#8a8c96] text-xs">Bi-directional lead sync active.</p>
         </div>

         {/* WhatsApp */}
         <div className="bg-[#1c1d21] rounded-[24px] p-6 shadow-xl border border-white/5 relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="absolute top-0 right-0 bg-[#8a8c96] text-[#1c1d21] text-[10px] font-black px-3 py-1 rounded-bl-xl">Phase 2</div>
            <div className="w-12 h-12 rounded-xl bg-[#25D366]/20 flex items-center justify-center mb-4">
               <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-white font-bold mb-1">WhatsApp Cloud API</h3>
            <p className="text-[#8a8c96] text-xs">Automate follow-up messages.</p>
         </div>
      </div>
    </div>
  );
}
