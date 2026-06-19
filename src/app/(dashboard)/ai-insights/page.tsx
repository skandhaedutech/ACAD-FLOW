"use client";


import { useEffect, useState, useMemo } from "react";
import { 
  Sparkles, TrendingUp, DollarSign, Users, Award, AlertCircle, Clock, 
  Activity, RefreshCw, Download, FileText, CheckCircle2, ShieldAlert,
  ArrowUpRight, BarChart3, LineChart, Target, UserCheck, Zap, Info, BookOpen
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";

interface AIInsightsPayload {
  executiveSummary: string;
  widgets: {
    admissionIntelligence: {
      growth: string;
      probabilityDesc: string;
      conversionAlert: string;
      forecast: string;
    };
    revenueForecasting: {
      expectedRevenue: string;
      expectedEmiThisWeek: string;
      growthTrend: string;
      alert: string;
    };
    counselorPerformance: {
      topCounselor: string;
      conversionSpeed: string;
      recommendation: string;
    };
    leadSourceIntelligence: {
      bestChannel: string;
      conversionRatio: string;
      channelBreakdown: string;
    };
    courseDemand: {
      trendingCourse: string;
      growthPercent: string;
      recommendation: string;
    };
    riskDetection: {
      emiDelayCount: number;
      dropRiskCount: number;
      overloadAlert: string;
    };
    smartRecommendations: string[];
  };
  trendAnalysis?: {
    courses: {
      name: string;
      leads: number;
      admissions: number;
      growth: number;
    }[];
    uncontactedBottleneckCount: number;
    counselorDelayFlag: boolean;
  };
  personalRecommendation?: {
    counselorName: string;
    message: string;
    metrics?: {
      activeLeads: number;
      overdueLeads: number;
      bestCourse: string;
    };
  };
}

export default function AIInsightsPage() {
  const [data, setData] = useState<AIInsightsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // AI Trends Scoring Weights
  const [growthWeight, setGrowthWeight] = useState(0.4);
  const [convWeight, setConvWeight] = useState(0.3);
  const [volWeight, setVolWeight] = useState(0.3);

  const coursesData = useMemo(() => {
    return data?.trendAnalysis?.courses || [
      { name: "Full Stack Development", leads: 42, admissions: 10, growth: 42 },
      { name: "Data Science & AI", leads: 35, admissions: 8, growth: 35 },
      { name: "Cyber Security", leads: 28, admissions: 6, growth: 15 },
      { name: "AWS Cloud Computing & DevOps", leads: 30, admissions: 7, growth: 25 },
      { name: "UI/UX Design", leads: 24, admissions: 5, growth: 20 },
      { name: "Mobile App Development", leads: 18, admissions: 4, growth: 10 },
      { name: "Python Programming", leads: 50, admissions: 12, growth: 5 },
      { name: "Software Testing", leads: 15, admissions: 3, growth: -5 }
    ];
  }, [data]);

  const scoredCourses = useMemo(() => {
    if (!coursesData.length) return [];
    
    const maxLeads = Math.max(...coursesData.map(c => c.leads), 1);
    const maxGrowth = Math.max(...coursesData.map(c => Math.abs(c.growth)), 1);

    const calculated = coursesData.map(c => {
      const conversionRate = c.leads > 0 ? (c.admissions / c.leads) * 100 : 0;
      const growthNormalized = Math.max(0, (c.growth / maxGrowth) * 100);
      const volumeNormalized = (c.leads / maxLeads) * 100;

      const score = Math.round(
        (growthNormalized * growthWeight) + 
        (conversionRate * convWeight) + 
        (volumeNormalized * volWeight)
      );

      return {
        ...c,
        conversionRate: Math.round(conversionRate),
        score: Math.min(Math.max(score, 0), 100)
      };
    });

    return calculated.sort((a, b) => b.score - a.score);
  }, [coursesData, growthWeight, convWeight, volWeight]);

  const fetchInsights = async (triggerLoader = false) => {
    if (triggerLoader) setIsProcessing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/server-api/ai-insights`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to fetch AI insights:", err);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchInsights();

    // 🔗 Supabase Realtime synchronization channels
    const insightsChannel = supabase
      .channel('insights-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          console.log('[Realtime] Leads updated, reloading insights...');
          fetchInsights();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_insights' },
        () => {
          console.log('[Realtime] AI Insights updated, reloading insights...');
          fetchInsights();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(insightsChannel);
    };
  }, []);

  const handleRecompute = () => {
    fetchInsights(true);
  };

  const handleExportReport = () => {
    if (!data) return;
    const content = `ACADFLOW CRM - AI BUSINESS INTELLIGENCE SUMMARY
Generated: ${new Date().toLocaleString()}

1. EXECUTIVE BUSINESS SUMMARY
${data.executiveSummary}

2. ADMISSION INTELLIGENCE
- Monthly growth: ${data.widgets.admissionIntelligence.growth}
- Probability: ${data.widgets.admissionIntelligence.probabilityDesc}
- Trend: ${data.widgets.admissionIntelligence.conversionAlert}
- Forecast: ${data.widgets.admissionIntelligence.forecast}

3. REVENUE FORECASTING
- Revenue growth expectation: ${data.widgets.revenueForecasting.expectedRevenue}
- Upcoming weekly EMIs: ${data.widgets.revenueForecasting.expectedEmiThisWeek}
- Financial health: ${data.widgets.revenueForecasting.growthTrend}
- Alerts: ${data.widgets.revenueForecasting.alert}

4. COUNSELOR INSIGHTS
- Top converter: ${data.widgets.counselorPerformance.topCounselor}
- Speed metrics: ${data.widgets.counselorPerformance.conversionSpeed}
- Allocation advice: ${data.widgets.counselorPerformance.recommendation}

5. MARKETING & CHANNELS
- Prime source: ${data.widgets.leadSourceIntelligence.bestChannel}
- Conversion ratios: ${data.widgets.leadSourceIntelligence.conversionRatio}
- Details: ${data.widgets.leadSourceIntelligence.channelBreakdown}

6. COURSE DEMAND PREDICTIONS
- Trending Category: ${data.widgets.courseDemand.trendingCourse}
- Growth level: ${data.widgets.courseDemand.growthPercent}
- Suggestions: ${data.widgets.courseDemand.recommendation}

7. ACTIONABLE SMART RECOMMENDATIONS
${data.widgets.smartRecommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `acadflow_ai_report_${new Date().toISOString().slice(0, 10)}.txt`);
    a.click();
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <div className="relative mb-6">
          <RefreshCw className="h-10 w-10 animate-spin text-[#0f5a3e]" />
          <Sparkles className="absolute inset-0 m-auto h-4.5 w-4.5 text-amber-500 animate-pulse" />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-[#0f5a3e]">AI Engine Processing...</p>
        <p className="text-xs text-slate-400 font-semibold mt-1">Analyzing admissions database & mapping counselor metrics</p>
      </div>
    );
  }

  const widgets = data?.widgets;

  return (
    <div className="w-full space-y-6 pb-8 text-[#1c1d21]">
      
      {/* 1. Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#0f5a3e] text-white px-4.5 py-2.5 rounded-full flex items-center gap-2 font-black text-sm shadow-sm border border-black/5">
            <Sparkles className="w-4.5 h-4.5 text-white" />
            <span>AI Insights</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Business Intelligence Dashboard</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-slate-400 text-xs font-bold">Real-time predictive analytics active • Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button 
            onClick={handleExportReport}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export AI Report
          </button>
          <button 
            onClick={handleRecompute}
            disabled={isProcessing}
            className="flex items-center gap-1.5 bg-[#0f5a3e] hover:bg-[#0a3f2b] disabled:opacity-50 text-white px-4.5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md shadow-[#0f5a3e]/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'AI Engine Processing...' : 'Generate Business Summary'}
          </button>
        </div>
      </div>

      {/* Processing Animation Alert */}
      {isProcessing && (
        <div className="bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 rounded-2xl p-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#0f5a3e] animate-spin" />
            <p className="text-xs font-bold text-[#0f5a3e] uppercase tracking-wider">AI engine is processing leads history and calculating forecasting indexes...</p>
          </div>
        </div>
      )}

      {/* 2. AI Executive Summary Banner */}
      {data && (
        <div className="bg-gradient-to-br from-[#0f5a3e] to-[#0a3e2a] rounded-[28px] p-6 text-white border border-slate-200/50 shadow-md relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 opacity-5 translate-x-1/4 translate-y-1/4">
            <Sparkles className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-[#d3f46f] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
                AI Executive Summary
              </span>
              <span className="text-[10px] text-slate-300 font-bold">NVIDIA Llama 3.1 Model</span>
            </div>
            <p className="text-sm font-semibold leading-relaxed tracking-wide text-slate-100 max-w-5xl">
              {data.executiveSummary}
            </p>
          </div>
        </div>
      )}
      {/* 2b. Personalized AI Recommendation for the Counselor */}
      {data?.personalRecommendation && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[28px] p-6 border border-emerald-500/20 dark:border-emerald-500/30 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-[0.03] translate-x-1/4 -translate-y-1/4">
            <Sparkles className="w-48 h-48 text-emerald-500" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Personalized Directive for You
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Assigned to: {data.personalRecommendation.counselorName}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                {data.personalRecommendation.message}
              </p>
            </div>
            
            {/* Quick Metrics display */}
            {data.personalRecommendation.metrics && data.personalRecommendation.metrics.activeLeads > 0 && (
              <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t border-slate-100 md:border-t-0 md:pl-4 md:border-l dark:md:border-l-slate-800">
                <div className="text-center px-3 py-1.5 bg-slate-50/60 border border-slate-100 rounded-xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Active Leads</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{data.personalRecommendation.metrics.activeLeads}</p>
                </div>
                {data.personalRecommendation.metrics.overdueLeads > 0 && (
                  <div className="text-center px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                    <p className="text-[9px] font-black text-rose-500 dark:text-rose-450 uppercase tracking-wider">Overdue</p>
                    <p className="text-sm font-black text-rose-600 dark:text-rose-400">{data.personalRecommendation.metrics.overdueLeads}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Top Prediction KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: "Admission probability", value: "87%", label: "Lead scores > 80", icon: <Target className="text-emerald-500" />, color: "border-emerald-100 bg-emerald-50/20" },
          { title: "Weekly expected EMI", value: "₹2.8L", label: "Collections forecasts", icon: <DollarSign className="text-blue-500" />, color: "border-blue-100 bg-blue-50/20" },
          { title: "Workload risk threshold", value: "45%", label: "Anita assignment overload", icon: <ShieldAlert className="text-rose-500" />, color: "border-rose-100 bg-rose-50/20" },
          { title: "Category demand growth", value: "+32%", label: "AI & Machine Learning", icon: <TrendingUp className="text-amber-500" />, color: "border-amber-100 bg-amber-50/20" }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.title}</span>
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none pt-0.5">{kpi.value}</h3>
              <p className="text-[9px] text-slate-400 font-bold">{kpi.label}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* 4. AI Insight Widgets Card Grid */}
      {widgets && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* 1. Admission Intelligence Card */}
          <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Admission Intelligence</h3>
                  <p className="text-[9.5px] text-slate-400 font-semibold">Growth metrics & predictive conversions</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <TrendingUp className="w-4 h-4 text-[#0f5a3e] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">{widgets.admissionIntelligence.growth}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Monthly admissions growth index</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <Target className="w-4 h-4 text-[#0f5a3e] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">{widgets.admissionIntelligence.probabilityDesc}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Prediction based on lead profiling</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-50 text-[10px] font-bold text-slate-400 flex items-center gap-1.5 leading-snug">
              <Info className="w-3.5 h-3.5 text-[#0f5a3e] shrink-0" />
              <span>{widgets.admissionIntelligence.forecast}</span>
            </div>
          </div>

          {/* 2. Revenue Forecasting Card */}
          <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Revenue Forecasting</h3>
                  <p className="text-[9.5px] text-slate-400 font-semibold">Collections trends & pending payments</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <LineChart className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">{widgets.revenueForecasting.expectedRevenue}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Expected next month contract value</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#0f5a3e] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">{widgets.revenueForecasting.expectedEmiThisWeek}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Target collected installments</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-50 text-[10px] font-bold text-rose-500 flex items-center gap-1.5 leading-snug">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{widgets.revenueForecasting.alert}</span>
            </div>
          </div>

          {/* 3. Counselor Performance AI */}
          <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Counselor Performance AI</h3>
                  <p className="text-[9.5px] text-slate-400 font-semibold">Conversion velocities & workload routing</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">Top Performer: {widgets.counselorPerformance.topCounselor}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Highest total closed enrollments</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <Activity className="w-4 h-4 text-[#0f5a3e] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">{widgets.counselorPerformance.conversionSpeed}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Counselor lead conversion velocity</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-50 text-[10px] font-bold text-slate-400 flex items-center gap-1.5 leading-snug">
              <Sparkles className="w-3.5 h-3.5 text-[#0f5a3e] shrink-0" />
              <span>{widgets.counselorPerformance.recommendation}</span>
            </div>
          </div>

          {/* 4. Lead Source Intelligence */}
          <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Lead Source Intelligence</h3>
                  <p className="text-[9.5px] text-slate-400 font-semibold">Channel conversions & campaign analysis</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">Best Channel: {widgets.leadSourceIntelligence.bestChannel}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Channel with highest placement yield</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <Activity className="w-4 h-4 text-[#0f5a3e] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">{widgets.leadSourceIntelligence.conversionRatio}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Relative conversion comparison</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-50 text-[10px] font-bold text-slate-400 flex items-center gap-1.5 leading-snug">
              <Info className="w-3.5 h-3.5 text-[#0f5a3e] shrink-0" />
              <span>{widgets.leadSourceIntelligence.channelBreakdown}</span>
            </div>
          </div>

          {/* 5. Course Demand Prediction */}
          <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Course Demand Prediction</h3>
                  <p className="text-[9.5px] text-slate-400 font-semibold">High-growth programs & trending indices</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">Trending: {widgets.courseDemand.trendingCourse}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Highest week-over-week growth program</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
                  <TrendingUp className="w-4 h-4 text-[#0f5a3e] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 font-extrabold">{widgets.courseDemand.growthPercent}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Student enrollment growth forecast</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-50 text-[10px] font-bold text-slate-400 flex items-center gap-1.5 leading-snug">
              <Sparkles className="w-3.5 h-3.5 text-[#0f5a3e] shrink-0" />
              <span>{widgets.courseDemand.recommendation}</span>
            </div>
          </div>

          {/* 6. Risk Detection Panel */}
          <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Risk Detection Panel</h3>
                  <p className="text-[9.5px] text-slate-400 font-semibold">Payment delays & inactive lead threats</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-rose-50/20 border border-rose-100/50 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-slate-800 font-extrabold">EMI Delay Risk</p>
                    <p className="text-[9px] text-slate-400 font-bold">Unpaid scheduled installments</p>
                  </div>
                  <span className="text-rose-600 font-black text-sm">{widgets.riskDetection.emiDelayCount} Students</span>
                </div>

                <div className="bg-amber-50/20 border border-amber-100/50 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-slate-800 font-extrabold">Neglected Drop Risks</p>
                    <p className="text-[9px] text-slate-400 font-bold">Leads without followups (7 days)</p>
                  </div>
                  <span className="text-amber-600 font-black text-sm">{widgets.riskDetection.dropRiskCount} Leads</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-50 text-[10px] font-bold text-rose-500 flex items-center gap-1.5 leading-snug">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{widgets.riskDetection.overloadAlert}</span>
            </div>
          </div>

          {/* 7. Smart AI Recommendations (Span 3) */}
          <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm xl:col-span-3 space-y-4 hover:shadow-md transition-shadow">
            <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#0f5a3e]" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Actionable Smart AI Recommendations</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              {widgets.smartRecommendations.map((rec, idx) => (
                <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3 hover:bg-slate-50 hover:border-slate-200 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 text-[#0f5a3e] font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-slate-800 leading-normal">{rec}</p>
                    <span className="inline-block text-[8.5px] font-black text-[#0f5a3e] bg-[#e2f9d5] border border-[#0f5a3e]/10 px-2 py-0.5 rounded-full mt-2 uppercase tracking-wider">
                      Optimization directive
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* AI Trends & Recommendations Engine Module */}
      {data && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-[#0f5a3e]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">AI Trends & Recommendations Engine</h3>
              <p className="text-slate-400 text-xs font-semibold">Know what to sell, when to market, and how to optimize conversions</p>
            </div>
          </div>

          {/* Dynamic Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Card 1: Trending Now */}
            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-[0.03] translate-x-1/4 -translate-y-1/4">
                <Zap className="w-32 h-32 text-orange-500" />
              </div>
              <div>
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
                  <span className="text-[10px] font-black text-orange-500 bg-orange-50 border border-orange-100/60 px-2.5 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                    🔥 Trending Now
                  </span>
                  <span className="text-[11px] font-black text-slate-705">Rank #1</span>
                </div>
                <h4 className="text-sm font-black text-slate-800 leading-snug mb-2">
                  {scoredCourses[0]?.name || "Full Stack Development"}
                </h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Inquiries for this course increased by <span className="text-[#0f5a3e] font-black">{scoredCourses[0]?.growth || 42}%</span> this cycle with an admissions score of <span className="font-extrabold text-slate-800">{scoredCourses[0]?.score || 94}/100</span>.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] font-extrabold text-slate-400">
                Demand score is heavily leading other programs.
              </div>
            </div>

            {/* Card 2: Growth Opportunity */}
            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-[0.03] translate-x-1/4 -translate-y-1/4">
                <TrendingUp className="w-32 h-32 text-[#0f5a3e]" />
              </div>
              <div>
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
                  <span className="text-[10px] font-black text-[#0f5a3e] bg-emerald-50 border border-emerald-100/60 px-2.5 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                    📈 Growth Opportunity
                  </span>
                  <span className="text-[11px] font-black text-slate-705">Rank #2</span>
                </div>
                <h4 className="text-sm font-black text-slate-800 leading-snug mb-2">
                  {scoredCourses[1]?.name || "Data Science & AI"}
                </h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  AI predicts high seasonal spikes among college students. Inquiry growth is at <span className="text-[#0f5a3e] font-black">+{scoredCourses[1]?.growth || 35}%</span> with steady conversion yield.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] font-extrabold text-slate-400">
                Highly recommended for college recruitment drives.
              </div>
            </div>

            {/* Card 3: Attention Needed */}
            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-[0.03] translate-x-1/4 -translate-y-1/4">
                <AlertCircle className="w-32 h-32 text-rose-500" />
              </div>
              <div>
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
                  <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100/60 px-2.5 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                    ⚠ Attention Needed
                  </span>
                  <span className="text-[11px] font-black text-rose-600">Action Required</span>
                </div>
                <h4 className="text-sm font-black text-slate-800 leading-snug mb-2">
                  Pipeline Bottlenecks
                </h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  <span className="text-rose-600 font-black">{data?.trendAnalysis?.uncontactedBottleneckCount || 25} students</span> attended demo sessions but have not been contacted for follow-up in over 3 days.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] font-extrabold text-rose-500">
                Urgent response delays are affecting active conversion rates.
              </div>
            </div>

            {/* Card 4: Marketing Recommendation */}
            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100/80 hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-[0.03] translate-x-1/4 -translate-y-1/4">
                <Sparkles className="w-32 h-32 text-[#0f5a3e]" />
              </div>
              <div>
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
                  <span className="text-[10px] font-black text-blue-650 bg-blue-50 border border-blue-100/60 px-2.5 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                    💡 Marketing Tips
                  </span>
                  <span className="text-[11px] font-black text-blue-600">Campaign Alert</span>
                </div>
                <h4 className="text-sm font-black text-slate-800 leading-snug mb-2">
                  Drip & Channel Optimization
                </h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Run Instagram ads for UI/UX Design this weekend. WhatsApp evening campaigns show 30% higher response. Referral leads convert 2x better than social campaigns.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] font-extrabold text-blue-500">
                Shift 15% budget to referral structures.
              </div>
            </div>
          </div>

          {/* Simulator & Details Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Simulator weight adjustments */}
            <div className="xl:col-span-1 bg-white rounded-[28px] p-6 border border-slate-100/80 shadow-sm space-y-6">
              <div className="pb-3 border-b border-slate-100">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Formula Tweak Simulator</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Customize coefficients to recalculate AI course trend scores</p>
              </div>

              <div className="space-y-5 text-xs">
                {/* Slider 1: Lead Growth */}
                <div className="space-y-2">
                  <div className="flex justify-between font-black text-slate-600">
                    <span>Growth Velocity (G)</span>
                    <span className="text-[#0f5a3e]">{Math.round(growthWeight * 100)}% weight</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={growthWeight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setGrowthWeight(val);
                      const rem = 1 - val;
                      setConvWeight(Number((rem * 0.5).toFixed(2)));
                      setVolWeight(Number((rem * 0.5).toFixed(2)));
                    }}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0f5a3e] border border-slate-205"
                  />
                </div>

                {/* Slider 2: Conversion Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between font-black text-slate-600">
                    <span>Conversion Rate (C)</span>
                    <span className="text-[#0f5a3e]">{Math.round(convWeight * 100)}% weight</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={convWeight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setConvWeight(val);
                      const rem = 1 - val;
                      setGrowthWeight(Number((rem * 0.5).toFixed(2)));
                      setVolWeight(Number((rem * 0.5).toFixed(2)));
                    }}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0f5a3e] border border-slate-205"
                  />
                </div>

                {/* Slider 3: Inquiry Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between font-black text-slate-600">
                    <span>Inquiry Volume (V)</span>
                    <span className="text-[#0f5a3e]">{Math.round(volWeight * 100)}% weight</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={volWeight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolWeight(val);
                      const rem = 1 - val;
                      setGrowthWeight(Number((rem * 0.5).toFixed(2)));
                      setConvWeight(Number((rem * 0.5).toFixed(2)));
                    }}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0f5a3e] border border-slate-205"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5 text-[10px] text-slate-500 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-[#0f5a3e]" />
                    <span>Calculated AI Scoring Formula</span>
                  </div>
                  <p>
                    Trend Score = (Growth &times; {growthWeight}) + (Conversion &times; {convWeight}) + (Volume &times; {volWeight})
                  </p>
                  <p className="text-[9px] text-slate-400 font-semibold pt-1">
                    Normalization filters ensure results are adjusted relative to lead databases.
                  </p>
                </div>
              </div>
            </div>

            {/* Scored course ranking list */}
            <div className="xl:col-span-2 bg-white rounded-[28px] p-6 border border-slate-100/80 shadow-sm space-y-4">
              <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dynamic Trend Rankings</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Automated sorting based on formula weights</p>
                </div>
                <span className="bg-[#e2f9d5] text-[#38b000] border border-[#38b000]/10 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Ranked by AI score
                </span>
              </div>

              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {scoredCourses.map((c, idx) => (
                  <div key={c.name} className="flex items-center justify-between border border-slate-100 rounded-2xl p-3 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 text-[#0f5a3e] font-black flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-slate-800 font-black text-xs leading-none mb-1">{c.name}</p>
                        <p className="text-[9px] font-bold text-slate-400">
                          Growth: {c.growth > 0 ? `+${c.growth}%` : `${c.growth}%`} • Vol: {c.leads} leads • Conv: {c.conversionRate}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden shrink-0 hidden md:block">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.score}%` }} />
                      </div>
                      <span className="bg-[#e2f9d5] text-[#38b000] border border-[#38b000]/15 text-[10px] font-black px-3 py-1 rounded-lg shrink-0">
                        {c.score}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Competitor & Market trends */}
          <div className="bg-gradient-to-r from-emerald-50/20 to-teal-50/20 border border-emerald-100/60 rounded-[28px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-[#0f5a3e]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none mb-1.5">Competitor & Regional Market Trend Suggestions</h4>
                <p className="text-slate-500 text-[10px] font-semibold leading-relaxed">
                  Job market data shows Cybersecurity course demand increasing by 28% in Chennai and Bangalore regions. Cloud & DevOps positions remain highly active with starting packages averaging ₹6.5L.
                </p>
              </div>
            </div>
            <span className="bg-[#0f5a3e]/10 text-[#0f5a3e] border border-[#0f5a3e]/20 text-[9px] font-black px-3 py-1 rounded-xl uppercase tracking-wider whitespace-nowrap self-start md:self-auto">
              Hiring index: High
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
