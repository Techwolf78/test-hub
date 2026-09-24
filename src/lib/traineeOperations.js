import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth as mainAuth, db, firebaseConfig } from "./firebaseConfig";

/**
 * Get or initialize a secondary Firebase app instance.
 * This allows an admin to create a new user account without disrupting their own active login session.
 */
function getSecondaryAuthInstance() {
  const secondaryAppName = "SecondaryTraineeAuthApp";
  const existingApp = getApps().find((a) => a.name === secondaryAppName);
  const secondaryApp =
    existingApp || initializeApp(firebaseConfig, secondaryAppName);
  return getAuth(secondaryApp);
}

/**
 * Create a new Trainee account in Firebase Auth & Firestore, and dispatch a password reset email.
 * @param {Object} params
 * @param {string} params.email - Trainee email
 * @param {string} params.password - Trainee password
 * @param {boolean} params.sendResetEmail - Whether to automatically send password reset email
 * @returns {Promise<Object>} Created trainee info
 */
export async function createTraineeAccount({ email, password, sendResetEmail = true }) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const trimmedEmail = email.trim();
  const secondaryAuth = getSecondaryAuthInstance();

  try {
    // 1. Create Auth user using the secondary auth instance
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      trimmedEmail,
      password
    );
    const newUid = userCredential.user.uid;

    // 2. Sign out the secondary instance immediately to keep it clean
    await firebaseSignOut(secondaryAuth).catch(() => {});

    // 3. Write user profile document to Firestore with role = 'trainee'
    const currentUser = mainAuth.currentUser;
    await setDoc(doc(db, "users", newUid), {
      email: trimmedEmail,
      role: "trainee",
      createdBy: currentUser ? currentUser.uid : null,
      createdByEmail: currentUser ? currentUser.email : null,
      createdAt: serverTimestamp(),
      status: "active",
    });

    // 4. Send official Firebase password reset email to trainee
    let resetEmailSent = false;
    if (sendResetEmail) {
      try {
        await sendPasswordResetEmail(mainAuth, trimmedEmail);
        resetEmailSent = true;
      } catch (resetError) {
        console.warn("Password reset email notice:", resetError);
      }
    }

    return {
      uid: newUid,
      email: trimmedEmail,
      role: "trainee",
      resetEmailSent,
    };
  } catch (error) {
    // Attempt cleanup on secondary auth if needed
    await firebaseSignOut(secondaryAuth).catch(() => {});
    console.error("Error creating trainee account:", error);
    throw error;
  }
}

/**
 * Trigger sending a password reset email to a trainee
 * @param {string} email
 */
export async function sendTraineePasswordReset(email) {
  if (!email) throw new Error("Trainee email is required");
  try {
    await sendPasswordResetEmail(mainAuth, email.trim());
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}

/**
 * Fetch all registered trainees from Firestore
 * @returns {Promise<Array>} List of trainee objects
 */
export async function getTrainees() {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "trainee"));
    const snapshot = await getDocs(q);

    const trainees = [];
    snapshot.forEach((d) => {
      trainees.push({
        id: d.id,
        ...d.data(),
      });
    });

    // Sort by createdAt client-side (newest first)
    return trainees.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error fetching trainees:", error);
    throw error;
  }
}

/**
 * Delete a trainee Firestore user record
 * @param {string} uid
 */
export async function deleteTraineeRecord(uid) {
  try {
    if (!uid) throw new Error("Trainee UID is required");
    await deleteDoc(doc(db, "users", uid));
    return true;
  } catch (error) {
    console.error("Error deleting trainee record:", error);
    throw error;
  }
}
