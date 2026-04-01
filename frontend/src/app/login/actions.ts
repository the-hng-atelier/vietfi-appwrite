"use server";

import { redirect } from "next/navigation";
import { signUp, signIn, signOut, getGoogleOAuthUrl } from "@/lib/appwrite/account";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn(email, password);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login failed";
    redirect(`/login?error=${encodeURIComponent(msg)}`);
  }

  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signUp(email, password, name);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signup failed";
    redirect(`/login?error=${encodeURIComponent(msg)}`);
  }

  redirect("/login?message=" + encodeURIComponent("Tài khoản đã được tạo! Đăng nhập để tiếp tục."));
}

/** Returns Google OAuth URL — called client-side to set window.location.href */
export async function getGoogleOAuthUrlAction(): Promise<{ url: string }> {
  const url = await getGoogleOAuthUrl();
  return { url };
}

export async function signoutAction() {
  try {
    await signOut();
  } catch {
    // Continue regardless
  }
  redirect("/login");
}
