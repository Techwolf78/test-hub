/**
 * ============================================================================
 * TEST OPERATIONS - Firestore Schema with Response Batching
 * ============================================================================
 * 
 * NEW SCHEMA STRUCTURE:
 * 
 * Firestore Collection: /tests/{testId}
 *   - createdBy: string (user ID)
 *   - createdByEmail: string
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 *   - status: string ('active' or 'inactive')
 *   - totalResponses: number (total across all batches)
 *   - [other test fields]
 * 
 * Subcollection: /tests/{testId}/responseBatches/{batchId}
 *   - batchId: string (format: 'batch_0', 'batch_1', 'batch_2', etc.)
 *   - responses: array of response objects (max 100 per document)
 *     Each response contains:
 *       - responseId: string
 *       - submittedAt: timestamp
 *       - status: string ('active')
 *       - totalQuestions: number
 *       - testName: string
 *       - answers: array
 *       - customResponses: array
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 * 
 * BATCHING LOGIC:
 * - Responses 0-99 go to batch_0
 * - Responses 100-199 go to batch_1
 * - Responses 200-299 go to batch_2
 * - etc.
 * 
 * This structure avoids Firestore's array/document size limits:
 * - Max array size: 20,000 items per field
 * - Max document size: 1 MB per document
 * ============================================================================
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  arrayUnion,
  increment,
  collectionGroup,
  writeBatch,
  enableNetwork,
  disableNetwork,
} from "firebase/firestore";
import { db, auth } from "./firebaseConfig";

const RESPONSES_PER_BATCH = 100;

/**
 * Helper function to calculate which batch document a response should go to
 * Based on total response count, returns batch number (0, 1, 2, etc.)
 */
const getBatchNumber = (totalResponses) => {
  return Math.floor(totalResponses / RESPONSES_PER_BATCH);
};

/**
 * Helper function to get the batch document reference
 * Path: tests/{testId}/responseBatches/batch_{batchNumber}
 */
const getBatchDocRef = (testId, batchNumber) => {
  return doc(db, "tests", testId, "responseBatches", `batch_${batchNumber}`);
};

/**
 * Get current batch document, creating if necessary
 */
const getCurrentBatchDoc = async (testId, testData) => {
  const batchNumber = getBatchNumber(testData.totalResponses || 0);
  const batchDocRef = getBatchDocRef(testId, batchNumber);
  
  try {
    const batchDocSnap = await getDoc(batchDocRef);
    return { batchDocRef, batchDocSnap, batchNumber };
  } catch (error) {
    console.error("Error getting batch doc:", error);
    throw error;
  }
};

export const batchWriteResponses = async (testId, responsesArray) => {
  if (!testId || typeof testId !== "string") {
    throw new Error("Invalid testId for batchWriteResponses");
  }

  if (!Array.isArray(responsesArray) || responsesArray.length === 0) return;

  const testRef = doc(db, "tests", testId);
  const testDocSnap = await getDoc(testRef);

  if (!testDocSnap.exists()) {
    throw new Error("Test not found");
  }

  const testData = testDocSnap.data();
  const currentTotalResponses = testData.totalResponses || 0;

  // Use batch write for better atomicity
  const batch = writeBatch(db);

  let responsesWritten = 0;
  let currentBatchNumber = getBatchNumber(currentTotalResponses);
  let currentBatchDocRef = getBatchDocRef(testId, currentBatchNumber);
  let currentBatchResponses = [];

  // Get existing responses in current batch if it exists
  try {
    const currentBatchSnap = await getDoc(currentBatchDocRef);
    if (currentBatchSnap.exists()) {
      currentBatchResponses = currentBatchSnap.data().responses || [];
    }
  } catch (error) {
    console.warn("Could not fetch current batch, starting fresh:", error);
  }

  // Format new responses
  const newResponses = responsesArray.map((resp) => ({
    responseId:
      Date.now().toString() + Math.random().toString(36).substring(2, 8),
    submittedAt: new Date(),
    status: "active",
    totalQuestions: resp.answersArr?.length || 0,
    testName: resp.meta?.testName || null,
    answers: resp.answersArr || [],
    customResponses: resp.customArr || [],
  }));

  // Distribute responses across batch documents
  for (const response of newResponses) {
    // Check if current batch is full
    if (currentBatchResponses.length >= RESPONSES_PER_BATCH) {
      // Write current batch to Firestore
      if (currentBatchResponses.length > 0) {
        batch.set(currentBatchDocRef, {
          responses: currentBatchResponses,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Move to next batch
      currentBatchNumber++;
      currentBatchDocRef = getBatchDocRef(testId, currentBatchNumber);
      currentBatchResponses = [];
    }

    currentBatchResponses.push(response);
    responsesWritten++;
  }

  // Write the final batch
  if (currentBatchResponses.length > 0) {
    batch.set(currentBatchDocRef, {
      responses: currentBatchResponses,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Update test document metadata
  batch.update(testRef, {
    totalResponses: increment(responsesWritten),
    updatedAt: serverTimestamp(),
  });

  // Commit all writes atomically
  await batch.commit();
};

// Create a new test
export const createTest = async (testData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const testWithMetadata = {
      ...testData,
      createdBy: user.uid,
      createdByEmail: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Use status to represent visibility: 'published' or 'unpublished' (default)
      status: "inactive",
      // Do NOT store responses array - use responseBatches subcollection instead
      totalResponses: 0,
    };

    const docRef = await addDoc(collection(db, "tests"), testWithMetadata);
    return { id: docRef.id, ...testWithMetadata };
  } catch (error) {
    console.error("Error creating test:", error);
    throw error;
  }
};

/**
 * Retrieve all responses for a test across all batch documents
 * @param {string} testId - The test ID
 * @returns {Promise<Array>} Array of all response objects
 */
export const getTestResponses = async (testId) => {
  try {
    if (!testId) throw new Error("Invalid testId");

    const batchesRef = collection(db, "tests", testId, "responseBatches");
    const batchesQuery = query(batchesRef, orderBy("createdAt", "asc"));
    const batchesSnapshot = await getDocs(batchesQuery);

    let allResponses = [];

    batchesSnapshot.forEach((batchDoc) => {
      const batchData = batchDoc.data();
      if (batchData.responses && Array.isArray(batchData.responses)) {
        allResponses = allResponses.concat(batchData.responses);
      }
    });

    return allResponses;
  } catch (error) {
    console.error("Error getting test responses:", error);
    throw error;
  }
};

// Publish a test (set status to 'published')
export const publishTest = async (testId) => {
  try {
    const testRef = doc(db, "tests", testId);
    await updateDoc(testRef, {
      status: "active",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error publishing test:", error);
    throw error;
  }
};

// Unpublish a test (set status to 'unpublished')
export const unpublishTest = async (testId) => {
  try {
    const testRef = doc(db, "tests", testId);
    await updateDoc(testRef, {
      status: "inactive",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error unpublishing test:", error);
    throw error;
  }
};

// Get all tests for current user with better error handling
export const getUserTests = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // Try the indexed query first
    try {
      const q = query(
        collection(db, "tests"),
        where("createdBy", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const tests = [];

      querySnapshot.forEach((doc) => {
        tests.push({ id: doc.id, ...doc.data() });
      });

      return tests;
    } catch (indexError) {
      // If index error, fall back to client-side sorting
      console.warn(
        "Index not ready, falling back to client-side sorting:",
        indexError
      );

      const q = query(
        collection(db, "tests"),
        where("createdBy", "==", user.uid)
      );

      const querySnapshot = await getDocs(q);
      const tests = [];

      querySnapshot.forEach((doc) => {
        tests.push({ id: doc.id, ...doc.data() });
      });

      // Sort by createdAt on client side
      return tests.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA; // Descending order
      });
    }
  } catch (error) {
    console.error("Error getting user tests:", error);
    throw error;
  }
};

// Alternative method without ordering (if index is taking too long)
export const getUserTestsSimple = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const q = query(
      collection(db, "tests"),
      where("createdBy", "==", user.uid)
    );

    const querySnapshot = await getDocs(q);
    const tests = [];

    querySnapshot.forEach((doc) => {
      tests.push({ id: doc.id, ...doc.data() });
    });

    return tests;
  } catch (error) {
    console.error("Error getting user tests:", error);
    throw error;
  }
};

// Get a single test by ID
export const getTestById = async (testId) => {
  const docRef = doc(db, "tests", testId);
  
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore read timeout (15s)')), 15000)
    );

    // Race between getDoc and timeout
    const docSnap = await Promise.race([
      getDoc(docRef),
      timeoutPromise
    ]);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Test not found");
    }
  } catch (error) {
    // Log the specific error
    console.error('getTestById error:', error.message);
    
    // If timeout, try to reset Firebase connection
    if (error.message.includes('timeout') || error.message.includes('PERMISSION_DENIED')) {
      try {
        // Disable and re-enable network to reset connection
        await disableNetwork(db).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 100));
        await enableNetwork(db).catch(() => {});
      } catch (e) {
        console.log('Connection reset error:', e.message);
      }
    }
    
    throw error;
  }
};

/**
 * Add a single response to a test
 * Automatically places it in the correct batch document in the responseBatches subcollection
 */
export const addTestResponse = async (testId, responseData) => {
  try {
    const testRef = doc(db, "tests", testId);
    const testDocSnap = await getDoc(testRef);

    if (!testDocSnap.exists()) throw new Error("Test not found");

    const testData = testDocSnap.data();
    const newResponse = {
      ...responseData,
      submittedAt: new Date(),
      responseId:
        Date.now().toString() + Math.random().toString(36).substring(2, 8),
      status: "active",
    };

    // Determine which batch this response should go to
    const currentTotalResponses = testData.totalResponses || 0;
    const batchNumber = getBatchNumber(currentTotalResponses);
    const batchDocRef = getBatchDocRef(testId, batchNumber);

    // Use batch for atomicity
    const batch = writeBatch(db);

    // Get current batch document
    const batchDocSnap = await getDoc(batchDocRef);
    let batchResponses = [];

    if (batchDocSnap.exists()) {
      batchResponses = batchDocSnap.data().responses || [];
    }

    // Check if current batch is full, if so create new batch
    if (batchResponses.length >= RESPONSES_PER_BATCH) {
      const newBatchNumber = batchNumber + 1;
      const newBatchDocRef = getBatchDocRef(testId, newBatchNumber);
      batch.set(newBatchDocRef, {
        responses: [newResponse],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Add to current batch
      batchResponses.push(newResponse);
      batch.set(batchDocRef, {
        responses: batchResponses,
        createdAt: batchDocSnap.exists() ? batchDocSnap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Update test metadata
    batch.update(testRef, {
      totalResponses: increment(1),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return newResponse;
  } catch (error) {
    console.error("Error adding test response:", error);
    throw error;
  }
};

// Update a test
export const updateTest = async (testId, updateData) => {
  try {
    const testRef = doc(db, "tests", testId);
    await updateDoc(testRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating test:", error);
    throw error;
  }
};

// Delete a test
export const deleteTest = async (testId) => {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, "tests", testId));

    // Also delete the emails document from MongoDB
    try {
      const response = await fetch("/api/delete-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testId: testId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error deleting emails from MongoDB:", errorData);
      } else {
        const data = await response.json();
        console.log("Emails deleted from MongoDB:", data);
      }
    } catch (error) {
      console.error("Error deleting emails from MongoDB:", error);
      // Don't throw - Firestore deletion was successful, just log MongoDB deletion error
    }
  } catch (error) {
    console.error("Error deleting test:", error);
    throw error;
  }
};

// Clear all responses for a test (delete all batch documents and reset counter)
export const clearTestResponses = async (testId) => {
  try {
    if (!testId) throw new Error("Invalid testId");
    
    const testRef = doc(db, "tests", testId);

    // Get the test document to know how many batches exist
    const testDocSnap = await getDoc(testRef);
    if (!testDocSnap.exists()) throw new Error("Test not found");

    const testData = testDocSnap.data();
    const totalResponses = testData.totalResponses || 0;
    
    if (totalResponses === 0) {
      // No responses to clear
      return;
    }

    // Calculate how many batch documents exist
    const lastBatchNumber = getBatchNumber(totalResponses - 1);
    
    // Delete batch documents sequentially in small groups to avoid transaction size limit
    const BATCH_SIZE = 10; // Delete 10 at a time
    
    for (let i = 0; i <= lastBatchNumber; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const endIndex = Math.min(i + BATCH_SIZE - 1, lastBatchNumber);
      
      for (let j = i; j <= endIndex; j++) {
        const batchDocRef = getBatchDocRef(testId, j);
        batch.delete(batchDocRef);
      }
      
      // Commit this small chunk
      await batch.commit();
    }

    // Finally, reset response counter and clear emails on test document
    await updateDoc(testRef, {
      totalResponses: 0,
      emails: [], // Clear emails array
      updatedAt: serverTimestamp(),
    });

    // Also delete the test document from MongoDB emails collection
    try {
      const response = await fetch("/api/delete-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testId: testId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error deleting emails from MongoDB:", errorData);
      } else {
        const data = await response.json();
        console.log("Emails deleted from MongoDB:", data);
      }
    } catch (error) {
      console.error("Error deleting emails from MongoDB:", error);
      // Don't throw - Firestore clearing was successful, just log MongoDB deletion error
    }
  } catch (error) {
    console.error("Error clearing test responses:", error);
    throw error;
  }
};

// Get all tests for superadmin
export const getAllTests = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "tests"));
    const tests = [];
    querySnapshot.forEach((doc) => {
      tests.push({ id: doc.id, ...doc.data() });
    });
    return tests;
  } catch (error) {
    console.error("Error getting all tests:", error);
    throw error;
  }
};
