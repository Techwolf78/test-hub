import { useState } from "react";

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
  colleges,
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
      {/* Generated test name */}
      <div>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
          <div className="w-2 h-2 bg-gradient-to-r from-[#1D4ED8] to-[#00BCD4] rounded-full" />
          <span className="sr-only">Test Name</span>
          <span className="text-sm">Generated Test Name *</span>
        </label>
        <input
          type="text"
          value={testName}
          readOnly
          className="w-full border border-blue-100 rounded-md px-3 py-2 text-sm bg-blue-50 text-gray-700 font-mono"
          placeholder="Select a college, trainer, domain, and test number"
          required
        />
      </div>

      {/* Test identity and access details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
        {/* Domain Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Test Domain *
          </label>
          <div className="relative">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full border border-blue-100 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-[#00BCD4] focus:border-[#00BCD4] appearance-none bg-white cursor-pointer"
              required
            >
              <option value="" className="text-gray-400">Select a domain...</option>
              {domains.map((domainOption) => (
                <option key={domainOption.value} value={domainOption.value}>
                  {domainOption.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-[#1D4ED8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Trainer Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Trainer Name *
          </label>
          <input
            type="text"
            value={trainerName}
            onChange={(e) => setTrainerName(e.target.value)}
            className="w-full border border-blue-100 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-[#00BCD4] focus:border-[#00BCD4] bg-white"
            placeholder="Enter trainer name"
            required
          />
        </div>

        {/* Test Number */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Test Number *
          </label>
          <input
            type="text"
            value={testNumber}
            readOnly
            className="w-full border border-blue-100 rounded-md px-3 py-2 text-sm bg-blue-50 text-gray-700"
            placeholder="Select college and domain"
            required
          />
        </div>

        {/* College Selection */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-gray-700">
              College
            </label>
            {!showCollegeInput && (
              <button
                type="button"
                onClick={() => setShowCollegeInput(true)}
                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Add College
              </button>
            )}
          </div>
          {showCollegeInput && (
            <div className="mb-2 flex gap-2">
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
                className="min-w-0 flex-1 rounded-md border border-blue-200 px-3 py-2 text-sm focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
              />
              <button
                type="button"
                onClick={addCollege}
                disabled={!newCollege.trim()}
                className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewCollege("");
                  setShowCollegeInput(false);
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
          <select
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            className="w-full border border-blue-100 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-[#00BCD4] focus:border-[#00BCD4] bg-white cursor-pointer"
          >
            <option value="">Select a college...</option>
            {colleges.map((collegeName) => (
              <option key={collegeName} value={collegeName}>
                {collegeName}
              </option>
            ))}
          </select>
        </div>

        {/* Password (compact) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
          <div className="relative">
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-blue-100 rounded-md px-3 py-2 pl-10 text-sm focus:ring-1 focus:ring-[#00BCD4] focus:border-[#00BCD4] bg-white font-mono"
              placeholder="Access password"
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <svg className="w-4 h-4 text-[#1D4ED8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Password is required for students to start the test</p>
        </div>

        {/* Short Description (compact textarea) */}
        <div className="lg:col-span-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-blue-100 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-[#00BCD4] focus:border-[#00BCD4] bg-white resize-none"
            rows={2}
            placeholder="Brief domain description"
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