"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Explore Businesses" },
    { href: "/feed", label: "Feed" },
    ...(isConnected ? [{ href: "/profile", label: "Dashboard" }] : []),
  ];

  return (
    <nav className="backdrop-blur-md bg-white/90 border-b border-white/20 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/welp-logo-adblue.png"
              alt="welp"
              width={110}
              height={36}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-[#4A90E2] bg-blue-50"
                      : "text-gray-700 hover:text-[#4A90E2] hover:bg-blue-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Wallet */}
        <div>
          {isConnected ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="text-sm text-gray-600 hover:text-[#4A90E2] font-mono transition"
              >
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </Link>
              <button
                onClick={() => disconnect()}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="px-5 py-2 rounded-lg bg-[#4A90E2] hover:bg-[#357ABD] text-white text-sm font-semibold transition-all duration-300 shadow-sm"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
