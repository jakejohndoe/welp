const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";
const PINATA_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";

export async function uploadToPinata(
  review: { text: string; rating: number; businessId: number; reviewer: string }
): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: {
        ...review,
        timestamp: Date.now(),
        version: "welp-v2",
      },
      pinataMetadata: {
        name: `welp-review-${review.businessId}-${Date.now()}`,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Pinata upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

export function ipfsUrl(hash: string): string {
  if (!hash || hash.startsWith("Qm") === false) return "";
  return `${PINATA_GATEWAY}/ipfs/${hash}`;
}
