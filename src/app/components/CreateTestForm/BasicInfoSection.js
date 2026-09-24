import { useState } from "react";
import { DEFAULT_COLLEGES } from "@/constants/colleges";

export default function BasicInfoSection({
  testName,
  setTestName,
  domain,
  setDomain,
  college,
  setCollege,
  trainerName,
  setTrainerName,
  testNumber,
  colleges = DEFAULT_COLLEGES,
  setColleges,
  description,
  setDescription,
  domains,
  password,
  setPassword,
}) {
  const [showCollegeInput, setShowCollegeInput] = useState(false);
  const [newCollege, setNewCollege] = useState("");

  const addCollege = () => {
    const trimmedName = newCollege.trim();
    if (!trimmedName) return;

    const nextColleges = colleges.includes(trimmedName)
      ? colleges
      : [...colleges, trimmedName];
    setColleges(nextColleges);
    setCollege(trimmedName);
    setNewCollege("");
    setShowCollegeInput(false);
    localStorage.setItem("colleges", JSON.stringify(nextColleges));
  };

  return (
    <div className="space-y-4">
      {/* Generated test name Card */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-cyan-50/60 border border-blue-100 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
            <div className="w-2.5 h-2.5 bg-gradient-to-r from-[#1D4ED8] to-[#00BCD4] rounded-full ring-2 ring-blue-200" />
            Generated Test Identifier *
          </label>
          <span className="text-[11px] text-blue-600 font-medium bg-white/80 px-2 py-0.5 rounded-full border border-blue-100">
            Auto-composed from selections
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            value={testName}
            readOnly
            className="w-full h-11 border border-blue-200/70 rounded-lg px-4 text-sm bg-white text-gray-800 font-mono font-medium shadow-inner tracking-wide"
            placeholder="Domain, Trainer, College, and Test Number will form the test name"
            required
          />
        </div>
      </div>

      {/* Test identity and access details - Squarish Card Tile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Test Domain */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🎯</span>
              <label className="text-xs font-bold text-gray-800">
                Test Domain <span className="text-rose-500">*</span>
              </label>
            </div>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Required</span>
          </div>
          <div className="relative">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full h-11 border border-slate-200 rounded-lg px-3.5 pr-9 text-sm focus:ring-2 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4] appearance-none bg-slate-50/50 hover:bg-white cursor-pointer text-gray-800 transition-colors font-medium"
              required
            >
              <option value="" className="text-gray-400">Select a domain...</option>
              {domains.map((domainOption) => (
                <option key={domainOption.value} value={domainOption.value}>
                  {domainOption.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. Trainer Name */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">👤</span>
              <label className="text-xs font-bold text-gray-800">
                Trainer Name <span className="text-rose-500">*</span>
              </label>
            </div>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Required</span>
          </div>
          <input
            type="text"
            value={trainerName}
            onChange={(e) => setTrainerName(e.target.value)}
            className="w-full h-11 border border-slate-200 rounded-lg px-3.5 text-sm focus:ring-2 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4] bg-slate-50/50 hover:bg-white text-gray-800 transition-colors font-medium"
            placeholder="Enter trainer name"
            required
          />
        </div>

        {/* 3. College Selection */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🏫</span>
              <label className="text-xs font-bold text-gray-800">
                College <span className="text-rose-500">*</span>
              </label>
            </div>
            {!showCollegeInput ? (
              <button
                type="button"
                onClick={() => setShowCollegeInput(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors"
              >
                + Add College
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNewCollege("");
                  setShowCollegeInput(false);
                }}
                className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
          {showCollegeInput ? (
            <div className="flex gap-1.5 h-11">
              <input
                type="text"
                value={newCollege}
                onChange={(e) => setNewCollege(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCollege();
                  }
                }}
                placeholder="Enter college name"
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-blue-200 px-3 text-sm focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] bg-white font-medium"
              />
              <button
                type="button"
                onClick={addCollege}
                disabled={!newCollege.trim()}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="relative">
              <select
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full h-11 border border-slate-200 rounded-lg px-3.5 pr-9 text-sm focus:ring-2 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4] appearance-none bg-slate-50/50 hover:bg-white cursor-pointer text-gray-800 transition-colors font-medium"
              >
                <option value="" className="text-gray-400">Select a college...</option>
                {colleges.map((collegeName) => (
                  <option key={collegeName} value={collegeName}>
                    {collegeName}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* 4. Password */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔒</span>
              <label className="text-xs font-bold text-gray-800">
                Password <span className="text-rose-500">*</span>
              </label>
            </div>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Access Code</span>
          </div>
          <div className="relative">
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 border border-slate-200 rounded-lg px-3.5 pl-9 text-sm focus:ring-2 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4] bg-slate-50/50 hover:bg-white font-mono text-gray-800 transition-colors font-medium"
              placeholder="Access password"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 5. Short Description */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📝</span>
              <label className="text-xs font-bold text-gray-800">
                Description
              </label>
            </div>
            <span className="text-[10px] font-medium text-slate-400">Optional</span>
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-11 border border-slate-200 rounded-lg px-3.5 text-sm focus:ring-2 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4] bg-slate-50/50 hover:bg-white text-gray-800 transition-colors font-medium"
            placeholder="Brief domain description"
          />
        </div>

        {/* 6. Test Number */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔢</span>
              <label className="text-xs font-bold text-gray-800">
                Test Number <span className="text-rose-500">*</span>
              </label>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">Auto</span>
          </div>
          <input
            type="text"
            value={testNumber}
            readOnly
            className="w-full h-11 border border-slate-200 rounded-lg px-3.5 text-sm bg-slate-100/80 text-gray-700 font-mono font-semibold cursor-not-allowed"
            placeholder="Auto-generated"
            required
          />
        </div>
      </div>

      {/* Subtle separator */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
        <div className="w-1.5 h-1.5 bg-[#00BCD4] rounded-full" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </div>
    </div>
  );
}