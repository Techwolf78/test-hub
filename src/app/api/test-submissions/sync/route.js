// /app/api/test-submissions/sync/route.js
import { NextResponse } from "next/server";
import { getQueueCollection } from "@/lib/mongo.js";
import { batchWriteResponses } from "@/lib/testOperations.js";

export async function POST() {
  try {
    const queue = await getQueueCollection();

    // Clean up old synced entries
    try{
      await queue.deleteMany({ synced: true });
    }catch(err){
      console.error("Failed to clear old synced entries:", err);
    }

    const SYNC_LIMIT = 500; // Process 500 at a time
    let totalSynced = 0;

    // Loop until all unsynced submissions are processed
    let hasMore = true;
    while (hasMore) {
      // 1️⃣ Fetch next batch of unsynced data
      const unsynced = await queue.find({ synced: false }).limit(SYNC_LIMIT).toArray();

      if (unsynced.length === 0) {
        hasMore = false;
        break;
      }

      // 2️⃣ Group by testId (so each test writes once)
      const grouped = {};
      for (const doc of unsynced) {
        const testId = doc.testId.toString();
        if (!grouped[testId]) grouped[testId] = [];
        grouped[testId].push(doc.response[0]); // assuming single response array
      }

      // 3️⃣ Write to Firestore for each test (with chunked processing per test)
      const RESPONSES_PER_CHUNK = 200; // Split large response arrays further
      for (const [testId, responses] of Object.entries(grouped)) {
        try {
          for (let i = 0; i < responses.length; i += RESPONSES_PER_CHUNK) {
            const chunk = responses.slice(i, i + RESPONSES_PER_CHUNK);
            await batchWriteResponses(testId, chunk);
          }
        } catch (err) {
          if (err.message === "Test not found") {
            console.warn(`Test ${testId} not found in Firestore. Submissions for this deleted test will be skipped and marked as synced to unblock the queue.`);
          } else {
            throw err;
          }
        }
      }

      // 4️⃣ Mark this batch as synced
      const ids = unsynced.map(d => d._id);
      await queue.updateMany(
        { _id: { $in: ids } },
        { $set: { synced: true, syncedAt: new Date() } }
      );

      totalSynced += unsynced.length;
      console.log(`Synced batch: ${unsynced.length} submissions (Total: ${totalSynced})`);

      // Check if there are more unsynced entries
      const remaining = await queue.countDocuments({ synced: false });
      if (remaining === 0) {
        hasMore = false;
      }
    }

    return NextResponse.json({
      message: `Successfully synced all ${totalSynced} submissions to Firestore in one call!`,
      totalSynced: totalSynced
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
