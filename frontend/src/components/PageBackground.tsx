"use client";

// Full welcome-page gradient painted as the canvas for every
// authenticated app page. This is the brand thread that ties the
// whole product to /welcome -- not a subtle accent.
export function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background:
          "linear-gradient(135deg, #667eea 0%, #5a4fcf 25%, #764ba2 50%, #6B73D1 75%, #4A90E2 100%)",
      }}
    />
  );
}
