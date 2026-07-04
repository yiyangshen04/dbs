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
          ? "border-selection/60 bg-selection/15 text-selection hover:bg-selection/25"
          : "border-panel-border text-foreground/80 hover:bg-white/5") +
        (disabled ? " cursor-not-allowed opacity-40" : "")
      }
    >
      <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
      {isFavorite ? "Saved" : "Save"}
    </button>
  );
}
