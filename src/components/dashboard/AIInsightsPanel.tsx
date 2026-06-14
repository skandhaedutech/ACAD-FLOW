import { Sparkles, TrendingUp, Clock, Users, Zap, AlertCircle, DollarSign } from "lucide-react";

interface Insight {
  type: string;
  icon: string;
  title: string;
  desc: string;
}

export function AIInsightsPanel({ insights = [] }: { insights?: Insight[] }) {
  const getIcon = (iconName: string, type: string) => {
    const sizeClass = "w-4 h-4";
    const colorClass = type === 'positive' ? 'text-[#0f5a3e]' : type === 'warning' ? 'text-rose-500' : 'text-slate-600';
    
    switch (iconName) {
      case 'TrendingUp':
        return <TrendingUp className={`${sizeClass} ${colorClass}`} />;
      case 'Users':
        return <Users className={`${sizeClass} ${colorClass}`} />;
      case 'Clock':
        return <Clock className={`${sizeClass} ${colorClass}`} />;
      case 'Zap':
        return <Zap className={`${sizeClass} ${colorClass}`} />;
      case 'DollarSign':
        return <DollarSign className={`${sizeClass} ${colorClass}`} />;
      case 'AlertCircle':
        return <AlertCircle className={`${sizeClass} ${colorClass}`} />;
      default:
        return <Sparkles className={`${sizeClass} ${colorClass}`} />;
    }
  };

  const getBgClass = (type: string) => {
    if (type === 'positive') return 'bg-emerald-50/50 border-emerald-100/50';
    if (type === 'warning') return 'bg-rose-50/50 border-rose-100/50';
    return 'bg-slate-50/50 border-slate-100/50';
  };

  return (
    <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-[#0f5a3e]/10 flex items-center justify-center">
             <Sparkles className="w-4 h-4 text-[#0f5a3e]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">AI Recommendations</h3>
          </div>
        </div>

        <div className="space-y-3 flex-1">
          {insights.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold">
              ✨ AI engine is analyzing your pipeline. Check back shortly!
            </div>
          ) : (
            insights.slice(0, 3).map((insight, idx) => (
              <div 
                key={idx} 
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-colors ${getBgClass(insight.type)}`}
              >
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                  {getIcon(insight.icon, insight.type)}
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-800 font-extrabold text-xs">{insight.title}</p>
                  <p className="text-[10px] font-semibold text-slate-500 leading-normal">
                    {insight.desc}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
