"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebaseConfig";
import CreateTestForm from "../components/CreateTestForm";
import TestDetailsForm from "../components/TestDetailsForm";
import QuestionsForm from "../components/QuestionsForm";
import ViewTests from "../components/ViewTests";
import TraineeSection from "../components/TraineeSection";

function UserPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeForm, setActiveForm] = useState("create-test");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const form = searchParams.get("form");
    if (form) setActiveForm(form);
  }, [searchParams]);

  // Wait for Firebase auth to initialize and redirect only if unauthenticated
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCheckingAuth(false);
        router.push("/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const role = snap.data().role || "user";
          setUserRole(role);
        } else {
          setUserRole("user");
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setUserRole("user");
      } finally {
        setCheckingAuth(false);
      }
    });
    return () => unsub();
  }, [router]);

  const renderActiveForm = () => {
    switch (activeForm) {
      case "create-test":
        return <CreateTestForm />;
      case "view-tests":
        return <ViewTests />;
      case "trainee":
        // Guard against trainee accessing trainee management
        if (userRole === "trainee") {
          return <CreateTestForm />;
        }
        return <TraineeSection />;
      case "test-details":
        return <TestDetailsForm />;
      case "questions":
        return <QuestionsForm />;
      default:
        return <ViewTests />;
    }
  };

  return (
    <div className="min-h-screen w-full">
      {checkingAuth ? (
        <div className="container mx-auto pt-8">
          <div className="p-6 mt-8">Checking authentication...</div>
        </div>
      ) : (
        <div className="container mx-auto pt-8">
          <div className="p-6 mt-8">{renderActiveForm()}</div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserPageContent />
    </Suspense>
  );
}
