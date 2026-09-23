import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

const TEST_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const getTimestampMs = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "string" || typeof value === "number") {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return null;
};

export async function GET(request) {
  try {
    const testId = request.nextUrl.searchParams.get("id");

    if (!testId) {
      return Response.json(
        { error: "Missing test ID" },
        { status: 400 }
      );
    }

    const docRef = doc(db, "tests", testId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return Response.json(
        { error: "Test not found" },
        { status: 404 }
      );
    }

    const testData = docSnap.data();
    
    // Check if test is active
    if (testData.status !== "active") {
      return Response.json(
        { error: "Test is not active" },
        { status: 403 }
      );
    }

    const publishedAtMs = getTimestampMs(testData.publishedAt) ?? getTimestampMs(testData.updatedAt);
    if (publishedAtMs && Date.now() - publishedAtMs >= TEST_EXPIRY_MS) {
      await updateDoc(docRef, {
        status: "inactive",
        updatedAt: serverTimestamp(),
      });

      return Response.json(
        { error: "This test has expired" },
        { status: 403 }
      );
    }

    // Serialize dates
    const serialized = JSON.parse(
      JSON.stringify(testData, (k, v) => {
        if (v && typeof v === "object") {
          if (typeof v.toDate === "function") return v.toDate().toISOString();
          if (v.seconds && typeof v.seconds === "number") return new Date(v.seconds * 1000).toISOString();
        }
        return v;
      })
    );

    return Response.json({
      id: docSnap.id,
      ...serialized,
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      }
    });
  } catch (error) {
    console.error("Error loading test:", error);
    return Response.json(
      { error: "Failed to load test: " + error.message },
      { status: 500 }
    );
  }
}
