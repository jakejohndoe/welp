"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";

const AVATARS = [
  { src: "/avatars/basic-woman-avatar.png", label: "Basic Woman" },
  { src: "/avatars/blonde-male-avatar.png", label: "Blonde Male" },
  { src: "/avatars/boutique-owner-avatar.png", label: "Boutique Owner" },
  { src: "/avatars/businessman-avatar.png", label: "Businessman" },
  { src: "/avatars/chef-avatar.png", label: "Chef" },
  { src: "/avatars/gardener-avatar.png", label: "Gardener" },
  { src: "/avatars/headwrap-person-avatar.png", label: "Headwrap Person" },
  { src: "/avatars/librarian-avatar.png", label: "Librarian" },
  { src: "/avatars/mechanic-avatar.png", label: "Mechanic" },
];

const CATEGORIES = [
  { id: "food", label: "Food & Dining", emoji: "🍽️" },
  { id: "coffee", label: "Coffee & Tea", emoji: "☕" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "entertainment", label: "Entertainment", emoji: "🎪" },
  { id: "services", label: "Services", emoji: "🔧" },
  { id: "nightlife", label: "Nightlife", emoji: "🍺" },
];

export default function Onboarding() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { profile, loaded, saveProfile } = useProfile(address);

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!loaded) return;
    if (!isConnected) {
      router.replace("/welcome");
    } else if (profile) {
      router.replace("/dashboard");
    }
  }, [isConnected, profile, loaded, router]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  };

  const handleComplete = () => {
    saveProfile({
      displayName: displayName.trim(),
      avatar: selectedAvatar,
      categories: selectedCategories,
      completedAt: Date.now(),
    });
    router.push("/dashboard");
  };

  const canProceed = () => {
    if (step === 1) return displayName.trim().length >= 2;
    if (step === 2) return selectedAvatar !== "";
    if (step === 3) return selectedCategories.length >= 2;
    return false;
  };

  if (!loaded || !isConnected) return null;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  s === step
                    ? "bg-[#4A90E2] text-white"
                    : s < step
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 ${
                    s < step ? "bg-green-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-8">
          {/* Step 1: Display Name */}
          {step === 1 && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome to welp!
                </h1>
                <p className="text-gray-500">
                  Choose a display name for your profile
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name..."
                    maxLength={24}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-gray-900 placeholder-gray-300 focus:border-[#4A90E2] focus:outline-none transition"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    {displayName.length}/24 characters
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Connected as{" "}
                  <span className="font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </p>
              </div>
            </>
          )}

          {/* Step 2: Avatar */}
          {step === 2 && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Choose Your Avatar
                </h1>
                <p className="text-gray-500">
                  Select an avatar that represents you
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.src}
                    onClick={() => setSelectedAvatar(avatar.src)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      selectedAvatar === avatar.src
                        ? "border-[#4A90E2] bg-blue-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <Image
                      src={avatar.src}
                      alt={avatar.label}
                      width={56}
                      height={56}
                      className="rounded-full"
                    />
                    <span className="text-xs text-gray-500">{avatar.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Categories */}
          {step === 3 && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Your Interests
                </h1>
                <p className="text-gray-500">
                  Pick 2-3 categories you love exploring
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      selectedCategories.includes(cat.id)
                        ? "border-[#4A90E2] bg-blue-50 text-[#4A90E2]"
                        : "border-gray-100 text-gray-600 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                {selectedCategories.length}/3 selected (min 2)
              </p>
            </>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-100 text-gray-600 font-medium hover:bg-gray-50 transition-all"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 py-3 rounded-xl bg-[#4A90E2] hover:bg-[#357ABD] text-white font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!canProceed()}
                className="flex-1 py-3 rounded-xl bg-[#F5D033] hover:bg-[#E6C029] text-gray-900 font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Complete Setup
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Step {step} of 3
        </p>
      </div>
    </div>
  );
}
