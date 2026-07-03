import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

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
