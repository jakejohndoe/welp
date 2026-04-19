"use client";

import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { ipfsUrl } from "@/lib/pinata";

export function ReviewText({ ipfsHash }: { ipfsHash: string }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isPlaceholder = !ipfsHash || ipfsHash.startsWith("QmPlaceholder");
  const verifyUrl = isPlaceholder
    ? null
    : `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

  useEffect(() => {
    if (isPlaceholder) {
      setText("Review submitted successfully (content not stored on IPFS)");
      setLoading(false);
      return;
    }

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
  }, [ipfsHash, isPlaceholder]);

  if (loading) {
    return <p className="text-sm text-gray-300 mt-2 animate-pulse">Loading review...</p>;
  }

  if (error || !text) {
    return (
      <div className="mt-2">
        <p className="text-sm text-gray-300 italic">Review content unavailable</p>
        {verifyUrl && (
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-primary transition mt-1"
          >
            View on IPFS <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
      {verifyUrl && (
        <a
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-primary transition mt-1.5"
        >
          View on IPFS <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
