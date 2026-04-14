export default function Footer() {
  return (
    <footer
      className="text-center border-t-[3px] border-double border-gold relative overflow-hidden"
      style={{
        background: "var(--cream)",
        padding: "var(--spacing-lg) 2rem 2rem",
      }}
    >
      {/* Ornamental border line */}
      <div
        className="mx-auto mb-4"
        style={{
          height: "2px",
          background:
            "linear-gradient(90deg, transparent, var(--gold), transparent)",
          maxWidth: "300px",
        }}
      />

      {/* Decorative ornament */}
      <div
        className="font-heading mb-3"
        style={{
          fontSize: "1.2rem",
          color: "var(--gold)",
          letterSpacing: "0.4rem",
        }}
      >
        &#x2726; &#x2726; &#x2726;
      </div>

      <p
        className="font-heading mb-2"
        style={{
          fontSize: "1rem",
          color: "var(--brown)",
          fontWeight: 600,
        }}
      >
        Travel Bucket List
      </p>

      <p
        className="font-body"
        style={{
          fontSize: "0.85rem",
          color: "var(--brown-light)",
          opacity: 0.7,
        }}
      >
        Explore the world, one country at a time.
      </p>

      <div className="ornament-line mt-4" />

      <p
        className="font-body mt-3"
        style={{
          fontSize: "0.8rem",
          color: "var(--brown-light)",
          opacity: 0.5,
        }}
      >
        MPCS 51238 &middot; Spring 2026
      </p>
    </footer>
  );
}
