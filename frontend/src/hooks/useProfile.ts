"use client";

import { useState, useEffect, useCallback } from "react";

export interface UserProfile {
  displayName: string;
  avatar: string;
  categories: string[];
  completedAt: number;
  hasReviewed?: boolean;
}

const PROFILE_KEY = "welp_profile";

export function useProfile(address: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Tracks which address's localStorage has been read. undefined = nothing
  // checked yet, null = confirmed there's no connected address. Deriving
  // `loaded` from this avoids a render window where a newly-arrived address
  // sees the previous run's `loaded=true` with a stale `profile=null`.
  const [checkedAddress, setCheckedAddress] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      setCheckedAddress(null);
      return;
    }
    const normAddr = address.toLowerCase();
    try {
      const raw = localStorage.getItem(`${PROFILE_KEY}_${normAddr}`);
      setProfile(raw ? JSON.parse(raw) : null);
    } catch {
      setProfile(null);
    }
    setCheckedAddress(normAddr);
  }, [address]);

  const currentKey = address?.toLowerCase() ?? null;
  const loaded = checkedAddress !== undefined && checkedAddress === currentKey;

  const saveProfile = useCallback(
    (data: UserProfile) => {
      if (!address) return;
      localStorage.setItem(
        `${PROFILE_KEY}_${address.toLowerCase()}`,
        JSON.stringify(data)
      );
      setProfile(data);
    },
    [address]
  );

  const markReviewed = useCallback(() => {
    if (!address || !profile) return;
    const updated = { ...profile, hasReviewed: true };
    localStorage.setItem(
      `${PROFILE_KEY}_${address.toLowerCase()}`,
      JSON.stringify(updated)
    );
    setProfile(updated);
  }, [address, profile]);

  return { profile, loaded, saveProfile, markReviewed };
}
