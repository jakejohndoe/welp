"use client";

import Image from "next/image";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useProfile } from "@/hooks/useProfile";

export default function Welcome() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const router = useRouter();
  const { profile, loaded } = useProfile(address);
  const learnMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) return;
    if (isConnected && profile) {
      router.replace("/dashboard");
    } else if (isConnected && !profile) {
      router.replace("/onboarding");
    }
  }, [isConnected, profile, loaded, router]);

  return (
    <div className="min-h-[85vh] flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full text-center">
          {/* Character illustration */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
                <Image
                  src="/avatars/chef-avatar.png"
                  alt="welp character"
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              </div>
              {/* Decorative stars */}
              <span className="absolute -top-2 -right-2 text-2xl">⭐</span>
              <span className="absolute -bottom-1 -left-3 text-lg">✨</span>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Your reviews.<br />
            <span className="text-[#4A90E2]">Your rewards.</span>
          </h1>

          <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
            Review local businesses in Saint Paul, earn WELP tokens for every honest review, and build your on-chain reputation.
          </p>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => connect({ connector: injected() })}
              className="px-8 py-3.5 rounded-xl bg-[#4A90E2] hover:bg-[#357ABD] text-white text-base font-semibold transition-all duration-300 shadow-sm hover:shadow-md w-full max-w-xs"
            >
              Connect Wallet
            </button>
            <button
              onClick={() => learnMoreRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm text-[#4A90E2] hover:underline font-medium transition"
            >
              Learn More &darr;
            </button>
          </div>
        </div>
      </div>

      {/* Learn More section */}
      <div ref={learnMoreRef} className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            How <span className="text-[#4A90E2]">welp</span> works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Image src="/icons/locationicon.png" alt="Visit" width={28} height={28} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Visit</h3>
              <p className="text-sm text-gray-500">
                Check in at any partner business in Saint Paul and discover new local gems.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <Image src="/icons/badgeicon-ribbon.png" alt="Review" width={28} height={28} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Review</h3>
              <p className="text-sm text-gray-500">
                Share honest reviews stored permanently on IPFS. Your words live forever on-chain.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Image src="/icons/trophyicon.png" alt="Earn" width={28} height={28} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Earn</h3>
              <p className="text-sm text-gray-500">
                Get WELP tokens for every review. Build reputation and unlock higher reward tiers.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => connect({ connector: injected() })}
              className="px-8 py-3 rounded-xl bg-[#4A90E2] hover:bg-[#357ABD] text-white font-semibold transition-all duration-300"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
