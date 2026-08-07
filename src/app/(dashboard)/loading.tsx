export default function Loading() {
  return (
    <div className="w-full space-y-6 pb-8 page-enter">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton w-11 h-11 rounded-2xl" />
          <div className="space-y-2">
            <div className="skeleton w-48 h-5 rounded-lg" />
            <div className="skeleton w-72 h-3 rounded-md" />
          </div>
        </div>
        <div className="skeleton w-36 h-10 rounded-xl" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm animate-fade-in stagger-${i}`}
          >
            <div className="flex justify-between items-start">
              <div className="skeleton w-24 h-3 rounded-md" />
              <div className="skeleton w-7 h-7 rounded-lg" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="skeleton w-20 h-6 rounded-lg" />
              <div className="skeleton w-32 h-2.5 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Tab navigation skeleton */}
      <div className="flex border-b border-slate-200 gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`px-5 py-3 animate-fade-in stagger-${i}`}>
            <div className="skeleton w-28 h-4 rounded-md" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-[28px] shadow-sm p-2 border border-slate-100 animate-fade-in stagger-5">
        <div className="rounded-[20px] bg-slate-50/50 border border-slate-100 overflow-hidden">
          {/* Table header */}
          <div className="bg-slate-50/80 border-b border-slate-200 px-4 py-4 flex gap-6">
            {[60, 100, 90, 70, 70, 60, 70, 70, 80, 40].map((w, i) => (
              <div key={i} className="skeleton rounded-md h-3" style={{ width: w }} />
            ))}
          </div>
          
          {/* Table rows */}
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="px-4 py-3.5 flex items-center gap-6 border-b border-slate-100 last:border-b-0"
            >
              <div className="skeleton w-14 h-5 rounded-md" />
              <div className="space-y-1.5 flex-1">
                <div className="skeleton w-24 h-3.5 rounded-md" />
                <div className="skeleton w-20 h-2.5 rounded-md" />
              </div>
              <div className="skeleton w-28 h-3.5 rounded-md" />
              <div className="skeleton w-16 h-3.5 rounded-md" />
              <div className="skeleton w-16 h-3.5 rounded-md" />
              <div className="skeleton w-14 h-3.5 rounded-md" />
              <div className="skeleton w-16 h-5 rounded-lg" />
              <div className="skeleton w-14 h-3.5 rounded-md" />
              <div className="skeleton w-20 h-3 rounded-md" />
              <div className="skeleton w-5 h-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
