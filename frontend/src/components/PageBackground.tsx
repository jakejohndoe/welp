"use client";

// Branded atmosphere, not full welcome moment. The /welcome gradient
// sits behind a cream overlay so the colors read as product identity
// without competing with the cards/content above. /welcome keeps the
// full-intensity gradient so the first-impression moment stays
// distinct.
export function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #667eea 0%, #5a4fcf 25%, #764ba2 50%, #6B73D1 75%, #4A90E2 100%)",
        }}
      />
      <div className="absolute inset-0 bg-brand-cream/60" />
    </div>
  );
}
