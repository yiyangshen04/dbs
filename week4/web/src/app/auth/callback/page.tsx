"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// Magic-link lands the user here with ?code=... (PKCE flow).
// We swap the code for a session and bounce back to the map.
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-slate-500">
          Signing you in…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const [error, setError] = useState<string | null>(
    code ? null : "No code in callback URL.",
  );

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    getBrowserSupabase()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
        } else {
          router.replace("/");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <div className="flex h-screen items-center justify-center text-sm">
      {error ? (
        <div className="max-w-md text-center">
          <p className="text-red-600">Sign-in failed: {error}</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 underline">
            Back to map
          </Link>
        </div>
      ) : (
        <p className="text-slate-500">Signing you in…</p>
      )}
    </div>
  );
}
