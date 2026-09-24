"use client";
import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "../../lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const getDestination = (role) => {
    if (role === "superadmin") return "/superadmin";
    if (role === "admin") return "/admin";
    if (role === "user" || role === "trainee") return "/user";
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || isLoading) return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const destination = snap.exists() ? getDestination(snap.data().role) : null;

        if (destination) {
          router.replace(destination);
        } else {
          await signOut(auth);
          setError(
            snap.exists()
              ? "Your user profile has no valid role. Ask an administrator to set the role to user, admin, superadmin, or trainee."
              : "No user profile was found for this account. Ask an administrator to create a users/{UID} Firestore document."
          );
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        setError(
          err.code === "permission-denied"
            ? "Firebase signed you in, but Firestore denied access to your user profile. Check Firestore rules."
            : "Unable to load your user profile. Check your connection and Firebase configuration."
        );
      }
    });

    return () => unsubscribe();
  }, [router, isLoading]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const destination = getDestination(snap.data().role);
        if (destination) {
          router.replace(destination);
        } else {
          await signOut(auth);
          setError("Your user profile has no valid role. Ask an administrator to set the role to user, admin, superadmin, or trainee.");
        }
      } else {
        await signOut(auth);
        setError("No user profile was found for this account. Ask an administrator to create a users/{UID} Firestore document.");
      }
    } catch (err) {
      console.error("Login failed:", err);
      const messages = {
        "auth/invalid-credential": `Firebase rejected these credentials for project ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}. Confirm this account exists in Firebase Authentication for this project.`,
        "auth/user-not-found": `No Firebase account exists for this email in project ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.`,
        "auth/wrong-password": "The password does not match this Firebase account.",
        "auth/operation-not-allowed": "Email/password sign-in is disabled in Firebase Authentication. Enable it in Sign-in providers.",
        "auth/invalid-email": "Enter a valid email address.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/too-many-requests": "Too many attempts. Wait and try again.",
        "permission-denied": "Firebase signed you in, but Firestore denied access to your user profile.",
      };
      setError(messages[err.code] || `Unable to sign in (${err.code || "unknown error"}): ${err.message || "unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl text-white">🔐</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm text-center">
              {error}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Demo credentials? Contact support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}