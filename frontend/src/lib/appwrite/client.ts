// frontend/src/lib/appwrite/client.ts
import { Client, Account, Databases, OAuthProvider } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

// Singleton browser client
let _client: Client | null = null;

export function getAppwriteClient(): Client {
  if (_client) return _client;
  _client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);
  return _client;
}

export function getAccount(): Account {
  return new Account(getAppwriteClient());
}

export function getDatabases(): Databases {
  return new Databases(getAppwriteClient());
}

export const APPWRITE_DATABASE_ID = "vietfi_db";
