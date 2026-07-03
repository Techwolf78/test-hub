import { MongoClient } from "mongodb";
import dns from "dns";

// Resolve querySrv ECONNREFUSED error on Windows / local router DNS configs
if (dns && typeof dns.setServers === "function") {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch (err) {
    console.warn("Failed to set DNS servers:", err);
  }
}

const uri = process.env.NEXT_PUBLIC_MONGODB_URI;
const options = {
  maxPoolSize: 10, // Limit connections per instance
  minPoolSize: 2,
  maxIdleTimeMS: 30000, // Close idle connections after 30s
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

if (!uri) {
  throw new Error("Please add your Mongo URI to .env.local");
}

let client;
let clientPromise;

// Use global caching in BOTH development and production
// Global variable to cache the MongoClient in development

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect().catch((err) => {
    global._mongoClientPromise = null;
    throw err;
  });
}
clientPromise = global._mongoClientPromise;

export default clientPromise;

// Helper functions remain the same
export async function getQueueCollection() {
  const client = await clientPromise;
  return client.db("test-hub").collection("queue");
}

export async function getTestSubmissionsCollection() {
  const client = await clientPromise;
  return client.db("test-hub").collection("testSubmissions");
}

export async function getTestsCollection() {
  const client = await clientPromise;
  return client.db("test-hub").collection("tests");
}

export async function getEmailsCollection() {
  const client = await clientPromise;
  return client.db("test-hub").collection("emails");
}
