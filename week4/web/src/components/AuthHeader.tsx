"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/use-auth";
import SignInModal from "./SignInModal";

export default function AuthHeader() {
  const { session, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return <span className="text-xs text-slate-400">…</span>;
  }

  if (!session) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Sign in
        </button>
        <SignInModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  const email = session.user.email;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
      <span className="font-mono">{email}</span>
      <button
        onClick={async () => {
          await getBrowserSupabase().auth.signOut();
        }}
        className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Sign out
      </button>
    </div>
  );
}
