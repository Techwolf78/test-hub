"use client";
import { useState, useEffect, useRef } from "react";
import {
  getUserTests,
  getAllTests,
  deleteTest,
  publishTest,
  unpublishTest,
  updateTest,
  clearTestResponses,
} from "../../lib/testOperations";
import DuplicateTest from "./DuplicateTest";
import CreateTestForm from "./CreateTestForm";
import { exportTestToExcel } from "@/utils/ExportToExcel";
import { exportTestToWord } from "@/utils/ExportToWord";
import {
  Download,
  Upload,
  Link2,
  Ban,
  Trash2,
  RefreshCcw,
  Edit,
  X,
  Delete,
  FileText,
  Mail,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function ViewTests({ mode = "user" }) {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Advanced filters for superadmin
  const [searchTerm, setSearchTerm] = useState("");
  const [testStatusFilter, setTestStatusFilter] = useState("all");
  const [testResponsesFilter, setTestResponsesFilter] = useState("all");
  const [testSortBy, setTestSortBy] = useState("newest");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updatingTest, setUpdatingTest] = useState(false);
  const [updatedTestData, setUpdatedTestData] = useState({
    testName: "",
    domain: "",
    description: "",
    instructions: "",
    questions: [], // Existing questions (preserved)
    newQuestions: [], // New questions to be added
    removedQuestions: [], // Questions to be removed
  });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [uploadingEmails, setUploadingEmails] = useState(false);
  const [syncingEmails, setSyncingEmails] = useState(false);
  const emailFileInputRef = useRef(null);

  // Load tests from Firestore
  useEffect(() => {
    loadTests();
  }, []);

  // Initialize update modal data when test is selected
  useEffect(() => {
    if (selectedTest && showUpdateModal) {
      setUpdatedTestData({
        testName: selectedTest.testName || "",
        domain: selectedTest.domain || "",
        description: selectedTest.description || "",
        instructions: selectedTest.instructions || "",
        password: selectedTest.password || "", // Add this line
        questions: selectedTest.questions || [], // Preserve existing questions
        newQuestions: [], // Start with empty new questions
        removedQuestions: [], // Start with empty removed questions
      });
    }
  }, [selectedTest, showUpdateModal]);

  const loadTests = async () => {
    try {
      let userTests;
      if (mode === "superadmin") {
        userTests = await getAllTests();
      } else {
        userTests = await getUserTests();
      }
      setTests(userTests);
    } catch (error) {
      console.error("Error loading tests:", error);
      setTests([]);
      toast.error("Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const refreshTestsWithSync = async () => {
    setLoading(true);
    try {
      await loadTests(); // Then refresh
    } catch (error) {
      console.error("Error in refresh with sync:", error);
      toast.error("Error refreshing tests");
    } finally {
      setLoading(false);
    }
  };

  //fix later export sync but exports the old data
  const exportTestWithSync = async () => {
    if (!selectedTest) return;

    setLoading(true);
    try {
      const test = await handleSyncQueue(); // Sync first
      exportTest(test);
    } catch (error) {
      console.error("Error in export with sync:", error);
      toast.error("Error exporting test");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this test? This action cannot be undone."
      )
    ) {
      try {
        await deleteTest(testId);
        setTests(tests.filter((test) => test.id !== testId));
        if (selectedTest?.id === testId) {
          setSelectedTest(null);
        }
        toast.success("Test deleted successfully!");
      } catch (error) {
        console.error("Error deleting test:", error);
        toast.error("Failed to delete test. Please try again.");
      }
    }
  };

  const exportTest = (test) => {
    if (!test) return;
    exportTestToExcel(test);
    toast.success("Test exported to Excel successfully!");
  };

  const exportTestToWordDoc = (test, showAnswers = false) => {
    if (!test) return;
    exportTestToWord(test, showAnswers);
    toast.success(showAnswers ? "Answer key exported successfully!" : "Question paper exported successfully!");
  };

  const handleEmailUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTest) {
      toast.error("Please select a test and file");
      return;
    }

    try {
      setUploadingEmails(true);
      const loadingToast = toast.loading("Processing emails...");

      // Read file based on type
      let newEmails = [];
      
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
          file.type === "application/vnd.ms-excel" ||
          file.name.endsWith(".xlsx") || 
          file.name.endsWith(".xls")) {
        // Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: "A" });
        
        // Extract emails from first column, starting from row 2
        newEmails = jsonData
          .slice(1) // Skip header (row 1)
          .map((row) => row.A)
          .filter((email) => email && typeof email === "string" && email.trim())
          .map((email) => email.trim().toLowerCase());
      } else if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        // CSV file
        const text = await file.text();
        const lines = text.split("\n");
        newEmails = lines
          .slice(1) // Skip header
          .map((line) => line.split(",")[0].trim().toLowerCase()) // Get first column
          .filter((email) => email && email.length > 0);
      } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        // Text file - one email per line, skip first line
        const text = await file.text();
        newEmails = text
          .split("\n")
          .slice(1) // Skip first line (header)
          .map((line) => line.trim().toLowerCase())
          .filter((email) => email && email.length > 0);
      } else {
        toast.error("Unsupported file type. Please upload CSV, Excel, or TXT file", {
          id: loadingToast,
        });
        return;
      }

      if (newEmails.length === 0) {
        toast.error("No emails found in the file", { id: loadingToast });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validNewEmails = newEmails.filter((email) => emailRegex.test(email));
      const invalidCount = newEmails.length - validNewEmails.length;

      if (validNewEmails.length === 0) {
        toast.error("No valid emails found", { id: loadingToast });
        return;
      }

      // Get existing emails and merge with new ones
      const existingEmails = selectedTest.emails || [];
      const existingEmailsLower = existingEmails.map((email) => email.toLowerCase());
      
      // Find truly new emails (not in existing list)
      const trulyNewEmails = validNewEmails.filter(
        (email) => !existingEmailsLower.includes(email)
      );

      // Merge: keep existing emails + add new ones
      const mergedEmails = [...existingEmails, ...trulyNewEmails];

      if (mergedEmails.length === existingEmails.length && trulyNewEmails.length > 0) {
        toast.info("All emails already exist", { id: loadingToast });
        return;
      }

      // Update test with merged emails
      await updateTest(selectedTest.id, {
        ...selectedTest,
        emails: mergedEmails,
      });

      // Update local state
      setTests((prev) =>
        prev.map((t) =>
          t.id === selectedTest.id ? { ...t, emails: mergedEmails } : t
        )
      );
      setSelectedTest((s) => ({ ...s, emails: mergedEmails }));

      const duplicateCount = validNewEmails.length - trulyNewEmails.length;
      const message = `Added ${trulyNewEmails.length} new email${trulyNewEmails.length !== 1 ? "s" : ""}. Total: ${mergedEmails.length}${
        duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ""
      }${invalidCount > 0 ? ` (${invalidCount} invalid emails skipped)` : ""}`;
      
      toast.success(message, { id: loadingToast });
      
      // Reset file input
      if (emailFileInputRef.current) {
        emailFileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading emails:", error);
      toast.error("Failed to upload emails: " + error.message);
    } finally {
      setUploadingEmails(false);
    }
  };

  const handleSyncEmailsToMongoDB = async () => {
    if (!selectedTest) {
      toast.error("Please select a test first");
      return;
    }

    const emails = selectedTest.emails || [];
    if (emails.length === 0) {
      toast.error("No emails to sync. Please upload emails first.");
      return;
    }

    try {
      setSyncingEmails(true);
      const loadingToast = toast.loading("Syncing emails to MongoDB...");

      const response = await fetch("/api/sync-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testId: selectedTest.id,
          emails: emails,
          testName: selectedTest.testName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to sync emails", { id: loadingToast });
        return;
      }

      // Update local state to reflect sync status
      setTests((prev) =>
        prev.map((t) =>
          t.id === selectedTest.id
            ? { ...t, emailsSyncedToMongoDB: true, lastEmailSyncAt: new Date() }
            : t
        )
      );
      setSelectedTest((s) => ({
        ...s,
        emailsSyncedToMongoDB: true,
        lastEmailSyncAt: new Date(),
      }));

      toast.success(
        `${data.message} (${data.mongoOperation === "created" ? "New collection created" : "Updated existing"})`,
        { id: loadingToast }
      );
    } catch (error) {
      console.error("Error syncing emails:", error);
      toast.error("Failed to sync emails: " + error.message);
    } finally {
      setSyncingEmails(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedTest) return;
    try {
      await publishTest(selectedTest.id);
      // Update local state
      setTests((prev) =>
        prev.map((t) =>
          t.id === selectedTest.id ? { ...t, status: "active" } : t
        )
      );
      setSelectedTest((s) => ({ ...s, status: "active" }));
      toast.success("Test published. You can now copy the link to share it.");

      // Automatically sync emails if they exist
      const emails = selectedTest.emails || [];
      if (emails.length > 0) {
        try {
          setSyncingEmails(true);
          const syncLoadingToast = toast.loading("Auto-syncing emails to MongoDB...");

          const response = await fetch("/api/sync-emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              testId: selectedTest.id,
              emails: emails,
              testName: selectedTest.testName,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            // Update local state to reflect sync status
            setTests((prev) =>
              prev.map((t) =>
                t.id === selectedTest.id
                  ? { ...t, emailsSyncedToMongoDB: true, lastEmailSyncAt: new Date() }
                  : t
              )
            );
            setSelectedTest((s) => ({
              ...s,
              emailsSyncedToMongoDB: true,
              lastEmailSyncAt: new Date(),
            }));

            toast.success(
              `Emails auto-synced (${data.mongoOperation === "created" ? "New collection created" : "Updated existing"})`,
              { id: syncLoadingToast }
            );
          } else {
            toast.error("Could not auto-sync emails", { id: syncLoadingToast });
          }
        } catch (error) {
          console.error("Error auto-syncing emails:", error);
          toast.error("Could not auto-sync emails: " + error.message);
        } finally {
          setSyncingEmails(false);
        }
      }
    } catch (error) {
      console.error(error);
      if (error.code === 'not-found' || error.message?.includes('not-found') || error.message?.includes('No document to update') || error.message?.includes('not found')) {
        toast.error("This test was already deleted from the database.");
        setTests((prev) => prev.filter((t) => t.id !== selectedTest.id));
        setSelectedTest(null);
      } else {
        toast.error("Failed to publish test. Please try again.");
      }
    }
  };

  const handleSyncQueue = async () => {
    const loadingToast = toast.loading("Syncing queue..."); // Add this
    try {
      setLoading(true);
      const res = await fetch("/api/test-submissions/sync", {
        method: "POST",
      });
      const data = await res.json();
      let updatedTest = null;
      if (res.ok) {
        toast.success(data.message || "Queue synced successfully!", {
          id: loadingToast,
        });

        // Update selectedTest with fresh data
        if (selectedTest) {
          const freshTests = mode === "superadmin" ? await getAllTests() : await getUserTests();
          updatedTest = freshTests.find((t) => t.id === selectedTest.id);
          if (updatedTest) {
            setSelectedTest(updatedTest);
          }
        }
      } else {
        toast.error(
          "Failed to sync queue: " + (data.error || "Unknown error"),
          {
            id: loadingToast,
          }
        );
      }
      return updatedTest;
    } catch (err) {
      console.error(err);
      toast.error("Error syncing queue: " + err.message);
    } finally {
      setLoading(false);
      loadTests();
    }
  };

  const handleUnpublish = async () => {
    if (!selectedTest) return;
    if (
      !window.confirm(
        "Are you sure you want to unpublish this test? It will no longer be publicly accessible."
      )
    )
      return;
    try {
      await unpublishTest(selectedTest.id);
      setTests((prev) =>
        prev.map((t) =>
          t.id === selectedTest.id ? { ...t, status: "inactive" } : t
        )
      );
      setSelectedTest((s) => ({ ...s, status: "inactive" }));
      toast.success("Test unpublished successfully.");
    } catch (error) {
      console.error(error);
      if (error.code === 'not-found' || error.message?.includes('not-found') || error.message?.includes('No document to update') || error.message?.includes('not found')) {
        toast.error("This test was already deleted from the database.");
        setTests((prev) => prev.filter((t) => t.id !== selectedTest.id));
        setSelectedTest(null);
      } else {
        toast.error("Failed to unpublish test. Please try again.");
      }
    }
  };

  const handleUpdateTest = (testId) => {
    if (!selectedTest) return;
    setShowUpdateModal(true);
  };

  // Handler used when CreateTestForm submits updated data for an existing test
  const handleUpdateWithForm = async (updatedFields) => {
    if (!selectedTest) return;
    setUpdatingTest(true);
    try {
      // Preserve fields we don't want to overwrite
      const preserved = {
        responses: selectedTest.responses || [],
        totalResponses:
          typeof selectedTest.totalResponses === "number"
            ? selectedTest.totalResponses
            : selectedTest.responses
            ? selectedTest.responses.length
            : 0,
        createdAt: selectedTest.createdAt,
        createdBy: selectedTest.createdBy,
        createdByEmail: selectedTest.createdByEmail,
        status: selectedTest.status || "inactive",
        // Preserve password if not provided in update
        password: updatedFields.password || selectedTest.password,
      };

      const updateData = {
        ...updatedFields,
        ...preserved,
        totalQuestions: (updatedFields.questions || []).length,
      };

      await updateTest(selectedTest.id, updateData);

      // Update local state
      setTests((prev) =>
        prev.map((t) =>
          t.id === selectedTest.id ? { ...t, ...updateData } : t
        )
      );
      setSelectedTest((s) => ({ ...s, ...updateData }));

      toast.success("Test updated successfully!");
      setShowUpdateModal(false);
    } catch (error) {
      console.error("Error updating test via form:", error);
      if (error.code === 'not-found' || error.message?.includes('not-found') || error.message?.includes('No document to update') || error.message?.includes('not found')) {
        toast.error("This test was already deleted from the database.");
        setTests((prev) => prev.filter((t) => t.id !== selectedTest.id));
        setSelectedTest(null);
        setShowUpdateModal(false);
      } else {
        toast.error("Failed to update test. Please try again.");
      }
    } finally {
      setUpdatingTest(false);
    }
  };

  const copyLink = async () => {
    if (!selectedTest) return;
    const url = `${window.location.origin}/test/${selectedTest.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Public link copied to clipboard! ${url}`);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Public link copied to clipboard!");
      } catch (e) {
        toast.error("Failed to copy link. Please copy it manually.");
      }
      document.body.removeChild(textArea);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString();
    } else if (typeof timestamp === "string") {
      return new Date(timestamp).toLocaleDateString();
    } else if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    return "Invalid date";
  };

  const refreshTests = () => {
    setLoading(true);
    loadTests();
  };

  const filteredTests = tests.filter((test) => {
    const matchesSearch = !searchTerm || 
                          test.testName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          test.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = testStatusFilter === "all" || test.status === testStatusFilter;
    const matchesResponses = testResponsesFilter === "all" || 
                             (testResponsesFilter === "has_responses" ? (test.totalResponses || 0) > 0 : (test.totalResponses || 0) === 0);
    return matchesSearch && matchesStatus && matchesResponses;
  }).sort((a, b) => {
    if (testSortBy === "newest") {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB - dateA;
    } else if (testSortBy === "oldest") {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateA - dateB;
    } else if (testSortBy === "most_responses") {
      return (b.totalResponses || 0) - (a.totalResponses || 0);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-8xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-8xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Created Tests
            </h2>
            <p className="text-gray-600">
              View and manage your assessment tests
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-sm text-gray-500">Total Tests</div>
              <div className="text-2xl font-bold text-blue-600">
                {tests.length}
              </div>
            </div>
            <button
              onClick={refreshTestsWithSync}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCcw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {tests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Tests Created Yet
            </h3>
            <p className="text-gray-500 mb-6">
              Create your first test to see it listed here
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create Your First Test
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tests List */}
            <div className="lg:col-span-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {mode === "superadmin" ? "All Tests" : "Your Tests"}
                </h3>
                <span className="text-sm text-gray-500">
                  {mode === "superadmin" ? filteredTests.length : tests.length} test{tests.length !== 1 ? "s" : ""}
                </span>
              </div>

              {mode === "superadmin" && (
                <div className="flex flex-col gap-2 mb-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tests..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-800 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={testStatusFilter}
                      onChange={(e) => setTestStatusFilter(e.target.value)}
                      className="px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-800 text-xs"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>

                    <select
                      value={testResponsesFilter}
                      onChange={(e) => setTestResponsesFilter(e.target.value)}
                      className="px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-800 text-xs"
                    >
                      <option value="all">All Resp</option>
                      <option value="has_responses">Has Resp</option>
                      <option value="no_responses">No Resp</option>
                    </select>

                    <select
                      value={testSortBy}
                      onChange={(e) => setTestSortBy(e.target.value)}
                      className="px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-800 text-xs"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="most_responses">Most Resp</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {(mode === "superadmin" ? filteredTests : tests).map((test) => (
                  <div
                    key={test.id}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedTest?.id === test.id
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedTest(test)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800 line-clamp-2">
                        {test.testName || "Unnamed Test"}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          test.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {test.status || "Active"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{test.totalQuestions || 0} Qs</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(test.createdAt)}
                    </div>
                    {mode === "superadmin" && (
                      <div className="text-xs text-blue-600 mt-0.5 font-medium">
                        By: {test.createdByEmail ? test.createdByEmail.split('@')[0] : "Unknown"} 
                        <span className="text-gray-500 font-normal"> ({test.createdByEmail || "Unknown"})</span>
                      </div>
                    )}
                    {test.totalResponses > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        {test.totalResponses} response
                        {test.totalResponses !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Test Details */}
            <div className="lg:col-span-2">
              {selectedTest ? (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex flex-col py-2 gap-y-5">
                    <div className="flex justify-between items-start gap-2 text-sm">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {selectedTest.testName}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 flex-wrap gap-2">
                          <span className="bg-sky-100 text-blue-800 px-3 py-1 rounded-full">
                            {selectedTest.domain
                              ? selectedTest.domain.charAt(0).toUpperCase() +
                                selectedTest.domain.slice(1)
                              : "No Domain"}
                          </span>
                          <span className="text-emerald-500 font-medium px-2 py-1 space-x-2 text-sm text-nowrap">
                            {selectedTest.totalQuestions || 0} questions
                          </span>

                          {selectedTest.totalResponses > 0 && (
                            <>
                              <span className="text-emerald-500 font-medium px-2 py-1 space-x-2 text-sm text-nowrap">
                                {selectedTest.totalResponses} responses
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Export button moved to the right end */}
                      <button
                        onClick={exportTestWithSync}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all"
                        title="Export to Excel"
                      >
                        <Download size={16} />
                        <span>Export Responses</span>
                      </button>
                      
                       {/* Delete */}
                        <button
                          onClick={() => handleDeleteTest(selectedTest.id)}
                          className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-rose-600 hover:shadow-md transition-all"
                        >
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </button>
                      <button
                          onClick={() => setShowDuplicateModal(true)}
                          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Duplicate</span>
                        </button>
                    </div>
                    <div className="flex flex-col items-start gap-3 text-sm">

                      {/* Buttons */}
                      <div className="flex justify-start flex-wrap gap-2 text-sm">
                        {/* Sync Queue */}

                        <button
                          onClick={handleSyncQueue}
                          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-purple-700 hover:shadow-md transition-all"
                        >
                          <RefreshCcw size={16} />
                          <span>Sync</span>
                        </button>
                        {/* Publish / Unpublish / Copy Link */}
                        {selectedTest.status === "active" ? (
                          <>
                            <button
                              onClick={handleUnpublish}
                              className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-amber-600 hover:shadow-md transition-all"
                            >
                              <Ban size={16} />
                              <span>Unpublish</span>
                            </button>

                            <button
                              onClick={copyLink}
                              className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-sky-700 hover:shadow-md transition-all"
                            >
                              <Link2 size={16} />
                              <span>Copy Link</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handlePublish}
                            className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-sky-700 hover:shadow-md transition-all"
                          >
                            <Upload size={16} />
                            <span>Publish</span>
                          </button>
                        )}

                        {/* Update Test Button - Only shows when test is inactive */}
                        {selectedTest.status !== "active" && (
                          <button
                            onClick={() => handleUpdateTest(selectedTest.id)}
                            className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-indigo-600 hover:shadow-md transition-all"
                          >
                            <Edit size={16} />
                            <span>Update Test</span>
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (!selectedTest) return;
                            if (!confirm('Are you sure you want to clear all responses and emails for this test? This action cannot be undone.')) return;
                            try {
                              setLoading(true);
                              await clearTestResponses(selectedTest.id);
                              // Update local state - clear responses, emails, and sync status
                              setSelectedTest((s) => ({ 
                                ...s, 
                                responses: [], 
                                totalResponses: 0,
                                emails: [],
                                emailsSyncedToMongoDB: false
                              }));
                              setTests((prev) => prev.map((t) => (t.id === selectedTest.id ? { 
                                ...t, 
                                responses: [], 
                                totalResponses: 0,
                                emails: [],
                                emailsSyncedToMongoDB: false
                              } : t)));
                              toast.success('Responses and emails cleared for this test');
                            } catch (err) {
                              console.error('Failed to clear responses', err);
                              if (err.code === 'not-found' || err.message?.includes('not-found') || err.message?.includes('No document to update') || err.message?.includes('not found')) {
                                toast.error("This test was already deleted from the database.");
                                setSelectedTest(null);
                                setTests((prev) => prev.filter((t) => t.id !== selectedTest.id));
                              } else {
                                toast.error('Failed to clear responses');
                              }
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-rose-700 hover:shadow-md transition-all"
                        >
                          <Trash2 size={16} />
                          <span>Clear Responses</span>
                        </button>
                       
                        <button
                        onClick={() => exportTestToWordDoc(selectedTest, false)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-blue-700 hover:shadow-md transition-all"
                        title="Export to Word without answers"
                      >
                        <FileText size={16} />
                        <span>Question Paper</span>
                      </button>
                      <button
                        onClick={() => exportTestToWordDoc(selectedTest, true)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-green-700 hover:shadow-md transition-all"
                        title="Export to Word with answers"
                      >
                        <FileText size={16} />
                        <span>Answer Key</span>
                      </button>

                      <button
                        onClick={() => emailFileInputRef.current?.click()}
                        disabled={uploadingEmails}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Upload emails from CSV, Excel, or TXT file"
                      >
                        <Mail size={16} />
                        <span>{uploadingEmails ? "Uploading..." : "Upload Emails"}</span>
                      </button>

                      <button
                        onClick={handleSyncEmailsToMongoDB}
                        disabled={syncingEmails || !selectedTest?.emails?.length}
                        className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-orange-700 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sync emails to MongoDB collection"
                      >
                        <RefreshCcw size={16} />
                        <span>{syncingEmails ? "Syncing..." : "Sync Emails"}</span>
                      </button>

                      <input
                        ref={emailFileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.txt"
                        onChange={handleEmailUpload}
                        style={{ display: "none" }}
                      />
                       
                      </div>
                       {/* Duplicate Test Button */}
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-md border border-amber-200 shadow-sm">
                        ⚠️ <strong>Unpublish</strong> the test first to update test.
                      </span>
                    </div>
                  </div>

                  {/* Test Details Grid - Side by Side Layout */}
                  <div className="flex flex-col lg:flex-row gap-6 mb-6">
                    {/* Statistics Card */}
                    <div className="bg-gray-50 p-4 rounded-lg flex-1">
                      <h4 className="font-semibold text-gray-800 mb-3">
                        Statistics
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Total Questions:
                          </span>
                          <span className="font-medium">
                            {selectedTest.totalQuestions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created On:</span>
                          <span className="font-medium">
                            {formatDate(selectedTest.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-medium text-green-600">
                            {selectedTest.status || "Active"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Responses:</span>
                          <span className="font-medium">
                            {selectedTest.totalResponses || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Password Card - ADD THIS */}
                    <div className="bg-gray-50 p-4 rounded-lg flex-1">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Test Password
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-white rounded border border-gray-300">
                          <div className="font-mono text-lg font-bold text-gray-800 tracking-wide">
                            {selectedTest.password || "No password set"}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Required
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Students will need this password to start the test
                        </p>
                      </div>
                    </div>

                    {/* Custom Fields - Student Data Collection */}
                    {selectedTest.customFields &&
                      selectedTest.customFields.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg flex-1">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <svg
                              className="w-5 h-5 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            Student Registration Fields
                          </h4>
                          <div className="space-y-2 max-h-50 pr-2 flex-1 overflow-y-scroll">
                            {selectedTest.customFields.map(
                              (field, index) =>
                                field.name &&
                                field.name.trim() !== "" && (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-300"
                                  >
                                    <div>
                                      <div className="font-medium text-gray-800 text-sm capitalize">
                                        {field.name}
                                      </div>
                                      <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span className="capitalize">
                                          {field.type || "text"}
                                        </span>
                                        <span>•</span>
                                        <span
                                          className={
                                            field.required
                                              ? "text-rose-600 font-medium"
                                              : "text-gray-500"
                                          }
                                        >
                                          {field.required
                                            ? "Required"
                                            : "Optional"}
                                        </span>
                                      </div>
                                    </div>
                                    {field.required && (
                                      <span className="text-rose-500 text-sm">
                                        *
                                      </span>
                                    )}
                                  </div>
                                )
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Instructions */}
                  {selectedTest.instructions && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-3">
                        Test Instructions
                      </h4>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {selectedTest.instructions}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Questions Preview */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-800">
                        Questions ({selectedTest.questions?.length || 0})
                      </h4>
                      <span className="text-sm text-gray-500">
                        Scroll to view all questions
                      </span>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedTest.questions?.map((q, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="font-medium text-gray-800 flex-1">
                              {index + 1}. {q.question}
                            </h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`flex items-center space-x-2 p-2 rounded ${
                                  ((q.correctOptions?.includes(optIndex) || optIndex == q.correctOption) && mode === "superadmin")
                                    ? "bg-green-50 border border-green-200"
                                    : "bg-gray-50"
                                }`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                    ((q.correctOptions?.includes(optIndex) || optIndex == q.correctOption) && mode === "superadmin")
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-300 text-gray-600"
                                  }`}
                                >
                                  {optIndex + 1}
                                </div>
                                <span
                                  className={
                                    ((q.correctOptions?.includes(optIndex) || optIndex == q.correctOption) && mode === "superadmin")
                                      ? "font-medium text-green-800"
                                      : "text-gray-600"
                                  }
                                >
                                  {option}
                                </span>
                                {(((q.correctOptions?.includes(optIndex) || optIndex == q.correctOption) && mode === "superadmin")) && (
                                  <span className="text-green-600 text-sm ml-auto font-medium">
                                    Ans ✓
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-12 text-center bg-gray-50">
                  <div className="text-4xl mb-4">👆</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Select a Test
                  </h3>
                  <p className="text-gray-500">
                    Choose a test from the list to view its details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Update Test Modal - reuse CreateTestForm */}
      {showUpdateModal && selectedTest && (
        <div className="fixed inset-0 bg-gray-600/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl relative flex flex-col h-[90vh]">
            <button
              onClick={() => setShowUpdateModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
            >
              <X size={24} />
            </button>

            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Update Test</h3>
            </div>

            <div className="flex-1 overflow-hidden">
              <CreateTestForm
                initialData={selectedTest}
                onSubmit={handleUpdateWithForm}
                isSubmitting={updatingTest}
              />
            </div>
          </div>
        </div>
      )}
      {showDuplicateModal && selectedTest && (
        <DuplicateTest
          test={selectedTest}
          onClose={() => {
            setShowDuplicateModal(false);
            refreshTests();
          }}
        />
      )}
    </>
  );
}
