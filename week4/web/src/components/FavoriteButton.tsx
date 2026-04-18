"use client";

interface Props {
  callsign: string | null;
  isFavorite: boolean;
  signedIn: boolean;
  onToggle: () => void;
  onRequireSignIn: () => void;
}

export default function FavoriteButton({
  callsign,
  isFavorite,
  signedIn,
  onToggle,
  onRequireSignIn,
}: Props) {
  const disabled = !callsign;
  const title = disabled
    ? "No callsign to save"
    : !signedIn
      ? "Sign in to save favorites"
      : isFavorite
        ? "Remove from favorites"
        : "Save to favorites";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!callsign) return;
        if (!signedIn) onRequireSignIn();
        else onToggle();
      }}
      title={title}
      className={
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition " +
        (isFavorite
          ? "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-200"
          : "border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800") +
        (disabled ? " opacity-40 cursor-not-allowed" : "")
      }
    >
      <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
      {isFavorite ? "Saved" : "Save"}
    </button>
  );
}
