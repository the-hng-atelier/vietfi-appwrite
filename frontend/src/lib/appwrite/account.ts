// frontend/src/lib/appwrite/account.ts
import { ID, OAuthProvider } from "appwrite";
import { getAccount } from "./client";

export interface AppwriteUser {
  $id: string;
  email: string;
  name: string;
  createdAt: string;
}

/** Get current authenticated user. Returns null if not logged in. */
export async function getCurrentUser(): Promise<AppwriteUser | null> {
  try {
    const account = getAccount();
    const user = await account.get();
    return {
      $id: user.$id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

/** Sign up with email + password */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<void> {
  const account = getAccount();
  await account.create(ID.unique(), email, password, name);
  // Auto-login after signup
  await signIn(email, password);
}

/** Sign in with email + password */
export async function signIn(
  email: string,
  password: string
): Promise<void> {
  const account = getAccount();
  await account.createEmailPasswordSession(email, password);
}

/** Sign out current session */
export async function signOut(): Promise<void> {
  const account = getAccount();
  await account.deleteSession("current");
}

/** Get Google OAuth URL (returns URL string — call window.location.href client-side) */
export async function getGoogleOAuthUrl(): Promise<string> {
  const account = getAccount();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return account.createOAuth2Token({
    provider: OAuthProvider.Google,
    success: `${origin}/auth/callback`,
    failure: `${origin}/login?error=oauth_failed`,
  });
}

/** Delete account */
export async function deleteAccount(): Promise<void> {
  const account = getAccount();
  await account.delete();
}
