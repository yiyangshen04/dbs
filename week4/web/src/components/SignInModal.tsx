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
        // With implicit flow, tokens arrive in the URL hash on the landing
        // page; `detectSessionInUrl: true` in the Supabase client picks them
        // up on init. No separate callback route needed.
        emailRedirectTo: `${window.location.origin}/`,
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
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold">Sign in</h2>
          <button
            onClick={onClose}
            className="text-muted transition hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {status === "sent" ? (
          <div className="text-sm">
            <p className="mb-2">Check your email.</p>
            <p className="text-muted">
              We sent a magic link to{" "}
              <strong className="text-foreground">{email}</strong>. Click it to
              sign in — this tab will pick up the session automatically when
              you return.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-3">
            <p className="text-xs text-muted">
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
              className="w-full rounded-md border border-panel-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
            />
            <button
              type="submit"
              disabled={status === "sending" || !email}
              className="w-full rounded-md bg-accent/90 px-3 py-2 text-sm font-semibold text-background transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-muted/40"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {errorMsg ? (
              <p className="text-xs text-red-400">{errorMsg}</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
