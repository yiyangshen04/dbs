"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SignInModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    const { error } = await getBrowserSupabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold">Sign in</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {status === "sent" ? (
          <div className="text-sm">
            <p className="mb-2">Check your email.</p>
            <p className="text-slate-500">
              We sent a magic link to <strong>{email}</strong>. Click it to
              sign in — this tab will pick up the session automatically when
              you return.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-3">
            <p className="text-xs text-slate-500">
              Enter your email — we&apos;ll send a one-click sign-in link. No
              password, no sign-up form.
            </p>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="submit"
              disabled={status === "sending" || !email}
              className="w-full rounded-md bg-blue-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {errorMsg ? (
              <p className="text-xs text-red-600">{errorMsg}</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
