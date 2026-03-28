"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useState } from "react";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const pathname = usePathname();
  const router = useRouter();
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const handleDisconnect = () => {
    if (address) {
      localStorage.removeItem(`welp_profile_${address.toLowerCase()}`);
    }
    disconnect();
    setShowDisconnectModal(false);
    router.push("/welcome");
  };

  // Don't show full nav on welcome/onboarding pages
  const isAuthPage = pathname === "/welcome" || pathname === "/onboarding";

  const navLinks = isConnected
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/businesses", label: "Explore Businesses" },
        { href: "/feed", label: "Feed" },
      ]
    : [];

  return (
    <>
      <nav className="backdrop-blur-md bg-white/90 border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href={isConnected ? "/dashboard" : "/welcome"} className="flex items-center gap-2">
              <Image
                src="/logos/welp-logo-adblue.png"
                alt="welp"
                width={140}
                height={44}
                className="h-11 w-auto"
                priority
              />
            </Link>

            {/* Nav links — only when connected and not on auth pages */}
            {!isAuthPage && navLinks.length > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive =
                    link.href === "/dashboard"
                      ? pathname === "/dashboard"
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
            )}
          </div>

          {/* Right: Wallet */}
          <div>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-[#4A90E2] font-mono transition"
                >
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </Link>
                <button
                  onClick={() => setShowDisconnectModal(true)}
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

      {/* Disconnect confirmation modal — rendered outside nav to avoid stacking context issues */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={() => setShowDisconnectModal(false)}>
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[1.5rem] border-2 border-gray-100 p-8 max-w-sm w-full mx-4 shadow-xl z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-fredoka)" }}>
              Disconnect Wallet?
            </h2>
            <p className="text-gray-500 text-sm mb-6" style={{ fontFamily: "var(--font-nunito)" }}>
              Are you sure you want to disconnect? Your local profile data will be cleared.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-100 text-gray-600 font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
