"use client";
import { useState } from "react";
import { auth, db } from "../../lib/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function SeedPage() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    setStatus("Seeding...");
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        "superadmin@gmail.com",
        "password123"
      );
      const uid = userCredential.user.uid;

      // Create Firestore document with superadmin role
      await setDoc(doc(db, "users", uid), {
        email: "superadmin@gmail.com",
        role: "superadmin",
      });

      setStatus("Superadmin created successfully! Email: superadmin@gmail.com, Password: password123");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Database Seeder</h1>
        <p className="text-slate-300 mb-6">
          Click the button below to create the superadmin user.
        </p>
        <button
          onClick={handleSeed}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? "Seeding..." : "Seed Superadmin"}
        </button>
        {status && (
          <div className={`mt-6 p-4 rounded-lg text-sm ${status.startsWith("Error") ? "bg-red-500/20 text-red-200" : "bg-emerald-500/20 text-emerald-200"}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
