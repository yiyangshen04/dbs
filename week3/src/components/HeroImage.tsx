"use client";

import { useState } from "react";

export default function HeroImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
