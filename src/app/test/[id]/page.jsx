"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getTestById } from "@/lib/testOperations";
import { auth, db, disableNetwork, enableNetwork } from "@/lib/firebaseConfig";
import TestRunner from "./TestRunner";

export default function Page() {
  const { id } = useParams() || {};
  const router = useRouter();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTime, setLoadingTime] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    let startTime = Date.now();
    let loadingTimer;

    // Update loading time every second
    const updateLoadingTime = () => {
      if (mounted) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setLoadingTime(elapsed);
        loadingTimer = setTimeout(updateLoadingTime, 1000);
      }
    };
    updateLoadingTime();

    const loadWithRetry = async (retryCount = 0) => {
      const maxRetries = 4;
      const timeout = 10000; // 10 seconds

      try {
        // Use API endpoint instead of direct Firestore (more reliable)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`/api/get-test?id=${id}&t=${Date.now()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        console.error(`Load attempt ${retryCount + 1} failed:`, err.message);
        
        if (retryCount < maxRetries) {
          // Exponential backoff: 300ms, 600ms, 1.2s, 2.4s
          const delay = Math.min(300 * Math.pow(2, retryCount), 3000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadWithRetry(retryCount + 1);
        }
        throw err;
      }
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadWithRetry();
        if (!mounted) return;
        if (!data || data.status !== "active") {
          setTest(null);
        } else {
          // Serialize dates to ISO strings for client consumption
          const serialized = JSON.parse(
            JSON.stringify(data, (k, v) => {
              if (v && typeof v === "object") {
                if (typeof v.toDate === "function") return v.toDate().toISOString();
                if (v.seconds && typeof v.seconds === "number") return new Date(v.seconds * 1000).toISOString();
              }
              return v;
            })
          );
          setTest(serialized);
        }
      } catch (err) {
        console.error("Error fetching test:", err);
        
        // Provide more specific error messages
        if (err.message.includes("timeout")) {
          setError("Network timeout. Please check your internet connection and try again.");
        } else if (err.message.includes("not found")) {
          setError("Test not found. Please check the test ID.");
        } else {
          setError(String(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(loadingTimer);
        }
      }
    };

    load();
    return () => {
      mounted = false;
      clearTimeout(loadingTimer);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 rounded-2xl bg-white shadow-lg text-center max-w-md mx-4">
          <div className="animate-spin w-12 h-12 mb-4 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <div className="text-xl font-semibold text-gray-800 mb-2">Loading test...</div>
          <div className="text-gray-600 mb-4">
            <div className="text-sm">Time elapsed: {loadingTime} seconds</div>
            {loadingTime < 2 && (
              <div className="mt-2 text-xs text-gray-500">
                Fetching test...
              </div>
            )}
            {loadingTime >= 2 && loadingTime < 6 && (
              <div className="mt-2 text-xs text-gray-500">
                Loading questions...
              </div>
            )}
            {loadingTime >= 6 && loadingTime < 10 && (
              <div className="mt-2 text-sm text-amber-600">
                ⚠️ Taking longer than usual...
              </div>
            )}
            {loadingTime >= 10 && (
              <div className="mt-2 text-sm text-red-600">
                ❌ Connection issues detected
              </div>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Refresh Page
            </button>
            {loadingTime >= 10 && (
              <button
                onClick={async () => {
                  // Reset Firebase network connection
                  try {
                    await disableNetwork(db);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await enableNetwork(db);
                  } catch (e) {
                    console.log('Network reset error:', e.message);
                  }
                  
                  // Clear all storage
                  localStorage.clear();
                  sessionStorage.clear();
                  
                  // Sign out to reset auth state
                  try {
                    await auth.signOut().catch(() => {});
                  } catch (e) {}
                  
                  // Hard reload with cache bust
                  window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 't=' + Date.now();
                }}
                className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                🔄 Reset Connection
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.includes("not found") || error.includes("check the test ID");
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-gray-100 text-center">
          <h2 className={`text-2xl font-bold mb-4 ${isNotFound ? 'text-gray-800' : 'text-red-600'}`}>
            {isNotFound ? '🔍 Test Not Found' : '⚠️ Connection Error'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isNotFound 
              ? 'This test link may have expired, or the test has been removed by the administrator. Please contact your instructor.'
              : error}
          </p>
          
          {!isNotFound && error.includes("timeout") && (
            <>
              <p className="text-gray-600 mb-4 text-sm text-left">
                This could be due to:
              </p>
              <ul className="list-disc ml-6 mb-4 space-y-1 text-sm text-gray-600 text-left">
                <li>Slow internet connection</li>
                <li>Server is temporarily busy</li>
                <li>Browser cache issues</li>
              </ul>
            </>
          )}
          
          <div className="space-y-3">
            {!isNotFound && (
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-md"
              >
                Try Again
              </button>
            )}
            
            {!isNotFound && (
              <button
                onClick={async () => {
                  try {
                    await disableNetwork(db);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await enableNetwork(db);
                  } catch (e) {
                    console.log('Network reset error:', e.message);
                  }
                  
                  localStorage.clear();
                  sessionStorage.clear();
                  
                  try {
                    await auth.signOut().catch(() => {});
                  } catch (e) {}
                  
                  window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 't=' + Date.now();
                }}
                className="w-full py-2.5 px-4 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium"
              >
                🔄 Reset & Retry
              </button>
            )}
            
            <button
              onClick={() => router.push('/user')}
              className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-8 max-w-3xl mx-auto bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Test not found</h2>
        <p className="text-gray-600">This test is not published or does not exist.</p>
      </div>
    );
  }

  // Force remount TestRunner when the route id changes so its internal state
  // resets for each new test. This prevents carrying over previous run state
  // (like signed-in/step) when the user opens a different test link.
  return <TestRunner test={test} key={id} />;
}