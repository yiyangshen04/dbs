import Link from "next/link";

const regions = [
  {
    name: "Africa",
    color: "var(--africa)",
    bg: "linear-gradient(135deg, #d4845a33, #c9a84c22)",
    description: "Vast savannas, ancient cultures, and vibrant cities",
    icon: "\uD83E\uDD81",
  },
  {
    name: "Americas",
    color: "var(--americas)",
    bg: "linear-gradient(135deg, #2d5a3d33, #3d7a5322)",
    description: "From Patagonia to the Arctic, diverse landscapes await",
    icon: "\uD83D\uDDFD",
  },
  {
    name: "Asia",
    color: "var(--asia)",
    bg: "linear-gradient(135deg, #c9a84c33, #dfc47a22)",
    description: "Temples, mountains, and millennia of civilization",
    icon: "\u26E9\uFE0F",
  },
  {
    name: "Europe",
    color: "var(--europe)",
    bg: "linear-gradient(135deg, #6a8caa33, #6a8caa22)",
    description: "Historic capitals, art, cuisine, and coastal charm",
    icon: "\uD83C\uDFF0",
  },
  {
    name: "Oceania",
    color: "var(--oceania)",
    bg: "linear-gradient(135deg, #6aadcc33, #6aadcc22)",
    description: "Island paradises, coral reefs, and ancient traditions",
    icon: "\uD83C\uDFDD\uFE0F",
  },
];

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section with Animated Beach Scene */}
      <section
        className="text-center relative overflow-hidden"
        style={{
          padding: "5rem 2rem 6rem",
          background:
            "linear-gradient(180deg, #dce9f3 0%, #f0e6d3 35%, #e8dcc8 50%, var(--warm-white) 100%)",
          borderBottom: "3px double var(--gold)",
          minHeight: "420px",
        }}
      >
        {/* Animated Scene */}
        <div className="hero-scene">
          {/* Sun */}
          <div className="hero-sun" />

          {/* Clouds */}
          <div className="hero-cloud hero-cloud-1" />
          <div className="hero-cloud hero-cloud-2" />
          <div className="hero-cloud hero-cloud-3" />

          {/* Birds */}
          <div className="hero-bird hero-bird-1">&#x2708;</div>
          <div className="hero-bird hero-bird-2">&#x2708;</div>
          <div className="hero-bird hero-bird-3">&#x2708;</div>

          {/* Palm Trees */}
          <div className="hero-palm hero-palm-left">{"\uD83C\uDF34"}</div>
          <div className="hero-palm hero-palm-right">{"\uD83C\uDF34"}</div>

          {/* Waves */}
          <div className="hero-waves">
            <div className="hero-wave hero-wave-1" />
            <div className="hero-wave hero-wave-2" />
            <div className="hero-wave hero-wave-3" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Ornament */}
          <div
            className="font-heading mb-4"
            style={{
              fontSize: "1.8rem",
              color: "var(--gold)",
              letterSpacing: "0.5rem",
            }}
          >
            &#x2726; &#x2726; &#x2726;
          </div>

          {/* Title */}
          <h1
            className="shimmer-text font-heading font-bold mb-2"
            style={{
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              lineHeight: 1.2,
            }}
          >
            Travel Bucket List
          </h1>

          {/* Subtitle */}
          <p
            className="font-heading italic mb-2"
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
              color: "var(--gold-dark)",
            }}
          >
            Discover Every Corner of the World
          </p>

          {/* Description */}
          <p
            className="font-body mx-auto mt-4"
            style={{
              fontSize: "0.95rem",
              color: "var(--brown-light)",
              maxWidth: "580px",
              lineHeight: 1.8,
            }}
          >
            Explore countries across all continents, save the ones that inspire
            you, and build your personal travel bucket list.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center mt-8 flex-wrap">
            <Link
              href="/explore"
              className="pill-btn pill-btn-lg no-underline"
              style={{
                background: "var(--gold)",
                color: "var(--warm-white)",
                borderColor: "var(--gold)",
              }}
            >
              {"\u2708\uFE0F"} Start Exploring
            </Link>
            <Link href="/sign-up" className="pill-btn pill-btn-lg no-underline">
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Region Overview */}
      <section
        className="mx-auto"
        style={{
          maxWidth: "960px",
          padding: "0 var(--spacing-md) var(--spacing-lg)",
        }}
      >
        {/* Section Header */}
        <div
          className="text-center"
          style={{
            padding: "var(--spacing-lg) var(--spacing-sm) var(--spacing-md)",
          }}
        >
          <span
            className="block mb-2"
            style={{
              fontSize: "1.2rem",
              color: "var(--gold)",
              letterSpacing: "0.4rem",
            }}
          >
            &#x2726;
          </span>
          <h2
            className="font-heading font-semibold uppercase"
            style={{
              fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
              color: "var(--green)",
              letterSpacing: "0.08em",
            }}
          >
            Explore by Region
          </h2>
          <div className="ornament-line mt-3" />
        </div>

        {/* Region Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {regions.map((region) => (
            <Link
              key={region.name}
              href={`/explore?region=${region.name}`}
              className="card-ornament p-6 no-underline block transition-all hover:-translate-y-2 hover:shadow-lg"
              style={{
                background: "var(--cream)",
                borderTop: `3px solid ${region.color}`,
              }}
            >
              {/* Region Icon */}
              <div
                className="region-icon-bg"
                style={{ background: region.bg }}
              >
                {region.icon}
              </div>

              <h3
                className="font-heading font-bold mb-2"
                style={{
                  fontSize: "1.3rem",
                  color: region.color,
                }}
              >
                {region.name}
              </h3>
              <p
                className="font-body"
                style={{
                  fontSize: "0.9rem",
                  color: "var(--brown-light)",
                  lineHeight: 1.6,
                }}
              >
                {region.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
