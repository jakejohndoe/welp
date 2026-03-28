"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";

export default function RootRedirect() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { profile, loaded } = useProfile(address);

  useEffect(() => {
    if (!loaded) return;
    if (!isConnected) {
      router.replace("/welcome");
    } else if (!profile) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  }, [isConnected, profile, loaded, router]);

  return null;
}
