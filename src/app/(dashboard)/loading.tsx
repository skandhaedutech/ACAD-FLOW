export default function Loading() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-[#0f5a3e]/20 border-t-[#0f5a3e] rounded-full animate-spin"></div>
      <p className="mt-4 text-sm font-bold text-slate-500">Loading page...</p>
    </div>
  );
}
