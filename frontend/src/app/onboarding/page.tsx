"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";

const DEFAULT_SEEDS = [
  "explorer", "foodie", "wanderer", "cryptofan",
  "moonwalker", "stargazer", "trailblazer", "wavelength",
  "sunrise", "thunderbolt", "firefly", "aurora",
];

function getDicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
}

const CATEGORIES = [
  { id: "food", label: "Food & Dining", emoji: "\u{1F37D}\u{FE0F}" },
  { id: "coffee", label: "Coffee & Tea", emoji: "\u2615" },
  { id: "shopping", label: "Shopping", emoji: "\u{1F6CD}\u{FE0F}" },
  { id: "entertainment", label: "Entertainment", emoji: "\u{1F3AA}" },
  { id: "services", label: "Services", emoji: "\u{1F527}" },
  { id: "nightlife", label: "Nightlife", emoji: "\u{1F37A}" },
];

export default function Onboarding() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { profile, loaded, saveProfile } = useProfile(address);

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [selectedSeed, setSelectedSeed] = useState("");
  const [avatarSeeds, setAvatarSeeds] = useState(DEFAULT_SEEDS);
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

  const randomizeAvatars = () => {
    const newSeeds = Array.from({ length: 12 }, () =>
      Math.random().toString(36).slice(2, 10)
    );
    setAvatarSeeds(newSeeds);
    setSelectedSeed("");
  };

  const handleComplete = () => {
    saveProfile({
      displayName: displayName.trim(),
      avatar: selectedSeed,
      categories: selectedCategories,
      completedAt: Date.now(),
    });
    router.push("/dashboard");
  };

  const canProceed = () => {
    if (step === 1) return displayName.trim().length >= 2;
    if (step === 2) return selectedSeed !== "";
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
                    ? "bg-brand-primary text-white shadow-md"
                    : s < step
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s < step ? "\u2713" : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 transition-colors ${
                    s < step ? "bg-green-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-8 shadow-lg">
          {/* Animated step content */}
          <div key={step} className="animate-fade-slide-up">
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
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-gray-900 placeholder-gray-300 focus:border-brand-primary focus:outline-none transition"
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
                <div className="grid grid-cols-4 gap-3">
                  {avatarSeeds.map((seed) => (
                    <button
                      key={seed}
                      onClick={() => setSelectedSeed(seed)}
                      className={`flex items-center justify-center p-2 rounded-xl border-2 transition-all hover:shadow-sm ${
                        selectedSeed === seed
                          ? "border-brand-primary bg-blue-50 shadow-md"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <img
                        src={getDicebearUrl(seed)}
                        alt={`Avatar ${seed}`}
                        width={64}
                        height={64}
                        className="rounded-lg"
                      />
                    </button>
                  ))}
                </div>
                <button
                  onClick={randomizeAvatars}
                  className="w-full mt-4 py-2.5 rounded-xl border-2 border-gray-100 text-gray-600 font-medium hover:bg-gray-50 hover:border-gray-200 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  Randomize
                </button>
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
                          ? "border-brand-primary bg-blue-50 text-brand-primary shadow-md"
                          : "border-gray-100 text-gray-600 hover:border-gray-200 hover:-translate-y-0.5 hover:shadow-md"
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
          </div>

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
                className="flex-1 py-3 rounded-xl bg-brand-primary hover:bg-brand-hover hover:scale-[1.02] text-white font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!canProceed()}
                className="flex-1 py-3 rounded-xl bg-[#F5A623] hover:bg-[#E6951F] hover:scale-[1.02] text-white font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md"
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
