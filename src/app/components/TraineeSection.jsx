"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Users,
  Trash2,
  Copy,
  Check,
  Search,
  Shield,
  Sparkles,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createTraineeAccount,
  getTrainees,
  deleteTraineeRecord,
  sendTraineePasswordReset,
} from "../../lib/traineeOperations";

export default function TraineeSection() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendResetEmail, setSendResetEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [trainees, setTrainees] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [lastCreated, setLastCreated] = useState(null);
  const [sendingResetId, setSendingResetId] = useState(null);

  // Fetch trainees on mount
  useEffect(() => {
    loadTrainees();
  }, []);

  const loadTrainees = async () => {
    setLoadingList(true);
    try {
      const list = await getTrainees();
      setTrainees(list);
    } catch (error) {
      console.error("Failed to load trainees:", error);
      toast.error("Failed to load trainees list");
    } finally {
      setLoadingList(false);
    }
  };

  const handleCreateTrainee = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const newTrainee = await createTraineeAccount({
        email: trimmedEmail,
        password,
        sendResetEmail,
      });

      if (newTrainee.resetEmailSent) {
        toast.success(`Account created & Password Reset Email sent to ${trimmedEmail}! 🎉`);
      } else {
        toast.success(`Trainee account created for ${trimmedEmail}! 🎉`);
      }

      setLastCreated({
        email: trimmedEmail,
        password,
        resetEmailSent: newTrainee.resetEmailSent,
      });
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      await loadTrainees();
    } catch (error) {
      console.error("Creation error:", error);
      let errorMsg = error.message;
      if (error.code === "auth/email-already-in-use") {
        errorMsg = "An account with this email already exists.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMsg = "Password should be at least 6 characters.";
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (traineeEmail, id) => {
    setSendingResetId(id);
    try {
      await sendTraineePasswordReset(traineeEmail);
      toast.success(`Password reset email sent to ${traineeEmail}! ✉️`);
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error("Failed to send reset email. Verify email format.");
    } finally {
      setSendingResetId(null);
    }
  };

  const handleDeleteTrainee = async (uid, traineeEmail) => {
    if (
      !window.confirm(
        `Are you sure you want to remove the trainee account for "${traineeEmail}"?`
      )
    ) {
      return;
    }

    try {
      await deleteTraineeRecord(uid);
      toast.success("Trainee account removed");
      setTrainees((prev) => prev.filter((t) => t.id !== uid));
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete trainee account");
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTrainees = trainees.filter((t) =>
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;
  const passwordsMismatch =
    password && confirmPassword && password !== confirmPassword;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl border border-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Trainer Management
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Create login credentials for new trainers and oversee active trainer accounts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-sm text-blue-700 font-medium">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Total Trainers: {trainees.length}</span>
          </div>
          <button
            onClick={loadTrainees}
            disabled={loadingList}
            className="p-2 border border-gray-200 hover:border-gray-300 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw
              className={`w-4 h-4 ${loadingList ? "animate-spin text-blue-600" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Main Grid: Add Form + Trainees List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Create Trainer Card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6 sticky top-24">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
              <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg text-white">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add New Trainer
                </h2>
                <p className="text-xs text-gray-500">
                  Generate login email and password for a trainer
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTrainee} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Trainer Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="e.g. trainer@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Set Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2.5 bg-gray-50/50 border rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white transition-all ${
                      passwordsMismatch
                        ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                        : passwordsMatch
                        ? "border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password Match Status */}
                {passwordsMismatch && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                  </p>
                )}
              </div>

              {/* Automatic Password Reset Email Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="sendResetEmail"
                  type="checkbox"
                  checked={sendResetEmail}
                  onChange={(e) => setSendResetEmail(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="sendResetEmail"
                  className="text-xs text-gray-600 cursor-pointer select-none font-medium"
                >
                  Send password reset email to trainer automatically
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  loading ||
                  !email.trim() ||
                  !password ||
                  !confirmPassword ||
                  password !== confirmPassword
                }
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium text-sm shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating & Dispatching Email...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Trainer Credentials</span>
                  </>
                )}
              </button>
            </form>

            {/* Recently Created Credentials Banner */}
            {lastCreated && (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Account Generated Successfully
                  </span>
                  <button
                    onClick={() => {
                      const msg = `Welcome to the Platform!\nYour Trainer Account Details:\nEmail: ${lastCreated.email}\nInitial Password: ${lastCreated.password}\nLogin URL: ${window.location.origin}/login\n(A password reset link has also been sent to your email).`;
                      handleCopy(msg, "lastCreated");
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1"
                  >
                    {copiedId === "lastCreated" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Copied Full Invite
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Invite Info
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-emerald-900 bg-white/80 p-3 rounded-lg border border-emerald-100 font-mono space-y-1.5">
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span className="font-semibold">{lastCreated.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Password:</span>{" "}
                    <span className="font-semibold">{lastCreated.password}</span>
                  </div>
                  {lastCreated.resetEmailSent && (
                    <div className="pt-1 text-[11px] text-blue-700 flex items-center gap-1 font-sans">
                      <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Password reset email dispatched to trainer inbox</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Existing Trainers List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Registered Trainers
                </h2>
                <p className="text-xs text-gray-500">
                  All accounts with Trainer role
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trainer email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Trainers List Container */}
            <div className="mt-4 space-y-3">
              {loadingList ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-xs">Loading trainer accounts...</p>
                </div>
              ) : filteredTrainees.length === 0 ? (
                <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl p-8">
                  <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-600">
                    {searchTerm ? "No trainers match your search" : "No Trainers Created Yet"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {searchTerm
                      ? "Try searching with a different keyword."
                      : "Use the form on the left to add your first trainer."}
                  </p>
                </div>
              ) : (
                filteredTrainees.map((trainee) => {
                  const createdDate = trainee.createdAt?.toDate
                    ? trainee.createdAt.toDate().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recently";

                  const isSendingReset = sendingResetId === trainee.id;

                  return (
                    <div
                      key={trainee.id}
                      className="flex items-center justify-between p-4 bg-gray-50/40 hover:bg-white border border-gray-200/80 hover:border-gray-300 rounded-xl transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm shrink-0 uppercase border border-blue-200">
                          {trainee.email?.charAt(0) || "T"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {trainee.email}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Trainer
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Created: {createdDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Send Password Reset Email Button */}
                        <button
                          onClick={() => handleSendResetEmail(trainee.email, trainee.id)}
                          disabled={isSendingReset}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1 text-xs font-medium"
                          title="Send Password Reset Email to Trainer"
                        >
                          {isSendingReset ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Send Reset Link</span>
                        </button>

                        {/* Copy Email Button */}
                        <button
                          onClick={() => handleCopy(trainee.email, trainee.id)}
                          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                          title="Copy Email"
                        >
                          {copiedId === trainee.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete Trainee Button */}
                        <button
                          onClick={() =>
                            handleDeleteTrainee(trainee.id, trainee.email)
                          }
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Remove Trainee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
