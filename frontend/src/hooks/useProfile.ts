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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      setLoaded(true);
      return;
    }
    try {
      const raw = localStorage.getItem(`${PROFILE_KEY}_${address.toLowerCase()}`);
      if (raw) {
        setProfile(JSON.parse(raw));
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
    setLoaded(true);
  }, [address]);

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
