"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import ViewTests from "../components/ViewTests";
import {
  Plus,
  Users,
  Shield,
  UserPlus,
  Trash2,
  Edit3,
  Mail,
  Key,
  UserCheck,
  Search,
  Filter,
  FileText,
  Settings,
  LogOut,
  RefreshCw,
  Crown,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // User form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [testStatusFilter, setTestStatusFilter] = useState("all");
  const [testResponsesFilter, setTestResponsesFilter] = useState("all");
  const [testSortBy, setTestSortBy] = useState("newest");
  
  const router = useRouter();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userList);
    } catch (err) {
      setError("Failed to fetch users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "tests"));
      const testList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTests(testList);
    } catch (err) {
      setError("Failed to fetch tests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTests();
  }, []);

  const handleCreateUser = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;
      await setDoc(doc(db, "users", uid), { email, role });
      setSuccess("User created successfully!");
      setEmail("");
      setPassword("");
      setRole("user");
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteDoc(doc(db, "users", uid));
        fetchUsers();
        setSuccess("User deleted successfully!");
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleUpdateRole = async (uid, newRole) => {
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      fetchUsers();
      setSuccess("Role updated successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (window.confirm("Are you sure you want to delete this test?")) {
      try {
        await deleteDoc(doc(db, "tests", testId));
        fetchTests();
        setSuccess("Test deleted successfully!");
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleUpdateTestStatus = async (testId, newStatus) => {
    try {
      await updateDoc(doc(db, "tests", testId), { status: newStatus });
      fetchTests();
      setSuccess("Test status updated successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredTests = tests.filter((test) => {
    const matchesSearch = test.testName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
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

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
      {/* Sidebar / Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Crown className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                SuperAdmin Portal
              </h1>
              <p className="text-xs text-slate-500">Vast Access & Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { fetchUsers(); fetchTests(); }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-600"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-fit">
          <button
            onClick={() => { setActiveTab("users"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "users"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Users className="w-4 h-4" />
            Users Management
          </button>
          <button
            onClick={() => { setActiveTab("tests"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "tests"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            Tests Management
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-300">×</button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-emerald-300">×</button>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Create User Card */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Create New User
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                      <Key className="w-4 h-4" />
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                      <Shield className="w-4 h-4" />
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-800"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">SuperAdmin</option>
                    </select>
                  </div>

                  <button
                    onClick={handleCreateUser}
                    disabled={loading || !email || !password}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/10"
                  >
                    {loading ? "Creating..." : "Create User"}
                  </button>
                </div>
              </div>
            </div>

            {/* Users List */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-900">
                      All Users
                    </h2>
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium">
                      {filteredUsers.length}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-800 text-sm"
                      />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-800 text-sm"
                    >
                      <option value="all">All Roles</option>
                      <option value="superadmin">SuperAdmin</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${
                            user.role === "superadmin" ? "bg-rose-50 text-rose-600" :
                            user.role === "admin" ? "bg-indigo-50 text-indigo-600" :
                            "bg-blue-50 text-blue-600"
                          }`}>
                            {user.role === "superadmin" ? <Crown className="w-5 h-5" /> :
                             user.role === "admin" ? <Shield className="w-5 h-5" /> :
                             <UserCheck className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                user.role === "superadmin" ? "bg-rose-50 text-rose-600" :
                                user.role === "admin" ? "bg-indigo-50 text-indigo-600" :
                                "bg-blue-50 text-blue-600"
                              }`}>
                                {user.role}
                              </span>
                              <span className="text-slate-500 text-xs">ID: {user.id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-800 text-sm"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">SuperAdmin</option>
                          </select>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === "tests" && (
          <ViewTests mode="superadmin" />
        )}
      </div>
    </div>
  );
}
