import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="bg-white p-12 rounded-[2rem] shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-center max-w-md">
        <div className="w-20 h-20 bg-[#f4f6f8] rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl font-bold text-[#1c1d21]">404</span>
        </div>
        <h2 className="text-2xl font-bold text-[#1c1d21] mb-3">Page not built yet!</h2>
        <p className="text-[#8a8c96] text-sm mb-8">
          This is just a UI demo dashboard. The other sidebar pages (Courses, Messages, etc.) haven't been developed yet.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 bg-[#d3f46f] text-[#1c1d21] font-bold px-6 py-3 rounded-full hover:bg-[#c1e655] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
