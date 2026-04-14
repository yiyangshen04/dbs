"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton, SignInButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/bucket-list", label: "Bucket List" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 border-b-2 border-gold px-6 py-2.5 flex items-center justify-between gap-4"
      style={{
        background: "rgba(245, 240, 232, 0.92)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <Link
        href="/"
        className="font-heading text-brown font-semibold tracking-wide whitespace-nowrap text-base no-underline"
      >
        Travel Bucket List
      </Link>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`pill-btn text-xs ${
              pathname === link.href ? "pill-btn-active" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}

        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        </Show>

        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="pill-btn text-xs">Sign In</button>
          </SignInButton>
        </Show>
      </div>
    </nav>
  );
}
