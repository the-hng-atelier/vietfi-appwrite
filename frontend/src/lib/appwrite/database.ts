// frontend/src/lib/appwrite/database.ts
import { ID, Query } from "appwrite";
import { getDatabases, APPWRITE_DATABASE_ID } from "./client";

// ── Generic helpers ────────────────────────────────────────────────────────

/** Create a document. Auto-assigns user_id from current session. */
export async function createDocument<T extends Record<string, unknown>>(
  collectionId: string,
  data: T,
  userId: string
): Promise<string> {
  const db = getDatabases();
  const doc = await db.createDocument(
    APPWRITE_DATABASE_ID,
    collectionId,
    ID.unique(),
    { ...data, user_id: userId }
  );
  return doc.$id;
}

/** List documents for current user */
export async function listUserDocuments<T>(
  collectionId: string,
  userId: string,
  orderByField = "created_at",
  limit = 500
): Promise<T[]> {
  const db = getDatabases();
  const result = await db.listDocuments(
    APPWRITE_DATABASE_ID,
    collectionId,
    [
      Query.equal("user_id", [userId]),
      Query.orderDesc(orderByField),
      Query.limit(limit),
    ]
  );
  return result.documents as unknown as T[];
}

/** Update a document */
export async function updateDocument(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDatabases();
  await db.updateDocument(
    APPWRITE_DATABASE_ID,
    collectionId,
    documentId,
    data
  );
}

/** Delete a document */
export async function deleteDocument(
  collectionId: string,
  documentId: string
): Promise<void> {
  const db = getDatabases();
  await db.deleteDocument(APPWRITE_DATABASE_ID, collectionId, documentId);
}

/** Delete all documents for user (used before re-insert) */
export async function deleteAllUserDocuments(
  collectionId: string,
  userId: string
): Promise<void> {
  const db = getDatabases();
  const result = await db.listDocuments(
    APPWRITE_DATABASE_ID,
    collectionId,
    [Query.equal("user_id", [userId]), Query.limit(200)]
  );
  await Promise.all(
    result.documents.map((doc) =>
      db.deleteDocument(APPWRITE_DATABASE_ID, collectionId, doc.$id)
    )
  );
}

/** Upsert a document by user_id (single-doc-per-user pattern) */
export async function upsertUserDocument(
  collectionId: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDatabases();
  // Try to find existing doc
  try {
    const result = await db.listDocuments(
      APPWRITE_DATABASE_ID,
      collectionId,
      [Query.equal("user_id", [userId]), Query.limit(1)]
    );
    if (result.documents.length > 0) {
      await db.updateDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        result.documents[0].$id,
        data
      );
    } else {
      await db.createDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        ID.unique(),
        { ...data, user_id: userId }
      );
    }
  } catch {
    // Fallback: create new
    await db.createDocument(
      APPWRITE_DATABASE_ID,
      collectionId,
      ID.unique(),
      { ...data, user_id: userId }
    );
  }
}
