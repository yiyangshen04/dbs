import Link from "next/link";

const regions = [
  {
    name: "Africa",
    color: "var(--africa)",
    description: "Vast savannas, ancient cultures, and vibrant cities",
    emoji: "\uD83C\uDF0D",
  },
  {
    name: "Americas",
    color: "var(--americas)",
    description: "From Patagonia to the Arctic, diverse landscapes await",
    emoji: "\uD83C\uDF0E",
  },
  {
    name: "Asia",
    color: "var(--asia)",
    description: "Temples, mountains, and millennia of civilization",
    emoji: "\uD83C\uDF0F",
  },
  {
    name: "Europe",
    color: "var(--europe)",
    description: "Historic capitals, art, cuisine, and coastal charm",
    emoji: "\uD83C\uDFF0",
  },
  {
    name: "Oceania",
    color: "var(--oceania)",
    description: "Island paradises, coral reefs, and ancient traditions",
    emoji: "\uD83C\uDFDD\uFE0F",
  },
];

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section
        className="text-center relative overflow-hidden"
        style={{
          padding: "var(--spacing-xl) 2rem 3.5rem",
          background:
            "linear-gradient(180deg, var(--cream) 0%, var(--warm-white) 100%)",
          borderBottom: "3px double var(--gold)",
        }}
      >
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(201,168,76,0.015) 40px, rgba(201,168,76,0.015) 80px)",
          }}
        />

        <div className="relative">
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
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
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
              color: "var(--gold)",
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
              maxWidth: "640px",
              lineHeight: 1.8,
            }}
          >
            Explore countries across all continents, save the ones that inspire
            you, and build your personal travel bucket list. Your next adventure
            starts here.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center mt-8 flex-wrap">
            <Link href="/explore" className="pill-btn pill-btn-lg no-underline">
              Start Exploring
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
              className="card-ornament p-6 no-underline block transition-transform hover:-translate-y-1"
              style={{
                background: "var(--cream)",
                borderTop: `3px solid ${region.color}`,
              }}
            >
              <div className="text-3xl mb-3">{region.emoji}</div>
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
