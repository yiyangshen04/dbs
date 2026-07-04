"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/use-auth";
import SignInModal from "./SignInModal";

export default function AuthHeader() {
  const { session, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return <span className="text-xs text-muted">…</span>;
  }

  if (!session) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md border border-accent/50 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
        >
          Sign in
        </button>
        <SignInModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  const email = session.user.email;

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className="hidden font-mono md:inline">{email}</span>
      <button
        onClick={async () => {
          await getBrowserSupabase().auth.signOut();
        }}
        className="rounded-md border border-panel-border px-2 py-1 transition hover:bg-white/5 hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
