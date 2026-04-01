"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Appwrite OAuth redirects here with ?key=...&userId=...&expire=...
    // The Appwrite SDK auto-creates a session from these URL params on the client.
    // We just need to verify the session was created by checking account.get().
    import("@/lib/appwrite/account")
      .then(({ getCurrentUser }) => getCurrentUser())
      .then((user) => {
        if (user) {
          router.replace("/dashboard");
        } else {
          setError("oauth_failed");
          router.replace("/login?error=oauth_failed");
        }
      })
      .catch(() => {
        router.replace("/login?error=oauth_failed");
      });
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">
          Đăng nhập thất bại. <a href="/login" className="underline">Thử lại</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 animate-pulse">Đang đăng nhập...</p>
    </div>
  );
}
