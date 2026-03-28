"use client";

import { useState, useEffect } from "react";
import { ipfsUrl } from "@/lib/pinata";

export function ReviewText({ ipfsHash }: { ipfsHash: string }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const url = ipfsUrl(ipfsHash);
    if (!url) {
      setLoading(false);
      setError(true);
      return;
    }

    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((data) => {
        setText(data.text || data.review || JSON.stringify(data));
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [ipfsHash]);

  if (loading) {
    return <p className="text-sm text-gray-300 mt-2 animate-pulse">Loading review...</p>;
  }

  if (error || !text) {
    return <p className="text-sm text-gray-300 mt-2 italic">Review content unavailable</p>;
  }

  return <p className="text-sm text-gray-600 mt-2 leading-relaxed">{text}</p>;
}
