"use client";

import { useState } from "react";
import { BACKEND_URL } from "@/lib/config";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const COURSES = [
  "Data Analytics",
  "Data Science",
  "Data Science with Gen AI",
  "Digital Marketing - Level 1",
  "Digital Marketing - Level 2",
  "Full stack Developer",
  "Excel",
  "Tally prime",
  "SAP Fico / MM with server",
  "Cybersecurity"
];

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    student_name: "",
    phone_number: "",
    email: "",
    interested_course: "",
    city: "",
    education: "",
    preferred_time: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/public/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit inquiry");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 text-center transform transition-all">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Application Received!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Thank you for your interest in AcadFlow Academy. Our admissions team will contact you shortly to discuss your learning journey.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setFormData({ student_name: "", phone_number: "", email: "", interested_course: "", city: "", education: "", preferred_time: "" });
            }}
            className="w-full bg-slate-900 text-white font-medium py-3 px-6 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Submit Another Inquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Admissions Open 2026</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4">
            Accelerate Your Career
          </h1>
          <p className="text-lg text-slate-600">
            Join thousands of successful alumni. Take the first step towards your dream job.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 px-8 py-6 text-white">
            <h2 className="text-xl font-semibold">Student Inquiry Form</h2>
            <p className="text-slate-400 text-sm mt-1">Please fill in your details below.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="student_name" className="block text-sm font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  id="student_name"
                  name="student_name"
                  required
                  value={formData.student_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-slate-50 focus:bg-white"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone_number" className="block text-sm font-medium text-slate-700">Phone Number *</label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  required
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-slate-50 focus:bg-white"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-slate-50 focus:bg-white"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="interested_course" className="block text-sm font-medium text-slate-700">Course Interested In *</label>
              <div className="relative">
                <select
                  id="interested_course"
                  name="interested_course"
                  required
                  value={formData.interested_course}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-slate-50 focus:bg-white appearance-none"
                >
                  <option value="" disabled>Select a course</option>
                  {COURSES.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="city" className="block text-sm font-medium text-slate-700">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-slate-50 focus:bg-white"
                  placeholder="e.g. Bangalore"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="preferred_time" className="block text-sm font-medium text-slate-700">Preferred Contact Time</label>
                <div className="relative">
                  <select
                    id="preferred_time"
                    name="preferred_time"
                    value={formData.preferred_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-slate-50 focus:bg-white appearance-none"
                  >
                    <option value="">Any Time</option>
                    <option value="Morning">Morning (9 AM - 12 PM)</option>
                    <option value="Afternoon">Afternoon (12 PM - 4 PM)</option>
                    <option value="Evening">Evening (4 PM - 7 PM)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="education" className="block text-sm font-medium text-slate-700">Education Background</label>
              <input
                type="text"
                id="education"
                name="education"
                value={formData.education}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-slate-50 focus:bg-white"
                placeholder="e.g. B.Tech Computer Science, 2024"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all disabled:opacity-70 flex items-center justify-center space-x-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Enquiry</span>
              )}
            </button>
            <p className="text-center text-xs text-slate-500 mt-4">
              By submitting this form, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
