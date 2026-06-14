"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  BookOpen, Search, Plus, ChevronDown, Check, GraduationCap, Clock, 
  DollarSign, Activity, Award, Sparkles, CheckCircle2, TrendingUp, 
  ChevronRight, X, Briefcase, Star, User, Percent, ShieldAlert, RefreshCw,
  Users
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";

interface Lead {
  id: string;
  student_name: string;
  phone_number: string;
  interested_course: string;
  lead_source: string;
  counselor_name: string;
  followup_status: string;
  admission_status: string;
  fees: number;
  lead_score: number;
  created_date: string;
}

interface Admission {
  id: string;
  student_name: string;
  phone_number: string;
  email: string;
  course: string;
  total_fee: number;
  amount_paid: number;
  pending_amount: number;
  emi_status: string;
  counselor_name: string;
  admission_date: string;
}

interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  fee: number;
  enrolledStudents: number;
  admissionStatus: "Open" | "Closed";
  trainerName: string;
  trainerExperience: string;
  placementPercentage: number;
  rating: number;
  syllabus: string[];
  emiOptions: string;
  batchTimings: string[];
  reviews: { student: string; text: string; rating: number }[];
  aiInsight: string;
  placementPartners: string[];
  max_price?: number;
  discount?: number;
  mode?: string;
  leadsGenerated?: number;
  revenue?: number;
}

import { AddCourseModal } from "@/components/courses/AddCourseModal";



export default function CoursesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [dbCourses, setDbCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "analytics" | "ai-copilot">("catalog");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedDuration, setSelectedDuration] = useState("All Durations");
  const [selectedFeeRange, setSelectedFeeRange] = useState("All Fees");
  const [selectedPopularity, setSelectedPopularity] = useState("All Courses");
  const [selectedActiveBatches, setSelectedActiveBatches] = useState("All Batches");

  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Selected Course for Details Modal
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);

  // AI Recommendation Engine local states
  const [studentInterest, setStudentInterest] = useState("Web Development");
  const [predictedAdmissionScore, setPredictedAdmissionScore] = useState(88);

  const fetchData = async () => {
    try {
      const [leadsRes, admissionsRes, coursesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/leads`),
        fetch(`${BACKEND_URL}/api/admissions`),
        fetch(`${BACKEND_URL}/api/courses`)
      ]);
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (admissionsRes.ok) setAdmissions(await admissionsRes.json());
      if (coursesRes.ok) setDbCourses(await coursesRes.json());
    } catch (err) {
      console.warn("Failed to load catalog stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 🔗 Supabase Realtime synchronization channels
    const coursesChannel = supabase
      .channel('courses-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          console.log('[Realtime] Leads updated, reloading courses...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admissions' },
        () => {
          console.log('[Realtime] Admissions updated, reloading courses...');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(coursesChannel);
    };
  }, []);

  // Compute dynamic database counts and merge into catalog courses
  const dynamicCoursesList = useMemo(() => {
    return dbCourses.map(c => {
      const enrolled = admissions.filter(a => a.course === c.title).length;
      const totalLead = leads.filter(l => l.interested_course === c.title).length;
      const rev = admissions.filter(a => a.course === c.title).reduce((s, a) => s + a.amount_paid, 0);

      return {
        ...c,
        enrolledStudents: enrolled > 0 ? enrolled : (c.enrolledStudents || 0),
        leadsGenerated: totalLead > 0 ? totalLead : Math.round((c.enrolledStudents || 10) * 2.6),
        revenue: rev > 0 ? rev : (enrolled > 0 ? enrolled * c.fee : (c.enrolledStudents || 0) * c.fee)
      };
    });
  }, [dbCourses, leads, admissions]);

  // Unique lists computed from dynamic courses
  const categories = useMemo(() => {
    const list = new Set<string>();
    dbCourses.forEach(c => { if (c.category) list.add(c.category); });
    return ["All Categories", ...Array.from(list).sort()];
  }, [dbCourses]);

  // Filter Catalog List
  const filteredCourses = useMemo(() => {
    return dynamicCoursesList.filter(c => {
      const matchesSearch = 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.syllabus.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.trainerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === "All Categories" || c.category === selectedCategory;
      
      let matchesDur = true;
      if (selectedDuration !== "All Durations") {
        matchesDur = c.duration === selectedDuration;
      }

      let matchesFee = true;
      if (selectedFeeRange !== "All Fees") {
        if (selectedFeeRange === "Under ₹50k") matchesFee = c.fee < 50000;
        else if (selectedFeeRange === "₹50k - ₹90k") matchesFee = c.fee >= 50000 && c.fee <= 90000;
        else if (selectedFeeRange === "Above ₹90k") matchesFee = c.fee > 90000;
      }

      let matchesPop = true;
      if (selectedPopularity === "Popular (Rating >= 4.7)") {
        matchesPop = c.rating >= 4.7;
      }

      let matchesBatch = true;
      if (selectedActiveBatches === "Admissions Open") {
        matchesBatch = c.admissionStatus === "Open";
      }

      return matchesSearch && matchesCat && matchesDur && matchesFee && matchesPop && matchesBatch;
    });
  }, [dynamicCoursesList, searchQuery, selectedCategory, selectedDuration, selectedFeeRange, selectedPopularity, selectedActiveBatches]);

  // --- Analytics Panel Calculations ---

  // 1. Most Demanded Courses (Lead volumes)
  const demandChartData = useMemo(() => {
    return dynamicCoursesList
      .map(c => ({ name: c.title, leads: c.leadsGenerated || 40 }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);
  }, [dynamicCoursesList]);

  // 2. Highest Revenue Slices
  const revenueChartData = useMemo(() => {
    return dynamicCoursesList
      .map(c => ({ name: c.title, value: c.revenue || 500000 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [dynamicCoursesList]);

  // 3. Category Completion Rates
  const categoryCompletionRates = useMemo(() => {
    const list = [
      { category: "Web Development", completion: 88, trending: "+12%" },
      { category: "AI & Data", completion: 94, trending: "+25%" },
      { category: "Cyber Security", completion: 82, trending: "+5%" },
      { category: "Cloud & DevOps", completion: 90, trending: "+18%" }
    ];
    return list;
  }, []);

  // AI Recommended Courses computation
  const aiRecommendedCourses = useMemo(() => {
    const matched = dynamicCoursesList.filter(c => c.category.toLowerCase().includes(studentInterest.toLowerCase()) || studentInterest.toLowerCase().includes(c.category.toLowerCase()));
    if (matched.length === 0) return dynamicCoursesList.slice(0, 2);
    return matched;
  }, [studentInterest, dynamicCoursesList]);

  useEffect(() => {
    // Simulated predictions shift based on selected interest
    const base = studentInterest === "AI & Data" ? 95 : studentInterest === "Web Development" ? 91 : 86;
    setPredictedAdmissionScore(base);
  }, [studentInterest]);

  // Helper Custom dropdown menu
  const renderFilterDropdown = (
    label: string, 
    value: string, 
    options: string[], 
    onChange: (val: string) => void, 
    id: string
  ) => {
    const isOpen = activeDropdown === id;
    return (
      <div className="relative">
        <button 
          onClick={() => setActiveDropdown(isOpen ? null : id)}
          className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}:</span>
          <span className="text-slate-900 font-black">{value}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setActiveDropdown(null)} />
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 py-1.5 animate-in fade-in slide-in-from-top-2 duration-100 max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setActiveDropdown(null);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-[#0f5a3e]/10 hover:text-[#0f5a3e] flex items-center justify-between transition-colors"
                >
                  {opt}
                  {value === opt && <Check className="w-3.5 h-3.5 text-[#0f5a3e]" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-[#8a8c96]">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-[#0f5a3e]" />
        <p className="text-sm font-bold">Assembling course logs...</p>
      </div>
    );
  }

  const chartColors = ["#0f5a3e", "#25a87b", "#ff8e3c", "#3ca2ff", "#10b981"];

  return (
    <div className="w-full space-y-6 pb-8 text-[#1c1d21]">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#0f5a3e] text-white px-4.5 py-2.5 rounded-full flex items-center gap-2 font-black text-sm shadow-sm border border-black/5">
            <BookOpen className="w-4.5 h-4.5 text-white" />
            <span>Courses</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Courses Catalog & Analytics</h2>
            <p className="text-slate-400 text-xs font-semibold">Interactive syllabus catalogs, class enrollments and AI trending predictions</p>
          </div>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-[#0f5a3e] hover:bg-[#0a3f2b] text-white px-5 py-2.5 rounded-xl text-xs font-black hover:scale-105 transition-all shadow-md shadow-[#0f5a3e]/10 self-start md:self-auto">
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {/* 2. Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-6">
        {[
          { id: "catalog", label: "Courses Catalog", icon: <BookOpen className="w-4 h-4" /> },
          { id: "analytics", label: "Course Performance Analytics", icon: <Activity className="w-4 h-4" /> },
          { id: "ai-copilot", label: "AI Recommendations", icon: <Sparkles className="w-4 h-4" /> }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3.5 text-xs font-black border-b-2 transition-all select-none ${
                isActive 
                  ? "border-[#0f5a3e] text-[#0f5a3e]" 
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}

      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Filters Toolbar */}
          <div className="bg-slate-50/85 rounded-[24px] p-4 border border-slate-200/50 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by topic, course title, trainer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 outline-none focus:border-slate-400 transition-colors shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {renderFilterDropdown("Category", selectedCategory, categories, setSelectedCategory, "cat")}
              {renderFilterDropdown("Duration", selectedDuration, ["All Durations", "3 Months", "6 Months"], setSelectedDuration, "dur")}
              {renderFilterDropdown("Fee Range", selectedFeeRange, ["All Fees", "Under ₹50k", "₹50k - ₹90k", "Above ₹90k"], setSelectedFeeRange, "fee")}
              {renderFilterDropdown("Popular", selectedPopularity, ["All Courses", "Popular (Rating >= 4.7)"], setSelectedPopularity, "pop")}
              {renderFilterDropdown("Batches", selectedActiveBatches, ["All Batches", "Admissions Open"], setSelectedActiveBatches, "batch")}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course) => (
              <div 
                key={course.id} 
                className="bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-[#0f5a3e]/10 text-[#0f5a3e] border border-[#0f5a3e]/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">
                      {course.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-slate-800 font-extrabold text-xs">{course.rating}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-black text-slate-800 mb-3 group-hover:text-[#0f5a3e] transition-colors leading-snug">
                    {course.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-slate-500 text-[10px] font-bold border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">{course.placementPercentage}% Placed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.enrolledStudents} Enrolled</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[80px]">{course.trainerName}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4.5">
                    <div>
                      <p className="text-[8.5px] text-slate-400 font-black uppercase tracking-wider">Course Fee</p>
                      <p className="text-slate-800 font-black text-sm">₹{course.fee.toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider ${
                      course.admissionStatus === "Open" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}>
                      Admissions {course.admissionStatus}
                    </span>
                  </div>

                  <button 
                    onClick={() => setViewingCourse(course)}
                    className="w-full py-2.5 rounded-xl bg-[#0f5a3e] hover:bg-[#0a3f2b] text-white text-xs font-black shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredCourses.length === 0 && (
            <div className="bg-white rounded-[28px] border border-slate-100 p-16 text-center text-slate-400 text-xs font-semibold shadow-sm">
              No courses found matching selected catalog filters.
            </div>
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Most Demanded Courses */}
          <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="pb-3 border-b border-slate-50 mb-5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Most Demanded Technology Courses</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Calculated by lead inquiries and active follow-ups</p>
            </div>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandChartData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569', fontWeight: 'black' }} width={120} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1c1d21', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="leads" fill="#0f5a3e" radius={[0, 6, 6, 0]} name="Lead Inquiries" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Highest Revenue Yield */}
          <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="pb-3 border-b border-slate-50 mb-5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Revenue Contribution Share</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Fee collections contribution percentage per course</p>
            </div>
            
            <div className="h-[200px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {revenueChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`₹${(value as number).toLocaleString()}`, 'Collections']}
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1c1d21', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-black text-slate-400">TOTAL</span>
                <span className="text-base font-black text-slate-800">
                  ₹{revenueChartData.reduce((s, x) => s + x.value, 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-50">
              {revenueChartData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 border border-slate-100 rounded-xl p-2 bg-slate-50/30">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: chartColors[idx % chartColors.length] }} />
                  <span className="text-[9.5px] font-bold text-slate-500 truncate max-w-[120px]">{item.name}</span>
                  <span className="text-[9.5px] text-slate-800 ml-auto font-black">₹{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student Completion Analytics */}
          <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm xl:col-span-2 space-y-5">
            <div className="pb-2 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Student Completion & Trending Index</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Average course module completion rate by category</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {categoryCompletionRates.map((c, idx) => (
                <div key={idx} className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-800 font-extrabold text-xs">{c.category}</span>
                    <span className="text-[9px] bg-emerald-50 text-[#0f5a3e] border border-emerald-100 px-2 py-0.5 rounded-full font-black">
                      {c.trending} Trend
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>COMPLETION RATE</span>
                      <span className="text-slate-850">{c.completion}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.completion}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === "ai-copilot" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Left: Input parameters */}
          <div className="xl:col-span-1 bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-[#0f5a3e]" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">AI Placement Assistant</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Student Academic Field</label>
                <div className="flex flex-col gap-2">
                  {["Web Development", "AI & Data", "Cyber Security", "Design"].map(f => (
                    <button
                      key={f}
                      onClick={() => setStudentInterest(f)}
                      className={`w-full py-2.5 px-4 rounded-xl border text-left font-bold transition-all ${
                        studentInterest === f
                          ? "bg-[#0f5a3e] text-white border-[#0f5a3e]"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#0f5a3e]" />
                  <h4 className="text-[#0f5a3e] font-black text-xs uppercase tracking-wide">Admission Prediction Index</h4>
                </div>
                <p className="text-slate-500 text-[10px] font-bold leading-normal">
                  Inquiries in this field show a placement conversion probability of **{predictedAdmissionScore}%** inside our network.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Predicted matches */}
          <div className="xl:col-span-2 bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-855 uppercase tracking-wider">Recommended Course Options</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Top technology programs matching selected candidate profile parameters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiRecommendedCourses.map(course => (
                <div key={course.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4 hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-800 text-xs">{course.title}</h4>
                    <span className="bg-emerald-50 text-[#0f5a3e] border border-emerald-100 px-2 py-0.5 rounded-full font-black text-[9px]">
                      {course.placementPercentage}% Placed
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#0f5a3e]" /> AI Recommendation Score
                    </p>
                    <p className="text-slate-500 text-[10px] font-semibold leading-relaxed">
                      {course.aiInsight}
                    </p>
                  </div>

                  <button 
                    onClick={() => setViewingCourse(course)}
                    className="w-full py-2 bg-white border border-slate-200 text-slate-600 hover:bg-[#0f5a3e] hover:text-white hover:border-transparent transition-all rounded-xl text-[10px] font-black"
                  >
                    View syllabus roadmap
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 4. Course Details Modal */}
      {viewingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 relative border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={() => setViewingCourse(null)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-4 mb-6">
              <span className="bg-[#0f5a3e]/10 text-[#0f5a3e] border border-[#0f5a3e]/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg mb-2 inline-block">
                {viewingCourse.category}
              </span>
              <h2 className="text-xl font-black text-slate-800 tracking-tight leading-snug">{viewingCourse.title}</h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Syllabus overview, active fees, timings & predictive analysis</p>
            </div>

            {/* Modal Body Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column (Span 2) */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Syllabus Checklist */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syllabus modules roadmap</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {viewingCourse.syllabus.map((topic, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#0f5a3e] shrink-0 mt-0.5" />
                        <span className="text-slate-700 font-bold leading-normal">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trainer Information */}
                <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-2">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Assigned Trainer Background</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-slate-800 font-extrabold text-xs">{viewingCourse.trainerName}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{viewingCourse.trainerExperience} teaching track records</p>
                    </div>
                  </div>
                </div>

                {/* Student reviews */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Student Reviews</h4>
                  <div className="space-y-2.5">
                    {viewingCourse.reviews.map((rev, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-slate-800 font-extrabold text-xs">{rev.student}</p>
                          <div className="flex gap-0.5">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-500 text-[11px] font-medium leading-relaxed italic">
                          &quot;{rev.text}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column (Span 1) */}
              <div className="md:col-span-1 space-y-6">
                
                {/* Financial Summary card */}
                <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fee Structure</h4>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-bold text-slate-500">TOTAL FEE</span>
                    <span className="text-slate-800 font-black text-lg">₹{viewingCourse.fee.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">EMI Installment Slots</p>
                    <p className="text-slate-700 font-extrabold text-[10px]">{viewingCourse.emiOptions}</p>
                  </div>
                </div>

                {/* Batch timimg slots */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Timings</h4>
                  <div className="flex flex-col gap-2">
                    {viewingCourse.batchTimings.map((time, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 font-bold text-xs flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Insight panel */}
                <div className="bg-[#0f5a3e]/10 border border-[#0f5a3e]/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0f5a3e]" />
                    <h4 className="text-[#0f5a3e] font-black text-xs uppercase tracking-wide">Predictive AI Insights</h4>
                  </div>
                  <p className="text-slate-600 text-[10px] font-semibold leading-relaxed">
                    {viewingCourse.aiInsight}
                  </p>
                </div>

                {/* Placement support */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Placement Partnerships</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingCourse.placementPartners.map((comp, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200/50">
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Add Course Modal */}
      <AddCourseModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchData} 
      />

    </div>
  );
}
